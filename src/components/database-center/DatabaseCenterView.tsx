import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  SlidersHorizontal, 
  Download, 
  Sparkles, 
  Eye, 
  Check, 
  FileCheck, 
  Info,
  Layers,
  Calendar,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { DatabaseCategory, RawUploadedFile, UploadSession } from '../../types/database';
import { AutoMappingModal } from './AutoMappingModal';
import { SheetInspectorModal } from './SheetInspectorModal';
import { ValidationReconciliationModal } from './ValidationReconciliationModal';
import { ReconciliationDetail } from '../../services/reconciliationEngine';
import { generateOfficeExcelFiles } from '../../services/sampleDataGenerator';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface DatabaseCenterViewProps {
  session: UploadSession;
  uploadedFiles: Record<DatabaseCategory, RawUploadedFile[]>;
  categoryMappings: Record<DatabaseCategory, Record<string, string>>;
  reconciliation: ReconciliationDetail | null;
  onFileUpload: (category: DatabaseCategory, files: FileList) => Promise<void>;
  onRemoveFile: (category: DatabaseCategory, fileId: string) => void;
  onUpdateMappings: (category: DatabaseCategory, mappings: Record<string, string>) => void;
  onSelectSheet: (category: DatabaseCategory, fileId: string, sheetName: string) => void;
  onConfirmMapping: (category: DatabaseCategory, fileId: string) => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
}

