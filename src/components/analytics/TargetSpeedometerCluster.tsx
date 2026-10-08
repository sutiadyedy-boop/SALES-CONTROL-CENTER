import React, { useState } from 'react';
import { Target, Award, TrendingUp, TrendingDown, Gauge, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '../../services/smartInsightEngine';

interface TargetSpeedometerClusterProps {
  totalTarget: number;
  totalActualCurrent: number;
  achievementRate: number | null;
  gapValue: number;
  salesValueField: string;
  hariKerjaBlnIni: number;
  hariKerjaBerjalan: number;
  sisaHariKerja: number;
  timeProgressPct: number;
  runRateHarianBerjalan: number;
  proyeksiAkhirBulan: number;
  proyeksiAchRate: number | null;
  totalSalesmen: number;
  achievedSalesmenCount: number;
}

// Helper: Convert angle in degrees (-120 to +120, where 0 is 12 o'clock top) to SVG (x, y)
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Helper: SVG Arc path from startAngle to endAngle (in degrees, clockwise)
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const clampedEnd = Math.max(startAngle + 0.1, Math.min(endAngle, startAngle + 359.9));
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, clampedEnd);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

// Map percentage (0 to maxScale) to angle (-120 to +120 degrees)
function pctToAngle(pct: number, maxScale: number = 120) {
  const clamped = Math.max(0, Math.min(maxScale, pct));
  return -120 + (clamped / maxScale) * 240;
}

