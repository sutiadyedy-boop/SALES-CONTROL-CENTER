import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Send, 
  Building2, 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Zap, 
  Layers, 
  FileText, 
  ShieldAlert, 
  Plus, 
  Trash2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  FiveWOneHReport, 
  FiveWActionPlanItem, 
  FiveWEscalationRequest, 
  formatFiveWWhatsAppMessage,
  getSavedEscalation,
  saveEscalation,
  getSavedActionPlans,
  saveActionPlans
} from '../../services/fiveWOneHEngine';
import { soundManager } from '../../services/soundManager';

interface FiveWOneHAnalysisCardProps {
  report: FiveWOneHReport;
  defaultExpanded?: boolean;
}

export function FiveWOneHAnalysisCard({
  report,
  defaultExpanded = true,
}: FiveWOneHAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedWA, setCopiedWA] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'action_plan' | 'escalation'>('diagnosis');

  // Loaded and persisted action plans
  const [actionPlans, setActionPlans] = useState<FiveWActionPlanItem[]>(() => {
    return getSavedActionPlans(report.menuKey, report.how.actionPlans);
  });

  // Loaded and persisted escalation
  const [escalation, setEscalation] = useState<FiveWEscalationRequest>(() => {
    return getSavedEscalation(report.menuKey, report.howMuchOrEscalation.defaultEscalation);
  });

  // New action form state
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionTarget, setNewActionTarget] = useState('');
  const [newActionPic, setNewActionPic] = useState('Sales Supervisor');
  const [newActionTimeline, setNewActionTimeline] = useState('3 Hari Kerja');

  // Escalation edit form state
  const [isEditingEscalation, setIsEditingEscalation] = useState(false);
  const [editEscTitle, setEditEscTitle] = useState(escalation.title);
  const [editEscSupport, setEditEscSupport] = useState(escalation.neededSupport);
  const [editEscAuthority, setEditEscAuthority] = useState(escalation.targetAuthority);
  const [editEscImpact, setEditEscImpact] = useState(escalation.financialImpact || '');

  // Keep state in sync if menuKey changes
  useEffect(() => {
    setActionPlans(getSavedActionPlans(report.menuKey, report.how.actionPlans));
    setEscalation(getSavedEscalation(report.menuKey, report.howMuchOrEscalation.defaultEscalation));
  }, [report.menuKey]);

  // Copy WhatsApp Formatted Message
  const handleCopyWhatsApp = () => {
    soundManager.playClick();
    const currentReport: FiveWOneHReport = {
      ...report,
      how: { ...report.how, actionPlans },
      howMuchOrEscalation: { ...report.howMuchOrEscalation, defaultEscalation: escalation },
    };
    const text = formatFiveWWhatsAppMessage(currentReport);
    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  // Toggle Action Status
  const handleToggleStatus = (id: string) => {
    soundManager.playClick();
    const updated = actionPlans.map(plan => {
      if (plan.id === id) {
        const nextStatus: FiveWActionPlanItem['status'] =
          plan.status === 'PENDING'
            ? 'IN_PROGRESS'
            : plan.status === 'IN_PROGRESS'
            ? 'COMPLETED'
            : 'PENDING';
        return { ...plan, status: nextStatus };
      }
      return plan;
    });
    setActionPlans(updated);
    saveActionPlans(report.menuKey, updated);
  };

  // Add Action Item
  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    soundManager.playSuccess();
    const newItem: FiveWActionPlanItem = {
      id: `ACT-${Date.now()}`,
      action: newActionTitle.trim(),
      targetOutput: newActionTarget.trim() || 'Tercapainya target penyelesaian',
      pic: newActionPic.trim() || 'Tim Operasional',
      timeline: newActionTimeline.trim() || 'Sesuai Jadwal',
      status: 'IN_PROGRESS',
    };

    const updated = [...actionPlans, newItem];
    setActionPlans(updated);
    saveActionPlans(report.menuKey, updated);

    setNewActionTitle('');
    setNewActionTarget('');
    setShowAddAction(false);
  };

  // Delete Action Item
  const handleDeleteAction = (id: string) => {
    soundManager.playClick();
    const updated = actionPlans.filter(p => p.id !== id);
    setActionPlans(updated);
    saveActionPlans(report.menuKey, updated);
  };

  // Save Escalation Update
  const handleSaveEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playSuccess();
    const updated: FiveWEscalationRequest = {
      ...escalation,
      title: editEscTitle,
      neededSupport: editEscSupport,
      targetAuthority: editEscAuthority,
      financialImpact: editEscImpact,
      status: 'PROPOSED',
      submittedAt: new Date().toISOString(),
    };
    setEscalation(updated);
    saveEscalation(report.menuKey, updated);
    setIsEditingEscalation(false);
  };

  // Toggle Escalation Approval
  const handleToggleEscalationApproval = (status: FiveWEscalationRequest['status']) => {
    soundManager.playClick();
    const updated: FiveWEscalationRequest = {
      ...escalation,
      status,
      submittedAt: new Date().toISOString(),
    };
    setEscalation(updated);
    saveEscalation(report.menuKey, updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all">
      {/* 1. Header Toolbar */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                KERANGKA ANALISIS 5W + 1H &amp; AKAR MASALAH (ROOT CAUSE)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {report.periodLabel}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  report.when.urgencyLevel === 'TINGGI'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                URGENSI: {report.when.urgencyLevel}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-100 mt-0.5">
              {report.menuTitle} &bull; Diagnosis Berbasis Fakta &amp; Solusi Terstruktur
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy WhatsApp Button */}
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              copiedWA
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800/80'
            }`}
            title="Salin ringkasan 5W+1H untuk dikirim langsung via WhatsApp ke manajemen/tim"
          >
            {copiedWA ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWA ? 'Tersalin ke WA!' : 'Salin Format WA (5W+1H)'}</span>
          </button>

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={isExpanded ? 'Ciutkan Panel 5W+1H' : 'Bentangkan Panel 5W+1H'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Key Facts Strip (Always visible or responsive) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/60 border-b border-slate-800">
        {report.facts.map((fact, idx) => (
          <div key={idx} className="bg-slate-950/70 p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block truncate">
              {fact.metricName}
            </span>
            <div
              className={`text-sm sm:text-base font-extrabold font-mono mt-0.5 truncate ${
                fact.severity === 'good'
                  ? 'text-emerald-400'
                  : fact.severity === 'danger'
                  ? 'text-rose-400'
                  : fact.severity === 'warning'
                  ? 'text-amber-300'
                  : 'text-cyan-400'
              }`}
            >
              {fact.value}
            </div>
            {fact.subtext && (
              <span className="text-[11px] text-slate-500 font-sans block truncate mt-0.5">
                {fact.subtext}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 3. Collapsible Body Section */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* Sub-Tabs: Diagnosis 5W, Action Plan, Escalation */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('diagnosis')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'diagnosis'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Analisis 5W + Akar Masalah (5-Whys)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('action_plan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'action_plan'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Action Plan &amp; Timeline</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {actionPlans.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('escalation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'escalation'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Eskalasi &amp; Pengajuan Keputusan</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    escalation.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {escalation.status}
                </span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400 hidden lg:inline">
              Metodologi: DMAIC Root Cause Analysis &bull; Prescriptive Action Framework
            </span>
          </div>

          {/* TAB 1: DIAGNOSIS 5W + 1H & 5-WHYS */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Problem Definition (WHAT) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wide">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">1. WHAT</span>
                  <span>Definisi Masalah Utama Berdasarkan Data:</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mt-2">{report.what.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{report.what.description}</p>
                <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  <strong className="text-slate-300">Metrik Kunci:</strong> {report.what.gapMetrics}
                </div>
              </div>

              {/* Root Cause Analysis (WHY & 5-Whys Chain) */}
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">2. WHY</span>
                  <span>Analisis Rantai Sebab-Akibat (5-Whys Validasi):</span>
                </div>

                {/* Validated Root Cause Highlight */}
                <div className="mt-3 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border-l-4 border-l-amber-500 p-3 rounded-r-xl">
                  <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Akar Penyebab Utama Tervalidasi (Root Cause):</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 mt-1">{report.why.rootCauseSummary}</p>
                </div>

                {/* 5-Whys Stepper */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 font-semibold">
                    Dekomposisi Penelusuran 5-Tingkat (5-Whys Process):
                  </div>
                  <div className="space-y-1.5 pl-2 border-l border-slate-800">
                    {report.why.fiveWhys.map((step, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-300 flex items-start gap-2 py-1 px-2.5 rounded bg-slate-900/40 hover:bg-slate-900/80 transition-colors"
                      >
                        <span className="text-amber-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                        <span>{step.replace(/^\d+\.\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validated Evidence */}
                {report.why.validatedEvidence && report.why.validatedEvidence.length > 0 && (
                  <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center gap-2 flex-wrap">
                    <strong className="text-slate-300 font-mono">Bukti Database:</strong>
                    {report.why.validatedEvidence.map((ev, i) => (
                      <span key={i} className="text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* WHERE, WHEN, WHO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* WHERE */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>3. WHERE (Lokasi Area)</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">Area/Depo Terkait:</span>
                      <p className="font-semibold text-slate-200 font-mono mt-0.5">
                        {report.where.affectedAreas.join(', ') || report.where.depoOrPma.join(', ') || 'Seluruh Jaringan'}
                      </p>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-400">
                      <span className="text-slate-500">Zona Kritis:</span> {report.where.criticalZones}
                    </div>
                  </div>
                </div>

                {/* WHEN */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>4. WHEN (Waktu &amp; Pace)</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">Rentang Waktu:</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{report.when.timeframe}</p>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-400">
                      <span className="text-slate-500">Pace / Tren:</span> {report.when.trendPace}
                    </div>
                  </div>
                </div>

                {/* WHO */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 uppercase">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>5. WHO (Pihak &amp; PIC)</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">Salesman/Entitas:</span>
                      <p className="font-semibold text-slate-200 font-mono truncate mt-0.5">
                        {report.who.affectedSalesmen.slice(0, 3).join(', ') || 'Tim Operasional'}
                      </p>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-400">
                      <span className="text-slate-500">Penanggung Jawab:</span> {report.who.accountableTeam}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTION PLAN (HOW) */}
          {activeTab === 'action_plan' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs border border-cyan-500/30">
                      6. HOW
                    </span>
                    <span>Action Plan Operasional, PIC, &amp; Timeline Eksekusi</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Arah Strategis: <span className="text-slate-200 font-semibold">{report.how.strategicDirection}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddAction(!showAddAction)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Action Item</span>
                </button>
              </div>

              {/* Form Tambah Action Baru */}
              {showAddAction && (
                <form
                  onSubmit={handleAddAction}
                  className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4 space-y-3"
                >
                  <div className="text-xs font-mono font-bold text-cyan-400">INPUT LANGKAH TINDAKAN BARU:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Langkah Tindakan (Action Required)</label>
                      <input
                        type="text"
                        value={newActionTitle}
                        onChange={e => setNewActionTitle(e.target.value)}
                        placeholder="Contoh: Kunjungan joint-visit ke 15 toko pareto"
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Target Output Terukur</label>
                      <input
                        type="text"
                        value={newActionTarget}
                        onChange={e => setNewActionTarget(e.target.value)}
                        placeholder="Contoh: Pemulihan repeat order minimal Rp 10 Juta"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">PIC (Penanggung Jawab)</label>
                      <input
                        type="text"
                        value={newActionPic}
                        onChange={e => setNewActionPic(e.target.value)}
                        placeholder="Contoh: Sales Supervisor & Salesman Rute"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Timeline / Tenggat Waktu</label>
                      <input
                        type="text"
                        value={newActionTimeline}
                        onChange={e => setNewActionTimeline(e.target.value)}
                        placeholder="Contoh: 3 Hari Kerja / H+5"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddAction(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                    >
                      Simpan Action
                    </button>
                  </div>
                </form>
              )}

              {/* Action Plan Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-4 min-w-[220px]">Langkah Tindakan Operasional</th>
                      <th className="py-2.5 px-4 min-w-[180px]">Target Output Terukur</th>
                      <th className="py-2.5 px-3 min-w-[140px]">PIC (Penanggung Jawab)</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Timeline</th>
                      <th className="py-2.5 px-3 min-w-[120px] text-center">Status</th>
                      <th className="py-2.5 px-2 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {actionPlans.map((plan, idx) => (
                      <tr key={plan.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-100">{plan.action}</td>
                        <td className="py-2.5 px-4 text-slate-300 text-[11px]">{plan.targetOutput}</td>
                        <td className="py-2.5 px-3 text-cyan-300 font-mono text-[11px]">{plan.pic}</td>
                        <td className="py-2.5 px-3 text-amber-300 font-mono text-[11px]">{plan.timeline}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(plan.id)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              plan.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : plan.status === 'IN_PROGRESS'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                            title="Klik untuk mengubah status: PENDING -> IN_PROGRESS -> COMPLETED"
                          >
                            {plan.status === 'COMPLETED'
                              ? '✓ SELESAI'
                              : plan.status === 'IN_PROGRESS'
                              ? 'BERJALAN'
                              : 'MENUNGGU'}
                          </button>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(plan.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            title="Hapus tindakan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ESCALATION & MANAGEMENT APPROVAL */}
          {activeTab === 'escalation' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                        ESKALASI &amp; PENGAJUAN DUKUNGAN MANAJEMEN
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-100">
                        {escalation.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                        escalation.status === 'APPROVED'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : escalation.status === 'IN_REVIEW'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      }`}
                    >
                      STATUS: {escalation.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsEditingEscalation(!isEditingEscalation)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                    >
                      {isEditingEscalation ? 'Batal Edit' : 'Edit Pengajuan'}
                    </button>
                  </div>
                </div>

                {isEditingEscalation ? (
                  <form onSubmit={handleSaveEscalation} className="mt-4 space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Judul Pengajuan Eskalasi</label>
                      <input
                        type="text"
                        value={editEscTitle}
                        onChange={e => setEditEscTitle(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Dukungan / Otorisasi yang Dibutuhkan</label>
                      <textarea
                        value={editEscSupport}
                        onChange={e => setEditEscSupport(e.target.value)}
                        rows={2}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Ditujukan Kepada (Otoritas)</label>
                        <input
                          type="text"
                          value={editEscAuthority}
                          onChange={e => setEditEscAuthority(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Estimasi Potensi Dampak Finansial</label>
                        <input
                          type="text"
                          value={editEscImpact}
                          onChange={e => setEditEscImpact(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingEscalation(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs"
                      >
                        Simpan &amp; Ajukan
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 space-y-3 text-xs">
                    <p className="text-slate-300 leading-relaxed">{escalation.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Dukungan / Otorisasi Spesifik</span>
                        <span className="font-semibold text-rose-300 mt-1 block">{escalation.neededSupport}</span>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Estimasi Dampak Finansial</span>
                        <span className="font-semibold text-emerald-400 mt-1 block font-mono">
                          {escalation.financialImpact || report.howMuchOrEscalation.impactValue}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400">
                        Ditujukan ke Otoritas: <strong className="text-slate-200">{escalation.targetAuthority}</strong>
                      </div>

                      {/* Approval buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleEscalationApproval('APPROVED')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui Pengajuan (Approve)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEscalationApproval('IN_REVIEW')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 cursor-pointer"
                        >
                          <span>Tandai Sedang Ditinjau</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
