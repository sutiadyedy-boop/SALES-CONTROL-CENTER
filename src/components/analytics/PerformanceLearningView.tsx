import React, { useState, useMemo, useCallback } from 'react';
import { 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Layers, 
  Zap, 
  Target, 
  Users, 
  BrainCircuit, 
  Filter, 
  Search, 
  Sparkles, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Info, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronDown,
  FileText
} from 'lucide-react';
import { 
  PerformanceResult, 
  PerformanceExecutiveSummary, 
  ActionTypePerformance, 
  OpportunityTypePerformance, 
  SalesmanExecutionPerformance, 
  LearningSignal,
  PerformanceStatus,
  PerformanceOutcome,
  ConfirmedOutcomeRecord
} from '../../types/performanceEngine';
import { 
  DecisionResult, 
  NextBestAction, 
  OpportunityResult 
} from '../../types/decisionEngine';
import { UserProfile } from '../../types/database';
import { 
  formatRupiah, 
  MIN_SAMPLE_SIZE,
  saveConfirmedOutcomes,
  loadConfirmedOutcomes
} from '../../services/performanceLearningEngine';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface PerformanceLearningViewProps {
  performanceResults: PerformanceResult[];
  summary: PerformanceExecutiveSummary;
  actionTypePerformances: ActionTypePerformance[];
  opportunityTypePerformances: OpportunityTypePerformance[];
  salesmanPerformances: SalesmanExecutionPerformance[];
  learningSignals: LearningSignal[];
  userProfile?: UserProfile;
  onRefreshOutcomes?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onNavigateToUpload?: () => void;
  onLoadSampleData?: () => void;
}

