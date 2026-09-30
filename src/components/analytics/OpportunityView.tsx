import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { OpportunityItem, InsightClassification } from '../../types/analytics';
import { formatRupiah } from '../../services/smartInsightEngine';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface OpportunityViewProps {
  opportunities: OpportunityItem[];
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
  onNavigateToActionMonitoring?: () => void;
}

export function OpportunityView({
  opportunities,
  onNavigateToUpload,
  onLoadSampleData,
  onNavigateToActionMonitoring,
}: OpportunityViewProps) {
  const [selectedClassification, setSelectedClassification] = useState<InsightClassification | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="DATA BELUM TERSEDIA"
        description="Upload database kantor untuk memproses kalkulasi peluang reaktivasi toko dan akselerasi gap target."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const priorityCount = opportunities.filter(o => o.classification === 'PRIORITY').length;
  const attentionCount = opportunities.filter(o => o.classification === 'ATTENTION').length;
  const opportunityCount = opportunities.filter(o => o.classification === 'OPPORTUNITY').length;

  const filteredOpportunities = opportunities.filter(o => {
    if (selectedClassification !== 'ALL' && o.classification !== selectedClassification) return false;
    if (selectedCategory !== 'ALL' && o.category !== selectedCategory) return false;
    return true;
  });

  const totalImpact = filteredOpportunities.reduce((acc, o) => acc + o.impactValue, 0);

  const getCategoryIcon = (category: OpportunityItem['category']) => {
    switch (category) {
      case 'OUTLET_BELUM_TRANSAKSI':
        return <Store className="w-5 h-5 text-amber-400" />;
      case 'DROP_OUTLET':
        return <AlertOctagon className="w-5 h-5 text-rose-400" />;
      case 'HIGH_TARGET_GAP':
        return <TrendingDown className="w-5 h-5 text-purple-400" />;
      case 'LOW_ACHIEVEMENT':
        return <Award className="w-5 h-5 text-indigo-400" />;
      case 'LOW_RO_AREA':
        return <MapPin className="w-5 h-5 text-cyan-400" />;
      case 'NEW_OUTLET_EXPANSION':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
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

  return (
    <div className="space-y-6">
      {/* Title & Recovery Radar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Sales Opportunity & Revenue Recovery Radar</span>
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
              {formatRupiah(totalImpact)}
            </span>
          </div>

          {onNavigateToActionMonitoring && (
            <button
              onClick={onNavigateToActionMonitoring}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-sm"
            >
              <span>Pantau di Action Monitoring</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards for Classification */}
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
            Peluang recovery kritis dengan dampak omset terbesar.
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
            Peluang dengan urgensi menengah yang perlu diantisipasi.
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
            Peluang ekspansi dan perluasan omset dari outlet aktif & baru.
          </p>
        </button>
      </div>

      {/* Filter Tabs by Category */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Kategori:</span>
        </span>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-cyan-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Semua Peluang ({opportunities.length})
        </button>
        <button
          onClick={() => setSelectedCategory('OUTLET_BELUM_TRANSAKSI')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'OUTLET_BELUM_TRANSAKSI'
              ? 'bg-amber-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Outlet Belum Transaksi
        </button>
        <button
          onClick={() => setSelectedCategory('DROP_OUTLET')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'DROP_OUTLET'
              ? 'bg-rose-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Reaktivasi Drop Outlet
        </button>
        <button
          onClick={() => setSelectedCategory('HIGH_TARGET_GAP')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'HIGH_TARGET_GAP'
              ? 'bg-purple-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Defisit Target Salesman
        </button>
        <button
          onClick={() => setSelectedCategory('LOW_RO_AREA')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'LOW_RO_AREA'
              ? 'bg-indigo-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Area Low RO
        </button>
        <button
          onClick={() => setSelectedCategory('NEW_OUTLET_EXPANSION')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedCategory === 'NEW_OUTLET_EXPANSION'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Retensi Outlet Baru
        </button>
      </div>

      {/* Opportunity Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOpportunities.map((opp) => (
          <div
            key={opp.id}
            className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all ${
              opp.classification === 'PRIORITY'
                ? 'bg-slate-900 border-rose-500/40 hover:border-rose-500/70'
                : opp.classification === 'ATTENTION'
                ? 'bg-slate-900 border-amber-500/40 hover:border-amber-500/70'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              {/* Header: Priority + Value */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {getCategoryIcon(opp.category)}
                  </div>
                  <div>
                    {getClassificationBadge(opp.classification)}
                    <span className="text-[10px] text-slate-500 font-mono ml-2">
                      {opp.identifier}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Nilai Potensi Faktual</span>
                  <span className="font-mono font-bold text-sm text-cyan-300">
                    {formatRupiah(opp.impactValue)}
                  </span>
                </div>
              </div>

              {/* Title & Detail */}
              <h3 className="text-sm font-bold text-slate-100 mb-1.5">{opp.title}</h3>

              {opp.thresholdContext && (
                <div className="mb-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    {opp.thresholdContext}
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {opp.detailText}
              </p>
            </div>

            {/* Action Box */}
            <div className="pt-3 border-t border-slate-800/80 bg-slate-950/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Rekomendasi Tindakan Lapangan:
              </div>
              <p className="text-xs text-cyan-300 flex items-start gap-1.5 leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{opp.actionRecommendation}</span>
              </p>
              {opp.assignedSalesman && (
                <div className="text-[10px] text-slate-400 font-mono mt-2">
                  PIC Penanggung Jawab: <span className="text-slate-200">{opp.assignedSalesman}</span> {opp.area ? `· Area: ${opp.area}` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
