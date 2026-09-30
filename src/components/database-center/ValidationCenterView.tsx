import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Users, Store, CopyCheck, RefreshCw, ShieldAlert, Lock } from 'lucide-react';
import { DatabaseCategory, RawUploadedFile, UserProfile } from '../../types/database';
import { ReconciliationDetail } from '../../services/reconciliationEngine';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface ValidationCenterViewProps {
  uploadedFiles: Record<DatabaseCategory, RawUploadedFile[]>;
  categoryMappings: Record<DatabaseCategory, Record<string, string>>;
  reconciliation: ReconciliationDetail | null;
  userProfile?: UserProfile;
  onNavigateToUpload: () => void;
}

export function ValidationCenterView({
  uploadedFiles,
  categoryMappings,
  reconciliation,
  userProfile,
  onNavigateToUpload,
}: ValidationCenterViewProps) {
  const isAdmin = userProfile?.role === 'ADMIN';
  const categories: {
    category: DatabaseCategory;
    name: string;
    requiredKeys: string[];
    exampleFile: string;
  }[] = [
    {
      category: 'previous_month',
      name: 'Database 1: Bulan Lalu (Previous Month)',
      requiredKeys: ['outlet_id', 'salesman_id', 'transaction_date', 'sales_value'],
      exampleFile: 'Dbase BONE - AGUSTUS.xlsx',
    },
    {
      category: 'current_month',
      name: 'Database 2: Bulan Ini (Current Month)',
      requiredKeys: ['outlet_id', 'salesman_id', 'transaction_date', 'sales_value'],
      exampleFile: '_dBase KSNI BNE.xlsx',
    },
    {
      category: 'target_salesman',
      name: 'Database 3: Target Salesman',
      requiredKeys: ['salesman_id', 'target_value'],
      exampleFile: 'Target SC September 2026.xlsx',
    },
    {
      category: 'master_cb',
      name: 'Database 4: Master CB / ROA',
      requiredKeys: ['outlet_id', 'status_current_month'],
      exampleFile: '_Master_CB BLK.xlsx',
    },
  ];

  const status = reconciliation?.status;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Pusat Validasi & Integritas Data (Data Validation Center)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pemeriksaan kelengkapan kolom wajib, tipe data, deteksi transaksi duplikat, dan sinkronisasi cross-database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Data_Validation_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Baca Saja (Read-Only):</strong> Anda masuk sebagai <span className="font-mono font-bold text-amber-200">[{userProfile?.role || 'USER'}]</span>. Anda dapat melihat status integritas dan validasi data. Modifikasi atau perubahan dataset hanya dapat dilakukan oleh peran <strong className="text-amber-200">ADMIN</strong>.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0">
            READ ONLY
          </span>
        </div>
      )}

      {/* 4 Database Readiness Checklist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(cat => {
          const files = uploadedFiles[cat.category] || [];
          const isUploaded = files.length > 0;
          const mappings = categoryMappings[cat.category] || {};
          const missingKeys = cat.requiredKeys.filter(k => !mappings[k]);
          const totalRows = files.reduce((acc, f) => acc + f.rows, 0);

          const isValid = isUploaded && missingKeys.length === 0;

          return (
            <div
              key={cat.category}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-sm ${
                isValid
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : isUploaded
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">{cat.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    Referensi: {cat.exampleFile}
                  </span>
                </div>

                <div>
                  {isValid ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  ) : isUploaded ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Perlu Review
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Belum Upload
                    </span>
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="mt-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>File Termuat:</span>
                  <span className="font-mono text-slate-200 font-semibold">{files.length} file ({totalRows.toLocaleString('id-ID')} baris)</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Kolom Wajib:</span>
                  <span className="font-mono text-slate-200">
                    {cat.requiredKeys.length - missingKeys.length} / {cat.requiredKeys.length} terpetakan
                  </span>
                </div>

                {missingKeys.length > 0 && (
                  <div className="pt-2 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Kolom wajib belum dipetakan: {missingKeys.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Check Reconciliation Results */}
      {status && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CopyCheck className="w-4 h-4 text-cyan-400" />
              <span>Hasil Audit Pencocokan Relasi Antar Database</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Relasi Diperiksa Otomatis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Store className="w-4 h-4 text-cyan-400" />
                  Master Outlets
                </span>
                <span className="font-mono font-bold text-slate-200">{status.totalMasterOutlets} Toko</span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Outlet Aktif (Status OK):</span>
                  <span className="font-mono text-emerald-400 font-semibold">{status.activeMasterOutlets}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Toko Transaksi Cocok:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{status.matchedMasterOutletsWithTransactions}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Salesman
                </span>
                <span className="font-mono font-bold text-slate-200">{status.totalSalesmenInTransactions} Orang</span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Target Terdaftar Cocok:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{status.matchedSalesmenWithTarget}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tanpa Target di File:</span>
                  <span className="font-mono text-amber-400 font-semibold">{status.unmatchedSalesmenWithoutTarget.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CopyCheck className="w-4 h-4 text-purple-400" />
                  Deduplikasi
                </span>
                <span className="font-mono font-bold text-emerald-400">Clean</span>
              </div>
              <div className="mt-2.5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Duplikat Bulan Lalu:</span>
                  <span className="font-mono text-slate-200">{status.duplicateTransactionsPrev} baris</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Duplikat Bulan Ini:</span>
                  <span className="font-mono text-slate-200">{status.duplicateTransactionsCurr} baris</span>
                </div>
              </div>
            </div>
          </div>

          {/* Missing data warnings if any */}
          {status.missingDataWarnings.length > 0 && (
            <div className="space-y-2 pt-2">
              {status.missingDataWarnings.map((w, idx) => (
                <div key={idx} className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
