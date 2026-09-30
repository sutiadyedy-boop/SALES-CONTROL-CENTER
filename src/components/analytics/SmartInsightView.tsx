import React, { useState } from 'react';
import { 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Zap, 
  AlertOctagon, 
  Users, 
  ArrowRight,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { SmartInsightItem, InsightClassification, InsightCategory } from '../../types/analytics';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface SmartInsightViewProps {
  insights: SmartInsightItem[];
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
  onNavigateToActionMonitoring?: () => void;
}

export function SmartInsightView({
  insights,
  onNavigateToUpload,
  onLoadSampleData,
  onNavigateToActionMonitoring,
}: SmartInsightViewProps) {
  const [selectedClassification, setSelectedClassification] = useState<InsightClassification | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory | 'ALL'>('ALL');

  if (insights.length === 0) {
    return (
      <EmptyState
        title="DATA BELUM TERSEDIA"
        description="Silakan unggah database transaksi, target, dan master outlet untuk mengaktifkan Smart Insight Business Intelligence."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  // Counts for classification tabs
  const priorityCount = insights.filter(i => i.classification === 'PRIORITY').length;
  const attentionCount = insights.filter(i => i.classification === 'ATTENTION').length;
  const opportunityCount = insights.filter(i => i.classification === 'OPPORTUNITY').length;

  const filteredInsights = insights.filter(ins => {
    if (selectedClassification !== 'ALL' && ins.classification !== selectedClassification) return false;
    if (selectedCategory !== 'ALL' && ins.category !== selectedCategory) return false;
    return true;
  });

  const getClassificationBadge = (classification: InsightClassification) => {
    switch (classification) {
      case 'PRIORITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>PRIORITAS TINGGI</span>
          </span>
        );
      case 'ATTENTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>PERLU PERHATIAN</span>
          </span>
        );
      case 'OPPORTUNITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>PELUANG & PERTUMBUHAN</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (category: InsightCategory) => {
    switch (category) {
      case 'ACHIEVEMENT':
        return <Target className="w-4 h-4 text-cyan-400" />;
      case 'GROWTH':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'GAP_TARGET':
        return <AlertCircle className="w-4 h-4 text-purple-400" />;
      case 'RO':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'DROP_OUTLET':
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'NEW_OUTLET':
        return <Sparkles className="w-4 h-4 text-cyan-300" />;
      case 'SALESMAN':
        return <Users className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getCategoryLabel = (category: InsightCategory) => {
    switch (category) {
      case 'ACHIEVEMENT':
        return 'Achievement';
      case 'GROWTH':
        return 'Growth MoM';
      case 'GAP_TARGET':
        return 'Gap Target';
      case 'RO':
        return 'Repeat Order (RO)';
      case 'DROP_OUTLET':
        return 'Drop Outlet';
      case 'NEW_OUTLET':
        return 'New Outlet';
      case 'SALESMAN':
        return 'Salesman Performance';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <span>Smart Business Intelligence & Executive Insights</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Intelijen naratif otomatis berbasis <span className="text-slate-200 font-semibold">100% angka faktual database</span> yang diklasifikasikan berdasarkan ambang batas (Thresholds).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Smart_Insights_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          {onNavigateToActionMonitoring && (
            <button
              onClick={onNavigateToActionMonitoring}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-sm"
            >
              <span>Buka Action Monitoring</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Tally Cards for Priority, Attention, Opportunity */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedClassification(selectedClassification === 'PRIORITY' ? 'ALL' : 'PRIORITY')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedClassification === 'PRIORITY'
              ? 'bg-rose-950/40 border-rose-500 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>PRIORITY</span>
            </span>
            <span className="font-mono text-xl font-bold text-rose-400">{priorityCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Indikator kritis yang memerlukan intervensi mendesak.
          </p>
        </button>

        <button
          onClick={() => setSelectedClassification(selectedClassification === 'ATTENTION' ? 'ALL' : 'ATTENTION')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedClassification === 'ATTENTION'
              ? 'bg-amber-950/40 border-amber-500 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>ATTENTION</span>
            </span>
            <span className="font-mono text-xl font-bold text-amber-400">{attentionCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Indikator yang perlu dipantau agar tidak memburuk.
          </p>
        </button>

        <button
          onClick={() => setSelectedClassification(selectedClassification === 'OPPORTUNITY' ? 'ALL' : 'OPPORTUNITY')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedClassification === 'OPPORTUNITY'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-sm'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>OPPORTUNITY</span>
            </span>
            <span className="font-mono text-xl font-bold text-emerald-400">{opportunityCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Pencapaian positif dan peluang pertumbuhan baru.
          </p>
        </button>
      </div>

      {/* 7 Domain Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Domain:</span>
        </span>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-cyan-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Semua 7 Domain ({insights.length})
        </button>
        {(['ACHIEVEMENT', 'GROWTH', 'GAP_TARGET', 'RO', 'DROP_OUTLET', 'NEW_OUTLET', 'SALESMAN'] as InsightCategory[]).map(cat => {
          const count = insights.filter(i => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{getCategoryLabel(cat)}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map((ins) => (
          <div
            key={ins.id}
            className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all ${
              ins.classification === 'PRIORITY'
                ? 'bg-slate-900 border-rose-500/40 hover:border-rose-500/70'
                : ins.classification === 'ATTENTION'
                ? 'bg-slate-900 border-amber-500/40 hover:border-amber-500/70'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              {/* Header: Classification + Category badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                    {getCategoryIcon(ins.category)}
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    {getCategoryLabel(ins.category)}
                  </span>
                </div>

                <div>
                  {getClassificationBadge(ins.classification)}
                </div>
              </div>

              {/* Exact Factual Headline */}
              <h3 className="text-sm font-bold text-slate-100 mb-2 leading-snug">
                "{ins.headline}"
              </h3>

              {/* Threshold Context Badge */}
              {ins.thresholdContext && (
                <div className="mb-3">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    {ins.thresholdContext}
                  </span>
                </div>
              )}

              {/* Factual Narrative */}
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {ins.narrative}
              </p>

              {/* Data Points Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl mb-4">
                {ins.dataPoints.map((dp, idx) => (
                  <div key={idx}>
                    <span className="text-[10px] text-slate-400 block">{dp.label}</span>
                    <span className="font-mono text-xs font-semibold text-slate-200">{dp.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation & Direct Action Link */}
            <div className="pt-3 border-t border-slate-800 text-xs flex flex-col gap-2">
              {ins.recommendation && (
                <div>
                  <span className="text-slate-400 font-medium">Rekomendasi Tindakan: </span>
                  <span className="text-cyan-300 font-medium">{ins.recommendation}</span>
                </div>
              )}
              {onNavigateToActionMonitoring && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={onNavigateToActionMonitoring}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Buat Rencana Tindak Lanjut</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
