import React, { useState } from 'react';
import { 
  GitBranch, 
  RotateCcw, 
  PlusCircle, 
  Check, 
  FileSpreadsheet, 
  AlertTriangle, 
  ShieldCheck, 
  CopyCheck, 
  Calendar,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { DatabaseCategory, RawUploadedFile, UploadSession, UserProfile } from '../../types/database';
import { VersionConflictModal } from './VersionConflictModal';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface VersionControlCenterViewProps {
  session: UploadSession;
  uploadedFiles: Record<DatabaseCategory, RawUploadedFile[]>;
  userProfile?: UserProfile;
  onTriggerConflictTest: (category: DatabaseCategory) => void;
  onClearCategory: (category: DatabaseCategory) => void;
}

export function VersionControlCenterView({
  session,
  uploadedFiles,
  userProfile,
  onTriggerConflictTest,
  onClearCategory,
}: VersionControlCenterViewProps) {
  const isAdmin = userProfile?.role === 'ADMIN';
  const [activeConflictModal, setActiveConflictModal] = useState<{
    fileName: string;
    categoryTitle: string;
    period: string;
    existingCount: number;
    newCount: number;
    category: DatabaseCategory;
  } | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const categories: {
    key: DatabaseCategory;
    title: string;
    period: string;
    refFile: string;
  }[] = [
    {
      key: 'previous_month',
      title: 'Database Bulan Lalu (Transaction)',
      period: 'AGUSTUS 2026',
      refFile: 'Dbase BONE - AGUSTUS.xlsx',
    },
    {
      key: 'current_month',
      title: 'Database Bulan Ini (Transaction)',
      period: 'SEPTEMBER 2026',
      refFile: '_dBase KSNI BNE.xlsx',
    },
    {
      key: 'target_salesman',
      title: 'Database Target Salesman',
      period: 'SEPTEMBER 2026',
      refFile: 'Target SC September 2026.xlsx',
    },
    {
      key: 'master_cb',
      title: 'Database Master CB / ROA',
      period: 'SEPTEMBER 2026',
      refFile: '_Master_CB BLK.xlsx',
    },
  ];

  const handleSimulateConflict = (category: DatabaseCategory, title: string, period: string, refFile: string) => {
    const existing = uploadedFiles[category] || [];
    const existingCount = existing.reduce((a, f) => a + f.rows, 0) || 120;
    setActiveConflictModal({
      fileName: refFile,
      categoryTitle: title,
      period,
      existingCount,
      newCount: 150,
      category,
    });
  };

  const handleConflictChoice = (choice: 'replace' | 'add' | 'keep' | 'cancel') => {
    if (!activeConflictModal) return;
    if (!isAdmin) {
      setNotification(`[MODE BACA SAJA] Anda login sebagai ${userProfile?.role || 'USER'}. Simulasi selesai tanpa mengubah dataset tersimpan.`);
      setActiveConflictModal(null);
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    if (choice === 'replace') {
      setNotification(`[REPLACE] Berhasil menggantikan seluruh data ${activeConflictModal.categoryTitle} dengan file baru.`);
    } else if (choice === 'add') {
      setNotification(`[ADD / APPEND] Berhasil menggabungkan file baru dengan data ${activeConflictModal.categoryTitle} & mendeduplikasi nomor faktur.`);
    } else if (choice === 'keep') {
      setNotification(`[USE EXISTING] Data lama ${activeConflictModal.categoryTitle} dipertahankan, file baru diabaikan.`);
    } else {
      setNotification(`[CANCEL] Proses upload file dibatalkan.`);
    }
    setActiveConflictModal(null);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              PHASE 2
            </span>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              <span>Version Control, Multi-File Append & Anti-Double Count Engine</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mekanisme kontrol versi ketika data periode yang sama diupload ulang, mencegah duplikasi dan double-counting nilai transaksi.
          </p>
        </div>

        <CaptureJpgButton
          targetId="main-capture-area"
          fileName={`Version_Control_${new Date().toISOString().split('T')[0]}.jpg`}
          label="Capture JPG"
        />
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Baca Saja (Read-Only):</strong> Anda masuk sebagai <span className="font-mono font-bold text-amber-200">[{userProfile?.role || 'USER'}]</span>. Kontrol versi dan penghapusan dataset terkunci. Hanya peran <strong className="text-amber-200">ADMIN</strong> yang diizinkan memodifikasi atau menghapus versi data.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0">
            READ ONLY
          </span>
        </div>
      )}

      {notification && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Rules Explanations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
            <RotateCcw className="w-4 h-4" />
            <span>1. REPLACE</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Menghapus data lama pada periode tersebut dan menggunakan seluruh dataset file baru.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
            <PlusCircle className="w-4 h-4" />
            <span>2. ADD / APPEND</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Menggabungkan multi-file cabang tanpa duplikasi dengan memeriksa primary key (No Faktur).
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-2">
            <Check className="w-4 h-4" />
            <span>3. USE EXISTING</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Menolak file baru dan tetap mempertahankan dataset yang telah tervalidasi di memori.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>4. CANCEL</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Membatalkan seluruh proses upload tanpa mengubah status database sama sekali.
          </p>
        </div>
      </div>

      {/* Current Version Control Status for each Database */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>Status Versi Periode Tersimpan</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => {
            const files = uploadedFiles[cat.key] || [];
            const isLoaded = files.length > 0;
            const totalRows = files.reduce((acc, f) => acc + f.rows, 0);

            return (
              <div
                key={cat.key}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{cat.title}</h4>
                    <span className="text-xs font-mono text-cyan-400 block mt-0.5">
                      Periode Resmi: {cat.period}
                    </span>
                  </div>

                  <div>
                    {isLoaded ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Versi Aktif ({files.length} file)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Belum Ada Data
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Baris Aktif:</span>
                    <span className="text-slate-100 font-bold">{totalRows.toLocaleString('id-ID')} baris</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>File Referensi:</span>
                    <span className="text-slate-300">{cat.refFile}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleSimulateConflict(cat.key, cat.title, cat.period, cat.refFile)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CopyCheck className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'Uji Dialog Konflik Versi (Upload Ulang)' : 'Lihat Simulasi Dialog Versi (Read-Only)'}</span>
                  </button>

                  {isLoaded && isAdmin && (
                    <button
                      onClick={() => onClearCategory(cat.key)}
                      className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-rose-400 hover:border-rose-500/40 text-xs font-medium border border-slate-800 transition-colors"
                      title="Hapus versi ini"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Version Conflict Modal if active */}
      {activeConflictModal && (
        <VersionConflictModal
          fileName={activeConflictModal.fileName}
          categoryTitle={activeConflictModal.categoryTitle}
          period={activeConflictModal.period}
          existingCount={activeConflictModal.existingCount}
          newCount={activeConflictModal.newCount}
          onChoice={handleConflictChoice}
        />
      )}
    </div>
  );
}
