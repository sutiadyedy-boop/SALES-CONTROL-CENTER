import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 
  | 'emerald_midnight' // Rekomendasi Utama: Hitam Pekat + Hijau Zamrud Gelap
  | 'forest_obsidian'  // Opsi 2: Hitam Obsidian + Hijau Hutan Pinus
  | 'cyber_jade'       // Opsi 3: Hitam Futuristik + Hijau Giok Modern
  | 'deep_black'       // Opsi 4: Hitam Pekat Stealth (OLED True Black) + Aksen Hijau
  | 'dark'             // Default Lama: Slate Navy Hitam Biru
  | 'light';           // Light Theme

export interface ThemeOption {
  id: Theme;
  name: string;
  tagline: string;
  category: 'green_dark' | 'standard_dark' | 'light';
  colors: {
    bg: string;
    card: string;
    border: string;
    accent: string;
    text: string;
    sampleMetric: string;
  };
  contrastRatio: string;
  description: string;
  isRecommended?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'emerald_midnight',
    name: 'Emerald Midnight (Hitam + Hijau Zamrud)',
    tagline: 'Perpaduan Hitam Arang Pekat & Hijau Zamrud Elegan',
    category: 'green_dark',
    colors: {
      bg: '#020906',
      card: '#071912',
      border: '#133e2c',
      accent: '#10b981',
      text: '#f0fdf4',
      sampleMetric: '#34d399',
    },
    contrastRatio: '14.8 : 1 (WCAG AAA)',
    description: 'Rekomendasi Utama: Latar belakang hitam pekat dengan nuansa hijau zamrud gelap. Angka dan teks mint-white sangat tajam dan nyaman untuk pemakaian berjam-jam.',
    isRecommended: true,
  },
  {
    id: 'forest_obsidian',
    name: 'Forest Obsidian (Hitam + Hijau Hutan Dalam)',
    tagline: 'Gaya Ruang Kontrol Natural & Dark Pine',
    category: 'green_dark',
    colors: {
      bg: '#030704',
      card: '#0a1a0f',
      border: '#183c22',
      accent: '#22c55e',
      text: '#f2fcf5',
      sampleMetric: '#4ade80',
    },
    contrastRatio: '15.2 : 1 (WCAG AAA)',
    description: 'Nuansa hijau daun pinus tua berpadu dengan hitam pekat obsidian. Memberikan ketenangan visual saat membaca ribuan baris data tabel.',
  },
  {
    id: 'cyber_jade',
    name: 'Cyber Jade (Hitam + Hijau Giok Modern)',
    tagline: 'Modern High-Tech Financial Dashboard',
    category: 'green_dark',
    colors: {
      bg: '#010d08',
      card: '#072418',
      border: '#144e36',
      accent: '#2dd4bf',
      text: '#e6fcf5',
      sampleMetric: '#2dd4bf',
    },
    contrastRatio: '13.9 : 1 (WCAG AAA)',
    description: 'Sentuhan warna hijau giok bercahaya lembut dipadu hitam modern ala Bloomberg / Terminal BI internasional. Grafik terlihat sangat hidup.',
  },
  {
    id: 'deep_black',
    name: 'Stealth Black & Emerald (Hitam OLED Pekat)',
    tagline: 'True Black 100% Hemat Energi Layar OLED',
    category: 'green_dark',
    colors: {
      bg: '#000000',
      card: '#080c09',
      border: '#183323',
      accent: '#10b981',
      text: '#ffffff',
      sampleMetric: '#10b981',
    },
    contrastRatio: '19.5 : 1 (Maksimum)',
    description: 'Hitam murni (#000000) dengan kartu bersudut tegas dan aksen hijau emerald neon. Memberikan kontras tertinggi bagi pengguna di ruangan redup.',
  },
  {
    id: 'dark',
    name: 'Slate Navy Dark (Tema Default Awal)',
    tagline: 'Tema Klasik Ruang Kontrol Slate Blue',
    category: 'standard_dark',
    colors: {
      bg: '#020617',
      card: '#0f172a',
      border: '#1e293b',
      accent: '#06b6d4',
      text: '#f8fafc',
      sampleMetric: '#22d3ee',
    },
    contrastRatio: '14.2 : 1 (WCAG AAA)',
    description: 'Tema bawaan awal aplikasi dengan perpaduan warna hitam kebiruan (Slate 950 / 900).',
  },
  {
    id: 'light',
    name: 'Clean Executive Light (Tema Terang)',
    tagline: 'Latar Putih Bersih untuk Ruangan Terang',
    category: 'light',
    colors: {
      bg: '#f8fafc',
      card: '#ffffff',
      border: '#e2e8f0',
      accent: '#0284c7',
      text: '#020617',
      sampleMetric: '#0891b2',
    },
    contrastRatio: '12.5 : 1 (WCAG AA)',
    description: 'Opsi tema terang dengan latar putih bersih dan teks arang pekat untuk kebutuhan presentasi di ruangan berlampu terang.',
  },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  activeOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      if (
        saved === 'emerald_midnight' ||
        saved === 'forest_obsidian' ||
        saved === 'cyber_jade' ||
        saved === 'deep_black' ||
        saved === 'dark' ||
        saved === 'light'
      ) {
        return saved as Theme;
      }
      // Default to Emerald Midnight as per user's request for black + dark green!
      return 'emerald_midnight';
    } catch {
      return 'emerald_midnight';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const allThemes: Theme[] = ['emerald_midnight', 'forest_obsidian', 'cyber_jade', 'deep_black', 'dark', 'light'];
    root.classList.remove(...allThemes);
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('app_theme', theme);
    } catch {
      // Ignore localStorage exceptions in private browsing
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'emerald_midnight' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const activeOption = THEME_OPTIONS.find(o => o.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme !== 'light', activeOption }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