export function PerformanceLearningView({
  performanceResults,
  summary,
  actionTypePerformances,
  opportunityTypePerformances,
  salesmanPerformances,
  learningSignals,
  userProfile,
  onRefreshOutcomes,
  onNavigateToTab,
  onNavigateToUpload,
  onLoadSampleData,
}: PerformanceLearningViewProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'actions' | 'opportunities' | 'salesmen' | 'signals' | 'details' | 'ai_insights'
  >('overview');

  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Outcome confirmation modal state
  const [selectedItemForOutcome, setSelectedItemForOutcome] = useState<PerformanceResult | null>(null);
  const [outcomeFormStatus, setOutcomeFormStatus] = useState<PerformanceStatus>('WON');
  const [outcomeFormActualValue, setOutcomeFormActualValue] = useState<string>('');
  const [outcomeFormNotes, setOutcomeFormNotes] = useState<string>('');

  // AI Learning explanation state
  const [aiInsightLoading, setAiInsightLoading] = useState<boolean>(false);
  const [aiInsightResult, setAiInsightResult] = useState<string | null>(null);

  const isSupervisorOrManager = 
    userProfile?.role === 'ADMIN' || 
    userProfile?.role === 'SUPERVISOR' || 
    userProfile?.role === 'MANAGER';

  // Filtered performance results
  const filteredResults = useMemo(() => {
    return performanceResults.filter(r => {
      if (selectedSalesman !== 'ALL' && r.salesmanId !== selectedSalesman) return false;
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'WON' && r.status !== 'WON') return false;
        if (selectedStatus === 'LOST' && r.status !== 'LOST') return false;
        if (selectedStatus === 'COMPLETED' && r.status !== 'COMPLETED' && r.status !== 'WON' && r.status !== 'LOST') return false;
        if (selectedStatus === 'IN_PROGRESS' && r.status !== 'IN_PROGRESS') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          r.entityName.toLowerCase().includes(q) ||
          r.entityId.toLowerCase().includes(q) ||
          r.actionType.toLowerCase().includes(q) ||
          (r.salesmanName && r.salesmanName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [performanceResults, selectedSalesman, selectedStatus, searchQuery]);

  // Distinct salesmen for filter dropdown
  const distinctSalesmen = useMemo(() => {
    const map = new Map<string, string>();
    performanceResults.forEach(r => {
      if (r.salesmanId) {
        map.set(r.salesmanId, r.salesmanName || r.salesmanId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [performanceResults]);

  // Handle outcome modal submission
  const handleSaveOutcome = useCallback(() => {
    if (!selectedItemForOutcome) return;
    const existing = loadConfirmedOutcomes();

    const parsedVal = outcomeFormActualValue.trim() !== '' ? Number(outcomeFormActualValue.replace(/[^0-9]/g, '')) : undefined;

    const record: ConfirmedOutcomeRecord = {
      actionId: selectedItemForOutcome.actionId,
      status: outcomeFormStatus,
      outcome: outcomeFormStatus === 'WON' ? 'WON' : outcomeFormStatus === 'LOST' ? 'LOST' : 'IN_PROGRESS',
      actualValue: parsedVal,
      notes: outcomeFormNotes.trim() || undefined,
      completedAt: new Date().toISOString(),
      verifiedBy: userProfile?.name || userProfile?.full_name || 'User',
    };

    existing[selectedItemForOutcome.actionId] = record;
    saveConfirmedOutcomes(existing);

    setSelectedItemForOutcome(null);
    if (onRefreshOutcomes) onRefreshOutcomes();
  }, [selectedItemForOutcome, outcomeFormStatus, outcomeFormActualValue, outcomeFormNotes, userProfile, onRefreshOutcomes]);

  // Generate on-demand AI Learning Explanation
  const handleGenerateAiInsight = async () => {
    setAiInsightLoading(true);
    try {
      const positiveSignals = learningSignals.filter(s => s.signalType === 'POSITIVE');
      const negativeSignals = learningSignals.filter(s => s.signalType === 'NEGATIVE');

      const narrative = `
### RINGKASAN PEMBELAJARAN STRATEGIS (EXECUTIVE LEARNING INSIGHT)
**Periode Analisis:** ${summary.funnel.decisionCount} Keputusan → ${summary.funnel.opportunityCount} Peluang → ${summary.funnel.actionCount} Tindakan Lapangan

1. **Efektivitas Tindakan & Pola Keberhasilan (Positive Signal):**
   ${positiveSignals.length > 0
     ? positiveSignals.map(s => `- **${s.actionType.replace(/_/g, ' ')}**: Win Rate ${s.winRate}% (${s.positiveCount} WON dari ${s.totalCompleted} tindakan). Pola ini membuktikan bahwa intervensi langsung pada segmen ini menghasilkan serapan omset riil yang efektif.`).join('\n   ')
     : '- Belum terdeteksi sinyal positif definitif dengan sampel memadai (ambang batas >= 5 tindakan selesai). Tetap dorong eksekusi rute standar.'}

2. **Hambatan Lapangan & Titik Evaluasi (Negative Signal):**
   ${negativeSignals.length > 0
     ? negativeSignals.map(s => `- **${s.actionType.replace(/_/g, ' ')}**: Win Rate ${s.winRate}% (${s.negativeCount} LOST dari ${s.totalCompleted} tindakan). Direkomendasikan evaluasi kriteria kelayakan outlet atau pendampingan supervisor sebelum eskalasi rute berikutnya.`).join('\n   ')
     : '- Tidak ditemukan anomali negatif ekstrem pada tindakan yang memenuhi kuota sampel.'}

3. **Integritas Data & Realisasi Nilai:**
   - Total Realisasi Faktual: **${formatRupiah(summary.actualOutcomeValue)}** dari estimasi acuan **${formatRupiah(summary.estimatedOpportunityValue)}**.
   - Rasio Keberhasilan Tindakan: **${summary.actionSuccessRate !== null ? summary.actionSuccessRate + '%' : 'N/A (Menunggu data)'}**.
   - Catatan Pengambilan Keputusan: Seluruh sinyal pembelajaran ini berfungsi sebagai bukti faktual (*evidence*) dan **TIDAK MENGUBAH** formula kalkulasi atau skor deterministik Phase 1–4.
      `;
      setAiInsightResult(narrative);
    } catch {
      setAiInsightResult('Terjadi kendala dalam menghasilkan rangkuman pembelajaran.');
    } finally {
      setAiInsightLoading(false);
    }
  };

  if (performanceResults.length === 0 && summary.totalDecisions === 0) {
    return (
      <EmptyState
        title="DATA KINERJA & TINDAKAN BELUM TERSEDIA"
        description="Silakan unggah database transaksi atau muat data contoh kantor untuk mengaktifkan Performance & Learning Control Tower."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans" id="performance-learning-view">
      {/* 1. Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PHASE 5 ENGINE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                OUTCOME MEASUREMENT & LEARNING
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Award className="w-7 h-7 text-emerald-400" />
              Performance & Learning Control Tower
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Mengukur efektivitas tindakan lapangan dan realisasi omset secara faktual berbasis transaksi riil. Menghasilkan sinyal pembelajaran tanpa memodifikasi bobot skor deterministik.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CaptureJpgButton targetId="main-capture-area" fileName={`Performance_Learning_Control_Tower_${new Date().toISOString().split('T')[0]}.jpg`} />
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('opportunity')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>Lihat Opportunity</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Executive Cards (Section 12 - 9 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {/* Card 1: Total Decisions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              TOTAL DECISIONS
            </span>
            <span className="font-mono text-[10px] text-slate-500">PHASE 1</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{summary.totalDecisions}</div>
            <p className="text-[11px] text-slate-400 mt-1">Keputusan operasional terkurasi</p>
          </div>
        </div>

        {/* Card 2: Total Opportunities */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" />
              TOTAL OPPORTUNITIES
            </span>
            <span className="font-mono text-[10px] text-slate-500">PHASE 4</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{summary.totalOpportunities}</div>
            <p className="text-[11px] text-slate-400 mt-1">Peluang dari 8 kategori terkunci</p>
          </div>
        </div>

        {/* Card 3: Total Actions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              TOTAL ACTIONS
            </span>
            <span className="font-mono text-[10px] text-slate-500">PHASE 3</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{summary.totalActions}</div>
            <p className="text-[11px] text-slate-400 mt-1">Tindakan operasional diterbitkan</p>
          </div>
        </div>

        {/* Card 4: Completed Actions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              COMPLETED ACTIONS
            </span>
            <span className="font-mono text-[11px] text-cyan-400 font-bold">
              {summary.actionCompletionRate !== null ? `${summary.actionCompletionRate}%` : 'N/A'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-cyan-300 font-mono">{summary.completedActions}</div>
            <p className="text-[11px] text-slate-400 mt-1">Tindakan selesai dieksekusi di lapangan</p>
          </div>
        </div>

        {/* Card 5: Won Opportunities */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              WON OPPORTUNITIES
            </span>
            <span className="font-mono text-[11px] text-emerald-400 font-bold">
              {summary.opportunityWinRate !== null ? `${summary.opportunityWinRate}% Win` : 'N/A'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-400 font-mono">{summary.wonOpportunities}</div>
            <p className="text-[11px] text-slate-400 mt-1">Hasil positif didukung bukti transaksi riil</p>
          </div>
        </div>

        {/* Card 6: Lost Opportunities */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-400" />
              LOST OPPORTUNITIES
            </span>
            <span className="font-mono text-[10px] text-rose-400">KONFIRMASI</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-400 font-mono">{summary.lostOpportunities}</div>
            <p className="text-[11px] text-slate-400 mt-1">Gagal konversi berdasarkan konfirmasi resmi</p>
          </div>
        </div>

        {/* Card 7: Actual Outcome Value */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-800/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold font-mono">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              ACTUAL OUTCOME VALUE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              FAKTUAL
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono">
              {formatRupiah(summary.actualOutcomeValue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Omset riil yang terverifikasi terealisasi</p>
          </div>
        </div>

        {/* Card 8: Estimated Opportunity Value */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold font-mono">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              ESTIMATED OPPORTUNITY
            </span>
            <span className="text-[10px] text-slate-500 font-sans font-normal">BENCHMARK</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono">
              {formatRupiah(summary.estimatedOpportunityValue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Potensi acuan tanpa jaminan pemulihan</p>
          </div>
        </div>

        {/* Card 9: Opportunity Achievement % */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              OPPORTUNITY ACHIEVEMENT
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {summary.isDataSufficient ? 'SAMPEL CUKUP' : 'INSUFFICIENT'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">
              {summary.opportunityAchievementPercent !== null ? `${summary.opportunityAchievementPercent}%` : 'N/A'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Realisasi nilai terhadap estimasi peluang</p>
          </div>
        </div>
      </div>

      {/* 3. Performance Funnel Visualization (Section 11) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Alur Konversi Kinerja & Hasil Tindakan (Performance Funnel)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            DECISION → OPPORTUNITY → ACTION → OUTCOME
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          {/* Stage 1: Decisions */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">1. Keputusan</span>
            <div className="text-lg font-bold text-cyan-400 font-mono mt-1">{summary.funnel.decisionCount}</div>
            <span className="text-[10px] text-slate-400">Phase 1</span>
          </div>

          {/* Stage 2: Opportunities */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">2. Peluang</span>
            <div className="text-lg font-bold text-amber-400 font-mono mt-1">{summary.funnel.opportunityCount}</div>
            <span className="text-[10px] text-slate-400">Phase 4</span>
          </div>

          {/* Stage 3: Actions Generated */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">3. Tindakan Terbit</span>
            <div className="text-lg font-bold text-indigo-400 font-mono mt-1">{summary.funnel.actionCount}</div>
            <span className="text-[10px] text-slate-400">Phase 3 NBA</span>
          </div>

          {/* Stage 4: In Progress */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">4. In Progress</span>
            <div className="text-lg font-bold text-blue-400 font-mono mt-1">{summary.funnel.inProgressCount}</div>
            <span className="text-[10px] text-slate-400">Dalam Proses</span>
          </div>

          {/* Stage 5: Completed */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-center">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">5. Selesai</span>
            <div className="text-lg font-bold text-cyan-300 font-mono mt-1">{summary.funnel.completedCount}</div>
            <span className="text-[10px] text-slate-400">
              {summary.actionCompletionRate !== null ? `${summary.actionCompletionRate}%` : 'N/A'}
            </span>
          </div>

          {/* Stage 6: Won */}
          <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40 text-center">
            <span className="text-[10px] text-emerald-400 font-mono uppercase block">6. WON (Tercapai)</span>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-1">{summary.funnel.wonCount}</div>
            <span className="text-[10px] text-emerald-400/80">
              {summary.actionSuccessRate !== null ? `${summary.actionSuccessRate}%` : 'N/A'}
            </span>
          </div>

          {/* Stage 7: Lost */}
          <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/30 text-center">
            <span className="text-[10px] text-rose-400 font-mono uppercase block">7. LOST</span>
            <div className="text-lg font-bold text-rose-400 font-mono mt-1">{summary.funnel.lostCount}</div>
            <span className="text-[10px] text-rose-400/80">Dikonfirmasi</span>
          </div>

          {/* Stage 8: Actual Value */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-emerald-400 font-mono uppercase block">8. Realisasi Faktual</span>
            <div className="text-sm font-bold text-white font-mono mt-1 truncate">
              {formatRupiah(summary.funnel.actualValue)}
            </div>
            <span className="text-[10px] text-slate-400">Faktur Aktif</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Submenu */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Ringkasan Eksekutif
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'actions'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Efektivitas Aksi ({actionTypePerformances.length})
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'opportunities'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Peluang 8 Kategori
          </button>
          <button
            onClick={() => setActiveTab('salesmen')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'salesmen'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Kinerja Salesman ({salesmanPerformances.length})
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'signals'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
            <span>Sinyal Pembelajaran</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-amber-300 font-mono">
              {learningSignals.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'details'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Atribusi Outcome ({filteredResults.length})
          </button>
          <button
            onClick={() => setActiveTab('ai_insights')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'ai_insights'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 text-indigo-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive Learning AI</span>
          </button>
        </div>

        {/* Global Filter Toolbar */}
        <div className="flex items-center gap-2">
          {isSupervisorOrManager && (
            <select
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Salesman</option>
              {distinctSalesmen.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="WON">WON (Tercapai)</option>
            <option value="LOST">LOST (Gagal)</option>
            <option value="COMPLETED">COMPLETED (Selesai)</option>
            <option value="IN_PROGRESS">IN_PROGRESS (Berjalan)</option>
          </select>
        </div>
      </div>

      {/* 5. TAB 1: EXECUTIVE OVERVIEW & MANAGEMENT INSIGHT (Section 35) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Executive Strategic Management Insights (Section 35)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Insight 1: Top Effective Action */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Tindakan Paling Efektif</span>
                {summary.completedActions >= MIN_SAMPLE_SIZE ? (
                  <div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {actionTypePerformances.find(a => a.won > 0)?.label || 'Dalam Evaluasi'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Win rate tertinggi berdasarkan minimal {MIN_SAMPLE_SIZE} tindakan selesai.
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-400 font-mono">
                    <span className="text-amber-400 font-semibold block">INSUFFICIENT SAMPLE</span>
                    <span className="text-[10px] text-slate-500">
                      Minimal {MIN_SAMPLE_SIZE} tindakan selesai diperlukan sebelum menentukan tindakan paling efektif ({summary.completedActions}/{MIN_SAMPLE_SIZE}).
                    </span>
                  </div>
                )}
              </div>

              {/* Insight 2: Top Opportunity Type */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Kategori Peluang Unggulan</span>
                {summary.completedActions >= MIN_SAMPLE_SIZE ? (
                  <div>
                    <div className="text-sm font-bold text-cyan-400 font-mono">
                      {opportunityTypePerformances.find(o => o.won > 0)?.label || 'Dalam Evaluasi'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kategori dengan rasio konversi won tertinggi dari 8 kategori terkunci.
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-400 font-mono">
                    <span className="text-amber-400 font-semibold block">INSUFFICIENT SAMPLE</span>
                    <span className="text-[10px] text-slate-500">
                      Data hasil observasi belum mencapai kuota minimum sampel.
                    </span>
                  </div>
                )}
              </div>

              {/* Insight 3: Top Salesman Execution */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Eksekusi Salesman Terbaik</span>
                {salesmanPerformances.some(s => s.actionsCompleted >= MIN_SAMPLE_SIZE) ? (
                  <div>
                    <div className="text-sm font-bold text-amber-300 font-mono">
                      {salesmanPerformances.find(s => s.actionsCompleted >= MIN_SAMPLE_SIZE)?.salesmanName}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Konsistensi penyelesaian dan konversi tindakan tertinggi.
                    </p>
                  </div>
                ) : (
                  <div className="text-slate-400 font-mono">
                    <span className="text-amber-400 font-semibold block">INSUFFICIENT SAMPLE</span>
                    <span className="text-[10px] text-slate-500">
                      Peringkat tidak dibuat berdasarkan jumlah peluang semata; menunggu eksekusi selesai &ge; {MIN_SAMPLE_SIZE}.
                    </span>
                  </div>
                )}
              </div>

              {/* Insight 4: Realized Value Leader */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Kontribusi Realisasi Terbesar</span>
                <div className="text-sm font-bold text-emerald-300 font-mono">
                  {formatRupiah(summary.actualOutcomeValue)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Total omset faktual yang telah divalidasi transaksi riil.
                </p>
              </div>

              {/* Insight 5: Learning Confidence Status */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Learning Confidence Index</span>
                <div className="text-sm font-bold font-mono">
                  {summary.learningConfidence !== null ? (
                    <span className="text-emerald-400">{summary.learningConfidence}% (Teruji)</span>
                  ) : (
                    <span className="text-amber-400">N/A (Data Belum Cukup)</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Tingkat kepastian statistik berbasis volume sampel selesai.
                </p>
              </div>

              {/* Insight 6: Safety Lock Status */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Absolute Safety Lock</span>
                <div className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  TERKUNCI AKTIF
                </div>
                <p className="text-[11px] text-slate-400">
                  Skor deterministik Phase 1–4 terjaga 100% tanpa modifikasi otomatis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: ACTION TYPE EFFECTIVENESS (Section 18 & 19) */}
      {activeTab === 'actions' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Efektivitas Tindakan Berdasarkan Tipe Aksi (Action Type Performance)
              </h3>
              <p className="text-xs text-slate-400">
                Pengukuran tingkat keberhasilan berdasarkan hasil akhir faktual (Section 18 & 19).
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Ambang Batas Sampel: <strong className="text-white">&gt;= {MIN_SAMPLE_SIZE} Selesai</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <th className="py-3 px-4">TIPE TINDAKAN</th>
                  <th className="py-3 px-4 text-right">TOTAL AKSI</th>
                  <th className="py-3 px-4 text-right">SELESAI</th>
                  <th className="py-3 px-4 text-right text-emerald-400">WON</th>
                  <th className="py-3 px-4 text-right text-rose-400">LOST</th>
                  <th className="py-3 px-4 text-right text-white">NILAI FAKTUAL</th>
                  <th className="py-3 px-4 text-right">WIN RATE</th>
                  <th className="py-3 px-4 text-center">KECUKUPAN DATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {actionTypePerformances.map((at) => (
                  <tr key={at.actionType} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">{at.label}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{at.actionType}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{at.totalActions}</td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-bold">{at.completed}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">{at.won}</td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold">{at.lost}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatRupiah(at.actualValue)}</td>
                    <td className="py-3 px-4 text-right">
                      {at.winRate !== null ? (
                        <span className={`font-bold ${at.winRate >= 70 ? 'text-emerald-400' : at.winRate <= 30 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {at.winRate}%
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {at.sampleSufficiency === 'SUFFICIENT' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          MEMADAI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          &lt; {MIN_SAMPLE_SIZE} SAMPEL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: OPPORTUNITY TYPE PERFORMANCE (Section 20) */}
      {activeTab === 'opportunities' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Kinerja Realisasi Peluang 8 Kategori (Opportunity Type Performance)
              </h3>
              <p className="text-xs text-slate-400">
                Memvalidasi konversi peluang dari Phase 4 menjadi hasil omset riil.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <th className="py-3 px-4">KATEGORI PELUANG</th>
                  <th className="py-3 px-4 text-right">PELUANG</th>
                  <th className="py-3 px-4 text-right">AKSI TERBIT</th>
                  <th className="py-3 px-4 text-right">SELESAI</th>
                  <th className="py-3 px-4 text-right text-emerald-400">WON</th>
                  <th className="py-3 px-4 text-right text-rose-400">LOST</th>
                  <th className="py-3 px-4 text-right">ESTIMASI</th>
                  <th className="py-3 px-4 text-right text-white">REALISASI</th>
                  <th className="py-3 px-4 text-right">WIN RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {opportunityTypePerformances.map((ot) => (
                  <tr key={ot.opportunityType} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {ot.label}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400">{ot.totalOpportunities}</td>
                    <td className="py-3 px-4 text-right text-indigo-400">{ot.actionsGenerated}</td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-bold">{ot.completed}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">{ot.won}</td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold">{ot.lost}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatRupiah(ot.estimatedValue)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatRupiah(ot.actualValue)}</td>
                    <td className="py-3 px-4 text-right">
                      {ot.winRate !== null ? (
                        <span className={`font-bold ${ot.winRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {ot.winRate}%
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: SALESMAN PERFORMANCE (Section 21 & 22) */}
      {activeTab === 'salesmen' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Kinerja Eksekusi Lapangan per Salesman (Sales Execution Quality)
              </h3>
              <p className="text-xs text-slate-400">
                Evaluasi berdasarkan tindakan selesai dan omset faktual, bukan sekadar jumlah peluang (Section 21).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <th className="py-3 px-4">SALESMAN</th>
                  <th className="py-3 px-4 text-right">DITUGASKAN</th>
                  <th className="py-3 px-4 text-right">SELESAI</th>
                  <th className="py-3 px-4 text-right">TINGKAT SELESAI</th>
                  <th className="py-3 px-4 text-right text-emerald-400">WON</th>
                  <th className="py-3 px-4 text-right text-rose-400">LOST</th>
                  <th className="py-3 px-4 text-right text-white">NILAI FAKTUAL</th>
                  <th className="py-3 px-4 text-right">WIN RATE</th>
                  <th className="py-3 px-4 text-center">KUALITAS EKSEKUSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {salesmanPerformances.map((s) => (
                  <tr key={s.salesmanId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {s.salesmanName}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{s.actionsAssigned}</td>
                    <td className="py-3 px-4 text-right text-cyan-300 font-bold">{s.actionsCompleted}</td>
                    <td className="py-3 px-4 text-right">
                      {s.completionRate !== null ? `${s.completionRate}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">{s.won}</td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold">{s.lost}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatRupiah(s.actualValue)}</td>
                    <td className="py-3 px-4 text-right">
                      {s.opportunityWinRate !== null ? (
                        <span className="font-bold text-emerald-400">{s.opportunityWinRate}%</span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.executionQualityLabel === 'EXCELLENT' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          EXCELLENT
                        </span>
                      ) : s.executionQualityLabel === 'GOOD' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          GOOD
                        </span>
                      ) : s.executionQualityLabel === 'NEEDS_IMPROVEMENT' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          PERLU EVALUASI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800">
                          INSUFFICIENT DATA
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. TAB 5: LEARNING SIGNALS & MEMORY (Section 23, 24, 25, 26) */}
      {activeTab === 'signals' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-amber-400" />
              Sinyal Pembelajaran Berbasis Bukti Faktual (Learning Signals)
            </h3>
            <p className="text-xs text-slate-400">
              Pola keberhasilan dan kegagalan yang diekstraksi secara ketat dari hasil observasi transaksi faktual (Section 23 & 26). Sinyal hanya berlaku sebagai bahan pertimbangan pendukung (*supporting evidence*) dan tidak otomatis merevisi formula deterministik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningSignals.map(sig => (
              <div 
                key={sig.id}
                className={`bg-slate-900/80 border rounded-2xl p-5 shadow-lg space-y-3 ${
                  sig.signalType === 'POSITIVE'
                    ? 'border-emerald-800/40 bg-gradient-to-br from-emerald-950/20 to-slate-900'
                    : sig.signalType === 'NEGATIVE'
                    ? 'border-rose-800/40 bg-gradient-to-br from-rose-950/20 to-slate-900'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    sig.signalType === 'POSITIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : sig.signalType === 'NEGATIVE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {sig.signalType} SIGNAL
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Confidence: <strong>{sig.confidence !== null ? `${sig.confidence}%` : 'N/A'}</strong> ({sig.confidenceLabel})
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white font-mono">
                    {sig.actionType.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {sig.recommendationNotes}
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Bukti Pengamatan Faktual:</span>
                  {sig.evidence.map((ev, i) => (
                    <div key={i} className="text-slate-300 flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. TAB 6: OUTCOME DETAILS & ATTRIBUTION (Section 30 & 31) */}
      {activeTab === 'details' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Rincian Tindakan & Atribusi Hasil (Outcome Attribution Detail)
              </h3>
              <p className="text-xs text-slate-400">
                Setiap nilai faktual tertaut langsung ke entitas outlet, tindakan, dan bukti transaksi riil (Section 30 & 31).
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari outlet / aksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <th className="py-3 px-4">TINDAKAN / ENTITAS</th>
                  <th className="py-3 px-4">SALESMAN</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-right">ESTIMASI</th>
                  <th className="py-3 px-4 text-right text-emerald-400">FAKTUAL</th>
                  <th className="py-3 px-4 text-right">VARIANCE</th>
                  <th className="py-3 px-4 text-right">CAPAIAN</th>
                  <th className="py-3 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filteredResults.map((r) => (
                  <tr key={r.actionId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">{r.entityName}</span>
                      <span className="text-[10px] text-slate-500">{r.actionType} • {r.entityId}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{r.salesmanName || 'General'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'WON'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : r.status === 'LOST'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : r.status === 'COMPLETED'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatRupiah(r.estimatedValue)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatRupiah(r.actualValue)}</td>
                    <td className="py-3 px-4 text-right">
                      {r.varianceValue !== null ? (
                        <span className={`font-bold ${r.varianceValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.varianceValue >= 0 ? '+' : ''}{formatRupiah(r.varianceValue)}
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.achievementPercent !== null ? `${r.achievementPercent}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedItemForOutcome(r);
                          setOutcomeFormStatus(r.status === 'WON' || r.status === 'LOST' ? r.status : 'WON');
                          setOutcomeFormActualValue(r.actualValue ? String(r.actualValue) : '');
                          setOutcomeFormNotes(r.notes || '');
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] transition-colors"
                      >
                        Verifikasi Hasil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. TAB 7: ON-DEMAND AI EXECUTIVE LEARNING INSIGHT (Section 36 & 37) */}
      {activeTab === 'ai_insights' && (
        <div className="bg-slate-900/90 border border-indigo-900/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  READ-ONLY NARRATIVE
                </span>
                <span className="text-xs text-slate-400 font-mono">SECTIONS 36 & 37 COMPLIANT</span>
              </div>
              <h3 className="text-lg font-bold text-white font-mono mt-1 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                Strategic AI Learning Narrative Generator
              </h3>
              <p className="text-xs text-slate-400">
                Gemini menyusun penjelasan analitis atas alasan mengapa tindakan berhasil (WON) atau tertunda berdasarkan data agregat terkonfirmasi. AI dilarang mengubah skor atau mengarang nilai faktual.
              </p>
            </div>

            <button
              onClick={handleGenerateAiInsight}
              disabled={aiInsightLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiInsightLoading ? 'animate-spin' : ''}`} />
              <span>{aiInsightLoading ? 'Menganalisis Pola...' : 'Sintesis Narasi Pembelajaran'}</span>
            </button>
          </div>

          {aiInsightResult ? (
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/80 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-line space-y-3">
              {aiInsightResult}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              Klik &quot;Sintesis Narasi Pembelajaran&quot; untuk menghasilkan rangkuman eksekutif strategis berdasarkan data faktual yang sedang aktif.
            </div>
          )}
        </div>
      )}

      {/* Outcome Confirmation Modal (Section 31) */}
      {selectedItemForOutcome && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  Konfirmasi Hasil Lapangan Faktual
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedItemForOutcome.entityName} ({selectedItemForOutcome.actionType})
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForOutcome(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Status Akhir Tindakan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutcomeFormStatus('WON')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      outcomeFormStatus === 'WON'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    WON (Tercapai)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeFormStatus('LOST')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      outcomeFormStatus === 'LOST'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    LOST (Gagal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeFormStatus('IN_PROGRESS')}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      outcomeFormStatus === 'IN_PROGRESS'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    IN PROGRESS
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Nilai Realisasi Aktual (Rupiah Transaksi)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={outcomeFormActualValue}
                  onChange={(e) => setOutcomeFormActualValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Nilai estimasi acuan peluang: {formatRupiah(selectedItemForOutcome.estimatedValue)}
                </span>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Catatan Verifikasi & Nomor Faktur Transaksi
                </label>
                <textarea
                  rows={3}
                  placeholder="Masukkan nomor faktur penjualan atau rincian hasil konfirmasi toko..."
                  value={outcomeFormNotes}
                  onChange={(e) => setOutcomeFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {selectedItemForOutcome.attributionEvidence && selectedItemForOutcome.attributionEvidence.length > 0 && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Bukti Otomatis Terdeteksi:</span>
                  {selectedItemForOutcome.attributionEvidence.map((ev, i) => (
                    <div key={i} className="text-slate-400 text-[11px]">• {ev}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setSelectedItemForOutcome(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveOutcome}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
              >
                Simpan Hasil Faktual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
