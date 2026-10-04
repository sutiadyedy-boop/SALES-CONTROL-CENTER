import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Cpu, 
  AlertOctagon, 
  TrendingUp, 
  Lightbulb, 
  Compass, 
  Store, 
  User, 
  Package, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  FileCheck2,
  Filter,
  BarChart2,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  Info,
  MessageSquare,
  Send,
  RefreshCw,
  Bot,
  HelpCircle,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { 
  DecisionContext, 
  DecisionResult, 
  DecisionCategory, 
  DecisionPriority, 
  DecisionEngineAuditReport,
  AiExplanationResult,
  AiExecutiveInsight,
  DecisionChatMessage
} from '../../types/decisionEngine';
import { formatRupiah, formatPercent } from '../../services/smartInsightEngine';
import { 
  fetchAiExplanation, 
  fetchAiExecutiveInsight, 
  askAiAboutDecision 
} from '../../services/aiExplanationService';
import { soundManager } from '../../services/soundManager';

interface DecisionCenterViewProps {
  context: DecisionContext | null;
  decisions: DecisionResult[];
  auditReport?: DecisionEngineAuditReport | null;
  onNavigateToTab: (tab: string) => void;
  onSendToActionMonitoring?: (decision: DecisionResult) => void;
}

export function DecisionCenterView({
  context,
  decisions,
  auditReport,
  onNavigateToTab,
  onSendToActionMonitoring,
}: DecisionCenterViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Phase 2: Dual-Inspection Tab Mode
  const [inspectionTab, setInspectionTab] = useState<'deterministic' | 'ai_explanation' | 'ask_ai'>('deterministic');

  // Phase 2: Executive Insight State
  const [executiveInsight, setExecutiveInsight] = useState<AiExecutiveInsight | null>(null);
  const [isExecLoading, setIsExecLoading] = useState(false);
  const [isExecExpanded, setIsExecExpanded] = useState(true);
  const [showExecFactsModal, setShowExecFactsModal] = useState(false);

  // Phase 2: Per-Decision Explanation State
  const [aiExplanation, setAiExplanation] = useState<AiExplanationResult | null>(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);

  // Phase 2: Per-Decision Q&A Chat State
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<string, DecisionChatMessage[]>>({});
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Filtered decisions list
  const filteredDecisions = useMemo(() => {
    return decisions.filter(d => {
      if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
      if (selectedPriority !== 'ALL' && d.status !== selectedPriority) return false;
      if (selectedSalesman !== 'ALL' && d.assignedSalesmanId !== selectedSalesman) return false;
      return true;
    });
  }, [decisions, selectedCategory, selectedPriority, selectedSalesman]);

  // Priority counts for KPI cards
  const counts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let opp = 0;

    decisions.forEach(d => {
      if (d.status === 'CRITICAL') critical++;
      else if (d.status === 'HIGH') high++;
      else if (d.status === 'MEDIUM') medium++;
      if (d.opportunityScore >= 70) opp++;
    });

    return { critical, high, medium, opp };
  }, [decisions]);

  // Active expanded decision
  const activeDecision = useMemo(() => {
    if (!activeDecisionId && filteredDecisions.length > 0) return filteredDecisions[0];
    return filteredDecisions.find(d => d.id === activeDecisionId) || filteredDecisions[0] || null;
  }, [activeDecisionId, filteredDecisions]);

  // Fetch Executive Insight when context is available
  useEffect(() => {
    let isMounted = true;
    if (context && decisions.length > 0) {
      setIsExecLoading(true);
      fetchAiExecutiveInsight(context, decisions)
        .then(res => {
          if (isMounted) {
            setExecutiveInsight(res);
            setIsExecLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsExecLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [context, decisions]);

  // Fetch AI Explanation when active decision changes or when user switches to 'ai_explanation' tab
  useEffect(() => {
    let isMounted = true;
    if (activeDecision && inspectionTab === 'ai_explanation') {
      setIsExplainLoading(true);
      fetchAiExplanation(activeDecision, context)
        .then(res => {
          if (isMounted) {
            setAiExplanation(res);
            setIsExplainLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsExplainLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [activeDecision, inspectionTab, context]);

  // Scroll chat to bottom when message arrives
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistoryMap, activeDecisionId]);

  if (!context || decisions.length === 0) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
          <Cpu className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-mono text-slate-100 tracking-wide uppercase">
          AI DECISION ENGINE CORE AKTIF
        </h2>
        <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
          Decision Engine menunggu dataset transaksi aktif untuk mensintesis prioritas, akar masalah, dan penjelasan preskriptif Gemini. Unggah data atau muat demo data kantor.
        </p>
        <button
          onClick={() => onNavigateToTab('database')}
          className="mt-6 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
        >
          Buka Database Center
        </button>
      </div>
    );
  }

  // Get distinct salesmen from context
  const salesmenList = context.salesmanDecisions || [];

  // Active chat history for currently active decision
  const activeChatMessages = activeDecision ? (chatHistoryMap[activeDecision.id] || []) : [];

  const handleSendChat = async (questionText: string) => {
    if (!activeDecision || !questionText.trim()) return;
    const q = questionText.trim();
    setCurrentQuestion('');
    soundManager.playClick();

    const userMsg: DecisionChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistoryMap(prev => ({
      ...prev,
      [activeDecision.id]: [...(prev[activeDecision.id] || []), userMsg],
    }));

    setIsAnswering(true);
    try {
      const resp = await askAiAboutDecision(
        activeDecision,
        q,
        activeChatMessages,
        context
      );

      const aiMsg: DecisionChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: resp.answer,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        citedFacts: resp.citedFacts,
      };

      setChatHistoryMap(prev => ({
        ...prev,
        [activeDecision.id]: [...(prev[activeDecision.id] || []), aiMsg],
      }));
    } catch {
      const fallbackMsg: DecisionChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `Data pendukung untuk ${activeDecision.entityName}: ${activeDecision.what}. Rekomendasi: ${activeDecision.recommendedAction}. Bukti: ${activeDecision.evidence.join('; ')}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        citedFacts: activeDecision.evidence,
      };
      setChatHistoryMap(prev => ({
        ...prev,
        [activeDecision.id]: [...(prev[activeDecision.id] || []), fallbackMsg],
      }));
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold tracking-wider text-slate-100 font-mono uppercase flex items-center gap-2">
                <span>AI DECISION CENTER</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  DECISION INTELLIGENCE V2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Sintesis Keputusan Preskriptif 5 Fokus: Salesman · Outlet · SKU · MARK NEW · EC (Actual Performance)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Debug / Audit button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowAuditModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Audit Diagnostic</span>
          </button>

          <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="text-slate-500 mr-1.5">PERIODE:</span>
            <span className="text-cyan-400 font-bold">{context.period.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* 2. PHASE 2: AI EXECUTIVE INSIGHT PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-wide uppercase flex items-center gap-2">
                  <span>AI EXECUTIVE INSIGHT</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    FMCG ANALYST
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Ringkasan komprehensif kinerja cabang & panduan aksi berbasis evidensi deterministik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsExecLoading(true);
                fetchAiExecutiveInsight(context, decisions).then(res => {
                  setExecutiveInsight(res);
                  setIsExecLoading(false);
                });
              }}
              title="Perbarui analisis AI"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isExecLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsExecExpanded(!isExecExpanded);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <span>{isExecExpanded ? 'Sembunyikan' : 'Buka Panel'}</span>
              {isExecExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isExecExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {isExecLoading && !executiveInsight ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs text-slate-400 font-mono">
                  Menyusun AI Executive Insight berbasis data transaksi riil...
                </p>
              </div>
            ) : executiveInsight ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Performance */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Kinerja Penjualan</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {executiveInsight.performanceSummary}
                    </p>
                  </div>

                  {/* Attention & Risk */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5 uppercase mb-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Fokus Perhatian & Risiko</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {executiveInsight.attentionSummary}
                    </p>
                  </div>

                  {/* Opportunity */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5 uppercase mb-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Peluang Pertumbuhan</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {executiveInsight.opportunitySummary}
                    </p>
                  </div>
                </div>

                {/* Top Priority & Actions */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col md:flex-row gap-4 items-start justify-between">
                  <div className="space-y-1.5 max-w-xl">
                    <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-wider block">
                      Prioritas Utama Eksekutif:
                    </span>
                    <p className="text-xs text-slate-100 font-medium leading-relaxed font-sans">
                      {executiveInsight.topPrioritySummary}
                    </p>
                  </div>

                  <div className="w-full md:w-auto shrink-0 space-y-1.5">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      3 Tindakan Taktis Segera:
                    </span>
                    <div className="space-y-1 text-xs text-slate-200 font-sans">
                      {executiveInsight.topRecommendedActions.map((act, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fact vs Inference toggle */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-slate-400">
                    Karakter Analisis: <span className="text-emerald-400 font-bold">100% Grounded on Engine</span> (Tanpa Halusinasi)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowExecFactsModal(true)}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
                  >
                    <span>Lihat Pemisahan Fakta vs Inferensi</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 3. Top Decision KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Critical */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-rose-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider">CRITICAL PRIORITIES</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-rose-400">{counts.critical}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Membutuhkan intervensi darurat</div>
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider">HIGH PRIORITIES</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-amber-400">{counts.high}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Peluang reaktivasi cepat</div>
          </div>
        </div>

        {/* Medium Priority */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-cyan-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider">MEDIUM PRIORITIES</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-cyan-400">{counts.medium}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Monitoring pergerakan rute</div>
          </div>
        </div>

        {/* High Opportunity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider">COMMERCIAL OPP</span>
            <Lightbulb className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono text-emerald-400">{counts.opp}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Score peluang $\ge 70$</div>
          </div>
        </div>
      </div>

      {/* 4. Decision Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter Keputusan:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="DROP_OUTLET_RECOVERY">Drop Outlet Recovery</option>
            <option value="SALESMAN_PRODUCTIVITY">Salesman Productivity</option>
            <option value="EC_RISK">EC Dynamics</option>
            <option value="MARK_NEW_OPPORTUNITY">MARK NEW Opportunity</option>
            <option value="SKU_OPPORTUNITY">SKU Penetration</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Salesman Filter */}
          <select
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Semua Salesman</option>
            {salesmenList.map(s => (
              <option key={s.salesmanId} value={s.salesmanId}>
                {s.salesmanName} ({s.salesmanId})
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Menampilkan <span className="text-cyan-400 font-bold">{filteredDecisions.length}</span> dari {decisions.length} keputusan
        </div>
      </div>

      {/* 5. Main Decision Grid: List on Left (5 cols), Deep Inspection on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Decision Items Cards */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredDecisions.map((dec) => {
            const isSelected = activeDecision?.id === dec.id;
            const priorityBadge = 
              dec.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
              dec.status === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
              dec.status === 'MEDIUM' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
              'bg-slate-800 text-slate-400 border-slate-700';

            return (
              <div
                key={dec.id}
                onClick={() => {
                  soundManager.playClick();
                  setActiveDecisionId(dec.id);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase ${priorityBadge}`}>
                      {dec.status} (Score {dec.priorityScore})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {dec.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-100 font-sans line-clamp-1 mt-1">
                    {dec.entityName}
                  </h3>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {dec.what}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-mono">
                      Risk: <span className="text-rose-400 font-bold">{dec.riskScore}</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      Opp: <span className="text-emerald-400 font-bold">{dec.opportunityScore}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playClick();
                        setActiveDecisionId(dec.id);
                        setInspectionTab('ai_explanation');
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] transition-colors"
                    >
                      WHY?
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playClick();
                        setActiveDecisionId(dec.id);
                        setInspectionTab('ask_ai');
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] transition-colors"
                    >
                      ASK AI
                    </button>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-600'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Deep Structured Inspection (Dual Tab: Engine V1 vs Gemini Explanation vs Ask AI) */}
        <div className="lg:col-span-7">
          {activeDecision ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 sticky top-4">
              {/* Decision Header */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border font-bold uppercase ${
                      activeDecision.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      activeDecision.status === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}>
                      PRIORITAS {activeDecision.status}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      Score: {activeDecision.priorityScore}/100
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Confidence: {(activeDecision.confidence * 100).toFixed(0)}% (Auditable)
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-100 font-sans">
                  {activeDecision.entityName}
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  ID: {activeDecision.entityId} &bull; Tipe: {activeDecision.entityType} &bull; Sumber: {activeDecision.sourcePeriod}
                </div>
              </div>

              {/* Phase 2: Navigation Mode Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setInspectionTab('deterministic');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                    inspectionTab === 'deterministic'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Diagnosa Engine V1</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setInspectionTab('ai_explanation');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                    inspectionTab === 'ai_explanation'
                      ? 'bg-indigo-600/30 text-indigo-300 shadow-sm border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Explanation (Gemini)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setInspectionTab('ask_ai');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                    inspectionTab === 'ask_ai'
                      ? 'bg-cyan-600/30 text-cyan-300 shadow-sm border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tanya AI</span>
                </button>
              </div>

              {/* ============================================================== */}
              {/* TAB 1: DETERMINISTIC ENGINE V1 VIEW                            */}
              {/* ============================================================== */}
              {inspectionTab === 'deterministic' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-between">
                    <span className="font-bold text-slate-300">DETERMINISTIC DATA RESULT</span>
                    <span className="text-emerald-400">Engine V1.0 Single Source of Truth</span>
                  </div>

                  {/* 5-Pillar Root Cause Structure */}
                  <div className="space-y-3">
                    {/* 1. WHAT */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="text-cyan-400 font-mono font-bold block mb-1">1. WHAT (Situasi Faktual):</span>
                      <p className="text-slate-200 leading-relaxed font-sans">{activeDecision.what}</p>
                    </div>

                    {/* 2. WHY */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="text-amber-400 font-mono font-bold block mb-1">2. WHY (Akar Masalah Utama):</span>
                      <p className="text-slate-200 leading-relaxed font-sans">{activeDecision.why}</p>
                    </div>

                    {/* 3. IMPACT */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="text-rose-400 font-mono font-bold block mb-1">3. IMPACT (Dampak Operasional / Omset):</span>
                      <p className="text-slate-200 leading-relaxed font-sans">{activeDecision.impact}</p>
                    </div>

                    {/* 4. RECOMMENDED ACTION */}
                    <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/40 text-xs">
                      <span className="text-emerald-400 font-mono font-bold block mb-1">4. RECOMMENDED ACTION (Rekomendasi Preskriptif):</span>
                      <p className="text-slate-100 font-bold leading-relaxed font-sans">{activeDecision.recommendedAction}</p>
                    </div>

                    {/* 5. EXPECTED IMPACT */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                      <span className="text-purple-400 font-mono font-bold block mb-1">5. EXPECTED IMPACT (Hasil yang Diharapkan):</span>
                      <p className="text-slate-200 leading-relaxed font-sans">{activeDecision.expectedImpact}</p>
                    </div>
                  </div>

                  {/* Traceability Evidence Section */}
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-300 font-mono tracking-wider block mb-2 uppercase">
                      Data Bukti (Evidence & Traceability)
                    </span>
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/90 font-mono text-[11px] text-slate-300 space-y-1">
                      {activeDecision.evidence.map((ev, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-400 shrink-0">&bull;</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 2: AI EXPLANATION (GEMINI FMCG ANALYST) VIEW               */}
              {/* ============================================================== */}
              {inspectionTab === 'ai_explanation' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI EXPLANATION LAYER</span>
                    </span>
                    <span className="text-xs text-indigo-400 font-bold">Read-Only Evidence Based</span>
                  </div>

                  {isExplainLoading && !aiExplanation ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <p className="text-xs text-slate-400 font-mono">
                        Gemini sedang menganalisis Evidence Package untuk {activeDecision.entityName}...
                      </p>
                    </div>
                  ) : aiExplanation ? (
                    <div className="space-y-3.5">
                      {/* Executive Summary */}
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                        <span className="text-[11px] font-mono font-bold text-indigo-400 block mb-1 uppercase">
                          Executive Summary:
                        </span>
                        <p className="text-xs text-slate-100 font-medium leading-relaxed font-sans">
                          {aiExplanation.summary}
                        </p>
                      </div>

                      {/* What & Why Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                          <span className="text-cyan-400 font-mono font-bold block mb-1">Apa yang Terjadi:</span>
                          <p className="text-slate-300 leading-relaxed font-sans">{aiExplanation.whatHappened}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                          <span className="text-amber-400 font-mono font-bold block mb-1">Mengapa Terjadi:</span>
                          <p className="text-slate-300 leading-relaxed font-sans">{aiExplanation.why}</p>
                        </div>
                      </div>

                      {/* Impact & Outcome */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                          <span className="text-rose-400 font-mono font-bold block mb-1">Dampak Bisnis:</span>
                          <p className="text-slate-300 leading-relaxed font-sans">{aiExplanation.businessImpact}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                          <span className="text-purple-400 font-mono font-bold block mb-1">Hasil yang Diharapkan:</span>
                          <p className="text-slate-300 leading-relaxed font-sans">{aiExplanation.expectedOutcome}</p>
                        </div>
                      </div>

                      {/* Recommended Action */}
                      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-xs">
                        <span className="text-emerald-400 font-mono font-bold block mb-1">Rekomendasi Preskriptif AI:</span>
                        <p className="text-slate-100 font-bold leading-relaxed font-sans">{aiExplanation.recommendedAction}</p>
                      </div>

                      {/* Distinction: Facts vs Inferences */}
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          Pemisahan Faktual: Data Riil vs Inferensi
                        </span>
                        <div className="space-y-1">
                          <span className="text-[11px] text-cyan-400 font-mono font-semibold block">Fakta Matematis (Engine):</span>
                          <ul className="list-disc list-inside text-[11px] text-slate-300 font-mono space-y-0.5">
                            {aiExplanation.distinction.facts.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-1 pt-1 border-t border-slate-800/80">
                          <span className="text-[11px] text-amber-400 font-mono font-semibold block">Inferensi Manajerial:</span>
                          <ul className="list-disc list-inside text-[11px] text-slate-300 font-sans space-y-0.5">
                            {aiExplanation.distinction.inferences.map((inf, i) => (
                              <li key={i}>{inf}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Limitations & Confidence */}
                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Confidence: <strong className="text-slate-200">{aiExplanation.confidence}</strong></span>
                        <span className="text-[10px] text-slate-500">{aiExplanation.modelUsed || 'Gemini 3.8 Flash'}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 3: TANYA AI (ASK ABOUT THIS DECISION) VIEW                  */}
              {/* ============================================================== */}
              {inspectionTab === 'ask_ai' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>TANYA AI TENTANG KEPUTUSAN INI</span>
                    </span>
                    <span className="text-xs text-cyan-400 font-bold">FMCG Q&A</span>
                  </div>

                  {/* Quick question prompt buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Pertanyaan Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Mengapa keputusan ini berprioritas tinggi?',
                        'Apa dampak bisnis jika tidak diintervensi?',
                        'Langkah taktis apa yang harus diambil sales supervisor?',
                        'Data apa saja yang membuktikan situasi ini?',
                      ].map((promptText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isAnswering}
                          onClick={() => handleSendChat(promptText)}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors text-left"
                        >
                          &bull; {promptText}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat messages display */}
                  <div 
                    ref={chatScrollRef}
                    className="min-h-[220px] max-h-[300px] overflow-y-auto bg-slate-950/90 rounded-xl p-3 border border-slate-800 space-y-3"
                  >
                    {activeChatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs font-mono">
                        <FileQuestion className="w-6 h-6 mb-2 text-slate-600" />
                        <span>Belum ada percakapan. Pilih pertanyaan cepat di atas atau ketik pertanyaan Anda.</span>
                      </div>
                    ) : (
                      activeChatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-cyan-600 text-slate-950 font-semibold'
                                : 'bg-slate-900 border border-slate-800 text-slate-200'
                            }`}
                          >
                            <p className="font-sans">{msg.text}</p>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 mt-0.5 px-1">
                            {msg.timestamp}
                          </span>
                        </div>
                      ))
                    )}
                    {isAnswering && (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyst sedang menyusun respon berdasarkan Evidence...</span>
                      </div>
                    )}
                  </div>

                  {/* Input form */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat(currentQuestion);
                        }
                      }}
                      placeholder={`Tanyakan tentang ${activeDecision.entityName}...`}
                      disabled={isAnswering}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                    />
                    <button
                      type="button"
                      disabled={isAnswering || !currentQuestion.trim()}
                      onClick={() => handleSendChat(currentQuestion)}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                <div className="text-[11px] font-mono text-slate-400">
                  Decision Engine: <span className="text-cyan-400">{activeDecision.engineVersion}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      onNavigateToTab('next_best_action');
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-950/30"
                  >
                    <span>Kawal di Next Best Action</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      if (onSendToActionMonitoring) {
                        onSendToActionMonitoring(activeDecision);
                      }
                      onNavigateToTab('action_monitoring');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-700 shadow-sm"
                  >
                    <span>Kirim ke Action Monitoring</span>
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 font-mono">
              Pilih salah satu keputusan di sebelah kiri untuk melihat rincian diagnosa mendalam.
            </div>
          )}
        </div>
      </div>

      {/* 6. Executive Facts vs Inference Modal */}
      {showExecFactsModal && executiveInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                PEMISAHAN FAKTA VS INFERENSI (AI EXECUTIVE INSIGHT)
              </h3>
              <button
                onClick={() => setShowExecFactsModal(false)}
                className="text-xs text-slate-400 hover:text-slate-100"
              >
                Tutup
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-cyan-400 font-bold block">1. FAKTA MATEMATIS (DETERMINISTIC ENGINE):</span>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {executiveInsight.distinction.facts.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-amber-400 font-bold block">2. INFERENSI & ANALISIS MANAJERIAL:</span>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {executiveInsight.distinction.inferences.map((inf, i) => (
                    <li key={i}>{inf}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExecFactsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Diagnostic / Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 font-mono">
                    DECISION ENGINE AUDIT & DIAGNOSTIC PANEL
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspeksi integritas agregasi dan ketertelusuran bukti matematis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-xs text-slate-400 hover:text-slate-100"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block mb-1 text-[10px]">TOTAL DECISIONS GENERATED</span>
                  <span className="text-lg font-bold text-cyan-400">{decisions.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block mb-1 text-[10px]">EVIDENCE TRACEABILITY</span>
                  <span className="text-lg font-bold text-emerald-400">100% AUDITABLE</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block mb-1">AGGREGATED DATA METRICS:</span>
                <div className="flex justify-between text-slate-300">
                  <span>Salesmen Evaluated:</span>
                  <span className="text-cyan-400 font-bold">{context.salesmanDecisions.length}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Effective Call (EC Current):</span>
                  <span className="text-cyan-400 font-bold">{context.ecSummary.ecCurrent} toko</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Drop Outlets Evaluated:</span>
                  <span className="text-rose-400 font-bold">{context.outletSummary.dropOutletsCount} toko</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>SKUs Aggregated:</span>
                  <span className="text-cyan-400 font-bold">{context.skuSummary.totalSkus} item</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>MARK NEW Program Value:</span>
                  <span className="text-emerald-400 font-bold">{formatRupiah(context.markNewSummary.markNewValue)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Model Operasional:</span>
                  <span className="text-emerald-400 font-bold">Actual Performance Only (Forecast Closed)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] leading-relaxed">
                Seluruh kalkulasi dilakukan secara deterministik tanpa campur tangan LLM/Gemini API, menjamin hasil 100% reproducible dan akurat terhadap data transaksi Excel.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Tutup Diagnostik
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
