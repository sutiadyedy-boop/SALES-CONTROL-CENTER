import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../../services/soundManager';

interface SoundToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function SoundToggle({ className = '', showLabel = false }: SoundToggleProps) {
  const [enabled, setEnabled] = useState(() => soundManager.isSoundEnabled());

  useEffect(() => {
    return soundManager.subscribe((newEnabled) => {
      setEnabled(newEnabled);
    });
  }, []);

  const handleToggle = () => {
    soundManager.toggleSound();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-sm select-none ${
        enabled
          ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-800 hover:border-cyan-400/40'
          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-500 border-slate-800/80 hover:border-slate-700'
      } ${className}`}
      title={enabled ? 'Sound Effect: Aktif (Klik untuk Mute)' : 'Sound Effect: Nonaktif (Klik untuk Aktifkan)'}
      aria-label={enabled ? 'Matikan efek suara UI' : 'Nyalakan efek suara UI'}
    >
      {enabled ? (
        <>
          <Volume2 className="w-4 h-4 text-cyan-400" />
          {showLabel && <span className="text-slate-200">Suara ON</span>}
        </>
      ) : (
        <>
          <VolumeX className="w-4 h-4 text-slate-500" />
          {showLabel && <span className="text-slate-400">Suara OFF</span>}
        </>
      )}
    </button>
  );
}
