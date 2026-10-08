import { SalesmanPerformanceItem } from '../types/analytics';
import { formatRupiah, formatPercent } from './smartInsightEngine';

export interface SalesmanContact {
  salesmanId: string;
  salesmanName: string;
  phone: string; // e.g. 6281234567890
  area?: string;
  rayon?: string;
}

export interface WhatsAppGatewayConfig {
  enabled: boolean;
  provider: 'fonnte' | 'wablas' | 'watzap' | 'custom';
  apiUrl: string;
  apiKey: string;
  senderNumber?: string;
}

const CONTACTS_STORAGE_KEY = 'scc_salesman_contacts_v1';
const GATEWAY_STORAGE_KEY = 'scc_whatsapp_gateway_config_v1';
const SEND_LOGS_STORAGE_KEY = 'scc_whatsapp_send_logs_v1';

export interface WhatsAppSendLog {
  id: string;
  salesmanId: string;
  salesmanName: string;
  phone: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'SKIPPED';
  sentAt: string;
  method: 'DIRECT_WEB' | 'GATEWAY_API';
  notes?: string;
}

// Default dummy mobile prefix for realistic Indonesian numbers
const DEFAULT_PHONE_PREFIXES = ['0812', '0813', '0821', '0822', '0852', '0853'];

export function cleanIndonesianPhoneNumber(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('620')) {
    cleaned = '62' + cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function isDummySamplePhone(phone: string, salesmanId: string, idx: number = 0): boolean {
  if (!phone) return true;
  const cleaned = cleanIndonesianPhoneNumber(phone);
  const seedNum = (salesmanId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + idx) % 10000;
  const suffix = `${String(seedNum).padStart(4, '0')}${String(idx + 10).padStart(4, '0')}`;
  return cleaned.endsWith(suffix);
}

export function loadSalesmanContacts(salesmen: SalesmanPerformanceItem[]): Record<string, SalesmanContact> {
  const contacts: Record<string, SalesmanContact> = {};

  try {
    const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(contacts, parsed);
    }
  } catch (e) {
    console.error('Failed to load contacts from storage', e);
  }

  // Ensure all salesmen in the list exist in contacts
  salesmen.forEach((s, idx) => {
    if (!contacts[s.salesmanId]) {
      // Deterministic sample phone based on salesmanId for convenient first-run testing
      const seedNum = (s.salesmanId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + idx) % 10000;
      const prefix = DEFAULT_PHONE_PREFIXES[idx % DEFAULT_PHONE_PREFIXES.length];
      const sampleRaw = `${prefix}${String(seedNum).padStart(4, '0')}${String(idx + 10).padStart(4, '0')}`;
      
      contacts[s.salesmanId] = {
        salesmanId: s.salesmanId,
        salesmanName: s.salesmanName,
        phone: cleanIndonesianPhoneNumber(sampleRaw),
        area: s.area,
        rayon: s.rayon,
      };
    } else {
      contacts[s.salesmanId].salesmanName = s.salesmanName;
      if (s.area) contacts[s.salesmanId].area = s.area;
      if (s.rayon) contacts[s.salesmanId].rayon = s.rayon;
    }
  });

  return contacts;
}

export function saveSalesmanContacts(contacts: Record<string, SalesmanContact>): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save contacts to storage', e);
  }
}

