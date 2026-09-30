import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ArrowRight, Save, Eye, Check } from 'lucide-react';
import { ColumnMappingDefinition, DatabaseCategory } from '../../types/database';
import { autoDetectMappings } from '../../services/columnMapper';

interface AutoMappingModalProps {
  category: DatabaseCategory;
  categoryTitle: string;
  headers: string[];
  currentMappings: Record<string, string>;
  sampleRows?: Record<string, any>[];
  readOnly?: boolean;
  onClose: () => void;
  onSaveMappings: (mappings: Record<string, string>) => void;
}

export function AutoMappingModal({
  category,
  categoryTitle,
  headers,
  currentMappings,
  sampleRows = [],
  readOnly = false,
  onClose,
  onSaveMappings,
}: AutoMappingModalProps) {
  const [detectedMap, setDetectedMap] = useState<Record<string, ColumnMappingDefinition>>(() => {
    return autoDetectMappings(category, headers, currentMappings);
  });

  const handleHeaderSelect = (canonical: string, selectedHeader: string) => {
    setDetectedMap(prev => ({
      ...prev,
      [canonical]: {
        ...prev[canonical],
        selectedHeader: selectedHeader || null,
        confidence: selectedHeader ? 100 : 0,
        needsConfirmation: false,
      },
    }));
  };

  const getSampleValuesForHeader = (header: string | null): string => {
    if (!header || sampleRows.length === 0) return '';
    const samples = sampleRows
      .slice(0, 3)
      .map(r => r[header])
      .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
      .map(v => String(v).trim());
    return samples.length > 0 ? samples.join(', ') : 'Tidak ada data di baris contoh';
  };

  const handleSave = () => {
    const finalMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(detectedMap)) {
      if (v.selectedHeader) {
        finalMap[k] = v.selectedHeader;
      }
    }
    onSaveMappings(finalMap);
    onClose();
  };

  const totalRequired = Object.values(detectedMap).filter(d => d.required).length;
  const mappedRequired = Object.values(detectedMap).filter(d => d.required && Boolean(d.selectedHeader)).length;
  const allRequiredMapped = totalRequired === mappedRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                {readOnly ? 'Detail Kolom Mapping' : 'Konfirmasi Auto Column Mapping'}: {categoryTitle}
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                readOnly
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : allRequiredMapped
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {readOnly ? 'READ ONLY' : `${mappedRequired} / ${totalRequired} Kolom Wajib Terpetakan`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {readOnly 
                ? 'Melihat hasil pemetaan kolom Excel kantor ke Canonical Key sistem.'
                : 'Periksa kecocokan kolom Excel aktual dengan Canonical Key sistem sebelum data diproses.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {readOnly && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mode Baca Saja (Read-Only) — Anda hanya dapat melihat pemetaan kolom saat ini. Perubahan pemetaan hanya dapat dilakukan oleh peran ADMIN.</span>
          </div>
        )}

        {/* Column Mapping Rows */}
        <div className="p-5 overflow-y-auto space-y-3.5 divide-y divide-slate-800/60">
          {Object.entries(detectedMap).map(([canonical, def]) => {
            const hasMatch = Boolean(def.selectedHeader);
            const isConfidenceLow = def.needsConfirmation;
            const sampleText = getSampleValuesForHeader(def.selectedHeader);

            return (
              <div key={canonical} className="pt-3 first:pt-0 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="sm:w-5/12">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{def.label}</span>
                      {def.required ? (
                        <span className="text-[10px] text-amber-400 font-medium font-mono px-1 rounded bg-amber-500/10">Wajib</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Opsional</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Canonical: <span className="text-slate-400">{canonical}</span>
                    </div>
                  </div>

                  <div className="sm:w-7/12 flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        disabled={readOnly}
                        value={def.selectedHeader || ''}
                        onChange={e => handleHeaderSelect(canonical, e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition-colors disabled:opacity-75 disabled:cursor-not-allowed ${
                          isConfidenceLow
                            ? 'border-amber-500/70 focus:border-amber-400'
                            : hasMatch
                            ? 'border-slate-700 focus:border-cyan-500 font-semibold'
                            : def.required
                            ? 'border-rose-700/60 focus:border-rose-500'
                            : 'border-slate-800 text-slate-500'
                        }`}
                      >
                        <option value="">-- Pilih Kolom Excel --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 text-right shrink-0">
                      {hasMatch && !isConfidenceLow ? (
                        <span className="text-[11px] text-emerald-400 flex items-center justify-end gap-1 font-mono">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{def.confidence}% Cocok</span>
                        </span>
                      ) : isConfidenceLow ? (
                        <span className="text-[11px] text-amber-400 flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Konfirmasi</span>
                        </span>
                      ) : def.required ? (
                        <span className="text-[11px] text-rose-400 font-medium">
                          Belum Ada
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Sample Value Preview */}
                {hasMatch && sampleText && (
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-2 text-slate-400">
                    <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-500">Contoh data baris:</span>
                    <span className="font-mono text-slate-200 truncate">{sampleText}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {readOnly
              ? 'Tampilan pratinjau pemetaan kolom aktif sistem (terkunci untuk user non-admin).'
              : 'Mapping ini disimpan otomatis ke memori browser untuk upload berikutnya.'}
          </span>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Tutup (Mode Baca Saja)
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Konfirmasi & Kunci Mapping</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
