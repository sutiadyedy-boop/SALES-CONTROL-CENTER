import React, { useState } from 'react';
import { 
  X, 
  Palette, 
  Check, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  Info, 
  TrendingUp, 
  Lightbulb, 
  Sun, 
  Moon,
  Monitor,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useTheme, THEME_OPTIONS, Theme, ThemeOption } from '../../context/ThemeContext';
import { soundManager } from '../../services/soundManager';

interface ThemePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemePresetModal({ isOpen, onClose }: ThemePresetModalProps) {
  const { theme, setTheme } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<Theme>(theme);
  const [activeTab, setActiveTab] = useState<'samples' | 'recommendations'>('samples');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApply = (targetTheme: Theme) => {
    soundManager.playSuccess();
    setTheme(targetTheme);
    setPreviewTheme(targetTheme);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handlePreview = (targetTheme: Theme) => {
    soundManager.playClick();
    setPreviewTheme(targetTheme);
    setTheme(targetTheme); // Live preview instantly across the whole app
  };

  const greenDarkThemes = THEME_OPTIONS.filter(t => t.category === 'green_dark');
  const otherThemes = THEME_OPTIONS.filter(t => t.category !== 'green_dark');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  SAMPEL &amp; PILIHAN TEMA VISUAL
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Data 100% Aman Tanpa Diubah
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 mt-0.5">
                Koleksi Palet Hitam + Hijau Gelap (High-Contrast Enterprise)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
              title="Tutup dialog tema"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Sampel Pilihan Tema (Hitam + Hijau)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Saran &amp; Panduan Ergonomi Visual</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {savedSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-300 text-xs font-semibold animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Tema berhasil diterapkan dan disimpan! Seluruh data dan tabel tetap utuh dengan kenyamanan visual optimal.</span>
          </div>
        )}

