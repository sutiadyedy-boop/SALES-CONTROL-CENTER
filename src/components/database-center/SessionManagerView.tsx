import React from 'react';
import { History, PlusCircle, RotateCcw, CheckCircle2, FileSpreadsheet, Clock, User } from 'lucide-react';
import { DatabaseCategory, RawUploadedFile, UploadSession, UserProfile } from '../../types/database';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface SessionManagerViewProps {
  session: UploadSession;
  uploadedFiles: Record<DatabaseCategory, RawUploadedFile[]>;
  userProfile: UserProfile;
  onNewSession: () => void;
  onClearSession: () => void;
}

export function SessionManagerView({
  session,
  uploadedFiles,
  userProfile,
  onNewSession,
  onClearSession,
}: SessionManagerViewProps) {
  const allFiles: RawUploadedFile[] = [];
  Object.values(uploadedFiles).forEach(files => allFiles.push(...files));

  const totalRows = allFiles.reduce((acc, f) => acc + f.rows, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Manajemen Sesi Upload & Log Audit Sesi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Melacak riwayat sesi proses data, waktu upload, file terhubung, dan kontrol versi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Session_Manager_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Mulai Sesi Baru</span>
          </button>

          <button
            onClick={onClearSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data Sesi Ini</span>
          </button>
        </div>
      </div>

      {/* Session Metadata Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">SESSION ID AKTIF:</span>
            <span className="text-sm font-bold font-mono text-cyan-400 px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
              {session.sessionId}
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            SESSION ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Waktu Pembuatan</span>
            <span className="font-mono text-slate-200 mt-1 block font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(session.createdAt).toLocaleTimeString('id-ID')}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Pengguna / Role</span>
            <span className="text-slate-200 mt-1 block font-semibold flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {userProfile.name} ({userProfile.role})
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Total File Termuat</span>
            <span className="font-mono text-slate-200 mt-1 block font-semibold">
              {allFiles.length} file Excel
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Total Baris Terkonsolidasi</span>
            <span className="font-mono text-cyan-300 mt-1 block font-semibold">
              {totalRows.toLocaleString('id-ID')} baris
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Files Manifest Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>Manifest File dalam Sesi {session.sessionId}</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {allFiles.length} file terdaftar
          </span>
        </div>

        {allFiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada file yang diupload dalam sesi ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Nama File</th>
                  <th className="py-2.5 px-4 font-semibold">Kategori Database</th>
                  <th className="py-2.5 px-4 font-semibold">Sheet</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Rows</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Columns</th>
                  <th className="py-2.5 px-4 font-semibold">Period</th>
                  <th className="py-2.5 px-4 font-semibold">Waktu Upload</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allFiles.map(f => (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 text-slate-100 font-bold font-sans">
                      {f.fileName}
                    </td>
                    <td className="py-2.5 px-4 text-cyan-400">
                      {f.category}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">
                      {f.sheet}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-200 font-bold">
                      {f.rows.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300">
                      {f.columns}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400">
                      {f.period}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {f.uploadTime}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        TERVERIFIKASI
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
