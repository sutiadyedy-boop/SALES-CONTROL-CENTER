import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data store path - handle both standard Node environment and Vercel serverless environment (/tmp)
const isVercel = !!process.env.VERCEL;
const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_DIR = isVercel ? path.resolve('/tmp', 'data') : BUNDLED_DATA_DIR;
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Copy initial bundled seed files to /tmp in Vercel if needed
if (isVercel && !fs.existsSync(USERS_FILE)) {
  const bundledUsers = path.resolve(BUNDLED_DATA_DIR, 'users.json');
  if (fs.existsSync(bundledUsers)) {
    try {
      fs.copyFileSync(bundledUsers, USERS_FILE);
    } catch (e) {
      console.warn('Could not copy bundled users to /tmp:', e);
    }
  }
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
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, passwordSalt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: passwordSalt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    if (keyBuffer.length !== hashBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch {
    return false;
  }
}

// Default Seed Users
function getInitialSeedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  
  const adminCred = hashPassword('password123');
  const salesCred = hashPassword('password123');
  const spvCred = hashPassword('password123');
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

// Initial load
loadData();

// Sanitize user (strip password hash and salt)
export function sanitizeUser(user: StoredUser) {
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
export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
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
export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as StoredUser;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access Denied. Hanya role ADMIN yang diizinkan mengakses menu ini.' });
  }
  next();
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  // 1. POST /auth/login
  router.post('/auth/login', (req, res) => {
    const { username, password, rememberMe } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username atau password salah.' });
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username atau password salah.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = usersCache.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const isValid = verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Akun Anda sedang ditangguhkan (SUSPENDED). Hubungi Administrator.' });
    }
    if (user.status === 'DISABLED') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan (DISABLED). Hubungi Administrator.' });
    }
    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Akun Anda masih dalam status menunggu persetujuan (PENDING).' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
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

    user.last_login = new Date().toISOString();
    saveUsers();

    return res.json({
      success: true,
      token,
      expiresAt,
      user: sanitizeUser(user),
    });
  });

  // 2. GET /auth/session
  router.get('/auth/session', authMiddleware, (req, res) => {
    const user = (req as any).user as StoredUser;
    const session = (req as any).session as StoredSession;
    return res.json({
      success: true,
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expires_at,
    });
  });

  // 3. POST /auth/logout
  router.post('/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      sessionsCache = sessionsCache.filter(s => s.token !== token);
      saveSessions();
    }
    return res.json({ success: true, message: 'Berhasil keluar.' });
  });

  // 4. POST /auth/forgot-password
  router.post('/auth/forgot-password', (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Silakan masukkan username akun Anda.' });
    }

    return res.json({
      success: true,
      message: 'Ikuti instruksi pemulihan akses yang dikirim melalui metode recovery akun.',
    });
  });

  // 5. GET /users - List all users (ADMIN only)
  router.get('/users', authMiddleware, requireAdmin, (_req, res) => {
    const list = usersCache.map(sanitizeUser);
    return res.json({
      success: true,
      users: list,
    });
  });

  // 6. POST /users - Create User (ADMIN only)
  router.post('/users', authMiddleware, requireAdmin, (req, res) => {
    const { username, name, role, status, password, cabang, area, salesmanId } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        error: 'Username hanya boleh mengandung huruf, angka, garis bawah (_), dan titik (.) tanpa spasi.',
      });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter.' });
    }

    const existing = usersCache.find(u => u.username.toLowerCase() === cleanUsername);
    if (existing) {
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

  // 7. PATCH /users/:id - Update User (ADMIN only)
  router.patch('/users/:id', authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { username, name, role, status, password, cabang, area, salesmanId } = req.body;

    const user = usersCache.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

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
      if (['SUSPENDED', 'DISABLED'].includes(status)) {
        sessionsCache = sessionsCache.filter(s => s.user_id !== user.id);
        saveSessions();
      }
    }

    if (password && typeof password === 'string' && password.trim()) {
      const cred = hashPassword(password.trim());
      user.password_hash = cred.hash;
      user.password_salt = cred.salt;
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

  // 8. DELETE /users/:id - Delete User (ADMIN only)
  router.delete('/users/:id', authMiddleware, requireAdmin, (req, res) => {
    const { id } = req.params;
    const currentUser = (req as any).user as StoredUser;

    if (id === currentUser.id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri saat sedang masuk.' });
    }

    const index = usersCache.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    usersCache.splice(index, 1);
    saveUsers();

    sessionsCache = sessionsCache.filter(s => s.user_id !== id);
    saveSessions();

    return res.json({
      success: true,
      message: 'User berhasil dihapus.',
    });
  });

  return router;
}

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  const apiRouter = createApiRouter();
  // Mount on both /api and root so both standard paths and rewrites work
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}

const defaultApp = createApp();
export default defaultApp;
