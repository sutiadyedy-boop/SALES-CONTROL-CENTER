import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data store path
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'SALESMAN';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DISABLED';

export interface StoredUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  password_hash: string;
  password_salt: string;
  avatar_url?: string;
  cabang?: string;
  area?: string;
  salesman_id?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface StoredSession {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: number;
  remember_me: boolean;
}

// Password hashing using Node.js crypto scrypt
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, passwordSalt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: passwordSalt,
  };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');
  if (keyBuffer.length !== hashBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, hashBuffer);
}

// Default Seed Users
function getInitialSeedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  
  // Seed 1: Admin Edy Sutiady
  const adminCred = hashPassword('password123');
  // Seed 2: Salesman Andi
  const salesCred = hashPassword('password123');
  // Seed 3: Supervisor Bone
  const spvCred = hashPassword('password123');
  // Seed 4: Manager Bone
  const mgrCred = hashPassword('password123');

  return [
    {
      id: 'usr_edy_sutiady_01',
      username: 'edy.sutiady',
      full_name: 'Edy Sutiady',
      role: 'ADMIN',
      status: 'ACTIVE',
      password_hash: adminCred.hash,
      password_salt: adminCred.salt,
      cabang: 'BONE',
      created_at: now,
      updated_at: now,
      last_login: now,
    },
    {
      id: 'usr_andi_sales_02',
      username: 'andi.sales',
      full_name: 'Andi Saputra',
      role: 'SALESMAN',
      status: 'ACTIVE',
      password_hash: salesCred.hash,
      password_salt: salesCred.salt,
      cabang: 'BONE',
      area: 'BONE TIMUR',
      salesman_id: '101',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_supervisor_bone_03',
      username: 'supervisor_bone',
      full_name: 'Budi Santoso',
      role: 'SUPERVISOR',
      status: 'ACTIVE',
      password_hash: spvCred.hash,
      password_salt: spvCred.salt,
      cabang: 'BONE',
      area: 'BONE TIMUR',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_manager_bone_04',
      username: 'manager.bone',
      full_name: 'Rahmat Hidayat',
      role: 'MANAGER',
      status: 'ACTIVE',
      password_hash: mgrCred.hash,
      password_salt: mgrCred.salt,
      cabang: 'BONE',
      created_at: now,
      updated_at: now,
    },
  ];
}

// In-memory + persisted cache
let usersCache: StoredUser[] = [];
let sessionsCache: StoredSession[] = [];

function loadData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      usersCache = JSON.parse(data);
    } else {
      usersCache = getInitialSeedUsers();
      saveUsers();
    }
  } catch (err) {
    console.error('Error loading users:', err);
    usersCache = getInitialSeedUsers();
  }

  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      sessionsCache = JSON.parse(data);
      // Clean expired sessions
      const now = Date.now();
      sessionsCache = sessionsCache.filter(s => s.expires_at > now);
    } else {
      sessionsCache = [];
      saveSessions();
    }
  } catch (err) {
    console.error('Error loading sessions:', err);
    sessionsCache = [];
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users file:', err);
  }
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions file:', err);
  }
}

loadData();

// Sanitize user (strip password hash and salt)
function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.full_name,
    role: user.role,
    status: user.status,
    cabang: user.cabang,
    area: user.area,
    salesmanId: user.salesman_id,
    avatar_url: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLogin: user.last_login,
  };
}

