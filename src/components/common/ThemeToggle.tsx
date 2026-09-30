import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-sm select-none ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800 hover:border-amber-400/40'
          : 'bg-white hover:bg-slate-50 text-indigo-600 border-slate-200 hover:border-indigo-400/40'
      } ${className}`}
      title={isDark ? 'Beralih ke Tema Terang (Light Mode)' : 'Beralih ke Tema Gelap (Dark Mode)'}
      aria-label={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          {showLabel && <span className="text-slate-200">Terang</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
          {showLabel && <span className="text-slate-800">Gelap</span>}
        </>
      )}
    </button>
  );
}
