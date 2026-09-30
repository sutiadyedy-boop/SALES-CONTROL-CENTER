import React, { useState } from 'react';
import { Table, FileSpreadsheet, Search, Eye, Filter, ShieldAlert, Lock } from 'lucide-react';
import { DatabaseCategory, RawUploadedFile, UserProfile } from '../../types/database';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface RawDataInspectorViewProps {
  uploadedFiles: Record<DatabaseCategory, RawUploadedFile[]>;
  userProfile?: UserProfile;
  onSelectSheet: (category: DatabaseCategory, fileId: string, sheetName: string) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function RawDataInspectorView({
  uploadedFiles,
  userProfile,
  onSelectSheet,
  onNavigateToUpload,
  onLoadSampleData,
}: RawDataInspectorViewProps) {
  const isAdmin = userProfile?.role === 'ADMIN';
  // Flatten all uploaded files
  const allFiles: RawUploadedFile[] = [];
  Object.values(uploadedFiles).forEach(files => allFiles.push(...files));

  const [selectedFileId, setSelectedFileId] = useState<string>(allFiles[0]?.id || '');

  if (allFiles.length === 0) {
    return (
      <EmptyState
        title="BELUM ADA FILE UNTUK DIINSPEKSI"
        description="Silakan upload file Excel kantor di Database Center untuk memeriksa baris data mentah dan header hasil parser."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const currentFile = allFiles.find(f => f.id === selectedFileId) || allFiles[0];

  // Dynamic columns generated directly from the detected headers of the Excel file
  const columns: ColumnDef<Record<string, any>>[] = currentFile.headers.map(h => ({
    key: h,
    header: h,
    render: (row) => <span className="font-mono text-xs text-slate-300">{String(row[h] ?? '-')}</span>,
  }));

  return (
    <div className="space-y-6">
      {/* Title & File Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Table className="w-5 h-5 text-cyan-400" />
            <span>Raw Data Inspector & Sheet Matrix Viewer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspeksi data mentah hasil pembacaan parser sheet dan baris header Excel tanpa asumsi format.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Raw_Data_Inspector_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />
          <span className="text-xs text-slate-400 font-semibold">Pilih File:</span>
          <select
            value={currentFile.id}
            onChange={e => setSelectedFileId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 font-semibold"
          >
            {allFiles.map(f => (
              <option key={f.id} value={f.id}>
                {f.fileName} ({f.rows} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Baca Saja (Read-Only):</strong> Anda masuk sebagai <span className="font-mono font-bold text-amber-200">[{userProfile?.role || 'USER'}]</span>. Anda dapat memeriksa baris data mentah dan sheet tanpa mengubah struktur database.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0">
            READ ONLY
          </span>
        </div>
      )}

      {/* File Metadata Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Kategori</span>
          <span className="font-mono font-bold text-cyan-400 mt-0.5 block truncate">
            {currentFile.category}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Sheet Aktif</span>
          {currentFile.sheetNames.length > 1 ? (
            <select
              value={currentFile.selectedSheet}
              onChange={e => onSelectSheet(currentFile.category, currentFile.id, e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs px-2 py-0.5 mt-0.5 w-full font-mono"
            >
              {currentFile.sheetNames.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className="font-mono font-bold text-slate-200 mt-0.5 block truncate">
              {currentFile.sheet}
            </span>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Total Baris</span>
          <span className="font-mono font-bold text-slate-200 mt-0.5 block">
            {currentFile.rows.toLocaleString('id-ID')}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Total Kolom</span>
          <span className="font-mono font-bold text-slate-200 mt-0.5 block">
            {currentFile.columns} Kolom
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Periode</span>
          <span className="font-mono font-bold text-emerald-400 mt-0.5 block truncate">
            {currentFile.period}
          </span>
        </div>
      </div>

      {/* Header pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
        <span className="text-[11px] text-slate-400 font-semibold mr-1">Header Terdeteksi:</span>
        {currentFile.headers.map(h => (
          <span key={h} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
            {h}
          </span>
        ))}
      </div>

      {/* Raw Data Table */}
      <DataTable
        title={`Tabel Mentah: ${currentFile.fileName} (Sheet: ${currentFile.selectedSheet})`}
        columns={columns}
        data={currentFile.sampleRows}
        searchPlaceholder="Cari nilai pada baris..."
        pageSizeDefault={15}
        exportFileName={`Raw_${currentFile.fileName.replace(/\.[^/.]+$/, '')}.xlsx`}
      />
    </div>
  );
}
