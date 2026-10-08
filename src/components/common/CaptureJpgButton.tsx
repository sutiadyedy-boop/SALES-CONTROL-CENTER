import React, { useState } from 'react';
import { Camera, Check, Loader2, Download, Eye, X, AlertCircle } from 'lucide-react';
import { captureElementToJpg, triggerFileDownload } from '../../services/captureEngine';

interface CaptureJpgButtonProps {
  targetId?: string;
  targetRef?: React.RefObject<HTMLElement | null>;
  fileName?: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'compact';
}

export function CaptureJpgButton({
  targetId = 'main-capture-area',
  targetRef,
  fileName,
  label = 'Capture JPG Full HD',
  className = '',
  variant = 'secondary',
}: CaptureJpgButtonProps) {
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview modal & toast states
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [savedFileName, setSavedFileName] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleCapture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (capturing) return;

    setCapturing(true);
    setErrorMessage(null);

    try {
      const target = targetRef?.current || targetId;
      const defaultName =
        fileName ||
        `Capture_${targetId.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.jpg`;

      const result = await captureElementToJpg(target, {
        fileName: defaultName,
        backgroundColor: '#020617', // Dark enterprise background
        scale: 2.5,
        quality: 0.99,
      });

      if (result.success) {
        setCaptured(true);
        setSavedFileName(result.fileName);
        if (result.dataUrl) setPreviewDataUrl(result.dataUrl);
        if (result.blob) setPreviewBlob(result.blob);

        // Show floating toast confirmation
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);

        setTimeout(() => setCaptured(false), 2500);
      } else {
        setErrorMessage(result.error || 'Gagal memproses gambar');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to capture:', err);
      setErrorMessage('Terjadi kesalahan saat memproses gambar');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setCapturing(false);
    }
  };

  const handleReDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewBlob) {
      triggerFileDownload(previewBlob, savedFileName);
    } else if (previewDataUrl) {
      triggerFileDownload(previewDataUrl, savedFileName);
    }
  };

  const buttonContent = (
    <>
      {capturing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>Memproses JPG...</span>
        </>
      ) : captured ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tersimpan (.jpg)!</span>
        </>
      ) : errorMessage ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-rose-400">Gagal Ambil</span>
        </>
      ) : (
        <>
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span>{label}</span>
          {!label.toUpperCase().includes('FULL HD') && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
              Full HD
            </span>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleCapture}
          disabled={capturing}
          className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
            captured
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : errorMessage
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-cyan-500/40'
          } ${className}`}
          title="Ambil tangkapan layar (Capture JPG)"
        >
          {capturing ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : captured ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : errorMessage ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>
      ) : (
        <button
          onClick={handleCapture}
          disabled={capturing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            captured
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : errorMessage
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : variant === 'primary'
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-cyan-400'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-cyan-500/40'
          } ${className}`}
          title="Ambil gambar tangkapan layar menu ini (.jpg)"
        >
          {buttonContent}
        </button>
      )}

      {/* Floating Success Toast with Direct Action Buttons */}
      {showToast && (
        <div
          data-capture-ignore="true"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md px-4 py-3 rounded-2xl text-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Capture JPG Berhasil!</span>
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5" title={savedFileName}>
              {savedFileName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {previewDataUrl && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Buka pratinjau gambar"
              >
                <Eye className="w-3 h-3 text-cyan-400" />
                <span>Lihat</span>
              </button>
            )}
            <button
              onClick={handleReDownload}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors"
              title="Unduh ulang file JPG"
            >
              <Download className="w-3 h-3" />
              <span>Unduh</span>
            </button>
            <button
              onClick={() => setShowToast(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {showModal && previewDataUrl && (
        <div
          data-capture-ignore="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Pratinjau Hasil Capture JPG</h3>
                  <p className="text-xs text-slate-400">{savedFileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File JPG</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Image Preview */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={previewDataUrl}
                alt="Hasil Tangkapan Layar"
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800 shadow-md"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span>Resolusi Tinggi (2x Retina) · Format: JPG Standar</span>
              <span className="text-[11px] text-slate-500">
                Tip: Anda juga dapat klik kanan gambar di atas dan pilih "Simpan gambar sebagai..."
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
