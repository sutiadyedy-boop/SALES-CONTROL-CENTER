import React from 'react';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Store, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Award,
  Zap,
  Radio,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { CalculationResult, OpportunityItem } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';
import { ControlTowerCharts } from './ControlTowerCharts';
import { ControlTowerTables } from './ControlTowerTables';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { ExecutiveBriefingBar } from './ExecutiveBriefingBar';
import { TopLeakageOutletsCard } from './TopLeakageOutletsCard';

interface DashboardViewProps {
  calculation: CalculationResult | null;
  opportunities: OpportunityItem[];
  settings: AppSettings;
  onNavigate: (tab: string) => void;
  onLoadSampleData: () => void;
}

export function DashboardView({
  calculation,
  opportunities,
  settings,
  onNavigate,
  onLoadSampleData,
}: DashboardViewProps) {
  // Check if database is empty - strictly display DATA BELUM TERSEDIA without dummy data
  const isEmptyDatabase = 
    !calculation || 
    (calculation.kpis.totalActualCurrent === 0 && 
     calculation.kpis.totalTarget === 0 && 
     calculation.kpis.totalActiveOutlets === 0);

  if (isEmptyDatabase) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-cyan-400">
          <Radio className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-mono text-slate-100 tracking-wide uppercase">
          DATA BELUM TERSEDIA
        </h2>
        <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
          Database transaksi atau master outlet belum diunggah. Silakan unggah berkas Excel kantor pada menu Database Center atau muat dataset kantor aktual untuk mengaktifkan Digital Sales Control Tower.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('database')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unggah Data Kantor</span>
          </button>
          <button
            onClick={onLoadSampleData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <span>Muat Dataset Kantor Aktual</span>
          </button>
        </div>
      </div>
    );
  }

  const { kpis } = calculation;
  const prevLabel = settings.previousMonthLabel && !settings.previousMonthLabel.toUpperCase().includes('AGUSTUS') 
    ? settings.previousMonthLabel 
    : 'September 2026';
  const currLabel = settings.currentMonthLabel && !settings.currentMonthLabel.toUpperCase().includes('AGUSTUS') && settings.currentMonthLabel !== prevLabel 
    ? settings.currentMonthLabel 
    : 'Oktober 2026';

  const isAchieved = kpis.achievementRate !== null && kpis.achievementRate >= 100;

  return (
    <div className="space-y-6">
      {/* CONTROL TOWER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-lg md:text-xl font-extrabold tracking-wider text-slate-100 font-mono uppercase">
              DIGITAL SALES CONTROL TOWER
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Sales Execution · Target Tracking · RO Penetration · Outlet Dynamics ({currLabel} vs {prevLabel})
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Control_Tower_Dashboard_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1.5">PERIODE:</span>
            <span className="text-cyan-400 font-semibold">{currLabel.toUpperCase()}</span>
          </div>
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1.5">STATUS DATA:</span>
            <span className="text-emerald-400 font-semibold">TERVALIDASI</span>
          </div>
        </div>
      </div>

      {/* EXECUTIVE 60-SECOND BRIEFING & RUN-RATE CLOSING ESTIMATION */}
      <ExecutiveBriefingBar
        calculation={calculation}
        settings={settings}
      />

      {/* TOP 9 PRIMARY KPI CARDS -> GLOWING SPEEDOMETER TELEMETRY CLUSTER (KHUSUSNYA TARGET VS REALISASI) */}
      <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.12)] relative overflow-hidden space-y-4">
        {/* Ambient Neon Backlight Glows */}
        <div className="absolute -top-24 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 left-1/2 w-72 h-72 bg-cyan-500/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cluster Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/90 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
            <h2 className="text-xs sm:text-sm font-extrabold font-mono uppercase tracking-wider text-slate-100">
              SPEEDOMETER TELEMETRY — TARGET VS REALISASI &amp; PENETRASI OUTLET ({currLabel.toUpperCase()})
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" /> &lt;65% Kritis
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" /> 65–85% Akselerasi
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" /> 85–99% On Track
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" /> &ge;100% Achieved
            </span>
          </div>
        </div>

        {/* 3 MAIN GLOWING SPEEDOMETERS: TARGET VS REALISASI */}
        {(() => {
          const cx = 120;
          const cy = 104;
          const outerR = 82;
          const trackR = 72;
          const innerR = 58;

          const polarToCartesian = (centerX: number, centerY: number, r: number, angleDeg: number) => {
            const rad = ((angleDeg - 90) * Math.PI) / 180;
            return {
              x: centerX + r * Math.cos(rad),
              y: centerY + r * Math.sin(rad),
            };
          };

          const describeArc = (centerX: number, centerY: number, r: number, startAngle: number, endAngle: number) => {
            const clampedEnd = Math.max(startAngle + 0.1, Math.min(endAngle, startAngle + 359.9));
            const start = polarToCartesian(centerX, centerY, r, startAngle);
            const end = polarToCartesian(centerX, centerY, r, clampedEnd);
            const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';
            return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
          };

          const pctToAngle = (pct: number, maxScale: number = 120) => {
            const clamped = Math.max(0, Math.min(maxScale, pct));
            return -120 + (clamped / maxScale) * 240;
          };

          const rawAch = kpis.achievementRate ?? (kpis.totalTarget > 0 ? (kpis.totalActualCurrent / kpis.totalTarget) * 100 : 0);
          const targetAngle = pctToAngle(100, 100);
          const realisasiAngle = pctToAngle(rawAch, 120);
          const target100AngleOn120 = pctToAngle(100, 120);
          const achAngle = pctToAngle(rawAch, 120);

          const achColorHex = rawAch >= 100 ? '#10b981' : rawAch >= 85 ? '#22d3ee' : rawAch >= 65 ? '#fbbf24' : '#f43f5e';
          const achGlowClass =
            rawAch >= 100
              ? 'border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
              : rawAch >= 85
              ? 'border-cyan-500/50 shadow-[0_0_25px_rgba(34,211,238,0.2)]'
              : rawAch >= 65
              ? 'border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
              : 'border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)]';

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
              {/* SPEEDOMETER 1: TARGET (KUOTA RESMI) */}
              <div className="bg-slate-900/95 border border-amber-500/40 hover:border-amber-400 rounded-xl p-4 flex flex-col justify-between shadow-[0_0_24px_rgba(245,158,11,0.15)] relative overflow-hidden transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                      01 · KUOTA BENCHMARK
                    </span>
                    <span className="text-sm font-extrabold tracking-wide text-slate-100">TARGET PENJUALAN</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                    <Target className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-1 flex flex-col items-center">
                  <svg viewBox="0 0 240 148" className="w-full max-w-[240px] overflow-visible">
                    <defs>
                      <linearGradient id="dashTargetGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#fde047" stopOpacity="1" />
                      </linearGradient>
                      <filter id="dashGlowAmber" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Outer Glowing Bezel */}
                    <path
                      d={describeArc(cx, cy, outerR, -120, 120)}
                      fill="none"
                      stroke="#fbbf24"
                      strokeOpacity="0.35"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Dark Track */}
                    <path
                      d={describeArc(cx, cy, trackR, -120, 120)}
                      fill="none"
                      stroke="#020617"
                      strokeWidth="13"
                      strokeLinecap="round"
                    />

                    {/* Glowing Full Target Arc */}
                    <path
                      d={describeArc(cx, cy, trackR, -120, 120)}
                      fill="none"
                      stroke="url(#dashTargetGrad)"
                      strokeWidth="13"
                      strokeLinecap="round"
                      filter="url(#dashGlowAmber)"
                    />

                    {/* Inner Scale Ring */}
                    <path
                      d={describeArc(cx, cy, innerR, -120, 120)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1"
                    />

                    {/* Ticks 0% to 100% */}
                    {[0, 25, 50, 75, 100].map((val) => {
                      const angle = pctToAngle(val, 100);
                      const p1 = polarToCartesian(cx, cy, outerR - 2, angle);
                      const p2 = polarToCartesian(cx, cy, outerR + 4, angle);
                      const labelPos = polarToCartesian(cx, cy, outerR + 13, angle);
                      return (
                        <g key={val}>
                          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fde047" strokeWidth="2" />
                          <text
                            x={labelPos.x}
                            y={labelPos.y + 3}
                            textAnchor="middle"
                            className="fill-amber-300 font-mono text-[8px] font-bold"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Glowing Needle at 100% Target */}
                    <g
                      style={{
                        transform: `rotate(${targetAngle}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      filter="url(#dashGlowAmber)"
                    >
                      <polygon points={`${cx - 3.5},${cy} ${cx},${cy - (trackR - 3)} ${cx + 3.5},${cy}`} fill="#fde047" />
                      <polygon points={`${cx - 2},${cy} ${cx},${cy + 12} ${cx + 2},${cy}`} fill="#b45309" />
                    </g>

                    {/* Center Hub */}
                    <circle cx={cx} cy={cy} r="10" fill="#0f172a" stroke="#fde047" strokeWidth="2.5" />
                    <circle cx={cx} cy={cy} r="4" fill="#fde047" />

                    <text
                      x={cx}
                      y={cy + 26}
                      textAnchor="middle"
                      className="fill-amber-300 font-mono text-[9px] font-extrabold tracking-widest"
                    >
                      100% TARGET RESMI
                    </text>
                  </svg>

                  {/* Digital Readout */}
                  <div className="w-full bg-slate-950/95 border border-amber-500/40 rounded-lg px-3 py-2 text-center -mt-1 shadow-[inset_0_0_15px_rgba(245,158,11,0.12)]">
                    <div className="text-lg sm:text-xl font-black font-mono text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                      {kpis.totalTarget > 0 ? formatRupiah(kpis.totalTarget) : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Periode: <span className="text-amber-200 font-semibold">{currLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SPEEDOMETER 2: REALISASI PENJUALAN */}
              <div className="bg-slate-900/95 border border-cyan-400/50 hover:border-cyan-300 rounded-xl p-4 flex flex-col justify-between shadow-[0_0_28px_rgba(34,211,238,0.2)] relative overflow-hidden transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                      02 · AKTUAL TRANSAKSI
                    </span>
                    <span className="text-sm font-extrabold tracking-wide text-slate-100">REALISASI PENJUALAN</span>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-1 flex flex-col items-center">
                  <svg viewBox="0 0 240 148" className="w-full max-w-[240px] overflow-visible">
                    <defs>
                      <linearGradient id="dashRealisasiGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="60%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <filter id="dashGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Outer Glowing Bezel */}
                    <path
                      d={describeArc(cx, cy, outerR, -120, 120)}
                      fill="none"
                      stroke="#22d3ee"
                      strokeOpacity="0.35"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Dark Track */}
                    <path
                      d={describeArc(cx, cy, trackR, -120, 120)}
                      fill="none"
                      stroke="#020617"
                      strokeWidth="13"
                      strokeLinecap="round"
                    />

                    {/* Overdrive Zone (100% - 120%) */}
                    <path
                      d={describeArc(cx, cy, trackR, target100AngleOn120, 120)}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.22"
                      strokeWidth="13"
                    />

                    {/* Active Glowing Realisasi Arc */}
                    {rawAch > 0 && (
                      <path
                        d={describeArc(cx, cy, trackR, -120, realisasiAngle)}
                        fill="none"
                        stroke="url(#dashRealisasiGrad)"
                        strokeWidth="13"
                        strokeLinecap="round"
                        filter="url(#dashGlowCyan)"
                      />
                    )}

                    {/* Inner Scale Ring */}
                    <path
                      d={describeArc(cx, cy, innerR, -120, 120)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1"
                    />

                    {/* Ticks 0% to 120% */}
                    {[0, 20, 40, 60, 80, 100, 120].map((val) => {
                      const angle = pctToAngle(val, 120);
                      const isTarget100 = val === 100;
                      const p1 = polarToCartesian(cx, cy, outerR - 2, angle);
                      const p2 = polarToCartesian(cx, cy, outerR + 4, angle);
                      const labelPos = polarToCartesian(cx, cy, outerR + 13, angle);
                      return (
                        <g key={val}>
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={isTarget100 ? '#fde047' : '#22d3ee'}
                            strokeWidth={isTarget100 ? '2.5' : '1.8'}
                          />
                          <text
                            x={labelPos.x}
                            y={labelPos.y + 3}
                            textAnchor="middle"
                            className={`font-mono text-[8px] font-bold ${isTarget100 ? 'fill-amber-300' : 'fill-cyan-300'}`}
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Glowing Needle for Realisasi */}
                    <g
                      style={{
                        transform: `rotate(${realisasiAngle}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      filter="url(#dashGlowCyan)"
                    >
                      <polygon points={`${cx - 3.5},${cy} ${cx},${cy - (trackR - 3)} ${cx + 3.5},${cy}`} fill="#67e8f9" />
                      <polygon points={`${cx - 2},${cy} ${cx},${cy + 12} ${cx + 2},${cy}`} fill="#0891b2" />
                    </g>

                    {/* Center Hub */}
                    <circle cx={cx} cy={cy} r="10" fill="#0f172a" stroke="#22d3ee" strokeWidth="2.5" />
                    <circle cx={cx} cy={cy} r="4" fill="#67e8f9" />

                    <text
                      x={cx}
                      y={cy + 26}
                      textAnchor="middle"
                      className="fill-cyan-300 font-mono text-[9px] font-extrabold tracking-widest"
                    >
                      {rawAch.toFixed(1)}% DARI TARGET
                    </text>
                  </svg>

                  {/* Digital Readout */}
                  <div className="w-full bg-slate-950/95 border border-cyan-400/40 rounded-lg px-3 py-2 text-center -mt-1 shadow-[inset_0_0_15px_rgba(34,211,238,0.15)]">
                    <div className="text-lg sm:text-xl font-black font-mono text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
                      {formatRupiah(kpis.totalActualCurrent)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Field: <span className="font-mono text-cyan-200 font-semibold">{settings.salesValueField}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SPEEDOMETER 3: ACHIEVEMENT RATE (%) */}
              <div className={`bg-slate-900/95 border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-all ${achGlowClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                      03 · CAPAIAN TARGET VS REALISASI
                    </span>
                    <span className="text-sm font-extrabold tracking-wide text-slate-100">ACHIEVEMENT (%)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <Award className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-1 flex flex-col items-center">
                  <svg viewBox="0 0 240 148" className="w-full max-w-[240px] overflow-visible">
                    <defs>
                      <filter id="dashGlowAch" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Multi-Zone Track Segments */}
                    <path
                      d={describeArc(cx, cy, trackR, pctToAngle(0, 120), pctToAngle(65, 120))}
                      fill="none"
                      stroke="#f43f5e"
                      strokeOpacity="0.22"
                      strokeWidth="13"
                    />
                    <path
                      d={describeArc(cx, cy, trackR, pctToAngle(65, 120), pctToAngle(85, 120))}
                      fill="none"
                      stroke="#f59e0b"
                      strokeOpacity="0.22"
                      strokeWidth="13"
                    />
                    <path
                      d={describeArc(cx, cy, trackR, pctToAngle(85, 120), pctToAngle(100, 120))}
                      fill="none"
                      stroke="#06b6d4"
                      strokeOpacity="0.25"
                      strokeWidth="13"
                    />
                    <path
                      d={describeArc(cx, cy, trackR, pctToAngle(100, 120), pctToAngle(120, 120))}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.3"
                      strokeWidth="13"
                    />

                    {/* Active Glowing Achievement Arc */}
                    {rawAch > 0 && (
                      <path
                        d={describeArc(cx, cy, trackR, -120, achAngle)}
                        fill="none"
                        stroke={achColorHex}
                        strokeWidth="13"
                        strokeLinecap="round"
                        filter="url(#dashGlowAch)"
                      />
                    )}

                    {/* Inner Scale Ring */}
                    <path
                      d={describeArc(cx, cy, innerR, -120, 120)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1"
                    />

                    {/* Ticks 0% to 120% */}
                    {[0, 20, 40, 60, 80, 100, 120].map((val) => {
                      const angle = pctToAngle(val, 120);
                      const isTarget100 = val === 100;
                      const p1 = polarToCartesian(cx, cy, outerR - 2, angle);
                      const p2 = polarToCartesian(cx, cy, outerR + 4, angle);
                      const labelPos = polarToCartesian(cx, cy, outerR + 13, angle);
                      return (
                        <g key={val}>
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={isTarget100 ? '#10b981' : '#94a3b8'}
                            strokeWidth={isTarget100 ? '2.5' : '1.8'}
                          />
                          <text
                            x={labelPos.x}
                            y={labelPos.y + 3}
                            textAnchor="middle"
                            className={`font-mono text-[8px] font-bold ${isTarget100 ? 'fill-emerald-300' : 'fill-slate-400'}`}
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Glowing Needle for Achievement */}
                    <g
                      style={{
                        transform: `rotate(${achAngle}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      filter="url(#dashGlowAch)"
                    >
                      <polygon points={`${cx - 3.5},${cy} ${cx},${cy - (trackR - 3)} ${cx + 3.5},${cy}`} fill={achColorHex} />
                      <polygon points={`${cx - 2},${cy} ${cx},${cy + 12} ${cx + 2},${cy}`} fill="#0f172a" />
                    </g>

                    {/* Center Hub */}
                    <circle cx={cx} cy={cy} r="10" fill="#0f172a" stroke={achColorHex} strokeWidth="2.5" />
                    <circle cx={cx} cy={cy} r="4" fill={achColorHex} />

                    <text
                      x={cx}
                      y={cy + 26}
                      textAnchor="middle"
                      fill={achColorHex}
                      className="font-mono text-[9px] font-extrabold tracking-widest"
                    >
                      {isAchieved ? 'MELAMPAUI TARGET' : 'DI BAWAH TARGET'}
                    </text>
                  </svg>

                  {/* Digital Readout */}
                  <div className="w-full bg-slate-950/95 border border-slate-800 rounded-lg px-3 py-2 text-center -mt-1 flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-[10px] text-slate-400 font-mono">CAPAIAN TIM</div>
                      <div className="text-xs text-slate-300">
                        {kpis.achievementRate !== null ? `${kpis.achievementRate >= 100 ? 'Melampaui Target' : 'Di Bawah Target'}` : 'Target belum ada'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xl font-black font-mono"
                        style={{ color: achColorHex, textShadow: `0 0 10px ${achColorHex}80` }}
                      >
                        {kpis.achievementRate !== null ? `${kpis.achievementRate.toFixed(1)}%` : 'N/A'}
                      </span>
                      {kpis.achievementRate !== null && (
                        <span
                          className={`text-[10px] font-sans px-2 py-0.5 rounded font-bold uppercase ${
                            isAchieved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isAchieved ? 'Achieved' : 'Under'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SECONDARY TELEMETRY ROW: GAP, GROWTH, OUTLET AKTIF, OUTLET TRANSAKSI, BELUM TRANSAKSI, RO % SPEEDOMETER */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10 pt-1">
          {/* KPI 4: GAP (REALISASI - TARGET) */}
          <div className={`bg-slate-900/90 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
            kpis.gapValue >= 0
              ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
              : 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold tracking-wider">GAP (SELISIH)</span>
              <TrendingUp className={`w-3.5 h-3.5 ${kpis.gapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <div className="mt-2">
              <div className={`text-sm sm:text-base font-black font-mono ${
                kpis.gapValue >= 0
                  ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                  : 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]'
              }`}>
                {(kpis.gapValue >= 0 ? '+' : '') + formatRupiah(kpis.gapValue)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Realisasi - Target
              </div>
            </div>
          </div>

          {/* KPI 5: GROWTH */}
          <div className={`bg-slate-900/90 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
            kpis.growthRate !== null && kpis.growthRate >= 0
              ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
              : 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold tracking-wider">GROWTH</span>
              {kpis.growthStatus === 'POSITIVE' ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className="mt-2">
              <div className={`text-sm sm:text-base font-black font-mono ${
                kpis.growthRate !== null && kpis.growthRate >= 0
                  ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                  : kpis.growthRate === null
                  ? 'text-slate-400'
                  : 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]'
              }`}>
                {formatPercent(kpis.growthRate)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 truncate" title={`vs ${prevLabel} (${formatRupiah(kpis.totalActualPrevious)})`}>
                vs {prevLabel} ({formatRupiah(kpis.totalActualPrevious)})
              </div>
            </div>
          </div>

          {/* KPI 6: TOTAL OUTLET AKTIF */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col justify-between shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold tracking-wider">TOTAL OUTLET AKTIF</span>
              <Store className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="text-sm sm:text-base font-black font-mono text-indigo-300 drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]">
                {kpis.totalActiveOutlets > 0 ? `${kpis.totalActiveOutlets} Toko` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                Master Active (STATUS: OK)
              </div>
            </div>
          </div>

          {/* KPI 7: OUTLET TRANSAKSI */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3.5 flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.12)]">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold tracking-wider">OUTLET TRANSAKSI</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-sm sm:text-base font-black font-mono text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
                {kpis.outletsTransactedCurrent} Toko
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Sales Value &gt; 0 pada {currLabel}
              </div>
            </div>
          </div>

          {/* KPI 8: OUTLET BELUM TRANSAKSI */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between shadow-[0_0_15px_rgba(245,158,11,0.12)]">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold tracking-wider">BELUM TRANSAKSI</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-sm sm:text-base font-black font-mono text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                {kpis.outletsNotTransactedCurrent} Toko
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Outlet aktif minus transaksi
              </div>
            </div>
          </div>

          {/* KPI 9: RO % (REPEAT ORDER) WITH MINI GLOWING GAUGE BAR */}
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3.5 flex flex-col justify-between shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold tracking-wider">RO % (REPEAT ORDER)</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-sm sm:text-base font-black font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                {kpis.totalActiveOutlets > 0 && kpis.repeatOrderRate !== null ? `${kpis.repeatOrderRate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_#22d3ee]"
                  style={{ width: `${Math.min(100, Math.max(0, kpis.repeatOrderRate ?? 0))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {kpis.outletsTransactedCurrent} / {kpis.totalActiveOutlets} Outlet
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 BI CHARTS SECTION */}
      <ControlTowerCharts
        calculation={calculation}
        currentPeriodLabel={currLabel}
        previousPeriodLabel={prevLabel}
      />

      {/* 4 VIRTUALIZED INTELLIGENCE TABLES SECTION */}
      <ControlTowerTables
        calculation={calculation}
        currentPeriodLabel={currLabel}
        previousPeriodLabel={prevLabel}
      />

      {/* TOP 10 LEAKAGE OUTLETS (PARETO 80/20 HIGH-VALUE DROP RECOVERY) */}
      <TopLeakageOutletsCard
        dropOutlets={calculation.dropOutlets}
        totalLostRevenue={kpis.dropOutletLostRevenue}
        onNavigate={onNavigate}
      />

      {/* TOP OPPORTUNITY ALERT PREVIEW (OPTIONAL COMPONENT) */}
      {opportunities.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Peluang Omset Prioritas (Sales Opportunities)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('opportunity')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Buka Seluruh Peluang ({opportunities.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {opportunities.slice(0, 3).map((opp) => (
              <div
                key={opp.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-amber-500/20 font-semibold">
                      PRIORITAS {opp.priority}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {formatRupiah(opp.impactValue)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mt-2 line-clamp-1">{opp.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {opp.detailText}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-300">
                  <span className="text-slate-500">Tindakan: </span>
                  {opp.actionRecommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
