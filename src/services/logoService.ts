import { useState, useEffect, useCallback } from 'react';
import { LogoConfig } from '../types/database';

export const DEFAULT_LOGO_URL = '/assets/logo-dashboard.png';

// Global singleton state for synchronized in-memory reactive updates
let currentLogoConfig: LogoConfig = {
  hasCustomLogo: false,
  logoUrl: DEFAULT_LOGO_URL,
  defaultLogoUrl: DEFAULT_LOGO_URL,
  updatedAt: null,
  updatedBy: null,
  version: 1,
};

const listeners = new Set<(config: LogoConfig) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn(currentLogoConfig));
}

/**
 * Fetches the active logo configuration from server
 */
export async function fetchLogoConfig(): Promise<LogoConfig> {
  try {
    const res = await fetch('/api/logo', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (res.ok) {
      const data = await res.json();
      currentLogoConfig = {
        hasCustomLogo: Boolean(data.hasCustomLogo),
        logoUrl: data.logoUrl || DEFAULT_LOGO_URL,
        defaultLogoUrl: data.defaultLogoUrl || DEFAULT_LOGO_URL,
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
        version: Number(data.version) || Date.now(),
      };
      notifyListeners();
      return currentLogoConfig;
    }
  } catch (err) {
    console.warn('Failed to fetch logo config from server, using fallback:', err);
  }

  return currentLogoConfig;
}

/**
 * Uploads a new dashboard logo (ADMIN ONLY)
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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

  if (!res.ok) {
    throw new Error(data.error || `Server merespon dengan status ${res.status}: Gagal mengunggah logo.`);
  }

  // Update in-memory singleton
  currentLogoConfig = {
    hasCustomLogo: true,
    logoUrl: data.logoUrl || `/api/logo/image?v=${data.version || Date.now()}`,
    defaultLogoUrl: DEFAULT_LOGO_URL,
    updatedAt: data.updatedAt || new Date().toISOString(),
    updatedBy: data.updatedBy || null,
    version: data.version || Date.now(),
  };

  notifyListeners();

  return {
    success: true,
    logoUrl: currentLogoConfig.logoUrl,
    message: data.message || 'Logo berhasil diperbarui.',
    version: currentLogoConfig.version,
  };
}

/**
 * Resets the dashboard logo to the system default (ADMIN ONLY)
 */
export async function resetDashboardLogo(
  token?: string | null
): Promise<{ success: boolean; logoUrl: string; message: string }> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/logo', {
    method: 'DELETE',
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Server merespon dengan status ${res.status}: Gagal menghapus logo custom.`);
  }

  currentLogoConfig = {
    hasCustomLogo: false,
    logoUrl: DEFAULT_LOGO_URL,
    defaultLogoUrl: DEFAULT_LOGO_URL,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
    version: Date.now(),
  };

  notifyListeners();

  return {
    success: true,
    logoUrl: DEFAULT_LOGO_URL,
    message: data.message || 'Logo custom berhasil dihapus, kembali menggunakan logo default.',
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
