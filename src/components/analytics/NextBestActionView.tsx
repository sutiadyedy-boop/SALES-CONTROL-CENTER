import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  AlertTriangle, 
  ArrowRight, 
  Filter, 
  Store, 
  User, 
  Package, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  Eye, 
  ChevronRight, 
  ExternalLink, 
  Send, 
  Check, 
  RefreshCw, 
  HelpCircle, 
  MessageSquare,
  DollarSign,
  Award,
  Target,
  FileCheck,
  Calendar,
  X,
  Play
} from 'lucide-react';
import { 
  NextBestAction, 
  NextBestActionType, 
  NextBestActionStatus, 
  NextBestActionOutcome,
  DecisionPriority,
  DecisionContext,
  DecisionResult,
  AiExplanationResult
} from '../../types/decisionEngine';
import { UserProfile } from '../../types/database';
import { 
  computeNextBestActionSummary, 
  computeNextBestActionFunnel, 
  filterActionsByUserRole,
  getTopActionsPerSalesman,
  PersistedNbaState,
  savePersistedNbaStates
} from '../../services/nextBestActionEngine';
import { formatRupiah } from '../../services/smartInsightEngine';
import { fetchAiExplanation } from '../../services/aiExplanationService';
import { soundManager } from '../../services/soundManager';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface NextBestActionViewProps {
  actions: NextBestAction[];
  context: DecisionContext | null;
  decisions: DecisionResult[];
  userProfile?: UserProfile | null;
  onUpdateActionState: (actionId: string, newState: PersistedNbaState) => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToUpload?: () => void;
  onLoadSampleData?: () => void;
}

