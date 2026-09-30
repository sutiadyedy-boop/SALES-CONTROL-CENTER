import React from 'react';
import { Database, UploadCloud, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onNavigateToUpload?: () => void;
  onLoadSampleData?: () => void;
}

export function EmptyState({
  title = 'DATA BELUM TERSEDIA',
  description = 'Silakan upload database transaksi kantor (Bulan Lalu, Bulan Ini, Target Salesman, dan Master CB/ROA) untuk memulai kalkulasi dan visualisasi performa penjualan.',
  onNavigateToUpload,
  onLoadSampleData,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 my-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 text-cyan-400">
        <Database className="w-8 h-8" />
      </div>

      <h3 className="text-lg font-bold text-slate-100 tracking-wide mb-2">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onNavigateToUpload && (
          <button
            onClick={onNavigateToUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Database Kantor</span>
          </button>
        )}

        {onLoadSampleData && (
          <button
            onClick={onLoadSampleData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-cyan-800/50 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Muat Contoh Dataset Kantor (Demo Bone)</span>
          </button>
        )}
      </div>
    </div>
  );
}