// Middleware: Authenticate Bearer token
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.' });
  }

  const token = authHeader.substring(7).trim();
  const session = sessionsCache.find(s => s.token === token);

  if (!session || session.expires_at < Date.now()) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.' });
  }

  const user = usersCache.find(u => u.id === session.user_id);
  if (!user) {
    return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Akun Anda sedang ditangguhkan (SUSPENDED). Hubungi Administrator.' });
  }
  if (user.status === 'DISABLED') {
    return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan (DISABLED). Hubungi Administrator.' });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

// Middleware: Require ADMIN role
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as StoredUser;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access Denied. Hanya role ADMIN yang diizinkan mengakses menu ini.' });
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ==========================================
  // AUTHENTICATION API ROUTES
  // ==========================================

  // 1. POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { username, password, rememberMe } = req.body;

    // Requirement: username & password mandatory
    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username atau password salah.' });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username atau password salah.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Find user by username
    const user = usersCache.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      // Requirement #2: "Jika salah: 'Username atau password salah.' Jangan menampilkan error teknis"
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // Verify secure password hash
    const isValid = verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Akun Anda sedang ditangguhkan (SUSPENDED). Hubungi Administrator.' });
    }
    if (user.status === 'DISABLED') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan (DISABLED). Hubungi Administrator.' });
    }
    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Akun Anda masih dalam status menunggu persetujuan (PENDING).' });
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    // 30 days if rememberMe, otherwise 24 hours
    const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = now + duration;

    const session: StoredSession = {
      token,
      user_id: user.id,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      remember_me: !!rememberMe,
    };

    sessionsCache.push(session);
    saveSessions();

    // Update last login
    user.last_login = new Date().toISOString();
    saveUsers();

    return res.json({
      success: true,
      token,
      expiresAt,
      user: sanitizeUser(user),
    });
  });

  // 2. GET /api/auth/session
  app.get('/api/auth/session', authMiddleware, (req, res) => {
    const user = (req as any).user as StoredUser;
    const session = (req as any).session as StoredSession;
    return res.json({
      success: true,
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expires_at,
    });
  });

  // 3. POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      sessionsCache = sessionsCache.filter(s => s.token !== token);
      saveSessions();
    }
    return res.json({ success: true, message: 'Berhasil keluar.' });
  });

  // 4. POST /api/auth/forgot-password
  // Requirement #12: Jangan expose apakah username terdaftar atau tidak
  app.post('/api/auth/forgot-password', (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Silakan masukkan username akun Anda.' });
    }

    // Always return safe security response
    return res.json({
      success: true,
      message: 'Ikuti instruksi pemulihan akses yang dikirim melalui metode recovery akun.',
    });
  });

  // ==========================================
  // USER MANAGEMENT API ROUTES (ADMIN ONLY)
  // ==========================================

  // 5. GET /api/users - List all users (ADMIN only)
  app.get('/api/users', authMiddleware, requireAdmin, (req, res) => {
    const list = usersCache.map(sanitizeUser);
    return res.json({
      success: true,
      users: list,
    });
  });

  // 6. POST /api/users - Create User (ADMIN only)
  // Requirement #4, #7, #8, #9
  app.post('/api/users', authMiddleware, requireAdmin, (req, res) => {
    const { username, name, role, status, password, cabang, area, salesmanId } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Format rule: letters, numbers, underscore, dot
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        error: 'Username hanya boleh mengandung huruf, angka, garis bawah (_), dan titik (.) tanpa spasi.',
      });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter.' });
    }

    // Unique check
    const existing = usersCache.find(u => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      // Requirement #9: "Username sudah digunakan."
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nama Lengkap wajib diisi.' });
    }

    const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'SALESMAN'];
    const assignedRole: UserRole = validRoles.includes(role) ? role : 'SALESMAN';

    const validStatuses: UserStatus[] = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DISABLED'];
    const assignedStatus: UserStatus = validStatuses.includes(status) ? status : 'ACTIVE';

    const initialPassword = password && typeof password === 'string' && password.trim()
      ? password.trim()
      : 'Pma@2026!';

    const cred = hashPassword(initialPassword);
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: `usr_${cleanUsername}_${Date.now()}`,
      username: cleanUsername,
      full_name: name.trim(),
      role: assignedRole,
      status: assignedStatus,
      password_hash: cred.hash,
      password_salt: cred.salt,
      cabang: cabang ? String(cabang).trim() : 'BONE',
      area: area ? String(area).trim() : undefined,
      salesman_id: salesmanId ? String(salesmanId).trim() : undefined,
      created_at: now,
      updated_at: now,
    };

    usersCache.push(newUser);
    saveUsers();

    return res.status(201).json({
      success: true,
      message: 'User berhasil dibuat.',
      user: sanitizeUser(newUser),
    });
  });

  // 7. PATCH /api/users/:id - Update User (ADMIN only)
  app.patch('/api/users/:id', authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { username, name, role, status, password, cabang, area, salesmanId } = req.body;

    const user = usersCache.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // If changing username, check uniqueness
    if (username && typeof username === 'string' && username.trim().toLowerCase() !== user.username.toLowerCase()) {
      const cleanUsername = username.trim().toLowerCase();
      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json({
          error: 'Username hanya boleh mengandung huruf, angka, garis bawah (_), dan titik (.) tanpa spasi.',
        });
      }
      const duplicate = usersCache.find(u => u.id !== id && u.username.toLowerCase() === cleanUsername);
      if (duplicate) {
        return res.status(409).json({ error: 'Username sudah digunakan.' });
      }
      user.username = cleanUsername;
    }

    if (name && typeof name === 'string' && name.trim()) {
      user.full_name = name.trim();
    }

    if (role && ['ADMIN', 'MANAGER', 'SUPERVISOR', 'SALESMAN'].includes(role)) {
      user.role = role as UserRole;
    }

    if (status && ['ACTIVE', 'PENDING', 'SUSPENDED', 'DISABLED'].includes(status)) {
      user.status = status as UserStatus;
      // If status changed to suspended or disabled, terminate active sessions
      if (['SUSPENDED', 'DISABLED'].includes(status)) {
        sessionsCache = sessionsCache.filter(s => s.user_id !== user.id);
        saveSessions();
      }
    }

    if (password && typeof password === 'string' && password.trim()) {
      const cred = hashPassword(password.trim());
      user.password_hash = cred.hash;
      user.password_salt = cred.salt;
      // Force re-login on password change
      sessionsCache = sessionsCache.filter(s => s.user_id !== user.id);
      saveSessions();
    }

    if (cabang !== undefined) user.cabang = cabang ? String(cabang).trim() : undefined;
    if (area !== undefined) user.area = area ? String(area).trim() : undefined;
    if (salesmanId !== undefined) user.salesman_id = salesmanId ? String(salesmanId).trim() : undefined;

    user.updated_at = new Date().toISOString();
    saveUsers();

    return res.json({
      success: true,
      message: 'Data user berhasil diperbarui.',
      user: sanitizeUser(user),
    });
  });

  // 8. DELETE /api/users/:id - Delete User (ADMIN only)
  app.delete('/api/users/:id', authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const currentUser = (req as any).user as StoredUser;

    if (id === currentUser.id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri saat sedang masuk.' });
    }

    const index = usersCache.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // Remove user
    usersCache.splice(index, 1);
    saveUsers();

    // Invalidate sessions
    sessionsCache = sessionsCache.filter(s => s.user_id !== id);
    saveSessions();

    return res.json({
      success: true,
      message: 'User berhasil dihapus.',
    });
  });

  // ==========================================
  // VITE & STATIC FILES
  // ==========================================
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sales Control Center Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
