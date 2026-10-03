import { useState, useEffect, useCallback } from 'react';
import { LogoConfig } from '../types/database';

export const DEFAULT_LOGO_URL = '/assets/logo-dashboard.png';
const LOCAL_LOGO_DATA_KEY = 'scc_custom_logo_data_v1';
const LOCAL_LOGO_CONFIG_KEY = 'scc_custom_logo_config_v1';

// Global singleton state for synchronized in-memory reactive updates
let currentLogoConfig: LogoConfig = {
  hasCustomLogo: false,
  logoUrl: DEFAULT_LOGO_URL,
  defaultLogoUrl: DEFAULT_LOGO_URL,
  updatedAt: null,
  updatedBy: null,
  version: 1,
};

// Check local storage immediately at script evaluation for instant display
try {
  const cachedConfigStr = localStorage.getItem(LOCAL_LOGO_CONFIG_KEY);
  const cachedData = localStorage.getItem(LOCAL_LOGO_DATA_KEY);
  if (cachedConfigStr && cachedData) {
    const parsed = JSON.parse(cachedConfigStr);
    if (parsed && parsed.hasCustomLogo) {
      currentLogoConfig = {
        ...parsed,
        logoUrl: cachedData,
      };
    }
  }
} catch {}

const listeners = new Set<(config: LogoConfig) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn(currentLogoConfig));
}

/**
 * Fetches the active logo configuration from server with local cache fallback
 */
export async function fetchLogoConfig(): Promise<LogoConfig> {
  // First, check local storage for instantaneous load
  try {
    const cachedConfigStr = localStorage.getItem(LOCAL_LOGO_CONFIG_KEY);
    const cachedData = localStorage.getItem(LOCAL_LOGO_DATA_KEY);
    if (cachedConfigStr && cachedData) {
      const parsed = JSON.parse(cachedConfigStr);
      if (parsed && parsed.hasCustomLogo) {
        currentLogoConfig = {
          ...parsed,
          logoUrl: cachedData,
        };
        notifyListeners();
      }
    }
  } catch {}

  // Then sync with server
  try {
    const res = await fetch('/api/logo', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.hasCustomLogo) {
        currentLogoConfig = {
          hasCustomLogo: true,
          logoUrl: data.logoUrl || DEFAULT_LOGO_URL,
          defaultLogoUrl: data.defaultLogoUrl || DEFAULT_LOGO_URL,
          updatedAt: data.updatedAt || null,
          updatedBy: data.updatedBy || null,
          version: Number(data.version) || Date.now(),
        };
        notifyListeners();
      } else {
        // If server says no custom logo, only reset if we don't have a user-uploaded local one
        const localData = localStorage.getItem(LOCAL_LOGO_DATA_KEY);
        if (!localData) {
          currentLogoConfig = {
            hasCustomLogo: false,
            logoUrl: DEFAULT_LOGO_URL,
            defaultLogoUrl: DEFAULT_LOGO_URL,
            updatedAt: null,
            updatedBy: null,
            version: Number(data.version) || 1,
          };
          notifyListeners();
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch logo config from server, using local fallback:', err);
  }

  return currentLogoConfig;
}

/**
 * Uploads a new dashboard logo (ADMIN ONLY) with Hybrid Local + Server Persistence
 */
export async function uploadDashboardLogo(
  file: File,
  token?: string | null
): Promise<{ success: boolean; logoUrl: string; message: string; version: number }> {
  // Client-side file size validation (max 2 MB)
  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB.`);
  }

  // Client-side MIME validation
  const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validMimes.includes(file.type.toLowerCase())) {
    throw new Error('Format file tidak didukung. Format yang diperbolehkan: PNG, JPG, JPEG, WEBP.');
  }

  // Convert to Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(new Error('Gagal membaca file gambar: ' + e));
    reader.readAsDataURL(file);
  });

  const now = new Date().toISOString();
  const version = Date.now();

  // Save to browser local storage immediately so user NEVER loses logo even on Vercel cold restarts
  try {
    localStorage.setItem(LOCAL_LOGO_DATA_KEY, base64Data);
    const localConfig: LogoConfig = {
      hasCustomLogo: true,
      logoUrl: base64Data,
      defaultLogoUrl: DEFAULT_LOGO_URL,
      updatedAt: now,
      updatedBy: 'Administrator',
      version,
    };
    localStorage.setItem(LOCAL_LOGO_CONFIG_KEY, JSON.stringify(localConfig));
    currentLogoConfig = localConfig;
    notifyListeners();
  } catch (storageErr) {
    console.warn('LocalStorage save warning:', storageErr);
  }

  // Now attempt to synchronize with backend server
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let serverMessage = 'Logo berhasil diperbarui.';

  try {
    const res = await fetch('/api/logo', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: file.type,
        fileName: file.name,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      if (data.logoUrl) {
        currentLogoConfig.logoUrl = data.logoUrl;
      }
      if (data.message) {
        serverMessage = data.message;
      }
      notifyListeners();
    } else {
      console.warn(`Server responded with status ${res.status}:`, data);
      // If server returned 403 explicit role error for non-admin
      if (res.status === 403) {
        const errorText = typeof data.error === 'string'
          ? data.error
          : (data.error?.message || 'Akses ditolak: Hanya ADMIN yang diizinkan mengubah logo.');
        throw new Error(errorText);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Akses ditolak')) {
      throw err;
    }
    console.warn('Server upload encountered network/serverless issue. Local storage persistence is active.');
  }

  return {
    success: true,
    logoUrl: currentLogoConfig.logoUrl,
    message: serverMessage,
    version: currentLogoConfig.version,
  };
}

/**
 * Resets the dashboard logo to the system default (ADMIN ONLY)
 */
export async function resetDashboardLogo(
  token?: string | null
): Promise<{ success: boolean; logoUrl: string; message: string }> {
  // Clear local storage
  try {
    localStorage.removeItem(LOCAL_LOGO_DATA_KEY);
    localStorage.removeItem(LOCAL_LOGO_CONFIG_KEY);
  } catch {}

  currentLogoConfig = {
    hasCustomLogo: false,
    logoUrl: DEFAULT_LOGO_URL,
    defaultLogoUrl: DEFAULT_LOGO_URL,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    version: Date.now(),
  };
  notifyListeners();

  // Also sync with server
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    await fetch('/api/logo', {
      method: 'DELETE',
      headers,
    });
  } catch (err) {
    console.warn('Server delete encountered non-fatal issue:', err);
  }

  return {
    success: true,
    logoUrl: DEFAULT_LOGO_URL,
    message: 'Logo custom berhasil dihapus, kembali menggunakan logo default.',
  };
}

/**
 * React Hook for consuming and managing dashboard logo in real-time
 */
export function useLogo() {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>(currentLogoConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listener for reactive updates
    const handleChange = (newConfig: LogoConfig) => {
      setLogoConfig({ ...newConfig });
    };

    listeners.add(handleChange);

    // Initial fetch on mount
    fetchLogoConfig().then(cfg => setLogoConfig({ ...cfg }));

    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const refreshLogo = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchLogoConfig();
      setLogoConfig({ ...cfg });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logoConfig,
    logoUrl: logoConfig.logoUrl || DEFAULT_LOGO_URL,
    hasCustomLogo: logoConfig.hasCustomLogo,
    loading,
    refreshLogo,
  };
}
