import React, { useState } from 'react';
import { SlidersHorizontal, CheckCircle2, AlertTriangle, AlertCircle, Edit, Eye, Database, ShieldAlert, Lock } from 'lucide-react';
import { DatabaseCategory, RawUploadedFile, UserProfile } from '../../types/database';
import { autoDetectMappings, MAPPING_DICTIONARY } from '../../services/columnMapper';
import { AutoMappingModal } from './AutoMappingModal';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface MappingHubViewProps {
  uploadedFiles: Record<DatabaseCategory, RawUploadedFile[]>;
  categoryMappings: Record<DatabaseCategory, Record<string, string>>;
  userProfile?: UserProfile;
  onUpdateMappings: (category: DatabaseCategory, mappings: Record<string, string>) => void;
  onConfirmMapping: (category: DatabaseCategory, fileId: string) => void;
}

export function MappingHubView({
  uploadedFiles,
  categoryMappings,
  userProfile,
  onUpdateMappings,
  onConfirmMapping,
}: MappingHubViewProps) {
  const isAdmin = userProfile?.role === 'ADMIN';
  const [activeModalCategory, setActiveModalCategory] = useState<{
    category: DatabaseCategory;
    title: string;
    fileId: string;
    headers: string[];
    sampleRows: Record<string, any>[];
  } | null>(null);

  const categories: { key: DatabaseCategory; title: string; subtitle: string; refFile: string }[] = [
    {
      key: 'previous_month',
      title: '1. Database Bulan Lalu (Previous Month Transaction)',
      subtitle: 'Mapping canonical: OUTLET_ID, SALESMAN_ID, TRANSACTION_DATE, SALES_VALUE, INVOICE_ID',
      refFile: 'Dbase BONE - AGUSTUS.xlsx',
    },
    {
      key: 'current_month',
      title: '2. Database Bulan Ini (Current Month Transaction)',
      subtitle: 'Mapping canonical: OUTLET_ID, SALESMAN_ID, TRANSACTION_DATE, SALES_VALUE, INVOICE_ID',
      refFile: '_dBase KSNI BNE.xlsx',
    },
    {
      key: 'target_salesman',
      title: '3. Database Target Salesman',
      subtitle: 'Mapping canonical: SALESMAN_ID = KD_SLS, TARGET_VALUE = TARGET',
      refFile: 'Target SC September 2026.xlsx',
    },
    {
      key: 'master_cb',
      title: '4. Database Master CB / ROA',
      subtitle: 'Mapping canonical: OUTLET_ID = KODE OUTLET, STATUS_CURRENT_MONTH = STATUS BLN INI',
      refFile: '_Master_CB BLK.xlsx',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
            <span>Hub Konfirmasi & Audit Auto Column Mapping</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tinjau bagaimana setiap kolom Excel kantor dipetakan ke Canonical Key aplikasi. Pengguna dapat melihat hasil pemetaan sebelum data diproses.
          </p>
        </div>

        <CaptureJpgButton
          targetId="main-capture-area"
          fileName={`Column_Mapping_Hub_${new Date().toISOString().split('T')[0]}.jpg`}
          label="Capture JPG"
        />
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Baca Saja (Read-Only):</strong> Anda masuk sebagai <span className="font-mono font-bold text-amber-200">[{userProfile?.role || 'USER'}]</span>. Seluruh kolom mapping terkunci. Hanya peran <strong className="text-amber-200">ADMIN</strong> yang diizinkan mengubah konfigurasi mapping.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0">
            READ ONLY
          </span>
        </div>
      )}

      {/* Categories Mapping Cards */}
      <div className="space-y-6">
        {categories.map(cat => {
          const files = uploadedFiles[cat.key] || [];
          const activeFile = files[0];
          const hasFile = Boolean(activeFile);
          const currentMap = categoryMappings[cat.key] || {};
          const detectedDefinitions = hasFile
            ? autoDetectMappings(cat.key, activeFile.headers, currentMap)
            : {};

          return (
            <div
              key={cat.key}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Category Card Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{cat.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{cat.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  {hasFile && (
                    <button
                      onClick={() => {
                        setActiveModalCategory({
                          category: cat.key,
                          title: cat.title,
                          fileId: activeFile.id,
                          headers: activeFile.headers,
                          sampleRows: activeFile.sampleRows,
                        });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                        isAdmin
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title={isAdmin ? 'Ubah pemetaan kolom' : 'Lihat pemetaan kolom (Read Only)'}
                    >
                      {isAdmin ? (
                        <>
                          <Edit className="w-3.5 h-3.5" />
                          <span>Ubah / Kustomisasi Mapping</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Lihat Detail Mapping</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Table of mappings */}
              {!hasFile ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Database className="w-8 h-8 text-slate-700" />
                  <span>File untuk kategori ini belum diupload. Upload file pada Database Center untuk melihat auto mapping.</span>
                  <span className="text-[10px] text-slate-600 font-mono">Referensi format: {cat.refFile}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-4 font-semibold">Canonical Key</th>
                        <th className="py-2.5 px-4 font-semibold">Fungsi / Label</th>
                        <th className="py-2.5 px-4 font-semibold">Status Wajib</th>
                        <th className="py-2.5 px-4 font-semibold">Kolom Excel Aktual</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Confidence</th>
                        <th className="py-2.5 px-4 font-semibold">Contoh Nilai Data (Row 1-3)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {Object.entries(detectedDefinitions).map(([canonical, def]) => {
                        const actualHeader = def.selectedHeader;
                        const sampleVals = actualHeader && activeFile.sampleRows.length > 0
                          ? activeFile.sampleRows
                              .slice(0, 3)
                              .map(r => r[actualHeader])
                              .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
                              .join(', ')
                          : '-';

                        return (
                          <tr key={canonical} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-cyan-400 text-xs">
                              {canonical}
                            </td>
                            <td className="py-2.5 px-4 text-slate-200 text-xs">
                              {def.label}
                            </td>
                            <td className="py-2.5 px-4">
                              {def.required ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                                  Wajib
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">
                                  Opsional
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs">
                              {actualHeader ? (
                                <span className="font-bold text-slate-100 bg-slate-800/60 px-2 py-1 rounded border border-slate-700">
                                  {actualHeader}
                                </span>
                              ) : (
                                <span className="text-rose-400 font-semibold">
                                  Belum Terpetakan
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {actualHeader ? (
                                <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{def.confidence}%</span>
                                </span>
                              ) : def.required ? (
                                <span className="text-[11px] text-rose-400 font-semibold">
                                  Missing
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-300 text-xs max-w-xs truncate" title={sampleVals}>
                              {sampleVals}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto Mapping Modal */}
      {activeModalCategory && (
        <AutoMappingModal
          category={activeModalCategory.category}
          categoryTitle={activeModalCategory.title}
          headers={activeModalCategory.headers}
          currentMappings={categoryMappings[activeModalCategory.category] || {}}
          sampleRows={activeModalCategory.sampleRows}
          readOnly={!isAdmin}
          onClose={() => setActiveModalCategory(null)}
          onSaveMappings={mappings => {
            if (isAdmin) {
              onUpdateMappings(activeModalCategory.category, mappings);
              onConfirmMapping(activeModalCategory.category, activeModalCategory.fileId);
            }
          }}
        />
      )}
    </div>
  );
}
