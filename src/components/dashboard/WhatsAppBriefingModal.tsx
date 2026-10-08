import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { CalculationResult } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatRupiah } from '../../services/smartInsightEngine';
import { soundManager } from '../../services/soundManager';

interface WhatsAppBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: CalculationResult;
  settings: AppSettings;
  totalHariKerja: number;
  hariKerjaBerjalan: number;
}

export function WhatsAppBriefingModal({
  isOpen,
  onClose,
  calculation,
  settings,
  totalHariKerja,
  hariKerjaBerjalan,
}: WhatsAppBriefingModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const { kpis, dropOutlets, salesmanPerformances } = calculation;
  const currLabel = settings.currentMonthLabel || 'September 2026';
  const sisaHariKerja = Math.max(1, totalHariKerja - hariKerjaBerjalan);

  // Derivations
  const kekuranganTarget = Math.max(0, kpis.totalTarget - kpis.totalActualCurrent);
  const targetHarianWajib = Math.round(kekuranganTarget / sisaHariKerja);
  const ads = hariKerjaBerjalan > 0 ? Math.round(kpis.totalActualCurrent / hariKerjaBerjalan) : 0;
  const closingEstimation = Math.round(kpis.totalActualCurrent + (ads * sisaHariKerja));
  const projectedAch = kpis.totalTarget > 0 ? (closingEstimation / kpis.totalTarget) * 100 : 0;

  // Top 3 drop outlets for flash card
  const top3Drop = [...dropOutlets]
    .sort((a, b) => b.salesPrevious - a.salesPrevious)
    .slice(0, 3);

  // Salesmen needing focus (achievement < 60%)
  const underperformers = salesmanPerformances
    .filter(s => s.target > 0 && (s.achievementRate ?? 0) < 60)
    .slice(0, 3);

  // Format Indonesian Date
  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Compose professional WhatsApp message template
  const messageText = 
`📊 *DIGITAL SALES CONTROL TOWER — MORNING BRIEFING*
🏢 *PT PINUS MERAH ABADI (ESM)*
🗓️ *${todayStr.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *STATUS TARGET & REALISASI (${currLabel.toUpperCase()})*
• Target Cabang: ${kpis.totalTarget > 0 ? formatRupiah(kpis.totalTarget) : 'Rp 0'}
• Realisasi s/d Hari Ini: ${formatRupiah(kpis.totalActualCurrent)} (${kpis.achievementRate !== null ? kpis.achievementRate.toFixed(1) : 0}%)
• Sisa Kekurangan Gap: ${formatRupiah(kekuranganTarget)}

⏱️ *NAVIGASI HARI KERJA & PENJUALAN AKTUAL*
• Hari Kerja: Hari ke-${hariKerjaBerjalan} dari ${totalHariKerja} hari (Sisa ${sisaHariKerja} hari)
• Rata-rata Penjualan Harian (ADS): ${formatRupiah(ads)}/hari
• GAP Defisit Saat Ini: ${formatRupiah(kekuranganTarget)}

🚨 *3 TITIK FOKUS UTAMA HARI INI:*
1️⃣ *Outlet Belum Order:* Ada *${kpis.outletsNotTransactedCurrent} Outlet Aktif* belum order di bulan ini. Segera visit & terbitkan faktur!
2️⃣ *Top Outlet Drop Perlu Reaktivasi:*
${top3Drop.length > 0 ? top3Drop.map((d, i) => `   ${i + 1}. ${d.outletName} (${d.salesmanName || 'SLS'} - Drop ${formatRupiah(d.salesPrevious)})`).join('\n') : '   - Tidak ada drop outlet kritis'}
3️⃣ *Akselerasi Salesman di Bawah 60%:*
${underperformers.length > 0 ? underperformers.map((s, i) => `   • ${s.salesmanName}: Ach ${s.achievementRate?.toFixed(1) || 0}% (Gap ${formatRupiah(Math.abs(s.gap))})`).join('\n') : '   • Seluruh salesman berjalan on-track!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💪 *Aksi Cepat, Kawal Rute Kunjungan, Capai Target 100%!*
_Generated automatically via ESM Sales Control Tower_`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      soundManager.playSuccess();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareWhatsApp = () => {
    soundManager.playClick();
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/?text=${encoded}`;
    try {
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>WhatsApp Morning Briefing Generator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Siap Kirim
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pesan briefing harian terstruktur otomatis untuk dibagikan ke grup WhatsApp Sales & Supervisor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Preview Text */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Format Pesan WhatsApp (Otomatis Diolah dari Calculation Engine):</span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold">
              {todayStr}
            </span>
          </div>

          <div className="relative rounded-xl bg-slate-950 border border-slate-800/90 p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all max-h-[380px] overflow-y-auto">
            {messageText}
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              Pesan ini otomatis memuat target harian sisa, top 3 toko drop terbesar, dan daftar salesman yang membutuhkan evaluasi pagi.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Teks'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Buka di WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