export function NextBestActionView({
  actions,
  context,
  decisions,
  userProfile,
  onUpdateActionState,
  onNavigateToTab,
  onNavigateToUpload,
  onLoadSampleData,
}: NextBestActionViewProps) {
  // Navigation / View modes
  const isSalesman = userProfile?.role === 'SALESMAN';
  const isSupervisorOrManager = userProfile?.role === 'SUPERVISOR' || userProfile?.role === 'MANAGER' || userProfile?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'my_actions' | 'control_tower' | 'all_actions'>(
    isSalesman ? 'my_actions' : 'control_tower'
  );

  // Filters
  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [detailAction, setDetailAction] = useState<NextBestAction | null>(null);
  const [completeActionTarget, setCompleteActionTarget] = useState<NextBestAction | null>(null);
  const [outcomeResult, setOutcomeResult] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [outcomeActualValue, setOutcomeActualValue] = useState<string>('');

  // AI "Why This Action" Modal
  const [aiExplainAction, setAiExplainAction] = useState<NextBestAction | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AiExplanationResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Distinct salesmen list for filters
  const distinctSalesmen = useMemo(() => {
    const map = new Map<string, string>();
    actions.forEach(a => {
      if (a.salesmanName) {
        map.set(a.salesmanId || a.salesmanName, a.salesmanName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [actions]);

  // Role-filtered baseline actions
  const roleBaseActions = useMemo(() => {
    if (activeTab === 'my_actions') {
      return filterActionsByUserRole(actions, userProfile);
    }
    return actions;
  }, [actions, activeTab, userProfile]);

  // Fully filtered actions list
  const filteredActions = useMemo(() => {
    return roleBaseActions.filter(a => {
      if (selectedSalesman !== 'ALL' && a.salesmanId !== selectedSalesman && a.salesmanName !== selectedSalesman) {
        return false;
      }
      if (selectedActionType !== 'ALL' && a.actionType !== selectedActionType) {
        return false;
      }
      if (selectedPriority !== 'ALL' && a.priority !== selectedPriority) {
        return false;
      }
      if (selectedStatus !== 'ALL' && a.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [roleBaseActions, selectedSalesman, selectedActionType, selectedPriority, selectedStatus]);

  // Top 10 actions for salesman focus mode
  const displayActions = useMemo(() => {
    if (activeTab === 'my_actions') {
      return getTopActionsPerSalesman(filteredActions, undefined, 10);
    }
    return filteredActions;
  }, [activeTab, filteredActions]);

  // Overall metrics & summary
  const summary = useMemo(() => {
    return computeNextBestActionSummary(actions);
  }, [actions]);

  // Funnel
  const funnel = useMemo(() => {
    return computeNextBestActionFunnel(decisions.length, actions);
  }, [decisions.length, actions]);

  // Handlers for action lifecycle
  const handleStartAction = (action: NextBestAction) => {
    soundManager.playClick();
    onUpdateActionState(action.id, {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      notes: [`[${new Date().toLocaleTimeString('id-ID')}] Tindakan dimulai oleh ${userProfile?.name || 'Operator'}`],
      outcome: action.outcome,
    });
  };

  const handleOpenCompleteModal = (action: NextBestAction) => {
    soundManager.playClick();
    setCompleteActionTarget(action);
    setOutcomeResult('Berhasil transaksi pemulihan');
    setOutcomeNotes('');
    setOutcomeActualValue(action.expectedRevenueReference ? String(action.expectedRevenueReference) : '');
  };

  const handleConfirmCompleteAction = () => {
    if (!completeActionTarget) return;
    soundManager.playSuccess();

    const numericValue = outcomeActualValue.trim() !== '' ? Number(outcomeActualValue.replace(/[^0-9]/g, '')) : undefined;

    const outcome: NextBestActionOutcome = {
      actionId: completeActionTarget.id,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      result: outcomeResult || 'Selesai dieksekusi',
      notes: outcomeNotes || 'Tindakan lapangan berhasil dituntaskan.',
      actualValue: isNaN(numericValue as number) ? undefined : numericValue,
    };

    onUpdateActionState(completeActionTarget.id, {
      status: 'COMPLETED',
      completedAt: outcome.completedAt,
      notes: [
        ...(completeActionTarget.reason ? [completeActionTarget.reason] : []),
        `[SELESAI] ${outcome.result} — ${outcome.notes || ''}`
      ],
      outcome,
    });

    setCompleteActionTarget(null);
  };

  // Trigger "Why This Action?" AI Explanation
  const handleOpenAiExplain = async (action: NextBestAction) => {
    soundManager.playClick();
    setAiExplainAction(action);
    setIsAiLoading(true);
    setAiExplanation(null);

    // Find original decision to pass into explanation service
    const matchingDecision = decisions.find(d => d.id === action.decisionId) || {
      id: action.decisionId,
      category: action.actionType.includes('OUTLET') ? 'DROP_OUTLET_RECOVERY' : 'SALESMAN_PRODUCTIVITY',
      entityType: action.entityType,
      entityId: action.entityId,
      entityName: action.entityName,
      priorityScore: action.priorityScore,
      riskScore: action.riskScore || 50,
      opportunityScore: action.opportunityScore || 50,
      status: action.priority,
      riskStatus: 'HIGH',
      what: action.what,
      why: action.why,
      impact: action.expectedImpact,
      recommendedAction: action.actionDescription,
      expectedImpact: action.expectedImpact,
      evidence: action.evidence,
      confidence: action.confidence,
      sourcePeriod: action.sourcePeriod,
      generatedAt: action.createdAt,
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

  // Helper for priority badges
  const renderPriorityBadge = (priority: DecisionPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-700">
            MONITOR
          </span>
        );
    }
  };

  // Helper for Action Type Icon and Label
  const getActionTypeMeta = (type: NextBestActionType) => {
    switch (type) {
      case 'REACTIVATE_OUTLET':
        return { label: 'Reaktivasi Outlet', icon: Store, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
      case 'CROSS_SELL_SKU':
        return { label: 'Cross-Sell SKU', icon: Package, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
      case 'PUSH_MARK_NEW':
        return { label: 'Push MARK NEW', icon: Sparkles, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
      case 'IMPROVE_EC':
        return { label: 'Tingkatkan EC', icon: Target, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
      case 'PROTECT_EXISTING_OUTLET':
        return { label: 'Proteksi Outlet Baru', icon: ShieldCheck, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
      case 'REVIEW_SKU_PERFORMANCE':
        return { label: 'Review SKU', icon: TrendingUp, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
      case 'FOLLOW_UP_HIGH_VALUE_OUTLET':
        return { label: 'Kawal Toko Pareto', icon: Award, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' };
      case 'FOLLOW_UP_HIGH_PRIORITY_SALESMAN':
        return { label: 'Pendampingan Salesman', icon: User, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' };
      case 'INCREASE_OUTLET_COVERAGE':
        return { label: 'Perluas Coverage', icon: Layers, color: 'text-teal-400 border-teal-500/30 bg-teal-500/10' };
      default:
        return { label: 'Monitoring', icon: Eye, color: 'text-slate-400 border-slate-700 bg-slate-800/40' };
    }
  };

  if (actions.length === 0) {
    return (
      <EmptyState
        title="BELUM ADA NEXT BEST ACTION"
        description="Next Best Action dihasilkan secara preskriptif dari Deterministic Decision Engine setelah database transaksi diunggah."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold tracking-wider rounded-md uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                PHASE 3 — NEXT BEST ACTION ENGINE
              </span>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRESCRIPTIVE LAYER
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Zap className="w-7 h-7 text-amber-400 fill-amber-400/20" />
              Next Best Action (NBA) Center
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              Transformasi keputusan analitis menjadi tindakan operasional terarah (5W + 1H) untuk memulihkan omset drop, 
              eksploitasi celah MARK NEW, dan mengamankan Effective Call (EC).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CaptureJpgButton
              targetId="main-capture-area"
              fileName={`Next_Best_Action_${new Date().toISOString().split('T')[0]}.jpg`}
              label="Capture JPG"
            />
            <button
              onClick={() => onNavigateToTab('decision_center')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              Kembali ke Decision Engine
            </button>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Login Role</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {userProfile?.name || 'User'} ({userProfile?.role || 'GUEST'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mode Selector: MY ACTION TODAY vs ACTION CONTROL TOWER vs ALL */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('my_actions');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'my_actions'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            MY ACTION TODAY
            {isSalesman && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-950 font-mono">
                Top 10
              </span>
            )}
          </button>

          {isSupervisorOrManager && (
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('control_tower');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'control_tower'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Target className="w-4 h-4 text-indigo-300" />
              ACTION CONTROL TOWER
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('all_actions');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all_actions'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            SEMUA TINDAKAN ({actions.length})
          </button>
        </div>

        {/* Global summary chips */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <strong>{summary.criticalCount}</strong> Kritis
          </span>
          <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <strong>{summary.pendingCount}</strong> Pending
          </span>
          <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <strong>{summary.inProgressCount}</strong> In Progress
          </span>
          <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <strong>{summary.completedCount}</strong> Selesai
          </span>
        </div>
      </div>

      {/* 3. CONTROL TOWER & FUNNEL PANEL (Visible when activeTab === 'control_tower') */}
      {activeTab === 'control_tower' && (
        <div className="bg-slate-900/80 border border-indigo-900/30 rounded-2xl p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              Executive Action Control Tower & Funnel
            </h2>
            <span className="text-xs text-slate-400">
              Monitoring Konversi: Keputusan → Pelaksanaan → Realisasi Outcome
            </span>
          </div>

          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Total Tindakan</div>
              <div className="text-xl font-bold text-white font-mono mt-1">{summary.totalActions}</div>
              <div className="text-[11px] text-amber-400 mt-0.5">{summary.pendingCount} belum dieksekusi</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Sedang Dikerjakan</div>
              <div className="text-xl font-bold text-blue-400 font-mono mt-1">{summary.inProgressCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Joint-visit / Call Plan</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Tuntas Dieksekusi</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{summary.completedCount}</div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Konversi: {summary.completionRate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Tingkat Keberhasilan</div>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                {summary.successRate !== null ? `${summary.successRate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {summary.completedCount < 3 ? 'Min 3 completed' : 'Positive outcome rate'}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 col-span-2 md:col-span-1">
              <div className="text-xs text-slate-400">Realisasi Omset (Actual)</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {formatRupiah(summary.totalActualImpact)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Ref: {formatRupiah(summary.totalExpectedImpact)}
              </div>
            </div>
          </div>

          {/* Visual Action Funnel (Section 26) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Action Conversion Funnel (Pipeline Tindakan Lapangan)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[11px] text-slate-400">1. DECISION</div>
                <div className="text-lg font-bold text-cyan-400 font-mono mt-1">{funnel.decisionsTotal}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Diagnostic Output</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[11px] text-slate-400">2. ACTION GENERATED</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{funnel.actionsTotal}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">5W + 1H Preskriptif</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[11px] text-slate-400">3. IN PROGRESS</div>
                <div className="text-lg font-bold text-blue-400 font-mono mt-1">{funnel.inProgressCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Sedang Dikawal</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="text-[11px] text-slate-400">4. COMPLETED</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{funnel.completedCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tuntas Dikunjungi</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center col-span-2 md:col-span-1">
                <div className="text-[11px] text-slate-400">5. POSITIVE OUTCOME</div>
                <div className="text-lg font-bold text-amber-400 font-mono mt-1">{funnel.positiveOutcomesCount}</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Omset / RO Berhasil</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            Filter:
          </div>

          {/* Salesman filter (for Supervisor/Manager/Admin) */}
          {isSupervisorOrManager && (
            <select
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Semua Salesman ({distinctSalesmen.length})</option>
              {distinctSalesmen.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {/* Action Type filter */}
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Jenis Tindakan</option>
            <option value="REACTIVATE_OUTLET">Reaktivasi Outlet</option>
            <option value="CROSS_SELL_SKU">Cross-Sell SKU</option>
            <option value="PUSH_MARK_NEW">Push MARK NEW / Eceran</option>
            <option value="IMPROVE_EC">Tingkatkan EC</option>
            <option value="PROTECT_EXISTING_OUTLET">Proteksi Outlet Baru</option>
            <option value="FOLLOW_UP_HIGH_VALUE_OUTLET">Kawal Toko Pareto</option>
            <option value="FOLLOW_UP_HIGH_PRIORITY_SALESMAN">Pendampingan Salesman</option>
            <option value="REVIEW_SKU_PERFORMANCE">Review SKU</option>
            <option value="INCREASE_OUTLET_COVERAGE">Perluas Coverage</option>
            <option value="MONITOR">Monitoring</option>
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="CRITICAL">🔴 Critical (81–100)</option>
            <option value="HIGH">🟠 High (61–80)</option>
            <option value="MEDIUM">🟡 Medium (41–60)</option>
            <option value="LOW">🟢 Low (21–40)</option>
            <option value="MONITOR">⚪ Monitor (0–20)</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Pending (Belum Mulai)</option>
            <option value="IN_PROGRESS">In Progress (Sedang Jalan)</option>
            <option value="COMPLETED">Completed (Selesai)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Menampilkan <strong className="text-white">{displayActions.length}</strong> tindakan
          {activeTab === 'my_actions' && isSalesman && ' (Top 10 Prioritas Harian)'}
        </div>
      </div>

      {/* 5. Next Best Action Cards Grid */}
      <div className="space-y-3.5">
        {displayActions.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            Tidak ada tindakan yang cocok dengan kriteria filter yang dipilih.
          </div>
        ) : (
          displayActions.map((action) => {
            const meta = getActionTypeMeta(action.actionType);
            const Icon = meta.icon;

            return (
              <div 
                key={action.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 transition-all shadow-md hover:shadow-lg ${
                  action.priority === 'CRITICAL' 
                    ? 'border-rose-500/40 hover:border-rose-500/70' 
                    : action.priority === 'HIGH'
                    ? 'border-amber-500/40 hover:border-amber-500/70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left block: Title, entity, 5W+1H */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderPriorityBadge(action.priority)}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${meta.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Skor: <strong className="text-white">{action.priorityScore}</strong>/100
                      </span>
                      {action.status === 'IN_PROGRESS' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> IN PROGRESS
                        </span>
                      )}
                      {action.status === 'COMPLETED' && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" /> COMPLETED
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        {action.entityName}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {action.actionDescription}
                      </p>
                    </div>

                    {/* 5W + 1H Operational Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">WHO (Eksekutor)</span>
                        <span className="text-slate-200 font-medium">{action.who}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">WHERE (Lokasi)</span>
                        <span className="text-slate-200 font-medium">{action.where}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">WHY (Akar Masalah)</span>
                        <span className="text-amber-300/90 font-medium line-clamp-1" title={action.why}>{action.why}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">WHEN (Timing)</span>
                        <span className="text-cyan-300 font-medium">{action.when}</span>
                      </div>
                    </div>

                    {/* Expected Impact Benchmark Disclaimer Callout */}
                    <div className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Benchmark Expected Impact:</strong> {action.expectedImpact}
                      </div>
                    </div>

                    {/* Completed Outcome Highlight (if already completed) */}
                    {action.status === 'COMPLETED' && action.outcome && (
                      <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-3 text-xs text-emerald-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-bold text-white">Hasil Eksekusi: {action.outcome.result}</div>
                          {action.outcome.actualValue !== undefined && action.outcome.actualValue > 0 && (
                            <div className="text-emerald-300 font-mono font-bold">
                              Realisasi Omset Lapangan: {formatRupiah(action.outcome.actualValue)}
                            </div>
                          )}
                          {action.outcome.notes && (
                            <div className="text-slate-300 text-[11px] italic">"{action.outcome.notes}"</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right block: Action buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setDetailAction(action);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        DETAIL
                      </button>

                      <button
                        onClick={() => handleOpenAiExplain(action)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 transition-colors flex items-center gap-1.5"
                        title="Tampilkan analisis penjelasan Gemini berbasis Evidence Package"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        WHY THIS ACTION?
                      </button>
                    </div>

                    {/* State Transition buttons */}
                    <div className="w-full lg:w-auto">
                      {action.status === 'PENDING' && (
                        <button
                          onClick={() => handleStartAction(action)}
                          className="w-full px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          START ACTION
                        </button>
                      )}

                      {action.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleOpenCompleteModal(action)}
                          className="w-full px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-md flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          SELESAIKAN TINDAKAN
                        </button>
                      )}

                      {action.status === 'COMPLETED' && (
                        <span className="text-xs text-slate-400 font-mono italic">
                          Tuntas dikerjakan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. DETAIL MODAL (Section 15) */}
      {detailAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {renderPriorityBadge(detailAction.priority)}
                  <span className="text-xs font-mono text-cyan-400">ID: {detailAction.id}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{detailAction.actionTitle}</h3>
                <p className="text-xs text-slate-400">Entitas: {detailAction.entityName} ({detailAction.entityType})</p>
              </div>
              <button
                onClick={() => setDetailAction(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 5W + 1H Full Review */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-2">
                  5W + 1H Kerangka Operasional Tindakan:
                </div>
                <div><strong className="text-slate-400">WHO (Pelaksana):</strong> <span className="text-white">{detailAction.who}</span></div>
                <div><strong className="text-slate-400">WHAT (Tindakan):</strong> <span className="text-white">{detailAction.what}</span></div>
                <div><strong className="text-slate-400">WHERE (Lokasi):</strong> <span className="text-white">{detailAction.where}</span></div>
                <div><strong className="text-slate-400">WHY (Akar Masalah):</strong> <span className="text-white">{detailAction.why}</span></div>
                <div><strong className="text-slate-400">WHEN (Waktu/Jadwal):</strong> <span className="text-white">{detailAction.when}</span></div>
              </div>

              {/* Evidence list */}
              <div>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Bukti Data Riil (Evidence Traceability):
                </div>
                <div className="space-y-1.5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs">
                  {detailAction.evidence.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-300">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Impact */}
              <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-indigo-300 uppercase text-[11px]">Expected Impact Reference:</div>
                <div className="text-slate-200">{detailAction.expectedImpact}</div>
                {detailAction.expectedRevenueReference !== undefined && detailAction.expectedRevenueReference > 0 && (
                  <div className="text-emerald-400 font-mono font-bold mt-1">
                    Nilai Referensi Historis: {formatRupiah(detailAction.expectedRevenueReference)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setDetailAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. COMPLETE ACTION OUTCOME MODAL (Section 18 & 19) */}
      {completeActionTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Selesaikan Tindakan Lapangan
                </h3>
                <p className="text-xs text-slate-400">Entitas: {completeActionTarget.entityName}</p>
              </div>
              <button
                onClick={() => setCompleteActionTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Hasil Kunjungan / Eksekusi Tindakan:
                </label>
                <input
                  type="text"
                  value={outcomeResult}
                  onChange={(e) => setOutcomeResult(e.target.value)}
                  placeholder="Misal: Berhasil transaksi, Toko setuju reorder, Toko tutup"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nilai Realisasi Transaksi / Omset Aktual (Rupiah - Opsional):
                </label>
                <input
                  type="text"
                  value={outcomeActualValue}
                  onChange={(e) => setOutcomeActualValue(e.target.value)}
                  placeholder="Misal: 850000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Kosongkan jika kunjungan belum menghasilkan transaksi langsung.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Catatan Evaluasi / Kendala Lapangan:
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Catatan tambahan hasil negosiasi dengan pemilik toko..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setCompleteActionTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCompleteAction}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Simpan & Tandai Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. "WHY THIS ACTION?" AI EXPLANATION MODAL (Section 21) */}
      {aiExplainAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-900/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI DECISION INTELLIGENCE
                </span>
                <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Mengapa Tindakan Ini Dipilih? (Why This Action)
                </h3>
                <p className="text-xs text-slate-400">Entitas: {aiExplainAction.entityName}</p>
              </div>
              <button
                onClick={() => setAiExplainAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAiLoading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">
                  Menganalisis paket bukti data riil (Evidence Package) melalui Gemini 3.8 Flash...
                </p>
              </div>
            ) : aiExplanation ? (
              <div className="space-y-4 text-xs">
                {/* Summary narrative */}
                <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl p-4 text-indigo-200 leading-relaxed">
                  <strong className="text-white block mb-1">Executive Summary Analis:</strong>
                  {aiExplanation.summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">What Happened (Fakta)</span>
                    <p className="text-slate-300">{aiExplanation.whatHappened}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Why (Akar Masalah)</span>
                    <p className="text-slate-300">{aiExplanation.why}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Business Impact</span>
                    <p className="text-amber-300/90">{aiExplanation.businessImpact}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Expected Outcome</span>
                    <p className="text-emerald-300/90">{aiExplanation.expectedOutcome}</p>
                  </div>
                </div>

                {/* Facts vs Inference */}
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
                onClick={() => setAiExplainAction(null)}
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