export function DatabaseCenterView({
  session,
  uploadedFiles,
  categoryMappings,
  reconciliation,
  onFileUpload,
  onRemoveFile,
  onUpdateMappings,
  onSelectSheet,
  onConfirmMapping,
  onLoadSampleData,
  onClearAllData,
}: DatabaseCenterViewProps) {
  // Modal states
  const [activeMappingModal, setActiveMappingModal] = useState<{
    category: DatabaseCategory;
    title: string;
    fileId: string;
    headers: string[];
    sampleRows: Record<string, any>[];
  } | null>(null);

  const [activeInspectorFile, setActiveInspectorFile] = useState<RawUploadedFile | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // File input refs
  const prevInputRef = useRef<HTMLInputElement>(null);
  const currInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const masterInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadOfficeSamples = () => {
    const generator = generateOfficeExcelFiles();
    generator.downloadFile(generator.wbPrev, 'Dbase BONE - AGUSTUS.xlsx');
    generator.downloadFile(generator.wbCurr, '_dBase KSNI BNE.xlsx');
    generator.downloadFile(generator.wbTrg, 'Target SC September 2026.xlsx');
    generator.downloadFile(generator.wbMaster, '_Master_CB BLK.xlsx');
  };

  const cards: {
    category: DatabaseCategory;
    title: string;
    subtitle: string;
    exampleFile: string;
    periodDefault: string;
    isMultiple: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    accentBorder: string;
    badgeColor: string;
  }[] = [
    {
      category: 'previous_month',
      title: 'DATABASE 1: BULAN LALU',
      subtitle: 'Database transaksi pembanding (Previous Month Transaction).',
      exampleFile: 'Dbase BONE - AGUSTUS.xlsx',
      periodDefault: 'AGUSTUS 2026',
      isMultiple: true,
      inputRef: prevInputRef,
      accentBorder: 'border-l-indigo-500',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      category: 'current_month',
      title: 'DATABASE 2: BULAN INI',
      subtitle: 'Database transaksi berjalan (Current Month Transaction).',
      exampleFile: '_dBase KSNI BNE.xlsx',
      periodDefault: 'SEPTEMBER 2026',
      isMultiple: true,
      inputRef: currInputRef,
      accentBorder: 'border-l-cyan-500',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      category: 'target_salesman',
      title: 'DATABASE 3: TARGET SALESMAN',
      subtitle: 'Target resmi penjualan per kode salesman (KD_SLS).',
      exampleFile: 'Target SC September 2026.xlsx',
      periodDefault: 'SEPTEMBER 2026',
      isMultiple: false,
      inputRef: targetInputRef,
      accentBorder: 'border-l-amber-500',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      category: 'master_cb',
      title: 'DATABASE 4: MASTER CB / ROA',
      subtitle: 'Master data outlet, channel, rayon, dan status aktif (STATUS BLN INI = OK).',
      exampleFile: '_Master_CB BLK.xlsx',
      periodDefault: 'MASTER AKTIF',
      isMultiple: true,
      inputRef: masterInputRef,
      accentBorder: 'border-l-emerald-500',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  // Overall database readiness count
  const readyCategoryCount = cards.filter(c => (uploadedFiles[c.category] || []).length > 0).length;

  return (
    <div className="space-y-6">
      {/* Session & Phase 1 Mission Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              PHASE 1 · DATABASE INGESTION ENGINE
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              SESSION: {session.sessionId}
            </span>
            <span className="text-xs text-slate-400">
              Kesiapan: <strong className="text-emerald-400">{readyCategoryCount}/4 Database Siap</strong>
            </span>
          </div>

          <h2 className="text-base font-bold text-slate-100 mt-2">
            Pusat Upload Excel, Deteksi Sheet, Header & Auto Mapping
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Upload file Excel kantor <strong className="text-slate-200">APA ADANYA</strong>. Sistem otomatis membaca sheet, mendeteksi baris header, memetakan canonical key, dan memvalidasi struktur data tanpa mengubah file asli.
          </p>
        </div>

        {/* Global Pipeline Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Database_Center_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          <button
            onClick={handleDownloadOfficeSamples}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            title="Download 4 file contoh (.xlsx) yang sesuai dengan struktur kantor asli"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download 4 File Contoh (.xlsx)</span>
          </button>

          <button
            onClick={onLoadSampleData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors shadow-sm"
            title="Muat 4 file contoh kantor langsung ke dalam memori sesi untuk pengujian"
          >
            <Sparkles className="w-4 h-4" />
            <span>Muat Data Contoh Kantor</span>
          </button>
        </div>
      </div>

      {/* 4 Database Upload Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(card => {
          const files = uploadedFiles[card.category] || [];
          const isUploaded = files.length > 0;
          const totalRowsInCard = files.reduce((acc, f) => acc + f.rows, 0);

          return (
            <div
              key={card.category}
              className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 border-l-4 ${card.accentBorder} flex flex-col justify-between shadow-sm`}
            >
              <div>
                {/* Station Title & Status */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">{card.title}</h3>
                      <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${card.badgeColor}`}>
                        {card.isMultiple ? 'MULTIPLE FILES' : 'SINGLE FILE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                  </div>

                  <div className="text-right shrink-0">
                    {isUploaded ? (
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready ({files.length} file)</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-500">Belum Ada File</span>
                    )}
                  </div>
                </div>

                {/* Dropzone Upload Trigger */}
                <div
                  onClick={() => card.inputRef.current?.click()}
                  className="mt-3 mb-4 border-2 border-dashed border-slate-700/80 hover:border-cyan-500/80 hover:bg-slate-800/30 rounded-xl p-4 text-center cursor-pointer transition-all group"
                >
                  <input
                    type="file"
                    ref={card.inputRef}
                    multiple={card.isMultiple}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        onFileUpload(card.category, e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-cyan-400 mx-auto mb-1.5 transition-colors" />
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    Klik atau Seret file Excel (.xlsx / .xls / .csv)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {card.isMultiple ? 'Mendukung multi-file upload sekaligus (otomatis diappend & dideduplikasi)' : 'Upload 1 file Target SC'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Contoh file kantor: <span className="text-slate-400 font-semibold">{card.exampleFile}</span>
                  </p>
                </div>

                {/* Uploaded File Cards Displaying: file name, sheet, rows, columns, period, status */}
                {files.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Daftar File yang Terbaca:</span>
                      <span className="font-mono text-slate-300">Total {totalRowsInCard.toLocaleString('id-ID')} baris</span>
                    </div>

                    {files.map(file => {
                      const isMappingConfirmed = file.mappingConfirmed;
                      const hasMissingKeys = file.validation.missingRequiredKeys.length > 0;

                      return (
                        <div
                          key={file.id}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3"
                        >
                          {/* Top: File Name + Actions */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 truncate">
                              <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                              <div className="truncate">
                                <span className="text-xs font-bold text-slate-100 block truncate" title={file.fileName}>
                                  {file.fileName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Upload: {file.uploadTime} · {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => onRemoveFile(card.category, file.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                              title="Hapus file ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Mandatory Specification Badges: sheet, rows, columns, period, status */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 font-mono">
                            {/* Sheet */}
                            <div className="text-left col-span-2 sm:col-span-1">
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Sheet</span>
                              {file.sheetNames.length > 1 ? (
                                <select
                                  value={file.selectedSheet}
                                  onChange={e => onSelectSheet(card.category, file.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-700 text-cyan-300 text-[10px] rounded px-1 py-0.5 mt-0.5 focus:outline-none w-full truncate"
                                  title="Pilih sheet aktif"
                                >
                                  {file.sheetNames.map(s => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-200 truncate block mt-0.5">
                                  {file.sheet}
                                </span>
                              )}
                            </div>

                            {/* Rows */}
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Rows</span>
                              <span className="text-[11px] font-bold text-slate-200 mt-0.5 block">
                                {file.rows.toLocaleString('id-ID')}
                              </span>
                            </div>

                            {/* Columns */}
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Columns</span>
                              <span className="text-[11px] font-bold text-slate-200 mt-0.5 block">
                                {file.columns} Kolom
                              </span>
                            </div>

                            {/* Period */}
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Period</span>
                              <span className="text-[11px] font-semibold text-cyan-400 mt-0.5 block truncate">
                                {file.period || card.periodDefault}
                              </span>
                            </div>

                            {/* Status */}
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Status</span>
                              {hasMissingKeys ? (
                                <span className="text-[10px] font-bold text-rose-400 block mt-0.5">
                                  🔴 Kolom Hilang
                                </span>
                              ) : isMappingConfirmed ? (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
                                  <Check className="w-3 h-3" /> Siap
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-400 block mt-0.5">
                                  🟡 Perlu Konfirmasi
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: Confirm Mapping & Sheet Inspector */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <button
                              onClick={() => setActiveInspectorFile(file)}
                              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-400 font-medium py-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Preview Data Mentah (Sheet Inspector)</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMappingModal({
                                  category: card.category,
                                  title: card.title,
                                  fileId: file.id,
                                  headers: file.headers,
                                  sampleRows: file.sampleRows,
                                });
                              }}
                              className="flex items-center gap-1.5 text-xs font-semibold py-1 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-colors"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Lihat & Konfirmasi Mapping</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card Footer Status */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {isUploaded
                    ? `${files.length} file termuat · Header terdeteksi otomatis`
                    : 'Menunggu upload file Excel kantor'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto Mapping Modal with live sample preview */}
      {activeMappingModal && (
        <AutoMappingModal
          category={activeMappingModal.category}
          categoryTitle={activeMappingModal.title}
          headers={activeMappingModal.headers}
          currentMappings={categoryMappings[activeMappingModal.category] || {}}
          sampleRows={activeMappingModal.sampleRows}
          onClose={() => setActiveMappingModal(null)}
          onSaveMappings={mappings => {
            onUpdateMappings(activeMappingModal.category, mappings);
            onConfirmMapping(activeMappingModal.category, activeMappingModal.fileId);
          }}
        />
      )}

      {/* Sheet Inspector Modal */}
      {activeInspectorFile && (
        <SheetInspectorModal
          file={activeInspectorFile}
          onClose={() => setActiveInspectorFile(null)}
          onSelectSheet={sheetName => {
            onSelectSheet(activeInspectorFile.category, activeInspectorFile.id, sheetName);
            setActiveInspectorFile(prev => prev ? { ...prev, selectedSheet: sheetName, sheet: sheetName } : null);
          }}
        />
      )}

      {/* Validation Reconciliation Modal */}
      {showValidationModal && (
        <ValidationReconciliationModal
          reconciliation={reconciliation}
          hasPrev={(uploadedFiles.previous_month || []).length > 0}
          hasCurr={(uploadedFiles.current_month || []).length > 0}
          hasTarget={(uploadedFiles.target_salesman || []).length > 0}
          hasMaster={(uploadedFiles.master_cb || []).length > 0}
          onClose={() => setShowValidationModal(false)}
        />
      )}
    </div>
  );
}
