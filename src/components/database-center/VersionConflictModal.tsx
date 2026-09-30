import React from 'react';
import { AlertTriangle, RefreshCw, PlusCircle, Check, X } from 'lucide-react';

interface VersionConflictModalProps {
  fileName: string;
  categoryTitle: string;
  period: string;
  existingCount: number;
  newCount: number;
  onChoice: (choice: 'replace' | 'add' | 'keep' | 'cancel') => void;
}

export function VersionConflictModal({
  fileName,
  categoryTitle,
  period,
  existingCount,
  newCount,
  onChoice,
}: VersionConflictModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
        <div className="flex items-center gap-3 text-amber-400 mb-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Data Periode Ini Sudah Tersedia</h3>
            <p className="text-xs text-amber-400 font-mono">{categoryTitle} · {period}</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          File <span className="font-semibold text-slate-100 font-mono">"{fileName}"</span> berisi data untuk periode yang sudah ada di sistem ({existingCount} baris tersimpan vs {newCount} baris baru).
          Pilih tindakan untuk mencegah data ganda (double count):
        </p>

        <div className="space-y-2 mb-6">
          <button
            onClick={() => onChoice('replace')}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 hover:bg-slate-900/80 flex items-start gap-3 text-left transition-colors group"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400 mt-0.5 group-hover:rotate-180 transition-transform duration-300" />
            <div>
              <div className="text-xs font-semibold text-slate-100">REPLACE (Ganti Seluruh Data Periode Ini)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Hapus data lama pada periode ini dan gunakan seluruh isi file baru.</div>
            </div>
          </button>

          <button
            onClick={() => onChoice('add')}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 hover:bg-slate-900/80 flex items-start gap-3 text-left transition-colors group"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-100">ADD / APPEND (Gabungkan & Deduplikasi)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tambahkan transaksi baru dengan pemeriksaan otomatis agar nomor faktur sama tidak terhitung ganda.</div>
            </div>
          </button>

          <button
            onClick={() => onChoice('keep')}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 hover:bg-slate-900/80 flex items-start gap-3 text-left transition-colors group"
          >
            <Check className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-100">USE EXISTING (Pertahankan Data Lama)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Abaikan upload file baru ini dan tetap gunakan data yang sudah tersimpan.</div>
            </div>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => onChoice('cancel')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Batal
          </button>
        </div>
      </div>
    </div>
  );
}
