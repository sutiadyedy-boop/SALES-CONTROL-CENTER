import React from 'react';
import { 
  Radio, 
  Loader2, 
  Zap, 
  Activity, 
  Cpu, 
  Database,
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';

interface DashboardSkeletonProps {
  message?: string;
  submessage?: string;
  periodLabel?: string;
}

export function DashboardSkeleton({
  message = 'MENGANALISIS & MENGKALKULASI DATA BESAR...',
  submessage = 'Memproses rekonsiliasi data transaksi, target salesman, dan master outlet...',
  periodLabel = 'PERIODE AKTUAL',
}: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. CONTROL TOWER TOP BANNER SKELETON */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        {/* Shimmer sweep effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent pointer-events-none" />

        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <div className="h-6 w-64 bg-slate-800/90 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-80 max-w-full bg-slate-800/60 rounded animate-pulse" />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-28 bg-slate-800/80 rounded-lg animate-pulse" />
          <div className="h-8 w-32 bg-slate-900 rounded-lg border border-slate-800 px-3 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono text-cyan-300 font-semibold">{periodLabel}</span>
          </div>
          <div className="h-8 w-28 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center">
            <span className="text-[11px] font-mono text-amber-300 font-semibold flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>SYNCING</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. TELEMETRY STATUS HUD BANNER (TACTICAL PROCESSING INDICATOR) */}
      <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)] shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold font-mono text-cyan-300 tracking-wider uppercase">
                {message}
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 animate-pulse">
                REAL-TIME TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
              {submessage}
            </p>
          </div>
        </div>

        {/* Progress simulation pulses */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-bold">Calculation Engine: Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-bold">In-Memory Pipeline</span>
          </div>
        </div>
      </div>

      {/* 3. SPEEDOMETERS TELEMETRY CLUSTER SKELETON */}
      <div className="bg-slate-950/90 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.08)] relative overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div className="h-4 w-72 bg-slate-800/90 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 bg-slate-800/60 rounded" />
            <div className="h-3 w-24 bg-slate-800/60 rounded" />
            <div className="h-3 w-20 bg-slate-800/60 rounded" />
          </div>
        </div>

        {/* 3 Speedometer Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { label: '01 · KUOTA BENCHMARK', title: 'TARGET PENJUALAN', color: 'amber' },
            { label: '02 · AKTUAL TRANSAKSI', title: 'REALISASI PENJUALAN', color: 'cyan' },
            { label: '03 · DEVIASI GAP', title: 'GAP DEFISIT / SURPLUS', color: 'emerald' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block">
                    {item.label}
                  </span>
                  <span className="text-sm font-extrabold tracking-wide text-slate-200">
                    {item.title}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 animate-pulse" />
              </div>

              {/* Simulated Gauge Arc Pulse */}
              <div className="my-4 flex flex-col items-center justify-center">
                <div className="relative w-44 h-24 flex items-center justify-center overflow-hidden">
                  <div className="absolute top-0 w-40 h-40 rounded-full border-[12px] border-slate-800/80 border-t-cyan-500/30 border-r-cyan-500/20 animate-spin [animation-duration:3s]" />
                  <div className="absolute bottom-2 text-center">
                    <div className="h-5 w-16 bg-slate-800 rounded animate-pulse mx-auto" />
                    <div className="h-2 w-12 bg-slate-800/60 rounded animate-pulse mx-auto mt-1" />
                  </div>
                </div>

                {/* Digital Readout Skeleton Box */}
                <div className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-center mt-2 space-y-1.5">
                  <div className="h-6 w-36 bg-slate-800/90 rounded animate-pulse mx-auto" />
                  <div className="h-2.5 w-24 bg-slate-800/60 rounded animate-pulse mx-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 6 Metric Telemetry Pods Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="h-2.5 w-16 bg-slate-800/70 rounded animate-pulse" />
              <div className="h-5 w-24 bg-slate-700/80 rounded animate-pulse" />
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-700/60 w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. EXECUTIVE BRIEFING BAR SKELETON */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-3 w-28 bg-slate-800/60 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-16 bg-slate-950/60 border border-slate-800/60 rounded-lg animate-pulse" />
          <div className="h-16 bg-slate-950/60 border border-slate-800/60 rounded-lg animate-pulse" />
          <div className="h-16 bg-slate-950/60 border border-slate-800/60 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* 5. BI CHARTS SECTION SKELETON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((idx) => (
          <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <div className="h-4 w-44 bg-slate-800 rounded animate-pulse" />
              </div>
              <div className="h-3 w-24 bg-slate-800/60 rounded" />
            </div>

            {/* Simulated Chart Bars */}
            <div className="h-56 bg-slate-950/80 rounded-xl p-4 flex items-end justify-between gap-3 border border-slate-800/60">
              {[40, 65, 30, 85, 55, 90, 45, 75].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full rounded-t bg-slate-800 animate-pulse transition-all"
                    style={{ height: `${h}%` }}
                  />
                  <div className="h-2 w-6 bg-slate-800/80 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 6. INTELLIGENCE TABLES SECTION SKELETON */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Table Tabs Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <div className="h-4 w-52 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 bg-slate-800 rounded-md animate-pulse" />
            <div className="h-7 w-24 bg-slate-800 rounded-md animate-pulse" />
            <div className="h-7 w-24 bg-slate-800 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Search & Export Mock */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-64 bg-slate-950 border border-slate-800 rounded-lg animate-pulse" />
          <div className="h-8 w-28 bg-slate-800 rounded-lg animate-pulse" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="h-3 w-16 bg-slate-800 rounded" />
            <div className="h-3 w-32 bg-slate-800 rounded" />
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-800 rounded" />
          </div>
          <div className="divide-y divide-slate-850">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 w-1/4">
                  <div className="w-6 h-6 rounded bg-slate-800 shrink-0 animate-pulse" />
                  <div className="space-y-1 w-full">
                    <div className="h-3.5 w-28 bg-slate-800 rounded animate-pulse" />
                    <div className="h-2 w-16 bg-slate-850 rounded" />
                  </div>
                </div>
                <div className="h-3.5 w-24 bg-slate-800/80 rounded animate-pulse" />
                <div className="h-3.5 w-24 bg-slate-800/80 rounded animate-pulse" />
                <div className="h-4 w-14 bg-slate-800 rounded-md animate-pulse" />
                <div className="h-3.5 w-16 bg-slate-800/70 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
