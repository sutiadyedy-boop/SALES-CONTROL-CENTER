import { UserProfile, CreateUserData, UpdateUserData } from '../types/database';

const TOKEN_KEY = 'scc_auth_token_v1';
const REMEMBER_KEY = 'scc_auth_remember_v1';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, rememberMe: boolean) {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, 'true');
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function loginWithCredentials(
  username: string,
  password: string,
  rememberMe: boolean = false
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Username atau password salah.',
      };
    }

    // Store token
    setStoredToken(data.token, rememberMe);

    return {
      success: true,
      user: data.user,
    };
  } catch (err: any) {
    console.error('Login network error:', err);
    return {
      success: false,
      error: 'Username atau password salah.',
    };
  }
}

export async function fetchCurrentSession(): Promise<{
  isAuthenticated: boolean;
  user: UserProfile | null;
}> {
  const token = getStoredToken();
  if (!token) {
    return { isAuthenticated: false, user: null };
  }

  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      clearStoredToken();
      return { isAuthenticated: false, user: null };
    }

    const data = await res.json();
    if (data.success && data.user) {
      return { isAuthenticated: true, user: data.user };
    }

    clearStoredToken();
    return { isAuthenticated: false, user: null };
  } catch (err) {
    console.error('Session check error:', err);
    return { isAuthenticated: false, user: null };
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  try {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (e) {
    // Ignore network error on logout
  } finally {
    clearStoredToken();
  }
}

export async function requestPasswordRecovery(username: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    return {
      success: true,
      message: data.message || 'Ikuti instruksi pemulihan akses yang dikirim melalui metode recovery akun.',
    };
  } catch (err) {
    return {
      success: true,
      message: 'Ikuti instruksi pemulihan akses yang dikirim melalui metode recovery akun.',
    };
  }
}

// ==========================================
// ADMIN USER MANAGEMENT API CLIENT
// ==========================================

export async function getAdminUsersList(): Promise<{ success: boolean; users?: UserProfile[]; error?: string }> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Gagal memuat daftar pengguna' };
    }
    return { success: true, users: data.users };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal terhubung ke server' };
  }
}

export async function createAdminUser(payload: CreateUserData): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Gagal membuat user' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal terhubung ke server' };
  }
}

export async function updateAdminUser(
  id: string,
  payload: UpdateUserData
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Gagal memperbarui user' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal terhubung ke server' };
  }
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Gagal menghapus user' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal terhubung ke server' };
  }
}
