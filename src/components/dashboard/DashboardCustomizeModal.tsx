import React from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  SlidersHorizontal, 
  RotateCcw, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Camera, 
  Layers, 
  BarChart3, 
  Gauge, 
  Table2, 
  Trophy, 
  AlertTriangle, 
  Zap, 
  Filter, 
  Building2 
} from 'lucide-react';
import { soundManager } from '../../services/soundManager';

export interface DashboardFeatureVisibility {
  banner: boolean;
  prefixFilter: boolean;
  telemetry: boolean;
  charts: boolean;
  depoTable: boolean;
  salesmanTable: boolean;
  leakageCard: boolean;
  opportunities: boolean;
}

export const DEFAULT_FEATURE_VISIBILITY: DashboardFeatureVisibility = {
  banner: true,
  prefixFilter: true,
  telemetry: true,
  charts: true,
  depoTable: true,
  salesmanTable: true,
  leakageCard: true,
  opportunities: true,
};

export interface DashboardFeatureMeta {
  id: keyof DashboardFeatureVisibility;
  label: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const DASHBOARD_FEATURES_LIST: DashboardFeatureMeta[] = [
  {
    id: 'banner',
    label: 'Banner Judul & Periode',
    category: 'Header & Status',
    description: 'Header "Digital Sales Control Tower", label periode aktif, dan status data tervalidasi.',
    icon: Building2,
    accentColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'prefixFilter',
    label: 'Filter Prefix Salesman',
    category: 'Kontrol & Filter',
    description: 'Toolbar multi-select prefix salesman (AEPDA, GDKDA, GLKDA).',
    icon: Filter,
    accentColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    id: 'telemetry',
    label: 'Speedometer Telemetri & 9 KPI Cards',
    category: 'Ringkasan Eksekutif',
    description: 'Speedometer glowing Target, Realisasi, Achievement % serta 6 metrik (Gap, Growth, Toko Aktif, RO %).',
    icon: Gauge,
    accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'charts',
    label: 'Visualisasi BI (5 Grafik Analytics)',
    category: 'Grafik Visual',
    description: 'Grafik batang Target vs Actual, komparasi MoM, ranking salesman, dan distribusi RO.',
    icon: BarChart3,
    accentColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'depoTable',
    label: 'Matriks Kinerja Depo / PMA',
    category: 'Tabel Kinerja',
    description: 'Tabel ringkasan Target, Realisasi, Ach %, Growth Omset, dan EC / RO Aktif konsolidasi Depo.',
    icon: Table2,
    accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'salesmanTable',
    label: 'Matriks Ranking Kinerja Salesman',
    category: 'Tabel Kinerja',
    description: 'Tabel urutan ranking salesman berdasarkan pencapaian target resmi, omset, dan repeat order.',
    icon: Trophy,
    accentColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'leakageCard',
    label: 'Top 10 Kebocoran Toko (Drop Outlets)',
    category: 'Analisis Risiko',
    description: 'Daftar 10 toko pareto nilai transaksi hilang tertinggi yang berhenti order.',
    icon: AlertTriangle,
    accentColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  {
    id: 'opportunities',
    label: 'Peluang Omset Prioritas',
    category: 'Rekomendasi Tindakan',
    description: 'Kartu radar peluang akselerasi omset dan potensi penjualan prioritas.',
    icon: Zap,
    accentColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
];

interface DashboardCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: DashboardFeatureVisibility;
  onChange: (visibility: DashboardFeatureVisibility) => void;
  onReset: () => void;
}

export function DashboardCustomizeModal({
  isOpen,
  onClose,
  visibility,
  onChange,
  onReset,
}: DashboardCustomizeModalProps) {
  if (!isOpen) return null;

  const visibleCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = DASHBOARD_FEATURES_LIST.length;

  const handleToggle = (id: keyof DashboardFeatureVisibility) => {
    soundManager.playClick();
    onChange({
      ...visibility,
      [id]: !visibility[id],
    });
  };

  const handleSelectAll = () => {
    soundManager.playClick();
    onChange({
      banner: true,
      prefixFilter: true,
      telemetry: true,
      charts: true,
      depoTable: true,
      salesmanTable: true,
      leakageCard: true,
      opportunities: true,
    });
  };

  const handleApplyPreset = (preset: 'executive' | 'operational' | 'tables_only' | 'charts_only') => {
    soundManager.playClick();
    if (preset === 'executive') {
      onChange({
        banner: true,
        prefixFilter: false,
        telemetry: true,
        charts: true,
        depoTable: false,
        salesmanTable: false,
        leakageCard: false,
        opportunities: false,
      });
    } else if (preset === 'operational') {
      onChange({
        banner: true,
        prefixFilter: true,
        telemetry: true,
        charts: false,
        depoTable: true,
        salesmanTable: true,
        leakageCard: true,
        opportunities: false,
      });
    } else if (preset === 'tables_only') {
      onChange({
        banner: true,
        prefixFilter: true,
        telemetry: false,
        charts: false,
        depoTable: true,
        salesmanTable: true,
        leakageCard: false,
        opportunities: false,
      });
    } else if (preset === 'charts_only') {
      onChange({
        banner: true,
        prefixFilter: false,
        telemetry: true,
        charts: true,
        depoTable: false,
        salesmanTable: false,
        leakageCard: false,
        opportunities: false,
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      data-capture-ignore="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  KUSTOMISASI TAMPILAN DASHBOARD
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Hide &amp; Unhide Fitur (Khusus JPG Capture)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 mt-0.5">
                Pilih Fitur yang Ingin Ditampilkan / Disembunyikan
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
              title="Tutup pengatur tampilan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informative Banner */}
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-xs">
          <Camera className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-cyan-200">
              Optimalisasi Hasil Gambar "Capture JPG Full HD"
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Setiap fitur yang Anda sembunyikan (<strong className="text-amber-400">Hide</strong>) akan dihilangkan dari tampilan dan <strong>TIDAK AKAN tercapture ke file JPG</strong>. Seluruh data, rekonsiliasi, dan rumus perhitungan tetap <strong>100% aman dan tidak terhapus</strong>.
            </p>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>PRESET CEPAT:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
            >
              Tampilkan Semua ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('executive')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-medium transition-colors cursor-pointer"
              title="Hanya Banner, Speedometer/KPI, dan 5 Grafik BI"
            >
              Eksekutif / BoD
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('operational')}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 font-medium transition-colors cursor-pointer"
              title="Speedometer, Matriks Depo/Salesman, dan Kebocoran Toko"
            >
              Operasional Lapangan
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('tables_only')}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 font-medium transition-colors cursor-pointer"
              title="Hanya Matriks Tabel Depo & Salesman"
            >
              Tabel Saja
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('charts_only')}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-300 font-medium transition-colors cursor-pointer"
              title="Speedometer & 5 Grafik BI"
            >
              Grafik Saja
            </button>
          </div>
        </div>

        {/* Features List with Toggle Controls */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>DAFTAR FITUR DASHBOARD</span>
            <span className="text-cyan-400 font-bold">
              {visibleCount} dari {totalCount} Fitur Ditampilkan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DASHBOARD_FEATURES_LIST.map((feat) => {
              const isVisible = visibility[feat.id];
              const IconComp = feat.icon;

              return (
                <div
                  key={feat.id}
                  onClick={() => handleToggle(feat.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                    isVisible
                      ? 'bg-slate-950 border-slate-700 hover:border-slate-600 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-85'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${feat.accentColor}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-100">
                          {feat.label}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {feat.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {feat.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-colors ${
                        isVisible ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform flex items-center justify-center text-[10px] font-bold ${
                          isVisible ? 'translate-x-6 text-emerald-600' : 'translate-x-0 text-slate-400'
                        }`}
                      >
                        {isVisible ? (
                          <Eye className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Default (Tampilkan Semua)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Selesai &amp; Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
