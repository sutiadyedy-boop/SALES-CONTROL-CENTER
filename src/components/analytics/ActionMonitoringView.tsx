import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Send, 
  Store, 
  Users, 
  Zap, 
  Sparkles, 
  CheckSquare, 
  RotateCcw,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { 
  ActionItem, 
  ActionMonitoringSummary, 
  ActionStatus, 
  InsightClassification, 
  InsightCategory 
} from '../../types/analytics';
import { formatRupiah } from '../../services/smartInsightEngine';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface ActionMonitoringViewProps {
  actions: ActionItem[];
  summary: ActionMonitoringSummary;
  onUpdateStatus: (actionId: string, status: ActionStatus, note?: string) => void;
  onAddNote: (actionId: string, note: string) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function ActionMonitoringView({
  actions,
  summary,
  onUpdateStatus,
  onAddNote,
  onNavigateToUpload,
  onLoadSampleData,
}: ActionMonitoringViewProps) {
  const [selectedClassification, setSelectedClassification] = useState<InsightClassification | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ActionStatus | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  if (actions.length === 0) {
    return (
      <EmptyState
        title="DATA BELUM TERSEDIA"
        description="Silakan unggah database transaksi dan master outlet untuk menghasilkan rencana tindakan lapangan otomatis."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const filteredActions = useMemo(() => {
    return actions.filter(act => {
      if (selectedClassification !== 'ALL' && act.classification !== selectedClassification) return false;
      if (selectedStatus !== 'ALL' && act.status !== selectedStatus) return false;
      if (selectedCategory !== 'ALL' && act.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          act.title.toLowerCase().includes(q) ||
          act.targetEntity.toLowerCase().includes(q) ||
          act.assignedPic.toLowerCase().includes(q) ||
          act.identifier.toLowerCase().includes(q) ||
          (act.area && act.area.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [actions, selectedClassification, selectedStatus, selectedCategory, searchQuery]);

  const handleNoteSubmit = (actionId: string) => {
    const text = noteInputs[actionId]?.trim();
    if (text) {
      onAddNote(actionId, text);
      setNoteInputs(prev => ({ ...prev, [actionId]: '' }));
    }
  };

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>BELUM DIMULAI</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>SEDANG BERJALAN</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>SELESAI DIVERIFIKASI</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>DIBATALKAN</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (category: InsightCategory) => {
    switch (category) {
      case 'DROP_OUTLET':
        return <Store className="w-4 h-4 text-rose-400" />;
      case 'SALESMAN':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'RO':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'NEW_OUTLET':
        return <Sparkles className="w-4 h-4 text-cyan-300" />;
      default:
        return <CheckSquare className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getClassificationBadge = (classification: InsightClassification) => {
    switch (classification) {
      case 'PRIORITY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>PRIORITAS TINGGI</span>
          </span>
        );
      case 'ATTENTION':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>PERLU PERHATIAN</span>
          </span>
        );
      case 'OPPORTUNITY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>OPPORTUNITY</span>
          </span>
        );
    }
  };

  const resolvedPercent = summary.totalActions > 0 
    ? ((summary.completedCount / summary.totalActions) * 100).toFixed(0) 
    : '0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-cyan-400" />
            <span>Action Monitoring & Field Execution Control</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pelacakan eksekusi tugas lapangan real-time yang ditugaskan kepada Salesman dan Supervisor berdasarkan data aktual intelijen bisnis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Action_Monitoring_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5">
            <div>
              <span className="text-[10px] text-slate-400 block">Progress Eksekusi</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all" 
                    style={{ width: `${resolvedPercent}%` }} 
                  />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">{resolvedPercent}%</span>
              </div>
            </div>
            <div className="border-l border-slate-800 pl-4 text-right">
              <span className="text-[10px] text-slate-400 block">Nilai Terselesaikan</span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {formatRupiah(summary.resolvedImpactValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Tindakan</span>
          <span className="font-mono text-xl font-bold text-slate-100">{summary.totalActions}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">item terdata</span>
        </div>

        <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-3.5">
          <span className="text-[10px] text-rose-300 block uppercase font-mono">Prioritas Tinggi</span>
          <span className="font-mono text-xl font-bold text-rose-400">{summary.priorityCount}</span>
          <span className="text-[10px] text-rose-400/80 block mt-0.5">intervensi darurat</span>
        </div>

        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-3.5">
          <span className="text-[10px] text-amber-300 block uppercase font-mono">Perhatian</span>
          <span className="font-mono text-xl font-bold text-amber-400">{summary.attentionCount}</span>
          <span className="text-[10px] text-amber-400/80 block mt-0.5">monitoring ketat</span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3.5">
          <span className="text-[10px] text-emerald-300 block uppercase font-mono">Peluang</span>
          <span className="font-mono text-xl font-bold text-emerald-400">{summary.opportunityCount}</span>
          <span className="text-[10px] text-emerald-400/80 block mt-0.5">ekspansi omset</span>
        </div>

        <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-3.5">
          <span className="text-[10px] text-cyan-300 block uppercase font-mono">Sedang Berjalan</span>
          <span className="font-mono text-xl font-bold text-cyan-400">{summary.inProgressCount}</span>
          <span className="text-[10px] text-cyan-400/80 block mt-0.5">sedang ditindak</span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3.5">
          <span className="text-[10px] text-emerald-300 block uppercase font-mono">Terselesaikan</span>
          <span className="font-mono text-xl font-bold text-emerald-400">{summary.completedCount}</span>
          <span className="text-[10px] text-emerald-400/80 block mt-0.5">telah selesai</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari target outlet, nama salesman PIC, area, atau ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Classification Filters */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedClassification('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedClassification === 'ALL' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Prioritas
            </button>
            <button
              onClick={() => setSelectedClassification('PRIORITY')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedClassification === 'PRIORITY' ? 'bg-rose-600 text-slate-950 font-bold' : 'text-rose-400 hover:text-rose-200'
              }`}
            >
              PRIORITY ({summary.priorityCount})
            </button>
            <button
              onClick={() => setSelectedClassification('ATTENTION')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedClassification === 'ATTENTION' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              ATTENTION ({summary.attentionCount})
            </button>
            <button
              onClick={() => setSelectedClassification('OPPORTUNITY')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedClassification === 'OPPORTUNITY' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-emerald-400 hover:text-emerald-200'
              }`}
            >
              OPPORTUNITY ({summary.opportunityCount})
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Status:</span>
          </span>
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg ${
              selectedStatus === 'ALL' ? 'bg-slate-700 text-slate-100 font-bold' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Semua Status ({actions.length})
          </button>
          <button
            onClick={() => setSelectedStatus('OPEN')}
            className={`px-2.5 py-1 rounded-lg ${
              selectedStatus === 'OPEN' ? 'bg-slate-700 text-slate-100 font-bold' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Belum Dimulai ({summary.openCount})
          </button>
          <button
            onClick={() => setSelectedStatus('IN_PROGRESS')}
            className={`px-2.5 py-1 rounded-lg ${
              selectedStatus === 'IN_PROGRESS' ? 'bg-cyan-600 text-slate-950 font-bold' : 'text-cyan-300 hover:bg-slate-800'
            }`}
          >
            Sedang Berjalan ({summary.inProgressCount})
          </button>
          <button
            onClick={() => setSelectedStatus('COMPLETED')}
            className={`px-2.5 py-1 rounded-lg ${
              selectedStatus === 'COMPLETED' ? 'bg-emerald-600 text-slate-950 font-bold' : 'text-emerald-300 hover:bg-slate-800'
            }`}
          >
            Selesai Diverifikasi ({summary.completedCount})
          </button>
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            Tidak ada item tindakan yang sesuai dengan filter pencarian yang dipilih.
          </div>
        ) : (
          filteredActions.map((act) => (
            <div
              key={act.id}
              className={`border rounded-2xl p-5 bg-slate-900 transition-all ${
                act.status === 'COMPLETED'
                  ? 'border-emerald-500/40 opacity-80'
                  : act.classification === 'PRIORITY'
                  ? 'border-rose-500/40 hover:border-rose-500/70'
                  : act.classification === 'ATTENTION'
                  ? 'border-amber-500/40 hover:border-amber-500/70'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {getCategoryIcon(act.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {getClassificationBadge(act.classification)}
                      {getStatusBadge(act.status)}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {act.identifier}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">
                      {act.title}
                    </h3>
                  </div>
                </div>

                {/* Right impact value */}
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Nilai Dampak Terkait</span>
                  <span className="font-mono font-bold text-sm text-cyan-300">
                    {formatRupiah(act.impactValue)}
                  </span>
                </div>
              </div>

              {/* Action Description */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 mb-3 text-xs space-y-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Instruksi Eksekusi Lapangan:
                  </span>
                  <p className="text-slate-200 leading-relaxed">
                    {act.recommendedAction}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-500">Target Entitas: </span>
                    <span className="text-slate-200 font-medium">{act.targetEntity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">PIC Penanggung Jawab: </span>
                    <span className="text-cyan-300 font-medium">{act.assignedPic} {act.area ? `(${act.area})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tenggat Waktu: </span>
                    <span className="text-amber-300 font-medium">{act.dueDate || 'Periode Berjalan'}</span>
                  </div>
                </div>
              </div>

              {/* Notes History */}
              {act.notes && act.notes.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Catatan Verifikasi & Laporan Lapangan:
                  </span>
                  {act.notes.map((n, idx) => (
                    <div key={idx} className="bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 shrink-0 font-mono text-[10px] mt-0.5">#{idx + 1}</span>
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Controls: Add note + Change status buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                {/* Note input form */}
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <input
                    type="text"
                    value={noteInputs[act.id] || ''}
                    onChange={e => setNoteInputs({ ...noteInputs, [act.id]: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNoteSubmit(act.id);
                      }
                    }}
                    placeholder="Tambah catatan progres kunjungan / hasil..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleNoteSubmit(act.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors shrink-0"
                    title="Simpan Catatan"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {act.status !== 'IN_PROGRESS' && act.status !== 'COMPLETED' && (
                    <button
                      onClick={() => onUpdateStatus(act.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-colors flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mulai Tindakan</span>
                    </button>
                  )}

                  {act.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => onUpdateStatus(act.id, 'COMPLETED')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tandai Selesai</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(act.id, 'OPEN')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Buka Kembali</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
