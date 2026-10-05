import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  PieChart, 
  Calendar, 
  Target, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { CalculationResult } from '../../types/analytics';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';

interface ControlTowerChartsProps {
  calculation: CalculationResult;
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
}

export function ControlTowerCharts({
  calculation,
  currentPeriodLabel = 'Oktober 2026',
  previousPeriodLabel = 'September 2026',
}: ControlTowerChartsProps) {
  const { salesmanPerformances, channelBreakdown, rayonBreakdown, kpis } = calculation;
  const [activeTab, setActiveTab] = useState<'all' | 'target_actual' | 'aug_sept' | 'ach_salesman' | 'growth_salesman' | 'ro_dist'>('all');
  const [hoveredItem, setHoveredItem] = useState<{ title: string; lines: string[] } | null>(null);

  // Take top 8 salesmen for readability in charts
  const topSalesmen = salesmanPerformances.slice(0, 8);

  const hasSalesmen = topSalesmen.length > 0;
  const maxSales = Math.max(
    ...topSalesmen.map(s => Math.max(s.target, s.actualCurrent, s.actualPrevious)),
    1
  );

  return (
    <div className="space-y-4">
      {/* Chart Section Header & Filter / View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            BI Analytics Visualizations
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            (5 Interactive Control Charts)
          </span>
        </div>

        {/* Segmented View Selector */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Chart
          </button>
          <button
            onClick={() => setActiveTab('target_actual')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'target_actual'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Target vs Actual
          </button>
          <button
            onClick={() => setActiveTab('aug_sept')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'aug_sept'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {previousPeriodLabel} vs {currentPeriodLabel}
          </button>
          <button
            onClick={() => setActiveTab('ach_salesman')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'ach_salesman'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Achievement Salesman
          </button>
          <button
            onClick={() => setActiveTab('growth_salesman')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'growth_salesman'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Growth Salesman
          </button>
          <button
            onClick={() => setActiveTab('ro_dist')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'ro_dist'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RO Distribution
          </button>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredItem && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs pointer-events-none max-w-xs animate-in fade-in duration-150">
          <div className="font-bold text-slate-100 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
            <span>{hoveredItem.title}</span>
          </div>
          <div className="space-y-0.5 font-mono text-[11px]">
            {hoveredItem.lines.map((line, idx) => (
              <div key={idx} className="text-slate-300">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 1: TARGET VS ACTUAL */}
        {(activeTab === 'all' || activeTab === 'target_actual') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">1. Target vs Realisasi (Actual)</h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-600" /> Target
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" /> Realisasi
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Komparasi nominal Target resmi vs Realisasi penjualan per salesman periode {currentPeriodLabel}.
              </p>

              {!hasSalesmen ? (
                <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
                  DATA BELUM TERSEDIA
                </div>
              ) : (
                <div className="space-y-3.5 pt-2">
                  {topSalesmen.map(s => {
                    const targetPct = Math.min(100, (s.target / maxSales) * 100);
                    const actualPct = Math.min(100, (s.actualCurrent / maxSales) * 100);
                    const achText = s.achievementRate !== null ? `${s.achievementRate.toFixed(1)}%` : 'N/A';
                    const isGood = s.achievementRate !== null && s.achievementRate >= 100;

                    return (
                      <div
                        key={s.salesmanId}
                        onMouseEnter={() =>
                          setHoveredItem({
                            title: `${s.salesmanName} (${s.salesmanId})`,
                            lines: [
                              `Target: ${formatRupiah(s.target)}`,
                              `Realisasi: ${formatRupiah(s.actualCurrent)}`,
                              `Achievement: ${achText}`,
                              `Gap: ${(s.gap >= 0 ? '+' : '') + formatRupiah(s.gap)}`,
                            ],
                          })
                        }
                        onMouseLeave={() => setHoveredItem(null)}
                        className="group p-2 rounded-lg hover:bg-slate-950/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {s.salesmanName}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400 text-[11px] hidden sm:inline">
                              {formatRupiah(s.actualCurrent)} / {formatRupiah(s.target)}
                            </span>
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                                isGood
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {achText}
                            </span>
                          </div>
                        </div>

                        {/* Dual Bar Comparison */}
                        <div className="space-y-1">
                          {/* Target bar */}
                          <div className="h-2 w-full bg-slate-950 rounded overflow-hidden">
                            <div
                              className="h-full bg-slate-600 rounded transition-all duration-500"
                              style={{ width: `${targetPct}%` }}
                            />
                          </div>
                          {/* Actual bar */}
                          <div className="h-2.5 w-full bg-slate-950 rounded overflow-hidden">
                            <div
                              className={`h-full rounded transition-all duration-500 ${
                                isGood ? 'bg-emerald-400' : 'bg-cyan-400'
                              }`}
                              style={{ width: `${actualPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Total Target: {formatRupiah(kpis.totalTarget)}</span>
              <span className="text-cyan-400 font-semibold">Total Realisasi: {formatRupiah(kpis.totalActualCurrent)}</span>
            </div>
          </div>
        )}

        {/* CHART 2: AUGUST VS SEPTEMBER (MoM) */}
        {(activeTab === 'all' || activeTab === 'aug_sept') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">2. {previousPeriodLabel} vs {currentPeriodLabel} (MoM)</h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> {previousPeriodLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> {currentPeriodLabel}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Pertumbuhan volume omset penjualan bulan lalu vs bulan berjalan per salesman.
              </p>

              {!hasSalesmen ? (
                <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
                  DATA BELUM TERSEDIA
                </div>
              ) : (
                <div className="space-y-3.5 pt-2">
                  {topSalesmen.map(s => {
                    const prevPct = Math.min(100, (s.actualPrevious / maxSales) * 100);
                    const currPct = Math.min(100, (s.actualCurrent / maxSales) * 100);
                    const growthText = formatPercent(s.growthRate);
                    const isPositive = s.growthRate !== null && s.growthRate >= 0;

                    return (
                      <div
                        key={s.salesmanId}
                        onMouseEnter={() =>
                          setHoveredItem({
                            title: `${s.salesmanName} MoM Comparison`,
                            lines: [
                              `${previousPeriodLabel}: ${formatRupiah(s.actualPrevious)}`,
                              `${currentPeriodLabel}: ${formatRupiah(s.actualCurrent)}`,
                              `Growth: ${growthText}`,
                              `Delta: ${formatRupiah(s.actualCurrent - s.actualPrevious)}`,
                            ],
                          })
                        }
                        onMouseLeave={() => setHoveredItem(null)}
                        className="group p-2 rounded-lg hover:bg-slate-950/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                            {s.salesmanName}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span
                              className={`text-[11px] font-bold ${
                                isPositive ? 'text-emerald-400' : s.growthRate === null ? 'text-slate-400' : 'text-rose-400'
                              }`}
                            >
                              {growthText}
                            </span>
                          </div>
                        </div>

                        {/* Dual Bar Comparison */}
                        <div className="space-y-1">
                          {/* Previous Month (Agustus) */}
                          <div className="h-2 w-full bg-slate-950 rounded overflow-hidden">
                            <div
                              className="h-full bg-indigo-500/80 rounded transition-all duration-500"
                              style={{ width: `${prevPct}%` }}
                            />
                          </div>
                          {/* Current Month (September) */}
                          <div className="h-2.5 w-full bg-slate-950 rounded overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded transition-all duration-500"
                              style={{ width: `${currPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{previousPeriodLabel}: {formatRupiah(kpis.totalActualPrevious)}</span>
              <span className="text-emerald-400 font-semibold">{currentPeriodLabel}: {formatRupiah(kpis.totalActualCurrent)}</span>
            </div>
          </div>
        )}

        {/* CHART 3: ACHIEVEMENT SALESMAN (WITH 100% BENCHMARK) */}
        {(activeTab === 'all' || activeTab === 'ach_salesman') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-100">3. Achievement Salesman Ranking</h3>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400 border border-dashed border-emerald-300" />
                  <span>Threshold 100% Target</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Pencapaian persentase terhadap target resmi dengan garis batas evaluasi 100%.
              </p>

              {!hasSalesmen ? (
                <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
                  DATA BELUM TERSEDIA
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {topSalesmen.map(s => {
                    const achVal = s.achievementRate ?? 0;
                    // Scale to max 150% visually
                    const barWidth = Math.min(100, (achVal / 150) * 100);
                    const isAchieved = achVal >= 100;

                    return (
                      <div
                        key={s.salesmanId}
                        onMouseEnter={() =>
                          setHoveredItem({
                            title: `${s.salesmanName} (Rank #${s.rank})`,
                            lines: [
                              `Achievement: ${s.achievementRate !== null ? `${s.achievementRate.toFixed(1)}%` : 'N/A'}`,
                              `Status: ${isAchieved ? 'ACHIEVED (Lolos Target)' : 'UNDER TARGET'}`,
                              `Realisasi: ${formatRupiah(s.actualCurrent)}`,
                              `Target: ${formatRupiah(s.target)}`,
                            ],
                          })
                        }
                        onMouseLeave={() => setHoveredItem(null)}
                        className="group p-2 rounded-lg hover:bg-slate-950/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 w-4 text-center">
                              #{s.rank}
                            </span>
                            <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                              {s.salesmanName}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-xs font-bold ${
                              isAchieved ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {s.achievementRate !== null ? `${s.achievementRate.toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>

                        {/* Bar with 100% threshold mark */}
                        <div className="relative h-3 w-full bg-slate-950 rounded overflow-hidden">
                          {/* 100% threshold line (at 66.6% on 0-150% scale) */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400/80 z-10"
                            style={{ left: `${(100 / 150) * 100}%` }}
                            title="Target 100%"
                          />
                          <div
                            className={`h-full rounded transition-all duration-500 ${
                              isAchieved
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-slate-600 to-cyan-500'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Overall Achievement: {kpis.achievementRate !== null ? `${kpis.achievementRate.toFixed(1)}%` : 'N/A'}</span>
              <span className="text-slate-400">Target Benchmark: 100.0%</span>
            </div>
          </div>
        )}

        {/* CHART 4: GROWTH SALESMAN (DIVERGING +/- BARS) */}
        {(activeTab === 'all' || activeTab === 'growth_salesman') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">4. Growth Salesman (Diverging MoM)</h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-rose-400">- Negatif</span>
                  <span className="text-slate-500">| 0% |</span>
                  <span className="text-emerald-400">+ Positif</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Divergensi pertumbuhan persentase MoM dari baseline 0% ({previousPeriodLabel} vs {currentPeriodLabel}).
              </p>
              {!hasSalesmen ? (
                <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
                  DATA BELUM TERSEDIA
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {topSalesmen.map(s => {
                    const g = s.growthRate;
                    const isPos = g !== null && g >= 0;
                    const isNull = g === null;
                    // Max clamp at 100% for visual divergence
                    const barScale = isNull ? 0 : Math.min(100, Math.abs(g));

                    return (
                       <div
                        key={s.salesmanId}
                        onMouseEnter={() =>
                          setHoveredItem({
                            title: `${s.salesmanName} MoM Growth`,
                            lines: [
                              `Growth %: ${formatPercent(s.growthRate)}`,
                              `${previousPeriodLabel}: ${formatRupiah(s.actualPrevious)}`,
                              `${currentPeriodLabel}: ${formatRupiah(s.actualCurrent)}`,
                              `Status: ${s.growthStatus}`,
                            ],
                          })
                        }
                        onMouseLeave={() => setHoveredItem(null)}
                        className="group p-2 rounded-lg hover:bg-slate-950/60 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {s.salesmanName}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold ${
                              isPos ? 'text-emerald-400' : isNull ? 'text-slate-400' : 'text-rose-400'
                            }`}
                          >
                            {formatPercent(s.growthRate)}
                          </span>
                        </div>

                        {/* Diverging Bar from center (50% mark) */}
                        <div className="relative h-2.5 w-full bg-slate-950 rounded flex overflow-hidden">
                          {/* Left half (Negative 0% to -100%) */}
                          <div className="w-1/2 h-full flex justify-end border-r border-slate-700">
                            {!isPos && !isNull && (
                              <div
                                className="h-full bg-rose-500 rounded-l transition-all duration-500"
                                style={{ width: `${barScale}%` }}
                              />
                            )}
                          </div>
                          {/* Right half (Positive 0% to +100%) */}
                          <div className="w-1/2 h-full flex justify-start">
                            {isPos && (
                              <div
                                className="h-full bg-emerald-400 rounded-r transition-all duration-500"
                                style={{ width: `${barScale}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Overall Growth: {formatPercent(kpis.growthRate)}</span>
              <span className="text-slate-400">Baseline: 0.0%</span>
            </div>
          </div>
        )}

        {/* CHART 5: RO DISTRIBUTION */}
        {(activeTab === 'all' || activeTab === 'ro_dist') && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">5. Distribusi RO Aktif & Penetrasi Channel</h3>
                </div>
                <div className="text-xs font-mono font-bold text-cyan-300">
                  RO Keseluruhan: {kpis.repeatOrderRate !== null ? `${kpis.repeatOrderRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Proporsi outlet transaksi vs belum transaksi serta distribusi tingkat Repeat Order (RO) per Channel & Rayon.
              </p>

              {kpis.totalActiveOutlets === 0 ? (
                <div className="h-56 flex items-center justify-center text-slate-500 text-xs">
                  DATA BELUM TERSEDIA
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-center">
                  {/* Left: Donut SVG representation */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#1e293b"
                          strokeWidth="12"
                        />
                        {/* Transacted ring */}
                        {kpis.repeatOrderRate !== null && (
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#06b6d4"
                            strokeWidth="12"
                            strokeDasharray={`${(kpis.repeatOrderRate / 100) * 238.76} 238.76`}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold font-mono text-cyan-300">
                          {kpis.repeatOrderRate !== null ? `${kpis.repeatOrderRate.toFixed(1)}%` : 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          RO Rate
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 w-full text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Transaksi</span>
                        </span>
                        <span className="font-bold text-cyan-400">{kpis.outletsTransactedCurrent} Toko</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Belum Transaksi</span>
                        </span>
                        <span className="font-bold text-amber-400">{kpis.outletsNotTransactedCurrent} Toko</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Channel Breakdown */}
                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      RO per Channel
                    </h4>
                    {channelBreakdown.length === 0 ? (
                      <div className="text-slate-500 text-xs py-4">Tidak ada data channel</div>
                    ) : (
                      channelBreakdown.slice(0, 4).map(ch => (
                        <div key={ch.channel} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-300 font-sans font-medium">{ch.channel || 'GENERAL'}</span>
                            <span className="text-cyan-400 font-bold">
                              {ch.roRate !== null ? `${ch.roRate.toFixed(0)}%` : 'N/A'} ({ch.transactedOutlets}/{ch.activeOutlets})
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-900 rounded overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded transition-all duration-500"
                              style={{ width: `${ch.roRate ?? 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right: Rayon Breakdown */}
                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      RO per Rayon
                    </h4>
                    {rayonBreakdown.length === 0 ? (
                      <div className="text-slate-500 text-xs py-4">Tidak ada data rayon</div>
                    ) : (
                      rayonBreakdown.slice(0, 4).map(r => (
                        <div key={r.rayon} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-300 font-sans font-medium">{r.rayon || 'RAYON'}</span>
                            <span className="text-emerald-400 font-bold">
                              {r.roRate !== null ? `${r.roRate.toFixed(0)}%` : 'N/A'} ({r.transactedOutlets}/{r.activeOutlets})
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-900 rounded overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded transition-all duration-500"
                              style={{ width: `${r.roRate ?? 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Total Outlet Terdaftar: {kpis.totalActiveOutlets} Outlet</span>
              <span className="text-cyan-400">Target RO Standard: &ge; 75.0%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
