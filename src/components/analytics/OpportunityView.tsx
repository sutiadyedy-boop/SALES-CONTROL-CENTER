import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Store, 
  AlertOctagon, 
  TrendingDown, 
  Award, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Sparkles,
  Layers,
  Package,
  Target,
  TrendingUp,
  User,
  ShieldCheck,
  Eye,
  Check,
  X,
  RefreshCw,
  MessageSquare,
  DollarSign,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { OpportunityItem, InsightClassification } from '../../types/analytics';
import { 
  OpportunityResult, 
  OpportunityType, 
  OpportunityStatus, 
  OpportunityOutcome,
  DecisionContext, 
  DecisionResult, 
  NextBestAction,
  AiExplanationResult
} from '../../types/decisionEngine';
import { UserProfile } from '../../types/database';
import { 
  computeOpportunitySummary, 
  filterOpportunitiesByUserRole,
  getTopOpportunities,
  PersistedOpportunityState
} from '../../services/opportunityIntelligenceEngine';
import { formatRupiah } from '../../services/smartInsightEngine';
import { fetchAiExplanation } from '../../services/aiExplanationService';
import { soundManager } from '../../services/soundManager';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface OpportunityViewProps {
  opportunities: OpportunityItem[];
  opportunityResults?: OpportunityResult[];
  context?: DecisionContext | null;
  decisions?: DecisionResult[];
  nbaActions?: NextBestAction[];
  userProfile?: UserProfile | null;
  onUpdateOpportunityState?: (oppId: string, newState: PersistedOpportunityState) => void;
  onNavigateToTab?: (tab: string) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
  onNavigateToActionMonitoring?: () => void;
}