        {/* TAB 1: SAMPLES & PREVIEWS */}
        {activeTab === 'samples' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="text-xs text-slate-300 flex items-center justify-between">
              <span>
                Klik <strong>"Pratinjau Langsung"</strong> untuk melihat tampilan live di dashboard, atau <strong>"Gunakan Tema Ini"</strong> untuk mengaktifkan:
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Tema Aktif Saat Ini: <strong>{theme.toUpperCase()}</strong>
              </span>
            </div>

            {/* Section 1: Perpaduan Hitam + Hijau Gelap */}
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                <span>Koleksi Utama: Perpaduan Hitam &amp; Hijau Gelap</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                  4 Variasi Sampel
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {greenDarkThemes.map(opt => {
                  const isCurrent = theme === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between shadow-md ${
                        isCurrent
                          ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-slate-950'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/70'
                      }`}
                      style={{
                        backgroundColor: opt.colors.bg,
                        borderColor: isCurrent ? opt.colors.accent : opt.colors.border,
                      }}
                    >
                      {opt.isRecommended && (
                        <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500 text-slate-950 uppercase shadow-md flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>Rekomendasi Utama</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Title & Tagline */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold" style={{ color: opt.colors.text }}>
                              {opt.name}
                            </h3>
                            {isCurrent && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{opt.tagline}</p>
                        </div>

                        {/* Interactive Mini Mockup Card */}
                        <div
                          className="rounded-xl p-3 border space-y-2 shadow-inner"
                          style={{
                            backgroundColor: opt.colors.card,
                            borderColor: opt.colors.border,
                          }}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-400">TARGET VS REALISASI</span>
                            <span
                              className="font-mono font-bold px-1.5 py-0.2 rounded text-[10px]"
                              style={{
                                backgroundColor: `${opt.colors.accent}20`,
                                color: opt.colors.accent,
                              }}
                            >
                              ACHIEVED 108.4%
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-base font-extrabold font-mono" style={{ color: opt.colors.text }}>
                              Rp 284.500.000
                            </span>
                            <span className="text-xs font-mono font-bold" style={{ color: opt.colors.sampleMetric }}>
                              +18.2% MoM
                            </span>
                          </div>

                          <div className="w-full bg-slate-900/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: '84%', backgroundColor: opt.colors.accent }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <span>Keterbacaan Teks: <strong style={{ color: opt.colors.text }}>Sangat Tajam</strong></span>
                            <span className="font-mono text-emerald-400">{opt.contrastRatio}</span>
                          </div>
                        </div>

                        {/* Palette Swatches */}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span>Palet:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: opt.colors.bg }} title="Warna Latar Utama" />
                            <span className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: opt.colors.card }} title="Warna Kartu/Tabel" />
                            <span className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: opt.colors.border }} title="Warna Border" />
                            <span className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: opt.colors.accent }} title="Warna Aksen Grafis" />
                            <span className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: opt.colors.text }} title="Warna Teks Utama" />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handlePreview(opt.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Pratinjau Langsung</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApply(opt.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Gunakan Tema Ini</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Pilihan Tema Lainnya */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                <span>Pilihan Lainnya: Tema Asli (Default) &amp; Tema Terang</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherThemes.map(opt => {
                  const isCurrent = theme === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-950'
                          : 'border-slate-800 bg-slate-950/60'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-slate-100">{opt.name}</h3>
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{opt.description}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => handlePreview(opt.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApply(opt.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pilih</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SARAN & REKOMENDASI ERGONOMI VISUAL */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>1. Rekomendasi Utama: "Emerald Midnight"</span>
              </div>
              <p className="text-slate-200 leading-relaxed">
                Kami sangat merekomendasikan opsi <strong>Emerald Midnight</strong> (<code className="text-emerald-300 font-mono">#020906</code> latar belakang + <code className="text-emerald-300 font-mono">#071912</code> kartu data). Alasan ergonomis:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>
                  <strong>Sensitivitas Mata Manusia:</strong> Retina manusia paling sensitif terhadap gelombang cahaya hijau (~555 nm), sehingga gradasi hijau gelap memberikan ketenangan visual maksimal dibanding biru dingin atau abu-abu datar.
                </li>
                <li>
                  <strong>Bebas Silau (Anti-Glare):</strong> Latar belakang hitam arang pekat menyerap pantulan cahaya layar, sangat cocok saat bekerja di ruangan kantor dengan pencahayaan redup.
                </li>
                <li>
                  <strong>Teks Putih-Mint (Mint White #f0fdf4):</strong> Jauh lebih lembut di mata daripada putih murni (#FFFFFF) yang bisa menusuk penglihatan saat membaca data berjam-jam.
                </li>
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold font-mono uppercase">
                <Lightbulb className="w-4 h-4" />
                <span>2. Saran Konsistensi Warna Fungsional Data (Grafik &amp; Angka)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Agar angka dan grafik tetap mudah diinterpretasikan tanpa kebingungan arti warna, kami tetap menjaga <strong>warna fungsional universal</strong>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span><strong>Hijau Emerald:</strong> Target Tercapai &ge;100% / Growth Positif</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                  <span><strong>Merah Rose:</strong> Defisit / Under-Target &lt;65% / Drop Outlet</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                  <span><strong>Kuning Amber:</strong> Zona Akselerasi 65–85% / Peringatan</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <span><strong>Biru Cyan:</strong> Nilai Target Resmi / Penetrasi RO Aktif</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono uppercase">
                <Monitor className="w-4 h-4" />
                <span>3. Saran Tampilan untuk Hasil Cetak &amp; Tangkapan Layar (Capture JPG)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Saat tombol <strong>"Capture JPG Full HD"</strong> ditekan, mesin penangkap gambar akan secara otomatis menyelaraskan latar belakang hitam + hijau gelap secara konsisten, sehingga hasil gambar JPG yang dibagikan ke WhatsApp manajemen memiliki kualitas estetika eksekutif yang mewah dan tajam.
              </p>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 font-mono">
            Kombinasi warna mengikuti standar WCAG AAA rasio kontras &gt; 13:1.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleApply(previewTheme)}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Terapkan Pilihan Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
