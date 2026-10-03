import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  Info, 
  Eye, 
  Lock,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import { UserProfile } from '../../types/database';
import { useLogo, uploadDashboardLogo, resetDashboardLogo, DEFAULT_LOGO_URL } from '../../services/logoService';
import { LogoDashboard } from '../common/LogoDashboard';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { soundManager } from '../../services/soundManager';
import { getStoredToken } from '../../services/authService';

export interface LogoManagementViewProps {
  currentUser: UserProfile;
  onNavigateToDashboard?: () => void;
}

export function LogoManagementView({
  currentUser,
  onNavigateToDashboard,
}: LogoManagementViewProps) {
  const { logoConfig, logoUrl, hasCustomLogo, refreshLogo } = useLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & preview states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Security gate: strictly ADMIN only
  const isAdmin = currentUser.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center text-center p-8 bg-slate-900/60 border border-rose-500/30 rounded-2xl animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-xl shadow-rose-950/40">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-100 font-mono tracking-wider">
          403 FORBIDDEN · ACCESS DENIED
        </h2>
        <p className="text-xs text-rose-300 font-medium max-w-md mt-2">
          Akses ditolak: Hanya pengguna dengan peran <strong>ADMIN</strong> yang memiliki otoritas untuk mengakses menu Logo Management dan melakukan perubahan logo resmi dashboard.
        </p>
        {onNavigateToDashboard && (
          <button
            onClick={onNavigateToDashboard}
            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        )}
      </div>
    );
  }

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Size limit: 2 MB
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`Ukuran file (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      soundManager.playError();
      return;
    }

    // MIME format validation
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage('Format file tidak didukung. Format yang diperbolehkan: PNG, JPG, JPEG, WEBP.');
      setSelectedFile(null);
      setPreviewUrl(null);
      soundManager.playError();
      return;
    }

    setSelectedFile(file);

    // Create object URL for live local preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    soundManager.playClick();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = getStoredToken();
      const res = await uploadDashboardLogo(selectedFile, token);

      soundManager.playSuccess();
      setSuccessMessage(res.message || 'Logo berhasil diperbarui.');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await refreshLogo();
    } catch (err: any) {
      soundManager.playError();
      let errorText = 'Gagal memperbarui logo dashboard.';
      if (typeof err === 'string') {
        errorText = err;
      } else if (err?.message && typeof err.message === 'string') {
        errorText = err.message;
      } else if (err?.error && typeof err.error === 'string') {
        errorText = err.error;
      } else if (err?.error?.message && typeof err.error.message === 'string') {
        errorText = err.error.message;
      }
      setErrorMessage(errorText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  const handleResetToDefault = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfirmResetModal(false);

    try {
      const token = getStoredToken();
      const res = await resetDashboardLogo(token);

      soundManager.playSuccess();
      setSuccessMessage(res.message || 'Logo custom berhasil dihapus, kembali menggunakan logo default.');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await refreshLogo();
    } catch (err: any) {
      soundManager.playError();
      let errorText = 'Gagal mereset logo dashboard.';
      if (typeof err === 'string') {
        errorText = err;
      } else if (err?.message && typeof err.message === 'string') {
        errorText = err.message;
      } else if (err?.error && typeof err.error === 'string') {
        errorText = err.error;
      } else if (err?.error?.message && typeof err.error.message === 'string') {
        errorText = err.error.message;
      }
      setErrorMessage(errorText);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              BRANDING &amp; IDENTITY ENGINE
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              ADMIN ONLY
            </span>
            <span className="text-xs text-slate-400">
              Status:{' '}
              <strong className={hasCustomLogo ? 'text-cyan-400' : 'text-amber-400'}>
                {hasCustomLogo ? 'Logo Custom Resmi Aktif' : 'Logo Default Sistem Aktif'}
              </strong>
            </span>
          </div>

          <h2 className="text-base font-bold text-slate-100 mt-2 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            <span>Manajemen Logo Resmi Dashboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-3xl">
            Kelola logo resmi aplikasi yang tampil secara seragam untuk seluruh pengguna (Admin, Supervisor, Manager, dan Salesman). Perubahan logo oleh Administrator akan otomatis tersinkronisasi ke seluruh antarmuka dashboard secara terpusat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Logo_Management_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          {hasCustomLogo && (
            <button
              onClick={() => setShowConfirmResetModal(true)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition-colors shadow-sm disabled:opacity-50"
              title="Hapus logo custom dan kembali menggunakan logo default dari aset aplikasi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Mereset...' : 'Kembali ke Logo Default'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-start gap-3 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{successMessage}</p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              Seluruh halaman dashboard dan seluruh akun pengguna kini menggunakan logo terbaru ini secara otomatis.
            </p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-3 text-xs animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Gagal Memperbarui Logo</p>
            <p className="text-[11px] text-rose-400/90 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. Main Grid: Current Logo Card & Upload Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Logo Aktif Saat Ini (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Logo Aktif Dashboard</h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                hasCustomLogo
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {hasCustomLogo ? 'CUSTOM LOGO' : 'DEFAULT LOGO'}
              </span>
            </div>

            {/* Display Active Logo */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
              <div className="w-32 h-32 rounded-2xl p-3 bg-slate-900 border-2 border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/30 mb-3">
                <img
                  src={logoUrl || DEFAULT_LOGO_URL}
                  alt="Logo Aktif Dashboard"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_LOGO_URL;
                  }}
                  className="w-full h-full object-contain select-none"
                />
              </div>

              <span className="text-xs font-bold text-slate-100 font-mono tracking-wide mt-1">
                {hasCustomLogo ? 'Official Custom Dashboard Logo' : 'Default Sales Control Center Logo'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                {hasCustomLogo ? logoUrl : '/assets/logo-dashboard.png'}
              </span>
            </div>

            {/* Meta Information */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Sumber Logo:</span>
                <span className="font-mono text-slate-200">
                  {hasCustomLogo ? 'Database / Storage Server' : 'Default Asset (/public/assets)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Diperbarui Oleh:</span>
                <span className="font-mono text-slate-200">
                  {logoConfig.updatedBy || 'Sistem (Default)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Waktu Pembaruan:</span>
                <span className="font-mono text-slate-200">
                  {logoConfig.updatedAt
                    ? new Date(logoConfig.updatedAt).toLocaleString('id-ID')
                    : 'Aset Bawaan'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Ketersediaan Bagi User:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sama untuk Seluruh Pengguna</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Context Card: How It Works */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Aturan &amp; Proteksi Sistem</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 leading-relaxed text-[11px] list-disc list-inside">
              <li>
                <strong className="text-slate-300">Proteksi Role:</strong> Hanya akun ber-role <span className="text-rose-300 font-mono">ADMIN</span> yang dapat mengunggah atau mengganti logo.
              </li>
              <li>
                <strong className="text-slate-300">User Biasa:</strong> Akun ber-role <span className="text-cyan-300 font-mono">USER / SALESMAN</span> hanya dapat melihat logo tanpa menu atau tombol perubahan.
              </li>
              <li>
                <strong className="text-slate-300">Penyimpanan Terpusat:</strong> Logo disimpan di database/server storage, bukan di browser masing-masing pengguna.
              </li>
              <li>
                <strong className="text-slate-300">Fallback Aman:</strong> Jika file gambar tidak ditemukan atau rusak, sistem otomatis beralih ke logo default tanpa menampilkan broken image.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Upload Form & Live Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Upload Logo Baru</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                PNG · JPG · JPEG · WEBP (Maks 2 MB)
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />

            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : 'border-slate-700/80 hover:border-cyan-500/80 hover:bg-slate-800/40 bg-slate-950/40'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                Pilih atau Tarik File Logo ke Sini
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Klik tombol di bawah untuk memilih file gambar dari komputer Anda.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih File Gambar</span>
              </button>
            </div>

            {/* Live Preview Section when file is selected */}
            {selectedFile && previewUrl && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Preview Logo Baru Sebelum Disimpan</span>
                  </div>
                  <button
                    onClick={handleCancelPreview}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Big Image Preview */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800 text-center">
                    <div className="w-28 h-28 rounded-xl p-2 bg-slate-950 border border-cyan-500/40 flex items-center justify-center shadow-md mb-2">
                      <img
                        src={previewUrl}
                        alt="Preview Logo Baru"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-200 truncate max-w-full">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type}
                    </span>
                  </div>

                  {/* UI Placement Simulation Preview */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      Simulasi Tampilan pada Komponen:
                    </span>

                    {/* Sidebar Header Simulation */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-500 block mb-1">
                        SIMULASI HEADER SIDEBAR
                      </span>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg p-0.5 bg-slate-950 border border-cyan-500/30 flex items-center justify-center shrink-0">
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-bold text-slate-100 font-mono truncate">
                            CONTROL TOWER
                          </div>
                          <div className="text-[9px] text-cyan-400 font-semibold truncate">
                            PT PINUS MERAH ABADI
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Mobile/Badge Simulation */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-500 block mb-1">
                        SIMULASI TOP BAR HEADER
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded p-0.5 bg-slate-950 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xs font-semibold text-slate-300">
                          Sales Control Dashboard
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Saving */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLogo}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-950/40 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting to Default Logo */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Reset ke Logo Default?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Penghapusan Logo Custom</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus logo custom dan kembali menggunakan logo default sistem (<code className="text-cyan-400 font-mono">/assets/logo-dashboard.png</code>)? Perubahan ini akan segera berlaku bagi seluruh user di sistem.
            </p>

            <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                {isDeleting ? (
                  <span>Mereset...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus & Reset Logo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogoManagementView;