export function loadGatewayConfig(): WhatsAppGatewayConfig {
  try {
    const saved = localStorage.getItem(GATEWAY_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    enabled: false,
    provider: 'fonnte',
    apiUrl: 'https://api.fonnte.com/send',
    apiKey: '',
    senderNumber: '',
  };
}

export function saveGatewayConfig(config: WhatsAppGatewayConfig): void {
  try {
    localStorage.setItem(GATEWAY_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save gateway config', e);
  }
}

export function loadSendLogs(): WhatsAppSendLog[] {
  try {
    const saved = localStorage.getItem(SEND_LOGS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function appendSendLog(log: WhatsAppSendLog): void {
  try {
    const existing = loadSendLogs();
    const updated = [log, ...existing].slice(0, 200); // keep last 200 logs
    localStorage.setItem(SEND_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save send log', e);
  }
}

export interface ReportOptions {
  currLabel: string;
  prevLabel: string;
  totalHariKerja: number;
  hariKerjaBerjalan: number;
  cabang?: string;
}

export function generatePersonalizedSalesmanReport(
  salesman: SalesmanPerformanceItem,
  opts: ReportOptions
): string {
  const { currLabel, totalHariKerja, hariKerjaBerjalan, cabang = 'CABANG BONE' } = opts;
  const sisaHariKerja = Math.max(1, totalHariKerja - hariKerjaBerjalan);

  const target = salesman.target || 0;
  const realisasi = salesman.actualCurrent || 0;
  const ach = salesman.achievementRate !== null && salesman.achievementRate !== undefined ? salesman.achievementRate : (target > 0 ? (realisasi / target) * 100 : 0);
  const gap = realisasi - target;
  const kekurangan = Math.max(0, target - realisasi);
  const targetPerHariSisa = Math.round(kekurangan / sisaHariKerja);
  const ads = hariKerjaBerjalan > 0 ? Math.round(realisasi / hariKerjaBerjalan) : 0;
  const proyeksiAkhir = Math.round(realisasi + (ads * sisaHariKerja));
  const proyeksiAch = target > 0 ? (proyeksiAkhir / target) * 100 : 0;

  const isAchieved = ach >= 100;
  const statusEmoji = isAchieved ? '🟢' : ach >= 80 ? '🟡' : '🔴';
  const statusText = isAchieved ? 'TARGET TERCAPAI (SURPLUS)' : ach >= 80 ? 'ON TRACK (MENDEKATI TARGET)' : 'PERLU AKSELERASI CEPAT';

  // Format date
  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const lines = [
    `📊 *REPORT PENCAPAIAN SALESMAN — ${currLabel.toUpperCase()}*`,
    `🏢 *PT PINUS MERAH ABADI (ESM) — ${cabang.toUpperCase()}*`,
    `🗓️ *${todayStr.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Nama:* ${salesman.salesmanName.toUpperCase()}`,
    `🆔 *Kode Sales:* ${salesman.salesmanId}`,
    `📍 *Area/Rayon:* ${salesman.area || 'GENERAL'} ${salesman.rayon ? `· ${salesman.rayon}` : ''}`,
    `🏆 *Peringkat Tim:* #${salesman.rank}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎯 *STATUS PENCAPAIAN ANDA:*`,
    `• Target Resmi: *${target > 0 ? formatRupiah(target) : 'Rp 0'}*`,
    `• Realisasi s/d Hari Ini: *${formatRupiah(realisasi)}*`,
    `• Achievement: *${formatPercent(ach)}* ${statusEmoji}`,
    `• Status Kinerja: *${statusText}*`,
    `• Posisi GAP: *${gap >= 0 ? '+' : ''}${formatRupiah(gap)}* (${gap >= 0 ? 'Surplus' : 'Defisit'})`,
    ``,
    `⏱️ *NAVIGASI HARI KERJA & RUN-RATE:*`,
    `• Hari Kerja: Hari ke-*${hariKerjaBerjalan}* dari *${totalHariKerja}* hari (Sisa *${sisaHariKerja}* hari kerja)`,
    `• Kekurangan Target: *${formatRupiah(kekurangan)}*`,
    `• Target Wajib / Hari Sisa: *${formatRupiah(targetPerHariSisa)} / hari kerja*`,
    `• Run-rate Rata-rata Harian (ADS): *${formatRupiah(ads)} / hari*`,
    `• Estimasi Proyeksi Akhir Bulan: *${formatRupiah(proyeksiAkhir)}* (${formatPercent(proyeksiAch)})`,
    ``,
    `🏪 *MONITORING TOKO & EFFECTIVE CALL (EC):*`,
    `• Total Master Toko Aktif: *${salesman.totalMasterOutlets || salesman.activeOutlets || 0} Toko*`,
    `• Toko Sudah Beli (EC): *${salesman.transactingOutlets || 0} Toko*`,
    `• Toko Belum Beli: *${salesman.nonTransactingOutlets || Math.max(0, (salesman.totalMasterOutlets || 0) - (salesman.transactingOutlets || 0))} Toko* ⚠️`,
    `• Penetrasi Repeat Order (RO): *${salesman.roRate !== null ? formatPercent(salesman.roRate) : 'N/A'}*`,
    ...(salesman.dropOutletsCount > 0 ? [`• Toko Drop (Beli bln lalu, bln ini belum): *${salesman.dropOutletsCount} Toko*`] : []),
    ``,
    `🚨 *3 REKOMENDASI TINDAKAN HARI INI:*`,
    `1️⃣ *Kunjungi & Ambil Order:* Prioritaskan ${salesman.nonTransactingOutlets || 0} toko yang belum order di rute hari ini.`,
    `2️⃣ *Target Minimal Harian:* Pertahankan penjualan minimal *${formatRupiah(targetPerHariSisa)}* per hari agar target 100% tercapai.`,
    `3️⃣ *Jaga Kerapihan Faktur:* Pastikan seluruh PO telah terbit faktur sah dan terinput di sistem.`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💪 *Kawal Rute Kunjungan, Berikan yang Terbaik & Raih Target 100%!*`,
    `_Pesan otomatis dari Digital Sales Control Tower PT Pinus Merah Abadi_`
  ];

  return lines.join('\n');
}

export function getWhatsAppDirectUrl(phone: string, message: string): string {
  const cleaned = cleanIndonesianPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  return cleaned 
    ? `https://wa.me/${cleaned}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

export function getWhatsAppWebDirectUrl(phone: string, message: string): string {
  const cleaned = cleanIndonesianPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  return cleaned 
    ? `https://web.whatsapp.com/send?phone=${cleaned}&text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;
}

export function getWhatsAppAppProtocolUrl(phone: string, message: string): string {
  const cleaned = cleanIndonesianPhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  return cleaned
    ? `whatsapp://send?phone=${cleaned}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;
}

export function openDirectWhatsAppWeb(phone: string, message: string, preferWebOnly: boolean = false): boolean {
  const url = preferWebOnly ? getWhatsAppWebDirectUrl(phone, message) : getWhatsAppDirectUrl(phone, message);
  try {
    // Anchor-click method works reliably inside sandboxed iframes where window.open may return null
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      return !!win;
    } catch {
      return false;
    }
  }
}

export async function sendReportViaGateway(
  config: WhatsAppGatewayConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; message: string; data?: any }> {
  const cleaned = cleanIndonesianPhoneNumber(phone);
  if (!cleaned) {
    return { success: false, message: 'Nomor WhatsApp tidak valid' };
  }

  try {
    const res = await fetch('/api/whatsapp/send-gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gatewayConfig: config,
        phone: cleaned,
        message,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || data.message || 'Gagal mengirim pesan melalui Gateway',
        data,
      };
    }

    return {
      success: true,
      message: 'Pesan berhasil dikirim via Gateway WhatsApp!',
      data,
    };
  } catch (err: any) {
    console.error('Gateway send error:', err);
    return {
      success: false,
      message: err?.message || 'Gagal menghubungi server WhatsApp Gateway',
    };
  }
}