export function TargetSpeedometerCluster({
  totalTarget,
  totalActualCurrent,
  achievementRate,
  gapValue,
  salesValueField,
  hariKerjaBlnIni,
  hariKerjaBerjalan,
  sisaHariKerja,
  timeProgressPct,
  runRateHarianBerjalan,
  proyeksiAkhirBulan,
  proyeksiAchRate,
  totalSalesmen,
  achievedSalesmenCount,
}: TargetSpeedometerClusterProps) {
  // Interactive toggle to preview Current Actual vs End-of-Month Projection on the needles (without changing data)
  const [needleMode, setNeedleMode] = useState<'actual' | 'projected'>('actual');

  const cx = 130;
  const cy = 114;
  const outerR = 88;
  const trackR = 78;
  const innerR = 64;

  // Calculations for Gauge 1: Total Target
  const targetHarianIdeal = hariKerjaBlnIni > 0 ? Math.round(totalTarget / hariKerjaBlnIni) : 0;
  const targetProRataSaatIni = Math.round(totalTarget * (Math.min(100, Math.max(0, timeProgressPct)) / 100));
  // Gauge 1 needle shows 100% Full Target Quota (or Time Pro-Rata benchmark when toggled)
  const gauge1Pct = needleMode === 'actual' ? 100 : 100;
  const gauge1Angle = pctToAngle(gauge1Pct, 100);
  const gauge1TimeAngle = pctToAngle(Math.min(100, Math.max(0, timeProgressPct)), 100);

  // Calculations for Gauge 2: Total Realisasi (scale 0% to 120% of Target)
  const rawRealisasiPct = totalTarget > 0 ? (totalActualCurrent / totalTarget) * 100 : 0;
  const rawProjectedPct = totalTarget > 0 ? (proyeksiAkhirBulan / totalTarget) * 100 : 0;
  const activeRealisasiValue = needleMode === 'actual' ? totalActualCurrent : proyeksiAkhirBulan;
  const activeRealisasiPct = needleMode === 'actual' ? rawRealisasiPct : rawProjectedPct;
  const gauge2Angle = pctToAngle(activeRealisasiPct, 120);
  const gauge2Target100Angle = pctToAngle(100, 120);
  const gauge2TimeAngle = pctToAngle(Math.min(120, Math.max(0, timeProgressPct)), 120);

  // Calculations for Gauge 3: Rata-rata Achievement (scale 0% to 120%)
  const actualAch = achievementRate ?? 0;
  const projectedAch = proyeksiAchRate ?? actualAch;
  const activeAchPct = needleMode === 'actual' ? actualAch : projectedAch;
  const gauge3Angle = pctToAngle(activeAchPct, 120);
  const gauge3ProjectedAngle = pctToAngle(projectedAch, 120);

  // Status badge helper for Achievement
  const getAchStatus = (ach: number) => {
    if (ach >= 100) return { label: 'TERCAPAI / SURPLUS', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', hex: '#10b981' };
    if (ach >= 85) return { label: 'ON TRACK', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', hex: '#06b6d4' };
    if (ach >= 65) return { label: 'PERLU AKSELERASI', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', hex: '#f59e0b' };
    return { label: 'KRITIS / DEFISIT', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', hex: '#f43f5e' };
  };

  const achStatus = getAchStatus(activeAchPct);

  return (
    <div className="space-y-4">
      {/* Header Bar for Speedometer Telemetry Cluster */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Speedometer Executive Telemetry — Target vs Realisasi
            </h3>
            <p className="text-[11px] text-slate-400">
              Visualisasi instrumen real-time dari data resmi tanpa merubah nilai transaksi maupun target.
            </p>
          </div>
        </div>

        {/* Interactive Mode Switcher for Needle Preview */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
          <span className="text-[11px] text-slate-400 px-2 hidden sm:inline">Mode Jarum:</span>
          <button
            type="button"
            onClick={() => setNeedleMode('actual')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              needleMode === 'actual'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Aktual Saat Ini
          </button>
          <button
            type="button"
            onClick={() => setNeedleMode('projected')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              needleMode === 'projected'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Simulasikan posisi jarum pada proyeksi akhir bulan"
          >
            Simulasi Akhir Bulan ({hariKerjaBlnIni} Hr)
          </button>
        </div>
      </div>

      {/* 3 Speedometer Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ================================================================= */}
        {/* SPEEDOMETER 1: TOTAL TARGET                                       */}
        {/* ================================================================= */}
        <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors">
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-2 z-10">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 block">
                01 · Kuota Benchmark
              </span>
              <h4 className="text-base font-bold text-slate-100 mt-0.5">Total Target</h4>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Target className="w-4 h-4" />
            </div>
          </div>

          {/* SVG Speedometer Dial */}
          <div className="my-2 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 260 165" className="w-full max-w-[270px] overflow-visible">
              <defs>
                <linearGradient id="targetGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
                </linearGradient>
                <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Outer decorative bezel arc */}
              <path
                d={describeArc(cx, cy, outerR, -120, 120)}
                fill="none"
                stroke="#1e293b"
                strokeWidth="2"
                strokeDasharray="3 3"
              />

              {/* Background Track */}
              <path
                d={describeArc(cx, cy, trackR, -120, 120)}
                fill="none"
                stroke="#0f172a"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Elapsed Time Pro-Rata Zone Arc */}
              {timeProgressPct > 0 && (
                <path
                  d={describeArc(cx, cy, trackR, -120, gauge1TimeAngle)}
                  fill="none"
                  stroke="url(#targetGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  filter="url(#glowAmber)"
                />
              )}

              {/* Full 100% Target Rim Outline */}
              <path
                d={describeArc(cx, cy, trackR, -120, 120)}
                fill="none"
                stroke="#f59e0b"
                strokeOpacity="0.3"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Inner fine scale arc */}
              <path
                d={describeArc(cx, cy, innerR, -120, 120)}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Major & Minor Ticks (0%, 25%, 50%, 75%, 100%) */}
              {[0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100].map((val, i) => {
                const angle = pctToAngle(val, 100);
                const isMajor = i % 2 === 0;
                const p1 = polarToCartesian(cx, cy, isMajor ? outerR - 2 : outerR - 4, angle);
                const p2 = polarToCartesian(cx, cy, isMajor ? outerR + 5 : outerR + 2, angle);
                const labelPos = polarToCartesian(cx, cy, outerR + 15, angle);
                return (
                  <g key={val}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isMajor ? '#fbbf24' : '#475569'}
                      strokeWidth={isMajor ? '2' : '1'}
                    />
                    {isMajor && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 3}
                        textAnchor="middle"
                        className="fill-slate-400 font-mono text-[9px] font-semibold"
                      >
                        {val}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Time Progress Marker on Rim */}
              {(() => {
                const mPos = polarToCartesian(cx, cy, trackR, gauge1TimeAngle);
                return (
                  <circle
                    cx={mPos.x}
                    cy={mPos.y}
                    r="4.5"
                    fill="#38bdf8"
                    stroke="#020617"
                    strokeWidth="1.5"
                  >
                    <title>Target Pro-Rata Hari Kerja ({timeProgressPct.toFixed(1)}%)</title>
                  </circle>
                );
              })()}

              {/* Speedometer Needle pointing to 100% Target Benchmark */}
              <g
                style={{
                  transform: `rotate(${gauge1Angle}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <polygon
                  points={`${cx - 3.5},${cy} ${cx},${cy - (trackR - 4)} ${cx + 3.5},${cy}`}
                  fill="#fbbf24"
                />
                <polygon
                  points={`${cx - 2},${cy} ${cx},${cy + 14} ${cx + 2},${cy}`}
                  fill="#78350f"
                />
              </g>

              {/* Center Cap */}
              <circle cx={cx} cy={cy} r="11" fill="#1e293b" stroke="#fbbf24" strokeWidth="2.5" />
              <circle cx={cx} cy={cy} r="4" fill="#fbbf24" />

              {/* Center Sub-label */}
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                className="fill-amber-400 font-mono text-[10px] font-bold tracking-wider"
              >
                100% KUOTA RESMI
              </text>
            </svg>

            {/* Digital Odometer Box */}
            <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-lg px-3.5 py-2.5 text-center -mt-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Akumulasi Target Sales
              </div>
              <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-300 mt-0.5 tracking-tight">
                {formatRupiah(totalTarget)}
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Breakdown */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
            <div className="bg-slate-950/50 rounded px-2.5 py-1.5 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Target / Hari ({hariKerjaBlnIni}hr)</span>
              <span className="text-slate-200 font-bold">{formatRupiah(targetHarianIdeal)}</span>
            </div>
            <div className="bg-slate-950/50 rounded px-2.5 py-1.5 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Pro-Rata ({hariKerjaBerjalan}hr)</span>
              <span className="text-cyan-300 font-bold">{formatRupiah(targetProRataSaatIni)}</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SPEEDOMETER 2: TOTAL REALISASI                                    */}
        {/* ================================================================= */}
        <div className="bg-slate-900 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors">
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-2 z-10">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 block">
                02 · Aktual Penjualan {needleMode === 'projected' ? '(Simulasi)' : ''}
              </span>
              <h4 className="text-base font-bold text-slate-100 mt-0.5">Total Realisasi</h4>
            </div>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Award className="w-4 h-4" />
            </div>
          </div>

          {/* SVG Speedometer Dial */}
          <div className="my-2 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 260 165" className="w-full max-w-[270px] overflow-visible">
              <defs>
                <linearGradient id="realisasiGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0891b2" />
                  <stop offset="65%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Outer decorative bezel arc */}
              <path
                d={describeArc(cx, cy, outerR, -120, 120)}
                fill="none"
                stroke="#1e293b"
                strokeWidth="2"
                strokeDasharray="3 3"
              />

              {/* Background Track (0 to 120% scale) */}
              <path
                d={describeArc(cx, cy, trackR, -120, 120)}
                fill="none"
                stroke="#0f172a"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Overdrive Zone (100% to 120%) subtle highlight */}
              <path
                d={describeArc(cx, cy, trackR, gauge2Target100Angle, 120)}
                fill="none"
                stroke="#10b981"
                strokeOpacity="0.18"
                strokeWidth="14"
              />

              {/* Active Realisasi Value Arc */}
              {activeRealisasiPct > 0 && (
                <path
                  d={describeArc(cx, cy, trackR, -120, gauge2Angle)}
                  fill="none"
                  stroke="url(#realisasiGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  filter="url(#glowCyan)"
                />
              )}

              {/* Inner fine scale arc */}
              <path
                d={describeArc(cx, cy, innerR, -120, 120)}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Ticks from 0% to 120% (every 20% major, 10% minor) */}
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((val) => {
                const angle = pctToAngle(val, 120);
                const isMajor = val % 20 === 0;
                const isTarget100 = val === 100;
                const p1 = polarToCartesian(cx, cy, isMajor ? outerR - 2 : outerR - 4, angle);
                const p2 = polarToCartesian(cx, cy, isMajor ? outerR + 5 : outerR + 2, angle);
                const labelPos = polarToCartesian(cx, cy, outerR + 15, angle);
                return (
                  <g key={val}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isTarget100 ? '#fbbf24' : isMajor ? '#22d3ee' : '#475569'}
                      strokeWidth={isTarget100 ? '2.5' : isMajor ? '1.8' : '1'}
                    />
                    {isMajor && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 3}
                        textAnchor="middle"
                        className={`font-mono text-[9px] font-semibold ${
                          isTarget100 ? 'fill-amber-400 font-bold' : 'fill-slate-400'
                        }`}
                      >
                        {val}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 100% Target Marker Notch on Track */}
              {(() => {
                const tIn = polarToCartesian(cx, cy, trackR - 8, gauge2Target100Angle);
                const tOut = polarToCartesian(cx, cy, trackR + 8, gauge2Target100Angle);
                return (
                  <line
                    x1={tIn.x}
                    y1={tIn.y}
                    x2={tOut.x}
                    y2={tOut.y}
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                  />
                );
              })()}

              {/* Elapsed Working Days Marker on Rim */}
              {(() => {
                const mPos = polarToCartesian(cx, cy, trackR, gauge2TimeAngle);
                return (
                  <circle
                    cx={mPos.x}
                    cy={mPos.y}
                    r="4"
                    fill="#fbbf24"
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                );
              })()}

              {/* Speedometer Needle */}
              <g
                style={{
                  transform: `rotate(${gauge2Angle}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <polygon
                  points={`${cx - 3.5},${cy} ${cx},${cy - (trackR - 4)} ${cx + 3.5},${cy}`}
                  fill="#22d3ee"
                />
                <polygon
                  points={`${cx - 2},${cy} ${cx},${cy + 14} ${cx + 2},${cy}`}
                  fill="#164e63"
                />
              </g>

              {/* Center Cap */}
              <circle cx={cx} cy={cy} r="11" fill="#1e293b" stroke="#22d3ee" strokeWidth="2.5" />
              <circle cx={cx} cy={cy} r="4" fill="#22d3ee" />

              {/* Center Ratio Sub-label */}
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                className="fill-cyan-300 font-mono text-[10px] font-bold tracking-wider"
              >
                {activeRealisasiPct.toFixed(1)}% DARI TARGET
              </text>
            </svg>

            {/* Digital Odometer Box */}
            <div className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-lg px-3.5 py-2.5 text-center -mt-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Realisasi ({salesValueField}) {needleMode === 'projected' ? '· Proyeksi' : ''}
              </div>
              <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-cyan-300 mt-0.5 tracking-tight">
                {formatRupiah(activeRealisasiValue)}
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Breakdown */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
            <div className="bg-slate-950/50 rounded px-2.5 py-1.5 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Run Rate / Hari</span>
              <span className="text-cyan-300 font-bold">{formatRupiah(runRateHarianBerjalan)}</span>
            </div>
            <div className="bg-slate-950/50 rounded px-2.5 py-1.5 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Defisit / Surplus</span>
              <span className={`font-bold ${gapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(gapValue >= 0 ? '+' : '') + formatRupiah(gapValue)}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SPEEDOMETER 3: RATA-RATA ACHIEVEMENT                              */}
        {/* ================================================================= */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden transition-colors">
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-2 z-10">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block">
                03 · Indeks Performa {needleMode === 'projected' ? '(Simulasi)' : ''}
              </span>
              <h4 className="text-base font-bold text-slate-100 mt-0.5">Rata-rata Achievement</h4>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* SVG Speedometer Dial */}
          <div className="my-2 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 260 165" className="w-full max-w-[270px] overflow-visible">
              <defs>
                <filter id="glowAch" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Outer decorative bezel arc */}
              <path
                d={describeArc(cx, cy, outerR, -120, 120)}
                fill="none"
                stroke="#1e293b"
                strokeWidth="2"
                strokeDasharray="3 3"
              />

              {/* Multi-Zone Segmented Background Track */}
              {/* Zone 1: 0% - 50% (Rose / Critical) */}
              <path
                d={describeArc(cx, cy, trackR, pctToAngle(0, 120), pctToAngle(50, 120))}
                fill="none"
                stroke="#f43f5e"
                strokeOpacity="0.22"
                strokeWidth="14"
              />
              {/* Zone 2: 50% - 80% (Amber / Warning) */}
              <path
                d={describeArc(cx, cy, trackR, pctToAngle(50, 120), pctToAngle(80, 120))}
                fill="none"
                stroke="#f59e0b"
                strokeOpacity="0.22"
                strokeWidth="14"
              />
              {/* Zone 3: 80% - 100% (Cyan / On Track) */}
              <path
                d={describeArc(cx, cy, trackR, pctToAngle(80, 120), pctToAngle(100, 120))}
                fill="none"
                stroke="#06b6d4"
                strokeOpacity="0.25"
                strokeWidth="14"
              />
              {/* Zone 4: 100% - 120% (Emerald / Overdrive) */}
              <path
                d={describeArc(cx, cy, trackR, pctToAngle(100, 120), pctToAngle(120, 120))}
                fill="none"
                stroke="#10b981"
                strokeOpacity="0.3"
                strokeWidth="14"
              />

              {/* Active Achievement Arc */}
              {activeAchPct > 0 && (
                <path
                  d={describeArc(cx, cy, trackR, -120, gauge3Angle)}
                  fill="none"
                  stroke={achStatus.hex}
                  strokeWidth="14"
                  strokeLinecap="round"
                  filter="url(#glowAch)"
                />
              )}

              {/* Inner fine scale arc */}
              <path
                d={describeArc(cx, cy, innerR, -120, 120)}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Ticks from 0% to 120% */}
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((val) => {
                const angle = pctToAngle(val, 120);
                const isMajor = val % 20 === 0;
                const isTarget100 = val === 100;
                const p1 = polarToCartesian(cx, cy, isMajor ? outerR - 2 : outerR - 4, angle);
                const p2 = polarToCartesian(cx, cy, isMajor ? outerR + 5 : outerR + 2, angle);
                const labelPos = polarToCartesian(cx, cy, outerR + 15, angle);
                return (
                  <g key={val}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isTarget100 ? '#10b981' : isMajor ? '#94a3b8' : '#475569'}
                      strokeWidth={isTarget100 ? '2.5' : isMajor ? '1.8' : '1'}
                    />
                    {isMajor && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 3}
                        textAnchor="middle"
                        className={`font-mono text-[9px] font-semibold ${
                          isTarget100 ? 'fill-emerald-400 font-bold' : 'fill-slate-400'
                        }`}
                      >
                        {val}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Ghost Needle for Projected Achievement when in Actual mode */}
              {needleMode === 'actual' && proyeksiAchRate !== null && (
                <g
                  style={{
                    transform: `rotate(${gauge3ProjectedAngle}deg)`,
                    transformOrigin: `${cx}px ${cy}px`,
                    transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  opacity="0.4"
                >
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx}
                    y2={cy - (trackR - 6)}
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                </g>
              )}

              {/* Primary Speedometer Needle */}
              <g
                style={{
                  transform: `rotate(${gauge3Angle}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <polygon
                  points={`${cx - 3.5},${cy} ${cx},${cy - (trackR - 4)} ${cx + 3.5},${cy}`}
                  fill={achStatus.hex}
                />
                <polygon
                  points={`${cx - 2},${cy} ${cx},${cy + 14} ${cx + 2},${cy}`}
                  fill="#0f172a"
                />
              </g>

              {/* Center Cap */}
              <circle cx={cx} cy={cy} r="11" fill="#1e293b" stroke={achStatus.hex} strokeWidth="2.5" />
              <circle cx={cx} cy={cy} r="4" fill={achStatus.hex} />

              {/* Status Label below center */}
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                fill={achStatus.hex}
                className="font-mono text-[10px] font-bold tracking-wider"
              >
                {achStatus.label}
              </text>
            </svg>

            {/* Digital Odometer Box */}
            <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-lg px-3.5 py-2.5 text-center -mt-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Realisasi / Target × 100 {needleMode === 'projected' ? '(Est. Akhir Bulan)' : ''}
              </div>
              <div className={`text-lg sm:text-xl font-black font-mono tabular-nums mt-0.5 tracking-tight ${achStatus.color}`}>
                {achievementRate !== null ? `${activeAchPct.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Breakdown */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
            <div className="bg-slate-950/50 rounded px-2.5 py-1.5 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Est. Akhir Bulan</span>
              <span className="text-purple-300 font-bold">
                {proyeksiAchRate !== null ? `${proyeksiAchRate.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950/50 rounded px-2.5 py-1.5 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Salesman &ge; 100%</span>
              <span className="text-emerald-300 font-bold">
                {achievedSalesmenCount} / {totalSalesmen} Tim
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preserve 4th Metric (Total Defisit / Surplus) & Legend Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${gapValue >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Defisit / Surplus (Gap Bersih Realisasi vs Target)</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-base font-black font-mono tabular-nums ${gapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(gapValue >= 0 ? '+' : '') + formatRupiah(gapValue)}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                · Sisa {sisaHariKerja} Hari Kerja
              </span>
            </div>
          </div>
        </div>

        {/* Speedometer Color Zone Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> &lt;50% Kritis
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 50–80% Akselerasi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> 80–99% On Track
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> &ge;100% Tercapai
          </span>
        </div>
      </div>
    </div>
  );
}
