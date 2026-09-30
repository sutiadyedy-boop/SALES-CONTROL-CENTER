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
  const currLabel = settings.currentMonthLabel || 'September 2026';
  const prevLabel = settings.previousMonthLabel || 'Agustus 2026';

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

      {/* TOP 9 PRIMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: TARGET */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">TARGET</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-slate-100">
              {kpis.totalTarget > 0 ? formatRupiah(kpis.totalTarget) : 'N/A'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Periode: {currLabel}
            </div>
          </div>
        </div>

        {/* KPI 2: REALISASI */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">REALISASI</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-cyan-300">
              {formatRupiah(kpis.totalActualCurrent)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Field: <span className="font-mono text-slate-300">{settings.salesValueField}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: ACHIEVEMENT */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">ACHIEVEMENT</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-slate-100 flex items-center gap-1.5">
              <span>{kpis.achievementRate !== null ? `${kpis.achievementRate.toFixed(1)}%` : 'N/A'}</span>
              {kpis.achievementRate !== null && (
                <span className={`text-[10px] font-sans px-1.5 py-0.2 rounded font-bold uppercase ${
                  isAchieved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isAchieved ? 'Achieved' : 'Under'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {kpis.achievementRate !== null ? `${kpis.achievementRate >= 100 ? 'Melampaui Target' : 'Di Bawah Target'}` : 'Target belum ada'}
            </div>
          </div>
        </div>

        {/* KPI 4: GAP */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">GAP</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2.5">
            <div className={`text-lg font-bold font-mono ${kpis.gapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(kpis.gapValue >= 0 ? '+' : '') + formatRupiah(kpis.gapValue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Realisasi - Target
            </div>
          </div>
        </div>

        {/* KPI 5: GROWTH */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">GROWTH</span>
            {kpis.growthStatus === 'POSITIVE' ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2.5">
            <div className={`text-lg font-bold font-mono flex items-center gap-1 ${
              kpis.growthRate !== null && kpis.growthRate >= 0 ? 'text-emerald-400' : kpis.growthRate === null ? 'text-slate-400' : 'text-rose-400'
            }`}>
              <span>{formatPercent(kpis.growthRate)}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              vs {prevLabel} ({formatRupiah(kpis.totalActualPrevious)})
            </div>
          </div>
        </div>

        {/* KPI 6: TOTAL OUTLET AKTIF */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">TOTAL OUTLET AKTIF</span>
            <Store className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-slate-100">
              {kpis.totalActiveOutlets > 0 ? `${kpis.totalActiveOutlets} Toko` : 'N/A'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Master Active (STATUS: OK)
            </div>
          </div>
        </div>

        {/* KPI 7: OUTLET TRANSAKSI */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">OUTLET TRANSAKSI</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-emerald-300">
              {kpis.outletsTransactedCurrent} Toko
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Sales Value &gt; 0 pada {currLabel}
            </div>
          </div>
        </div>

        {/* KPI 8: OUTLET BELUM TRANSAKSI */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">OUTLET BELUM TRANSAKSI</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-amber-300">
              {kpis.outletsNotTransactedCurrent} Toko
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Outlet aktif minus transaksi
            </div>
          </div>
        </div>

        {/* KPI 9: RO % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold tracking-wider">RO % (REPEAT ORDER)</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold font-mono text-cyan-400">
              {kpis.totalActiveOutlets > 0 && kpis.repeatOrderRate !== null ? `${kpis.repeatOrderRate.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {kpis.outletsTransactedCurrent} / {kpis.totalActiveOutlets} Outlet
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