export function OpportunityView({
  opportunities,
  opportunityResults = [],
  context = null,
  decisions = [],
  nbaActions = [],
  userProfile,
  onUpdateOpportunityState,
  onNavigateToTab,
  onNavigateToUpload,
  onLoadSampleData,
  onNavigateToActionMonitoring,
}: OpportunityViewProps) {
  // Top Navigation Mode: Phase 4 Opportunity Intelligence vs Phase 1-3 Legacy Radar
  const [engineMode, setEngineMode] = useState<'intelligence' | 'radar'>('intelligence');

  // Role checks
  const isSalesman = userProfile?.role === 'SALESMAN';
  const isSupervisorOrManager = userProfile?.role === 'SUPERVISOR' || userProfile?.role === 'MANAGER' || userProfile?.role === 'ADMIN';

  // Sub-tab for Phase 4: MY OPPORTUNITIES vs CONTROL TOWER
  const [activeSubTab, setActiveSubTab] = useState<'my_opps' | 'control_tower' | 'all'>(
    isSalesman ? 'my_opps' : 'control_tower'
  );

  // Filters for Phase 4
  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Filters for Legacy Radar
  const [selectedClassification, setSelectedClassification] = useState<InsightClassification | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [detailOpportunity, setDetailOpportunity] = useState<OpportunityResult | null>(null);
  const [outcomeTarget, setOutcomeTarget] = useState<OpportunityResult | null>(null);
  const [outcomeStatusInput, setOutcomeStatusInput] = useState<'WON' | 'LOST'>('WON');
  const [outcomeValueInput, setOutcomeValueInput] = useState<string>('');
  const [outcomeNotesInput, setOutcomeNotesInput] = useState<string>('');

  // AI "Why This Opportunity?" Modal
  const [aiExplainOpp, setAiExplainOpp] = useState<OpportunityResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AiExplanationResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Distinct salesmen for filters
  const distinctSalesmen = useMemo(() => {
    const map = new Map<string, string>();
    opportunityResults.forEach(o => {
      if (o.salesmanName) {
        map.set(o.salesmanId || o.salesmanName, o.salesmanName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [opportunityResults]);

  // Role-filtered baseline
  const roleBaseOpps = useMemo(() => {
    if (activeSubTab === 'my_opps') {
      return filterOpportunitiesByUserRole(opportunityResults, userProfile);
    }
    return opportunityResults;
  }, [opportunityResults, activeSubTab, userProfile]);

  // Fully filtered opportunities list
  const filteredOpps = useMemo(() => {
    return roleBaseOpps.filter(o => {
      if (selectedSalesman !== 'ALL' && o.salesmanId !== selectedSalesman && o.salesmanName !== selectedSalesman) {
        return false;
      }
      if (selectedType !== 'ALL' && o.opportunityType !== selectedType) {
        return false;
      }
      if (selectedPriority !== 'ALL') {
        if (selectedPriority === 'HIGH' && o.priorityScore < 70) return false;
        if (selectedPriority === 'MEDIUM' && (o.priorityScore < 40 || o.priorityScore >= 70)) return false;
        if (selectedPriority === 'LOW' && o.priorityScore >= 40) return false;
      }
      if (selectedStatus !== 'ALL' && o.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [roleBaseOpps, selectedSalesman, selectedType, selectedPriority, selectedStatus]);

  // Top 10 for salesman focus
  const displayOpps = useMemo(() => {
    if (activeSubTab === 'my_opps') {
      return getTopOpportunities(filteredOpps, 10);
    }
    return filteredOpps;
  }, [activeSubTab, filteredOpps]);

  // Summary Metrics
  const summary = useMemo(() => {
    return computeOpportunitySummary(opportunityResults);
  }, [opportunityResults]);

  // Handlers
  const handleOpenOutcomeModal = (opp: OpportunityResult, status: 'WON' | 'LOST') => {
    soundManager.playClick();
    setOutcomeTarget(opp);
    setOutcomeStatusInput(status);
    setOutcomeValueInput(opp.opportunityValue ? String(opp.opportunityValue) : '');
    setOutcomeNotesInput(status === 'WON' ? 'Berhasil konversi transaksi' : 'Toko belum bersedia order');
  };

  const handleConfirmOutcome = () => {
    if (!outcomeTarget || !onUpdateOpportunityState) return;
    soundManager.playSuccess();

    const numericVal = outcomeValueInput.trim() !== '' ? Number(outcomeValueInput.replace(/[^0-9]/g, '')) : undefined;

    const outcome: OpportunityOutcome = {
      actualValue: isNaN(numericVal as number) ? undefined : numericVal,
      wonAt: new Date().toISOString(),
      notes: outcomeNotesInput,
      result: outcomeStatusInput === 'WON' ? 'Tercapai Transaksi' : 'Belum Berhasil',
    };

    onUpdateOpportunityState(outcomeTarget.id, {
      status: outcomeStatusInput,
      outcome,
      notes: outcomeNotesInput,
      updatedAt: new Date().toISOString(),
    });

    setOutcomeTarget(null);
  };

  const handleOpenAiExplain = async (opp: OpportunityResult) => {
    soundManager.playClick();
    setAiExplainOpp(opp);
    setIsAiLoading(true);
    setAiExplanation(null);

    const matchingDecision = decisions.find(d => d.id === opp.linkedDecisionId) || {
      id: opp.id,
      category: opp.opportunityType === 'OUTLET_RECOVERY' ? 'DROP_OUTLET_RECOVERY' : 'SKU_OPPORTUNITY',
      entityType: opp.entityType,
      entityId: opp.entityId,
      entityName: opp.entityName,
      priorityScore: opp.priorityScore,
      riskScore: 50,
      opportunityScore: opp.opportunityScore,
      status: opp.priorityScore >= 80 ? 'CRITICAL' : opp.priorityScore >= 60 ? 'HIGH' : 'MEDIUM',
      riskStatus: 'MEDIUM',
      what: opp.reason,
      why: opp.reason,
      impact: opp.opportunityValue ? `Estimasi potensi omset ${formatRupiah(opp.opportunityValue)}` : 'Penguatan distribusi',
      recommendedAction: opp.recommendedAction,
      expectedImpact: opp.opportunityValue ? `Estimasi nilai recovery ${formatRupiah(opp.opportunityValue)}` : 'Peningkatan penjualan',
      evidence: opp.evidence,
      confidence: opp.confidence / 100,
      sourcePeriod: opp.sourcePeriod,
      generatedAt: opp.createdAt,
      engineVersion: 'v1.0-deterministic',
    } as DecisionResult;

    try {
      const exp = await fetchAiExplanation(matchingDecision, context);
      setAiExplanation(exp);
    } catch {
      // Graceful fallback
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper for Opportunity Type Meta
  const getTypeMeta = (type: OpportunityType) => {
    switch (type) {
      case 'OUTLET_RECOVERY':
        return { label: 'Outlet Recovery', icon: Store, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      case 'SKU_CROSS_SELL':
        return { label: 'SKU Cross-Sell', icon: Package, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'MARK_NEW_CROSS_SELL':
        return { label: 'MARK NEW Cross-Sell', icon: Sparkles, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'EC_EXPANSION':
        return { label: 'Ekspansi EC', icon: Target, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'OUTLET_DEVELOPMENT':
        return { label: 'Pengembangan Keranjang', icon: TrendingUp, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'SKU_PENETRATION':
        return { label: 'Penetrasi SKU', icon: Layers, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' };
      case 'SALESMAN_OPPORTUNITY':
        return { label: 'Peluang Salesman', icon: User, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'REPEAT_OUTLET_GROWTH':
        return { label: 'Pertumbuhan Repeat', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: OpportunityStatus) => {
    switch (status) {
      case 'WON':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">WON</span>;
      case 'LOST':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">LOST</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">IN PROGRESS</span>;
      case 'ACTIONED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">ACTIONED</span>;
      case 'QUALIFIED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">QUALIFIED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-500/20 text-slate-300 border border-slate-700">NEW</span>;
    }
  };

  if (opportunities.length === 0 && opportunityResults.length === 0) {
    return (
      <EmptyState
        title="DATA BELUM TERSEDIA"
        description="Silakan unggah database transaksi kantor untuk memproses analisis peluang omset tersembunyi."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold tracking-wider rounded-md uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                PHASE 4 — OPPORTUNITY INTELLIGENCE ENGINE
              </span>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                EVIDENCE-BASED RECOVERY
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Zap className="w-7 h-7 text-amber-400 fill-amber-400/20" />
              Opportunity Intelligence & Recovery Center
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              Eksplorasi celah omset riil berdasarkan pola transaksi: Pemulihan Toko Drop, Cross-sell SKU Unggulan, Penetrasi MARK NEW / Eceran, dan Ekspansi EC.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Engine Mode Toggle */}
            <div className="bg-slate-950/90 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setEngineMode('intelligence');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  engineMode === 'intelligence'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Intelligence (Phase 4)
              </button>
              <button
                onClick={() => {
                  soundManager.playClick();
                  setEngineMode('radar');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  engineMode === 'radar'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Radar Asli (Phase 1–3)
              </button>
            </div>

            {onNavigateToActionMonitoring && (
              <button
                onClick={onNavigateToActionMonitoring}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>Action Monitoring</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MODE: OPPORTUNITY INTELLIGENCE (PHASE 4) */}
      {engineMode === 'intelligence' && (
        <div className="space-y-6">
          {/* Section 24 & 25: Executive Opportunity Dashboard & ESTIMATED OPPORTUNITY CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Estimated Opportunity Value Card (Section 25) */}
            <div className="bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border border-amber-900/40 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-amber-400 uppercase font-mono flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    ESTIMATED OPPORTUNITY
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Confidence: {summary.averageConfidence}%
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  {formatRupiah(summary.totalOpportunityValue)}
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  *ESTIMATED OPPORTUNITY VALUE — REFERENCE / BENCHMARK (NON-GUARANTEED RECOVERY).
                </p>
              </div>

              {/* Breakdown counts */}
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Outlet Recovery:</span>
                  <span className="font-bold text-rose-400 font-mono">{summary.outletRecoveryCount} peluang</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">SKU Cross-Sell:</span>
                  <span className="font-bold text-cyan-400 font-mono">{summary.skuCrossSellCount} peluang</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">MARK NEW Eceran:</span>
                  <span className="font-bold text-amber-400 font-mono">{summary.markNewCount} peluang</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Ekspansi EC:</span>
                  <span className="font-bold text-purple-400 font-mono">{summary.ecExpansionCount} peluang</span>
                </div>
              </div>
            </div>

            {/* Card 2: Status & Outcome Pipeline */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Pipeline Kualifikasi & Outcome
                </h3>
                <div className="text-2xl font-bold text-white font-mono">
                  {summary.totalOpportunities} <span className="text-xs text-slate-400 font-sans font-normal">total peluang teridentifikasi</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Qualified</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">{summary.qualifiedCount}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400">Actioned</div>
                  <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">{summary.actionedCount}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-emerald-400 font-bold">WON (Tercapai)</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">{summary.wonCount}</div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Realisasi WON:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatRupiah(summary.totalWonValue)}
                </span>
              </div>
            </div>

            {/* Card 3: Quick Navigation to Next Best Action */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Integrasi Tindakan Operasional (NBA)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Peluang yang sudah terkualifikasi langsung terhubung dengan Next Best Action untuk dieksekusi oleh salesman di lapangan.
                </p>
              </div>

              <div className="space-y-2">
                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('next_best_action')}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-md"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    Buka Next Best Action Center
                  </button>
                )}
                <div className="text-[11px] text-center text-slate-500">
                  Data → Decision → Opportunity → NBA → Outcome
                </div>
              </div>
            </div>
          </div>

          {/* Sub-tab Selector: MY OPPORTUNITIES vs CONTROL TOWER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveSubTab('my_opps');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeSubTab === 'my_opps'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                MY OPPORTUNITIES
                {isSalesman && <span className="ml-1 text-[10px] font-mono">(Top 10)</span>}
              </button>

              {isSupervisorOrManager && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveSubTab('control_tower');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    activeSubTab === 'control_tower'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Target className="w-4 h-4 text-indigo-300" />
                  OPPORTUNITY CONTROL TOWER
                </button>
              )}

              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveSubTab('all');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeSubTab === 'all'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                SEMUA PELUANG ({opportunityResults.length})
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Menampilkan <strong className="text-white">{displayOpps.length}</strong> peluang terkurasi
            </div>
          </div>

          {/* Section 31: CONTROL TOWER BREAKDOWNS (when activeSubTab === 'control_tower') */}
          {activeSubTab === 'control_tower' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Target className="w-4 h-4 text-indigo-400" />
                Distribusi Potensi Nilai Peluang Cabang (Control Tower)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {Object.entries(summary.byOpportunityType).map(([typeKey, data]) => {
                  const meta = getTypeMeta(typeKey as OpportunityType);
                  const Icon = meta.icon;
                  return (
                    <div key={typeKey} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold truncate">{meta.label}</span>
                      </div>
                      <div className="text-base font-bold text-white font-mono mt-1">
                        {typeKey === 'SALESMAN_OPPORTUNITY' && (!summary.isSalesmanTargetLinked || data.count === 0)
                          ? 'N/A'
                          : formatRupiah(data.value)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {typeKey === 'SALESMAN_OPPORTUNITY' && (!summary.isSalesmanTargetLinked || data.count === 0)
                          ? 'TARGET SALESMAN NOT LINKED'
                          : `${data.count} entitas sasaran`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Toolbar (Section 29) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                Filter:
              </div>

              {isSupervisorOrManager && (
                <select
                  value={selectedSalesman}
                  onChange={(e) => setSelectedSalesman(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Salesman ({distinctSalesmen.length})</option>
                  {distinctSalesmen.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Kategori Peluang (8 Tipe)</option>
                <option value="OUTLET_RECOVERY">Outlet Recovery (Toko Drop)</option>
                <option value="SKU_CROSS_SELL">SKU Cross-Sell</option>
                <option value="MARK_NEW_CROSS_SELL">MARK NEW / Eceran</option>
                <option value="EC_EXPANSION">Ekspansi EC</option>
                <option value="OUTLET_DEVELOPMENT">Pengembangan Keranjang</option>
                <option value="SKU_PENETRATION">Penetrasi SKU</option>
                <option value="SALESMAN_OPPORTUNITY">Peluang Salesman</option>
                <option value="REPEAT_OUTLET_GROWTH">Pertumbuhan Repeat</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="HIGH">Tinggi (Score ≥ 70)</option>
                <option value="MEDIUM">Menengah (Score 40–69)</option>
                <option value="LOW">Rendah (Score &lt; 40)</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WON">WON (Berhasil)</option>
                <option value="LOST">LOST</option>
              </select>
            </div>
          </div>

          {/* Section 26: TOP OPPORTUNITIES LIST CARDS */}
          <div className="space-y-3.5">
            {displayOpps.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                Tidak ada peluang yang cocok dengan filter yang dipilih.
              </div>
            ) : (
              displayOpps.map((opp) => {
                const meta = getTypeMeta(opp.opportunityType);
                const Icon = meta.icon;

                return (
                  <div
                    key={opp.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md hover:shadow-lg"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Info, Reason, Evidence */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {meta.label}
                          </span>
                          {renderStatusBadge(opp.status)}
                          <span className="text-xs font-mono text-slate-400">
                            Confidence: <strong className="text-amber-400">{opp.confidence}%</strong>
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            Priority Score: <strong className="text-white">{opp.priorityScore}</strong>/100
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            {opp.entityName}
                          </h3>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {opp.reason}
                          </p>
                        </div>

                        {/* Estimated Opportunity Value Card Callout (Section 25) */}
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                              ESTIMATED OPPORTUNITY VALUE (REFERENSI RECOVERY)
                            </span>
                            <span className="text-base font-bold text-emerald-400 font-mono">
                              {opp.opportunityValue !== null ? formatRupiah(opp.opportunityValue) : 'N/A (Data belum cukup)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">SALESMAN PIC</span>
                            <span className="text-slate-200 font-medium">{opp.salesmanName || 'Supervisor Area'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">REKOMENDASI AKSI</span>
                            <span className="text-cyan-400 font-mono font-semibold">{opp.recommendedAction}</span>
                          </div>
                        </div>

                        {/* Evidence snippets */}
                        <div className="space-y-1 text-[11px] text-slate-400">
                          {opp.evidence.map((ev, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{ev}</span>
                            </div>
                          ))}
                        </div>

                        {/* Outcome info if WON */}
                        {opp.status === 'WON' && opp.outcome && (
                          <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-2.5 text-xs text-emerald-200 flex items-center justify-between">
                            <span>Hasil: <strong>{opp.outcome.result}</strong> {opp.outcome.notes && `— ${opp.outcome.notes}`}</span>
                            {opp.outcome.actualValue && (
                              <span className="font-mono font-bold text-emerald-300">
                                Realisasi: {formatRupiah(opp.outcome.actualValue)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              soundManager.playClick();
                              setDetailOpportunity(opp);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            DETAIL
                          </button>

                          <button
                            onClick={() => handleOpenAiExplain(opp)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 transition-colors flex items-center gap-1.5"
                            title="Penjelasan AI berbasis Evidence Package"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                            WHY THIS OPP?
                          </button>
                        </div>

                        {/* State & NBA Link Buttons */}
                        <div className="flex flex-col gap-1.5 w-full lg:w-auto">
                          {onNavigateToTab && (
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onNavigateToTab('next_best_action');
                              }}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Zap className="w-3.5 h-3.5 fill-slate-950" />
                              Kawal di NBA
                            </button>
                          )}

                          {opp.status !== 'WON' && opp.status !== 'LOST' && onUpdateOpportunityState && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenOutcomeModal(opp, 'WON')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 flex items-center gap-1"
                              >
                                <ThumbsUp className="w-3 h-3" /> Tandai WON
                              </button>
                              <button
                                onClick={() => handleOpenOutcomeModal(opp, 'LOST')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 flex items-center gap-1"
                              >
                                <ThumbsDown className="w-3 h-3" /> LOST
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. MODE: LEGACY OPPORTUNITY RADAR (PHASE 1-3 VIEW PRESERVED 100%) */}
      {engineMode === 'radar' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Sales Opportunity & Revenue Recovery Radar (Legacy)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Prioritas penanganan otomatis berdasarkan kalkulasi data aktual: Toko belum order, Drop outlet, Target gap, dan Penetrasi RO.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <CaptureJpgButton
                targetId="main-capture-area"
                fileName={`Opportunity_Radar_${new Date().toISOString().split('T')[0]}.jpg`}
                label="Capture JPG"
              />

              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-right">
                <span className="text-[10px] text-slate-400 block">Total Potensi Nilai Recovery</span>
                <span className="font-mono text-base font-bold text-cyan-400">
                  {formatRupiah(opportunities.reduce((acc, o) => acc + o.impactValue, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Cards & Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {opp.category}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{formatRupiah(opp.impactValue)}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{opp.title}</h4>
                <p className="text-xs text-slate-300">{opp.detailText}</p>
                <div className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-800">
                  <strong>Rekomendasi:</strong> {opp.actionRecommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. DETAIL MODAL (Section 27) */}
      {detailOpportunity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase">Opportunity Detail</span>
                <h3 className="text-xl font-bold text-white mt-1">{detailOpportunity.entityName}</h3>
                <p className="text-xs text-slate-400">Kategori: {detailOpportunity.opportunityType}</p>
              </div>
              <button
                onClick={() => setDetailOpportunity(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div><strong className="text-slate-400">WHAT:</strong> <span className="text-white">{detailOpportunity.reason}</span></div>
                <div><strong className="text-slate-400">WHY:</strong> <span className="text-slate-200">{detailOpportunity.reason}</span></div>
                <div>
                  <strong className="text-slate-400">ESTIMATED OPPORTUNITY VALUE:</strong>{' '}
                  <span className="text-emerald-400 font-mono font-bold">
                    {detailOpportunity.opportunityValue !== null ? formatRupiah(detailOpportunity.opportunityValue) : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-400 block italic mt-0.5">
                    *REFERENCE / BENCHMARK (NON-GUARANTEED REVENUE)
                  </span>
                </div>
                <div><strong className="text-slate-400">CONFIDENCE:</strong> <span className="text-amber-400 font-bold">{detailOpportunity.confidence}%</span></div>
                <div><strong className="text-slate-400">RECOMMENDED ACTION:</strong> <span className="text-cyan-400 font-mono">{detailOpportunity.recommendedAction}</span></div>
                {detailOpportunity.linkedNbaId && (
                  <div><strong className="text-slate-400">LINKED NBA:</strong> <span className="text-purple-400 font-mono">{detailOpportunity.linkedNbaId}</span></div>
                )}

                {/* Auditability & Traceability Fields (Phase 4.1 Requirement) */}
                <div className="border-t border-slate-800/80 pt-2.5 mt-2.5 space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono block">
                    Penelusuran Nilai & Bukti Transaksi:
                  </span>
                  <div>
                    <strong className="text-slate-400">VALUE SOURCE:</strong>{' '}
                    <span className="text-cyan-300 font-mono font-semibold">{detailOpportunity.valueSource || 'N/A'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">VALUE EVIDENCE:</strong>{' '}
                    <span className="text-slate-200">{detailOpportunity.valueEvidence || 'N/A'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-400">VALUE CALCULATION:</strong>{' '}
                    <span className="text-amber-200/90">{detailOpportunity.valueCalculation || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-300 uppercase text-[10px] block mb-1.5">Bukti Data Riil (Evidence):</span>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  {detailOpportunity.evidence.map((e, idx) => (
                    <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setDetailOpportunity(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. OUTCOME INPUT MODAL (WON/LOST) */}
      {outcomeTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Catat Hasil Peluang: {outcomeStatusInput}
                </h3>
                <p className="text-xs text-slate-400">{outcomeTarget.entityName}</p>
              </div>
              <button onClick={() => setOutcomeTarget(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {outcomeStatusInput === 'WON' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nilai Realisasi Transaksi Aktual (Rupiah):
                  </label>
                  <input
                    type="text"
                    value={outcomeValueInput}
                    onChange={(e) => setOutcomeValueInput(e.target.value)}
                    placeholder="Contoh: 1500000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Estimasi awal: {outcomeTarget.opportunityValue ? formatRupiah(outcomeTarget.opportunityValue) : 'N/A'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catatan Evaluasi / Hasil Lapangan:
                </label>
                <textarea
                  value={outcomeNotesInput}
                  onChange={(e) => setOutcomeNotesInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setOutcomeTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmOutcome}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Simpan Hasil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. AI EXPLANATION MODAL (Section 28) */}
      {aiExplainOpp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-900/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI DECISION INTELLIGENCE
                </span>
                <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Mengapa Peluang Ini Dipilih? (Why This Opportunity)
                </h3>
                <p className="text-xs text-slate-400">Entitas: {aiExplainOpp.entityName}</p>
              </div>
              <button onClick={() => setAiExplainOpp(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAiLoading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">
                  Menganalisis paket bukti data riil peluang melalui Gemini 3.8 Flash...
                </p>
              </div>
            ) : aiExplanation ? (
              <div className="space-y-4 text-xs">
                <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl p-4 text-indigo-200 leading-relaxed">
                  <strong className="text-white block mb-1">Executive Summary Analis:</strong>
                  {aiExplanation.summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">What Happened</span>
                    <p className="text-slate-300">{aiExplanation.whatHappened}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Why (Akar Masalah)</span>
                    <p className="text-slate-300">{aiExplanation.why}</p>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-slate-300 uppercase text-[10px]">Pemisahan Fakta vs Inferensi Logis:</div>
                  <div className="space-y-1">
                    {aiExplanation.distinction.facts.map((fact, i) => (
                      <div key={i} className="text-slate-400 flex items-start gap-1.5">
                        <span className="text-cyan-400 font-mono">[FAKTA]</span> {fact}
                      </div>
                    ))}
                    {aiExplanation.distinction.inferences.map((inf, i) => (
                      <div key={i} className="text-slate-400 flex items-start gap-1.5">
                        <span className="text-purple-400 font-mono">[INFERENSI]</span> {inf}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 text-xs">
                Tidak dapat memuat penjelasan AI saat ini.
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setAiExplainOpp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
