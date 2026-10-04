import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Flame, 
  TrendingUp, 
  Compass, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare,
  ChevronDown,
  Info
} from 'lucide-react';
import { CalculationResult } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatRupiah, formatPercent } from '../../services/smartInsightEngine';
import { WhatsAppBriefingModal } from './WhatsAppBriefingModal';
import { soundManager } from '../../services/soundManager';

interface ExecutiveBriefingBarProps {
  calculation: CalculationResult;
  settings: AppSettings;
}

export function ExecutiveBriefingBar({
  calculation,
  settings,
}: ExecutiveBriefingBarProps) {
  const currLabel = settings.currentMonthLabel || 'September 2026';
  // Shared storage key identical to Target vs Realisasi
  const storageKey = `target_work_days_${currLabel.replace(/\s+/g, '_')}`;

  // Working days states initialized from shared storageKey
  const [totalHariKerja, setTotalHariKerja] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.blnIni === 'number' && parsed.blnIni > 0) {
          return parsed.blnIni;
        }
      }
    } catch {}
    return 26;
  });

  const [hariKerjaBerjalan, setHariKerjaBerjalan] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.berjalan === 'number' && parsed.berjalan >= 0) {
          return parsed.berjalan;
        }
      }
    } catch {}
    return 18;
  });

  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  // Bi-directional reactive synchronization with Target vs Realisasi
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.blnIni === 'number' && parsed.blnIni > 0) {
            setTotalHariKerja(parsed.blnIni);
          }
          if (typeof parsed.berjalan === 'number' && parsed.berjalan >= 0) {
            setHariKerjaBerjalan(parsed.berjalan);
          }
        }
      } catch {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('target_work_days_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('target_work_days_updated', handleSync);
    };
  }, [storageKey]);

  // Synchronized setter function: updates state and syncs to Target vs Realisasi
  const updateWorkingDays = (newTotal: number, newElapsed: number) => {
    const safeTotal = Math.max(1, newTotal);
    const safeElapsed = Math.min(safeTotal, Math.max(0, newElapsed));
    setTotalHariKerja(safeTotal);
    setHariKerjaBerjalan(safeElapsed);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        blnIni: safeTotal,
        berjalan: safeElapsed,
      }));
      window.dispatchEvent(new Event('target_work_days_updated'));
    } catch {}
  };

  const { kpis } = calculation;
  const sisaHariKerja = Math.max(1, totalHariKerja - hariKerjaBerjalan);

  // Performance-protected memoized math (0ms compute)
  const metrics = useMemo(() => {
    const target = kpis.totalTarget;
    const actual = kpis.totalActualCurrent;
    const gapActual = kpis.gapValue;
    
    // Actual current Daily Run-rate (ADS) = Actual / Elapsed Days
    const adsActual = hariKerjaBerjalan > 0 ? Math.round(actual / hariKerjaBerjalan) : 0;

    // Status evaluation based on actual achievement
    let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    let statusLabel = 'TARGET TERCAPAI';
    if (kpis.achievementRate === null) {
      statusColor = 'text-slate-400 bg-slate-800 border-slate-700';
      statusLabel = 'NO TARGET';
    } else if (kpis.achievementRate < 70) {
      statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      statusLabel = 'DEFISIT AKTUAL';
    } else if (kpis.achievementRate < 100) {
      statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      statusLabel = 'PERLU AKSELERASI';
    }

    return {
      gapActual,
      adsActual,
      statusColor,
      statusLabel,
    };
  }, [kpis.totalTarget, kpis.totalActualCurrent, kpis.gapValue, kpis.achievementRate, hariKerjaBerjalan]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header bar of Briefing */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Navigasi Ritme Kerja & Penjualan Aktual</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${metrics.statusColor}`}>
                {metrics.statusLabel}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Evaluasi ritme harian sales, rata-rata penjualan harian aktual (ADS), dan posisi gap saat ini
            </p>
          </div>
        </div>

        {/* Quick WhatsApp Action Button */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setIsBriefingModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>Format WhatsApp Briefing</span>
        </button>
      </div>

      {/* Grid: 4 Core Navigator Cards (Actual Performance Focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Hari Kerja Control */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>PENGATURAN HK</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Sisa {sisaHariKerja} Hari
            </span>
          </div>

          {/* Stepper Control: Hari Berjalan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Hari Berjalan:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    updateWorkingDays(totalHariKerja, Math.max(1, hariKerjaBerjalan - 1));
                  }}
                  title="Kurangi 1 hari"
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-700 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={totalHariKerja}
                  value={hariKerjaBerjalan}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val)) {
                      updateWorkingDays(totalHariKerja, Math.min(totalHariKerja, Math.max(1, val)));
                    }
                  }}
                  className="w-10 text-center py-0.5 bg-slate-900 border border-cyan-500/50 rounded text-cyan-300 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    updateWorkingDays(totalHariKerja, Math.min(totalHariKerja, hariKerjaBerjalan + 1));
                  }}
                  title="Tambah 1 hari"
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs border border-slate-700 transition-colors"
                >
                  +
                </button>
                <span className="text-slate-500 text-[11px] font-mono">HK</span>
              </div>
            </div>

            {/* Total HK Selector */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 font-medium">Total Sebulan:</span>
              <div className="flex items-center gap-1">
                {[24, 25, 26].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      const newElapsed = hariKerjaBerjalan > days ? days : hariKerjaBerjalan;
                      updateWorkingDays(days, newElapsed);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                      totalHariKerja === days
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {days}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress bar of passed working days */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
              <div 
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (hariKerjaBerjalan / totalHariKerja) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Actual Realisasi & Achievement */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between border-l-2 border-l-cyan-500">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>REALISASI AKTUAL</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {kpis.achievementRate !== null ? `${kpis.achievementRate.toFixed(1)}% Ach` : 'N/A'}
            </span>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-cyan-300">
              {formatRupiah(kpis.totalActualCurrent)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Target Cabang: <span className="font-mono text-slate-300">{formatRupiah(kpis.totalTarget)}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Actual Daily Run-Rate (ADS) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>ADS AKTUAL (RUN-RATE)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Realisasi ÷ HK
            </span>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
              {formatRupiah(metrics.adsActual)}
              <span className="text-[10px] text-slate-400 font-normal font-sans ml-1">/ hari</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Rata-rata penjualan harian dari {hariKerjaBerjalan} hari kerja
            </p>
          </div>
        </div>

        {/* Card 4: Actual Financial Gap */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between border-l-2 border-l-purple-500">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>GAP SAAT INI</span>
            </span>
            <span className={`text-[10px] font-mono font-bold ${kpis.gapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.gapValue >= 0 ? 'SURPLUS' : 'DEFISIT'}
            </span>
          </div>

          <div>
            <div className={`text-base sm:text-lg font-bold font-mono ${kpis.gapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.gapValue >= 0 ? '+' : ''}{formatRupiah(kpis.gapValue)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Realisasi dikurangi Target kuota cabang
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal Mount */}
      <WhatsAppBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        calculation={calculation}
        settings={settings}
        totalHariKerja={totalHariKerja}
        hariKerjaBerjalan={hariKerjaBerjalan}
      />
    </div>
  );
}
