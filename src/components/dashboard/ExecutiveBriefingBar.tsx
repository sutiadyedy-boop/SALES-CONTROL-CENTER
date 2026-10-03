import React, { useState, useMemo } from 'react';
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
  // Working days states (lightweight, default 26 days month, 18 days passed)
  const [totalHariKerja, setTotalHariKerja] = useState<number>(26);
  const [hariKerjaBerjalan, setHariKerjaBerjalan] = useState<number>(18);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  const { kpis } = calculation;
  const sisaHariKerja = Math.max(1, totalHariKerja - hariKerjaBerjalan);

  // Performance-protected memoized math (0ms compute)
  const metrics = useMemo(() => {
    const target = kpis.totalTarget;
    const actual = kpis.totalActualCurrent;
    const gapKekurangan = Math.max(0, target - actual);
    
    // Required Daily Run-rate to achieve 100% target
    const targetHarianWajib = Math.round(gapKekurangan / sisaHariKerja);
    
    // Actual current Daily Run-rate (ADS)
    const adsActual = hariKerjaBerjalan > 0 ? Math.round(actual / hariKerjaBerjalan) : 0;
    
    // Projected closing value at month-end based on current ADS
    const projectedClosing = Math.round(actual + (adsActual * sisaHariKerja));
    const projectedAchRate = target > 0 ? (projectedClosing / target) * 100 : 0;
    const projectedGap = projectedClosing - target;

    // Status evaluation
    let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    let statusLabel = 'ON TRACK';
    if (projectedAchRate < 90) {
      statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      statusLabel = 'DEFISIT BERISIKO';
    } else if (projectedAchRate < 100) {
      statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      statusLabel = 'PERLU AKSELERASI';
    }

    return {
      gapKekurangan,
      targetHarianWajib,
      adsActual,
      projectedClosing,
      projectedAchRate,
      projectedGap,
      statusColor,
      statusLabel,
    };
  }, [kpis.totalTarget, kpis.totalActualCurrent, totalHariKerja, hariKerjaBerjalan, sisaHariKerja]);

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
              <span>Navigasi Run-Rate & Proyeksi Akhir Bulan</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${metrics.statusColor}`}>
                {metrics.statusLabel}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Evaluasi ritme harian sales, target setoran wajib per hari, dan estimasi angka penutupan
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

      {/* Grid: 4 Core Navigator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Hari Kerja Control */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>HARI KERJA</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              Sisa {sisaHariKerja} Hari
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Hari Berjalan:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalHariKerja}
                  value={hariKerjaBerjalan}
                  onChange={(e) => setHariKerjaBerjalan(Math.min(totalHariKerja, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-12 text-center py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-cyan-500"
                />
                <span className="text-slate-500 text-[11px]">/ {totalHariKerja} HK</span>
              </div>
            </div>

            {/* Progress bar of passed working days */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (hariKerjaBerjalan / totalHariKerja) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Required Daily Target (Setoran Wajib Harian) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>TARGET WAJIB / HARI</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
              Target Sisa
            </span>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
              {formatRupiah(metrics.targetHarianWajib)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Setoran minimal harian tim untuk menutup gap <span className="font-mono text-slate-300">{formatRupiah(metrics.gapKekurangan)}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Actual Daily Run-Rate (ADS) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>ADS AKTUAL (RUN-RATE)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Realisasi ÷ HK
            </span>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-cyan-300">
              {formatRupiah(metrics.adsActual)}
              <span className="text-[10px] text-slate-400 font-normal font-sans ml-1">/ hari</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Kecepatan jalan rata-rata dari {hariKerjaBerjalan} hari kerja pertama
            </p>
          </div>
        </div>

        {/* Card 4: Month-End Closing Estimation */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between border-l-2 border-l-purple-500">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>ESTIMASI AKHIR BULAN</span>
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-bold">
              {metrics.projectedAchRate.toFixed(1)}% Ach
            </span>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-100">
              {formatRupiah(metrics.projectedClosing)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Proyeksi Gap: <span className={metrics.projectedGap >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {metrics.projectedGap >= 0 ? '+' : ''}{formatRupiah(metrics.projectedGap)}
              </span>
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
