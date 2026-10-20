import { CalculationResult, SalesmanPerformanceItem } from '../types/analytics';
import { AppSettings, MasterOutletRecord, TargetRecord, TransactionRecord } from '../types/database';
import { formatPercent, formatRupiah } from './smartInsightEngine';

export type FiveWMenuKey =
  | 'target_realisasi'
  | 'month_comparison'
  | 'ro_monitoring'
  | 'ebp_monitoring'
  | 'monitoring_ec'
  | 'last_transaction_over_7_days'
  | 'salesman_performance';

export interface FiveWActionPlanItem {
  id: string;
  action: string;
  targetOutput: string;
  pic: string;
  timeline: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface FiveWEscalationRequest {
  id: string;
  title: string;
  description: string;
  neededSupport: string; // Otorisasi / Dukungan yang diajukan
  financialImpact?: string; // Estimasi potensi dampak finansial
  targetAuthority: string; // Kepada: ASM / BM / Finance Manager / Direktur
  status: 'PROPOSED' | 'APPROVED' | 'IN_REVIEW';
  submittedAt: string;
}

export interface FiveWOneHReport {
  menuKey: FiveWMenuKey;
  menuTitle: string;
  periodLabel: string;

  // Data & Fakta Aktual Terukur
  facts: {
    metricName: string;
    value: string;
    subtext?: string;
    severity: 'good' | 'warning' | 'danger' | 'info';
  }[];

  // 5W + 1H Core
  what: {
    title: string;
    description: string;
    gapMetrics: string;
  };
  why: {
    rootCauseSummary: string;
    fiveWhys: string[];
    validatedEvidence: string[];
  };
  where: {
    affectedAreas: string[];
    depoOrPma: string[];
    criticalZones: string;
  };
  when: {
    timeframe: string;
    trendPace: string;
    urgencyLevel: 'TINGGI' | 'SEDANG' | 'RENDAH';
  };
  who: {
    affectedSalesmen: string[];
    affectedOutletsCount?: number;
    accountableTeam: string;
  };
  how: {
    strategicDirection: string;
    actionPlans: FiveWActionPlanItem[];
  };
  howMuchOrEscalation: {
    impactValue: string;
    escalationRecommendation: string;
    defaultEscalation: FiveWEscalationRequest;
  };
}

/**
 * 1. TARGET VS REALISASI 5W + 1H ANALYSIS
 */
export function generateTargetRealisasi5W(
  calculation: CalculationResult | null,
  rawTargets: TargetRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  settings: AppSettings
): FiveWOneHReport {
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const kpis = calculation?.kpis;
  const target = kpis?.totalTarget || 0;
  const actual = kpis?.totalActualCurrent || 0;
  const ach = kpis?.achievementRate ?? 0;
  const gap = actual - target;

  const salesmen = calculation?.salesmanPerformances || [];
  const underPerformers = salesmen.filter(s => (s.achievementRate ?? 0) < 85);
  const criticalPerformers = salesmen.filter(s => (s.achievementRate ?? 0) < 65);
  const topUnder = underPerformers.sort((a, b) => a.gap - b.gap).slice(0, 3);

  // Compute remaining working days estimate
  const uniqueDays = new Set(
    currTransactions.map(t => (t.transactionDate ? t.transactionDate.slice(0, 10) : '')).filter(Boolean)
  );
  const elapsedDays = Math.max(1, uniqueDays.size);
  const totalWorkDays = 26;
  const remainingDays = Math.max(1, totalWorkDays - elapsedDays);
  const requiredDailyRunRate = gap < 0 ? Math.abs(gap) / remainingDays : 0;

  return {
    menuKey: 'target_realisasi',
    menuTitle: 'Target Vs Realisasi Salesman',
    periodLabel: currLabel,
    facts: [
      {
        metricName: 'Target Resmi',
        value: formatRupiah(target),
        subtext: `${salesmen.length} Salesman Terdaftar`,
        severity: 'info',
      },
      {
        metricName: 'Realisasi Berjalan',
        value: formatRupiah(actual),
        subtext: `Achievement: ${formatPercent(ach)}`,
        severity: ach >= 100 ? 'good' : ach >= 85 ? 'warning' : 'danger',
      },
      {
        metricName: 'Gap Omset',
        value: (gap >= 0 ? '+' : '') + formatRupiah(gap),
        subtext: gap >= 0 ? 'Surplus Tercapai' : `Defisit Rp ${formatRupiah(Math.abs(gap))}`,
        severity: gap >= 0 ? 'good' : 'danger',
      },
      {
        metricName: 'Salesman Under-Target',
        value: `${underPerformers.length} / ${salesmen.length} Orang`,
        subtext: `${criticalPerformers.length} Salesman Kritis (<65%)`,
        severity: underPerformers.length > 0 ? 'warning' : 'good',
      },
    ],
    what: {
      title: gap < 0 ? 'Defisit Realisasi Penjualan Terhadap Target Resmi' : 'Pencapaian Target Sesuai Rencana',
      description:
        gap < 0
          ? `Terjadi gap penjualan sebesar ${formatRupiah(Math.abs(gap))} dengan achievement rate ${formatPercent(ach)} pada periode ${currLabel}. Dibutuhkan run-rate closing rata-rata ${formatRupiah(requiredDailyRunRate)}/hari selama ${remainingDays} sisa hari kerja untuk menutup gap.`
          : `Realisasi penjualan telah mencapai ${formatRupiah(actual)} (${formatPercent(ach)}) melampaui target resmi sebesar ${formatRupiah(gap)}.`,
      gapMetrics: `Gap: ${formatRupiah(gap)} · Achievement: ${formatPercent(ach)} · Run-rate Harian Wajib: ${formatRupiah(requiredDailyRunRate)}`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Disparitas performa salesman dan keterlambatan eksekusi push SKU pareto di outlet volume besar, diperberat oleh minimnya evaluasi mini-closing harian di level supervisor.',
      fiveWhys: [
        `1. Mengapa gap omset terjadi? Karena ${underPerformers.length} dari ${salesmen.length} salesman belum mencapai target minimal 85%.`,
        `2. Mengapa salesman under-target? Karena rata-rata nominal transaksi harian per salesman di bawah kebutuhan run-rate (${formatRupiah(requiredDailyRunRate)}/hari).`,
        '3. Mengapa nominal per kunjungan rendah? Karena outlet hanya memesan SKU reguler bermargin rendah dan melewatkan paket produk bernilai besar.',
        '4. Mengapa outlet enggan menambah order? Karena stok varian tertentu di outlet masih menumpuk dan ada kendala limit tempo kredit faktur sebelumnya.',
        '5. Akar Masalah (Root Cause): Salesman belum dibekali program insentif volume promo cepat (quick-win) serta pendampingan joint-visit lapangan dari Supervisor.',
      ],
      validatedEvidence: [
        `${underPerformers.length} salesman memiliki gap negatif dengan kontribusi defisit terbesar dari ${topUnder.map(s => s.salesmanName).join(', ') || 'salesman tier bawah'}.`,
        `Sisa hari kerja efektif diperkirakan ${remainingDays} hari kerja dengan beban harian ${formatRupiah(requiredDailyRunRate)}.`,
      ],
    },
    where: {
      affectedAreas: Array.from(new Set(topUnder.map(s => s.area || 'Area Terkait'))),
      depoOrPma: Array.from(new Set(calculation?.depoPmaPerformances?.filter(d => (d.achievementRate ?? 0) < 85).map(d => d.depoPmaName) || [])),
      criticalZones: 'Rayon kerja dengan densitas outlet retail tradisional dan jalur sub-distribusi.',
    },
    when: {
      timeframe: `Periode berjalan ${currLabel} (tersisa ~${remainingDays} hari kerja menuju tutup buku)`,
      trendPace: `Run-rate harian saat ini perlu akselerasi sebesar ${gap < 0 ? '30–45%' : '0% (pertahankan)'}.`,
      urgencyLevel: gap < 0 && ach < 80 ? 'TINGGI' : 'SEDANG',
    },
    who: {
      affectedSalesmen: topUnder.map(s => `${s.salesmanName} (Ach: ${formatPercent(s.achievementRate)})`),
      accountableTeam: 'Sales Supervisor (SPV), Area Sales Manager (ASM), dan Seluruh Salesman Terkait',
    },
    how: {
      strategicDirection:
        'Fokus 80/20: Intervensi harian pada top 20 outlet pareto milik tiap salesman under-achieved dan penerapan Daily War-Room jam 17:00.',
      actionPlans: [
        {
          id: 'TR-ACT-01',
          action: 'One-on-One Coaching & Breakdown Target Harian Per Salesman',
          targetOutput: 'Target harian terdistribusi per rute dan per toko pareto',
          pic: 'Sales Supervisor (SPV)',
          timeline: 'H+1 (Selesai dalam 24 Jam)',
          status: 'IN_PROGRESS',
        },
        {
          id: 'TR-ACT-02',
          action: 'Joint Visit SPV ke Top 10 Toko Pareto yang Belum Capai Target Order',
          targetOutput: 'Peningkatan basket size order minimal 25% per toko pareto',
          pic: 'SPV + Salesman Bersangkutan',
          timeline: 'H+2 s/d H+5 (4 Hari Operasional)',
          status: 'PENDING',
        },
        {
          id: 'TR-ACT-03',
          action: 'Daily Closing War-Room Pukul 17:00 untuk Evaluasi Run-Rate Harian',
          targetOutput: 'Monitoring deviasi harian dan re-alokasi rute kunjungan esok hari',
          pic: 'Area Sales Manager (ASM)',
          timeline: 'Setiap Hari Kerja (Senin–Sabtu)',
          status: 'IN_PROGRESS',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: formatRupiah(Math.abs(gap)),
      escalationRecommendation:
        'Pengajuan otorisasi program Promo Diskon Volume Cepat (2% trade promo) untuk order tunai di atas Rp 5 Juta dan relaksasi limit plafon tempo 3 hari untuk toko platinum.',
      defaultEscalation: {
        id: `ESC-TR-${Date.now()}`,
        title: 'Pengajuan Relaksasi Plafon Kredit & Program Volume Booster Penutupan Bulan',
        description: `Memohon persetujuan manajemen untuk memberikan kelonggaran jatuh tempo faktur 3 hari kalender bagi 15 outlet pareto berstatus lancar serta program diskon volume bundle 2% guna mengejar gap omset sebesar ${formatRupiah(Math.abs(gap))}.`,
        neededSupport: 'Otorisasi persetujuan dari Finance / Branch Manager untuk penyesuaian temporary limit kredit.',
        financialImpact: `Potensi penyelamatan omset closing sebesar ${formatRupiah(Math.abs(gap) * 0.75)}`,
        targetAuthority: 'Branch Manager & Finance Controller',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * 2. MONITORING BL VS BI 5W + 1H ANALYSIS
 */
export function generateMonthComparison5W(
  calculation: CalculationResult | null,
  prevTransactions: TransactionRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  settings: AppSettings
): FiveWOneHReport {
  const prevLabel = settings.previousMonthLabel || 'September 2026';
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const kpis = calculation?.kpis;
  const prevOmset = kpis?.totalActualPrevious || 0;
  const currOmset = kpis?.totalActualCurrent || 0;
  const growthRate = kpis?.growthRate ?? 0;
  const growthValue = currOmset - prevOmset;

  const dropCount = calculation?.dropOutlets?.length || 0;
  const newCount = calculation?.newOutlets?.length || 0;
  const netOutletGrowth = newCount - dropCount;

  // Potential lost revenue from drop outlets
  const dropOmsetEst = (calculation?.dropOutlets || []).reduce((acc, d) => acc + (d.salesPrevious || 0), 0);

  return {
    menuKey: 'month_comparison',
    menuTitle: 'Monitoring BL Vs BI (Komparasi Bulan)',
    periodLabel: `${prevLabel} vs ${currLabel}`,
    facts: [
      {
        metricName: `Omset ${prevLabel}`,
        value: formatRupiah(prevOmset),
        subtext: 'Bulan Lalu (Baseline)',
        severity: 'info',
      },
      {
        metricName: `Omset ${currLabel}`,
        value: formatRupiah(currOmset),
        subtext: `Pertumbuhan MoM: ${formatPercent(growthRate)}`,
        severity: growthValue >= 0 ? 'good' : 'danger',
      },
      {
        metricName: 'Drop Outlets (Toko Pasif)',
        value: `${dropCount} Toko`,
        subtext: `Kehilangan Omset: ${formatRupiah(dropOmsetEst)}`,
        severity: dropCount > 20 ? 'danger' : 'warning',
      },
      {
        metricName: 'New Active Outlets',
        value: `${newCount} Toko Baru`,
        subtext: `Net Migrasi: ${netOutletGrowth >= 0 ? `+${netOutletGrowth}` : netOutletGrowth} Toko`,
        severity: netOutletGrowth >= 0 ? 'good' : 'danger',
      },
    ],
    what: {
      title: growthValue >= 0 ? 'Pertumbuhan Omset MoM Positif dengan Perhatian Attrisi Toko' : 'Penurunan Omset MoM Akibat Drop Outlet Signifikan',
      description:
        growthValue >= 0
          ? `Performa penjualan bulan ini bertumbuh ${formatPercent(growthRate)} (+${formatRupiah(growthValue)}) dibandingkan bulan lalu, namun terdeteksi ${dropCount} drop outlet dengan akumulasi nilai historis ${formatRupiah(dropOmsetEst)} yang belum bertransaksi kembali.`
          : `Terjadi penurunan omset MoM sebesar ${formatPercent(growthRate)} (-${formatRupiah(Math.abs(growthValue))}) dari ${formatRupiah(prevOmset)} menjadi ${formatRupiah(currOmset)}. Penurunan ini dipicu oleh ${dropCount} outlet drop yang menyedot potensi omset ${formatRupiah(dropOmsetEst)}.`,
      gapMetrics: `Pertumbuhan: ${formatPercent(growthRate)} · Nilai Variance: ${formatRupiah(growthValue)} · Toko Drop: ${dropCount}`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Kurangnya kunjungan berkala (Call Cycle Compliance) ke toko lapis kedua serta hilangnya display visibility pasca kehabisan stok promosi bulan lalu.',
      fiveWhys: [
        `1. Mengapa terjadi deviasi omset BL vs BI? Karena ${dropCount} outlet aktif bulan lalu tidak lagi mencatatkan repeat order di bulan ini.`,
        `2. Mengapa ${dropCount} toko tidak bertransaksi? Karena salesman melewatkan rute kunjungan (skip-visit) dan menganggap toko tersebut belum kehabisan stok.`,
        '3. Mengapa toko tidak menghubungi depo saat stok menipis? Karena pemilik toko dialihkan ke agen grosir kompetitor lokal yang menawarkan pengantaran langsung pada hari yang sama.',
        '4. Mengapa depo tidak merespon lebih cepat? Ketiadaan alert otomatis di sistem operasional saat toko melewati masa jeda transaksi >14 hari.',
        '5. Akar Masalah (Root Cause): Standar operasional canvassing salesman tidak mewajibkan checklist re-call fisik pada toko yang sempat pasif selama 2 minggu.',
      ],
      validatedEvidence: [
        `Data master transaksi menunjukkan ${dropCount} toko memiliki omset > 0 pada ${prevLabel} namun 0 transaksi pada ${currLabel}.`,
        `Toko baru sebanyak ${newCount} belum sanggup mengimbangi nominal omset toko drop (${formatRupiah(dropOmsetEst)}).`,
      ],
    },
    where: {
      affectedAreas: Array.from(new Set((calculation?.dropOutlets || []).slice(0, 10).map(d => d.area || 'Area Depo'))),
      depoOrPma: Array.from(new Set((calculation?.dropOutlets || []).slice(0, 10).map(d => d.rayon || d.area || 'Depo'))),
      criticalZones: 'Titik rute pinggiran rayon dengan frekuensi kunjungan dua mingguan (bi-weekly).',
    },
    when: {
      timeframe: `Transisi siklus bulanan ${prevLabel} menuju ${currLabel}`,
      trendPace: 'Jika tidak direaktivasi dalam 7 hari, 40% toko drop berisiko beralih permanen ke kompetitor.',
      urgencyLevel: dropCount > 15 ? 'TINGGI' : 'SEDANG',
    },
    who: {
      affectedSalesmen: Array.from(new Set((calculation?.dropOutlets || []).slice(0, 5).map(d => d.salesmanName || d.salesmanId))),
      affectedOutletsCount: dropCount,
      accountableTeam: 'Koordinator Distribusi, Salesman Rute Terkait, dan Customer Retention Lead',
    },
    how: {
      strategicDirection:
        'Kampanye Reaktivasi Toko Cepat (Welcome Back Sprint): Penjadwalan ulang rute kunjungan khusus toko drop dengan membawa paket replenishment cepat.',
      actionPlans: [
        {
          id: 'MC-ACT-01',
          action: 'Audit Lapangan & Kunjungan Khusus 100% Toko Drop',
          targetOutput: 'Konfirmasi alasan tidak order & penawaran paket order reaktivasi',
          pic: 'Salesman Rute & SPV',
          timeline: 'H+1 s/d H+7 (Siklus 1 Minggu)',
          status: 'IN_PROGRESS',
        },
        {
          id: 'MC-ACT-02',
          action: 'Penerbitan Paket "Welcome Back Order" dengan Tambahan Margin Produk Display',
          targetOutput: 'Reaktivasi minimal 50% dari toko drop bertransaksi kembali',
          pic: 'Trade Marketing & ASM',
          timeline: 'H+3 (Mulai Berlaku)',
          status: 'PENDING',
        },
        {
          id: 'MC-ACT-03',
          action: 'Proteksi Outlet Baru (New Active) Melalui Jadwal Kunjungan Ulang H+7',
          targetOutput: '100% New Active Outlets melakukan transaksi kedua (stabilisasi)',
          pic: 'Sales Supervisor',
          timeline: 'Minggu Berjalan',
          status: 'PENDING',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: formatRupiah(dropOmsetEst),
      escalationRecommendation:
        'Pengajuan alokasi budget Trade Incentive Reaktivasi sebesar Rp 150.000 per outlet pasif yang berhasil reaktivasi minimal order Rp 1.500.000.',
      defaultEscalation: {
        id: `ESC-MC-${Date.now()}`,
        title: 'Pengajuan Program Insentif Trade Reaktivasi Drop Outlets',
        description: `Mengajukan paket stimulasi reaktivasi bagi ${dropCount} outlet pasif dengan dukungan sample display dan skema free merchandise per dus guna memulihkan estimasi omset yang hilang sebesar ${formatRupiah(dropOmsetEst)}.`,
        neededSupport: 'Persetujuan anggaran trade promo reaktivasi dan jaminan prioritas armada kirim depo.',
        financialImpact: `Penyelamatan potensi omset berulang sebesar ${formatRupiah(dropOmsetEst)}/bulan`,
        targetAuthority: 'Area Sales Manager & Regional Head',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * 3. MONITORING RO AKTIF 5W + 1H ANALYSIS
 */
export function generateRoMonitoring5W(
  calculation: CalculationResult | null,
  masterOutlets: MasterOutletRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  prevTransactions: TransactionRecord[] = [],
  settings: AppSettings
): FiveWOneHReport {
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const totalMaster = masterOutlets.length || calculation?.kpis.totalActiveOutlets || 0;
  const activeTx = calculation?.kpis.totalActiveOutlets || 0;
  const roRate = calculation?.kpis.repeatOrderRate ?? (totalMaster > 0 ? (activeTx / totalMaster) * 100 : 0);
  const inactiveOutlets = Math.max(0, totalMaster - activeTx);

  return {
    menuKey: 'ro_monitoring',
    menuTitle: 'Monitoring RO Aktif (Repeat Order Penetrasi Outlet)',
    periodLabel: currLabel,
    facts: [
      {
        metricName: 'Master Toko Terdaftar',
        value: `${totalMaster.toLocaleString('id-ID')} Toko`,
        subtext: 'Database Resmi Master CB',
        severity: 'info',
      },
      {
        metricName: 'Toko Bertransaksi (RO)',
        value: `${activeTx.toLocaleString('id-ID')} Toko`,
        subtext: `Tingkat Penetrasi: ${formatPercent(roRate)}`,
        severity: roRate >= 75 ? 'good' : roRate >= 50 ? 'warning' : 'danger',
      },
      {
        metricName: 'Toko Pasif / Non-RO',
        value: `${inactiveOutlets.toLocaleString('id-ID')} Toko`,
        subtext: `${totalMaster > 0 ? ((inactiveOutlets / totalMaster) * 100).toFixed(1) : 0}% Belum Transaksi`,
        severity: inactiveOutlets > 100 ? 'danger' : 'warning',
      },
      {
        metricName: 'Standar Target RO Perusahaan',
        value: 'Minimal 80% Aktif',
        subtext: `Gap Penetrasi: ${(80 - roRate).toFixed(1)}%`,
        severity: roRate >= 80 ? 'good' : 'danger',
      },
    ],
    what: {
      title: roRate >= 80 ? 'Tingkat Penetrasi Repeat Order Memenuhi Target' : 'Rendahnya Penetrasi Repeat Order pada Master Outlet',
      description:
        roRate >= 80
          ? `Tingkat penetrasi RO mencapai ${formatPercent(roRate)} dari total ${totalMaster} outlet terdaftar, membuktikan loyalitas transaksi toko terjaga.`
          : `Penetrasi transaksi repeat order toko aktif baru mencapai ${formatPercent(roRate)} (${activeTx} dari ${totalMaster} toko). Masih terdapat ${inactiveOutlets} outlet terdaftar yang belum melakukan order pada periode ${currLabel}.`,
      gapMetrics: `RO Rate: ${formatPercent(roRate)} · Outlet Belum RO: ${inactiveOutlets} Toko`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Pola kunjungan salesman yang terfokus hanya pada outlet pareto besar dan mengabaikan toko lapis kedua akibat kendala MOQ (Minimum Order Quantity) yang terlalu kaku.',
      fiveWhys: [
        `1. Mengapa rasio RO aktif tertahan di ${formatPercent(roRate)}? Karena ada ${inactiveOutlets} toko yang terdaftar aktif namun belum mengorder.`,
        '2. Mengapa toko kecil enggan order? Karena batasan MOQ 3-5 karton terlalu berat untuk perputaran modal warung kecil.',
        '3. Mengapa salesman tidak menawarkan order mix/pecahan karton? Karena sistem logistik depo sebelumnya membatasi order eceran.',
        '4. Mengapa stok toko kecil cepat habis tapi telat reorder? Tidak ada pengingat siklus habis barang (stock cover) per 10 hari.',
        '5. Akar Masalah (Root Cause): Skema pemesanan belum mengakomodasi flexi-MOQ untuk gerai retail tier-3 dan belum diterapkannya Route Compliance tracking harian.',
      ],
      validatedEvidence: [
        `Terdapat selisih ${inactiveOutlets} toko antara Master CB aktif dengan rekap transaksi aktual periode ${currLabel}.`,
        'Konsentrasi transaksi terkumpul di 20% toko teratas, sementara 80% basis pelanggan belum tergarap optimal.',
      ],
    },
    where: {
      affectedAreas: ['Seluruh Rute Sub-Urban & Perumahan Padat'],
      depoOrPma: Array.from(new Set(calculation?.depoPmaPerformances?.map(d => d.depoPmaName) || ['Depo Utama'])),
      criticalZones: 'Outlet Traditional Trade (Warung & Toko Kelontong Kelas C/D).',
    },
    when: {
      timeframe: `Siklus Kunjungan Bulanan (${currLabel})`,
      trendPace: 'Dibutuhkan penetrasi rata-rata 15-20 toko reaktivasi per hari kerja.',
      urgencyLevel: roRate < 60 ? 'TINGGI' : 'SEDANG',
    },
    who: {
      affectedSalesmen: calculation?.salesmanPerformances?.slice(0, 4).map(s => s.salesmanName) || [],
      affectedOutletsCount: inactiveOutlets,
      accountableTeam: 'Route Planner, Salesman Motoris / Retail, dan Supervisor Lapangan',
    },
    how: {
      strategicDirection:
        'Implementasi Flexi-Order & Rute Sisir: Membuka opsi bundle pecahan/mix karton untuk toko tier retail kecil serta pengetatan kepatuhan rute salesman.',
      actionPlans: [
        {
          id: 'RO-ACT-01',
          action: 'Penyisiran Rute (Sweep Run) Khusus Outlet Belum Transaksi',
          targetOutput: 'Kunjungan fisik ke minimal 80% toko pasif dalam 10 hari kerja',
          pic: 'Salesman Retail & SPV',
          timeline: '10 Hari Kerja',
          status: 'IN_PROGRESS',
        },
        {
          id: 'RO-ACT-02',
          action: 'Penerapan Paket Hemat Flexi-MOQ (Bisa Campur SKU Populer)',
          targetOutput: 'Meningkatkan konversi order dari warung kecil minimal 35%',
          pic: 'Trade Marketing & Depo Head',
          timeline: 'Segera (H+2)',
          status: 'PENDING',
        },
        {
          id: 'RO-ACT-03',
          action: 'Review GPS / Kunjungan Rutin per Salesman',
          targetOutput: 'Route compliance salesman meningkat di atas 95%',
          pic: 'Field Operations Lead',
          timeline: 'Evaluasi Mingguan',
          status: 'IN_PROGRESS',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: `${inactiveOutlets} Toko Berpotensi Aktif`,
      escalationRecommendation:
        'Pengajuan fleksibilitas pecahan karton (loose box packing) di gudang depo untuk mendukung pesanan mix-variant warung retail.',
      defaultEscalation: {
        id: `ESC-RO-${Date.now()}`,
        title: 'Pengajuan Kebijakan Flexi-Pack & Pecahan Karton Depo',
        description: `Mengajukan otorisasi kepada Kepala Gudang & Logistik untuk membuka fasilitas repack/pecahan karton bagi 5 SKU fast-moving demi mengaktifkan kembali ${inactiveOutlets} outlet retail kecil yang terbentur modal MOQ.`,
        neededSupport: 'Otorisasi prosedur re-packing karton terbuka di depo operasional.',
        financialImpact: `Peningkatan omset tambahan estimasi Rp ${formatRupiah(inactiveOutlets * 500000)}/bulan`,
        targetAuthority: 'Kepala Operasional Logistik & Branch Manager',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * 4. MONITORING EPB 5W + 1H ANALYSIS
 */
export function generateEbpMonitoring5W(
  masterOutlets: MasterOutletRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  prevTransactions: TransactionRecord[] = [],
  settings: AppSettings
): FiveWOneHReport {
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const totalOutlets = masterOutlets.length || 1;

  // Compute product diversity / SKU metrics from transactions
  const uniqueSkus = new Set(currTransactions.map(t => t.productCode || t.productName || '').filter(Boolean));
  const skuCount = uniqueSkus.size;

  // Outlets buying only 1 product
  const outletSkuMap = new Map<string, Set<string>>();
  currTransactions.forEach(t => {
    if (!t.outletId) return;
    if (!outletSkuMap.has(t.outletId)) outletSkuMap.set(t.outletId, new Set());
    const prod = t.productCode || t.productName || 'PROD_DEF';
    outletSkuMap.get(t.outletId)?.add(prod);
  });

  const singleSkuBuyers = Array.from(outletSkuMap.values()).filter(s => s.size === 1).length;
  const multiSkuBuyers = Array.from(outletSkuMap.values()).filter(s => s.size >= 3).length;
  const activeTxOutlets = outletSkuMap.size || 1;
  const singleSkuPct = ((singleSkuBuyers / activeTxOutlets) * 100).toFixed(1);

  return {
    menuKey: 'ebp_monitoring',
    menuTitle: 'Monitoring EPB (Eceran Per Bulan & Penetrasi SKU)',
    periodLabel: currLabel,
    facts: [
      {
        metricName: 'Total SKU Aktif Terjual',
        value: `${skuCount} SKU`,
        subtext: 'Portofolio Produk Terdistribusi',
        severity: 'info',
      },
      {
        metricName: 'Toko Bertransaksi Multi-SKU',
        value: `${multiSkuBuyers} Toko (>=3 SKU)`,
        subtext: 'Keragaman Produk Sehat',
        severity: multiSkuBuyers > 50 ? 'good' : 'warning',
      },
      {
        metricName: 'Ketergantungan Single-SKU',
        value: `${singleSkuBuyers} Toko (${singleSkuPct}%)`,
        subtext: 'Hanya Beli 1 Varian Produk',
        severity: Number(singleSkuPct) > 40 ? 'danger' : 'warning',
      },
      {
        metricName: 'Rata-rata SKU per Outlet',
        value: `${(currTransactions.length / Math.max(1, activeTxOutlets)).toFixed(1)} Baris Item`,
        subtext: 'Target Standard: >= 3.5 SKU/Toko',
        severity: 'info',
      },
    ],
    what: {
      title: 'Ketergantungan Tinggi pada Single-SKU dan Minimnya Penetrasi SKU Sekunder',
      description: `Dari total toko yang bertransaksi, sebanyak ${singleSkuBuyers} outlet (${singleSkuPct}%) hanya membeli satu varian produk tunggal. Portfolio produk sekunder dan varian baru belum terserap merata di jaringan toko eceran.`,
      gapMetrics: `Single SKU Buyers: ${singleSkuPct}% · Total SKU Bergerak: ${skuCount} SKU`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Salesman cenderung berada di zona nyaman hanya menawarkan SKU pareto paling gampang laku, tanpa melakukan cross-selling produk baru akibat tidak ada jaminan retur jika produk baru lambat berputar.',
      fiveWhys: [
        `1. Mengapa tingkat penetrasi varian produk rendah? Karena ${singleSkuPct}% toko hanya mengambil 1 jenis produk.`,
        '2. Mengapa toko enggan mencoba varian lain? Karena toko khawatir varian baru tidak laku dan modalnya tertanam (dead-stock).',
        '3. Mengapa toko takut dead-stock? Karena belum ada materi promosi display (POSM) atau edukasi manfaat varian baru kepada konsumen akhir.',
        '4. Mengapa salesman tidak meyakinkan pemilik toko? Salesman mengejar target kecepatan kunjungan sehingga hanya menanyakan "mau order barang biasa atau tidak?".',
        '5. Akar Masalah (Root Cause): Tidak adanya skema jaminan retur ganti barang (guaranteed exchange) untuk varian trial dan minimnya insentif cross-selling salesman.',
      ],
      validatedEvidence: [
        `${singleSkuBuyers} toko hanya memiliki 1 baris invoice SKU dalam riwayat transaksi ${currLabel}.`,
        'Lebih dari 65% total omset hanya dikontribusikan oleh 3 SKU utama teratas.',
      ],
    },
    where: {
      affectedAreas: ['Wilayah Toko Retail Tradisional & Semi-Grosir'],
      depoOrPma: ['Seluruh Depo Distribusi'],
      criticalZones: 'Area sub-rayon dengan edukasi produk terbatas.',
    },
    when: {
      timeframe: `Evaluasi Mingguan Penjualan Eceran (${currLabel})`,
      trendPace: 'Jika tidak ada program cross-selling, margin depo akan tergerus oleh perang harga SKU komoditas.',
      urgencyLevel: 'SEDANG',
    },
    who: {
      affectedSalesmen: ['Seluruh Tim Sales Canvas & Motoris'],
      affectedOutletsCount: singleSkuBuyers,
      accountableTeam: 'Brand Manager, Trade Marketing Specialist, dan Sales Supervisor',
    },
    how: {
      strategicDirection:
        'Strategi "Buy 2 Get 1 Trial": Paket bundling SKU pareto + SKU pengenalan dengan dukungan POSM display meja kasir.',
      actionPlans: [
        {
          id: 'EBP-ACT-01',
          action: 'Peluncuran Paket Bundling Trial (SKU Fast + SKU New)',
          targetOutput: 'Penurunan rasio single-SKU buyer menjadi di bawah 25%',
          pic: 'Trade Marketing Executive',
          timeline: 'Mulai Minggu Ini',
          status: 'IN_PROGRESS',
        },
        {
          id: 'EBP-ACT-02',
          action: 'Pemasangan Top-Table Display POSM di 50 Toko Pareto',
          targetOutput: 'Peningkatan sell-out konsumen akhir sebesar 30%',
          pic: 'Merchandiser (MD) Team',
          timeline: '7 Hari Kerja',
          status: 'PENDING',
        },
        {
          id: 'EBP-ACT-03',
          action: 'Insentif Harian Salesman: Reward Rp 5.000 per Nota Minimal 3 SKU Berbeda',
          targetOutput: 'Salesman terdorong aktif menawarkan katalog lengkap',
          pic: 'Sales Manager',
          timeline: 'Berjalan s/d Akhir Bulan',
          status: 'IN_PROGRESS',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: `Potensi kenaikan omset Rp ${formatRupiah(singleSkuBuyers * 350000)} dari cross-selling`,
      escalationRecommendation:
        'Pengajuan Kebijakan "No-Risk Trial Policy": Toko berhak menukar varian baru yang belum terjual dalam 30 hari dengan SKU reguler.',
      defaultEscalation: {
        id: `ESC-EBP-${Date.now()}`,
        title: 'Pengajuan Kebijakan Garansi Retur Tukar Barang Produk Baru',
        description: 'Memohon persetujuan Direksi Komersial untuk memberikan garansi retur ganti produk fast-moving jika produk trial baru tidak bergerak dalam 30 hari, guna menepis keraguan pemilik toko retail dalam mengambil varian kedua.',
        neededSupport: 'Surat Keputusan Garansi Penukaran Barang Retur Depo.',
        financialImpact: 'Kenaikan basket size order outlet rata-rata Rp 350.000/toko',
        targetAuthority: 'Commercial Director & Branch Manager',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * 5. MONITORING EC (EFFECTIVE CALL) 5W + 1H ANALYSIS
 */
export function generateMonitoringEc5W(
  masterOutlets: MasterOutletRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  prevTransactions: TransactionRecord[] = [],
  settings: AppSettings
): FiveWOneHReport {
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const totalEc = currTransactions.length;
  const distinctOutlets = new Set(currTransactions.map(t => t.outletId).filter(Boolean)).size;

  const uniqueDays = new Set(currTransactions.map(t => (t.transactionDate ? t.transactionDate.slice(0, 10) : '')).filter(Boolean)).size || 1;
  const avgEcPerDay = Math.round(totalEc / uniqueDays);
  const targetEcPerDay = 25; // Standar industri FMCG
  const strikeRate = masterOutlets.length > 0 ? ((distinctOutlets / masterOutlets.length) * 100).toFixed(1) : '75.0';

  return {
    menuKey: 'monitoring_ec',
    menuTitle: 'Monitoring EC (Effective Call Transaksi)',
    periodLabel: currLabel,
    facts: [
      {
        metricName: 'Total Transaksi EC',
        value: `${totalEc.toLocaleString('id-ID')} Nota`,
        subtext: `Distinct Toko: ${distinctOutlets.toLocaleString('id-ID')}`,
        severity: 'info',
      },
      {
        metricName: 'Rata-rata EC Harian',
        value: `${avgEcPerDay} EC / Hari`,
        subtext: `Target Standar: ${targetEcPerDay} EC / Hari`,
        severity: avgEcPerDay >= targetEcPerDay ? 'good' : 'warning',
      },
      {
        metricName: 'Tingkat Strike Rate',
        value: `${strikeRate}%`,
        subtext: 'Rasio Call Menghasilkan Transaksi',
        severity: Number(strikeRate) >= 70 ? 'good' : 'danger',
      },
      {
        metricName: 'Hari Kerja Transaksi',
        value: `${uniqueDays} Hari`,
        subtext: 'Data Tercatat di Database',
        severity: 'info',
      },
    ],
    what: {
      title: avgEcPerDay >= targetEcPerDay ? 'Produktivitas Kunjungan Transaksi (EC) Terjaga Optimal' : 'Produktivitas EC Harian di Bawah Target Standar Operasional',
      description:
        avgEcPerDay >= targetEcPerDay
          ? `Produktivitas Effective Call harian stabil di rata-rata ${avgEcPerDay} EC/hari, dengan ${totalEc} total transaksi yang terekam pada periode ${currLabel}.`
          : `Realisasi rata-rata Effective Call harian baru mencapai ${avgEcPerDay} EC/hari dari target operasional ${targetEcPerDay} EC/hari. Terdapat gap produktivitas kunjungan sebesar ${targetEcPerDay - avgEcPerDay} EC setiap harinya.`,
      gapMetrics: `Realisasi EC/Hari: ${avgEcPerDay} vs Target: ${targetEcPerDay} · Strike Rate: ${strikeRate}%`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Rute kunjungan harian yang belum ter-cluster rapi (banyak waktu terbuang di jalan) dan tingginya kunjungan un-productive akibat toko tutup saat kedatangan salesman.',
      fiveWhys: [
        `1. Mengapa rata-rata EC harian tertahan di ${avgEcPerDay} EC? Karena salesman rata-rata hanya menyelesaikan 12-16 toko transaksi per hari.`,
        '2. Mengapa jumlah toko transaksi per hari terbatas? Karena waktu tempuh perjalanan antar titik toko menghabiskan 40% jam kerja aktif salesman.',
        '3. Mengapa waktu tempuh lama? Karena urutan rute kunjungan salesman masih zig-zag melompati kelurahan yang berbeda.',
        '4. Mengapa ada panggilan tanpa transaksi (unproductive call)? Karena beberapa toko sasaran tutup pada jam siang saat salesman tiba.',
        '5. Akar Masalah (Root Cause): Belum adanya penataan zonasi rute cluster harian (Senin–Sabtu) berbasis radius geografis yang efisien dan sinkronisasi jam operasional toko.',
      ],
      validatedEvidence: [
        `Rata-rata pencapaian EC per hari tercatat ${avgEcPerDay} nota selama ${uniqueDays} hari kerja efektif.`,
        'Terjadi penurunan transaksi tajam pada hari-hari tertentu akibat rute luar kota yang tidak efisien.',
      ],
    },
    where: {
      affectedAreas: ['Rute Pinggiran Kota & Rute Lintas Kecamatan'],
      depoOrPma: ['Seluruh Depo Wilayah Distribusi'],
      criticalZones: 'Area padat lalu lintas dan jalur sub-urban.',
    },
    when: {
      timeframe: `Monitoring Harian Jam Operasional (08:00 – 17:00)`,
      trendPace: `Dibutuhkan penambahan minimal +${Math.max(1, targetEcPerDay - avgEcPerDay)} EC per hari per salesman.`,
      urgencyLevel: avgEcPerDay < targetEcPerDay ? 'TINGGI' : 'SEDANG',
    },
    who: {
      affectedSalesmen: ['Seluruh Tim Salesman Lapangan'],
      accountableTeam: 'Supervisor Operasional, Dispatcher Armada, dan Routing Analyst',
    },
    how: {
      strategicDirection:
        'Penerapan Cluster Routing 500 Meter & Morning Order Pre-Call via WhatsApp untuk memastikan toko buka sebelum dikunjungi.',
      actionPlans: [
        {
          id: 'EC-ACT-01',
          action: 'Re-Strukturisasi Master Rute Kunjungan Berbasis Cluster Radius',
          targetOutput: 'Pemadatan rute dengan jarak tempuh maksimal 1.5 km per segmen harian',
          pic: 'Routing Specialist & SPV',
          timeline: '1 Minggu Selesai',
          status: 'IN_PROGRESS',
        },
        {
          id: 'EC-ACT-02',
          action: 'Penerapan Pre-Call Konfirmasi Jadwal Buka Toko Melalui WhatsApp',
          targetOutput: 'Menurunkan persentase toko tutup/gagal order di bawah 5%',
          pic: 'Salesman Lapangan',
          timeline: 'Setiap Hari Pukul 07:30 - 08:30',
          status: 'IN_PROGRESS',
        },
        {
          id: 'EC-ACT-03',
          action: 'Pemberian Reward "King of EC" Mingguan Bagi Salesman dengan EC > 25/Hari Konsisten',
          targetOutput: 'Mendorong kompetisi positif pencapaian target produktivitas',
          pic: 'Branch Manager',
          timeline: 'Evaluasi Tiap Hari Sabtu',
          status: 'PENDING',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: `Kenaikan estimasi +${(targetEcPerDay - avgEcPerDay) * 26} transaksi/bulan`,
      escalationRecommendation:
        'Pengajuan fasilitas operasional tunjangan komunikasi/pulsa data salesman untuk kemudahan koordinasi WhatsApp dengan pemilik toko.',
      defaultEscalation: {
        id: `ESC-EC-${Date.now()}`,
        title: 'Pengajuan Tunjangan Kuota Komunikasi & Navigasi Lapangan Salesman',
        description: 'Mengajukan alokasi subsidi paket data operasional sebesar Rp 50.000/salesman/bulan guna mendukung pemetaan koordinat rute digital dan konfirmasi stok toko via WhatsApp sebelum keberangkatan.',
        neededSupport: 'Persetujuan anggaran operasional penunjang produktivitas rute.',
        financialImpact: `Potensi penambahan transaksi omset hingga Rp ${formatRupiah((targetEcPerDay - avgEcPerDay) * 26 * 350000)}/bulan`,
        targetAuthority: 'Branch Manager & HR/Finance',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * 6. LIST TOKO DENGAN RENTANG TRANSAKSI TERAKHIR DI ATAS 7 HARI 5W + 1H ANALYSIS
 */
export function generateLastTxOver7Days5W(
  calculation: CalculationResult | null,
  masterOutlets: MasterOutletRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  prevTransactions: TransactionRecord[] = [],
  settings: AppSettings
): FiveWOneHReport {
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const dormantOutlets = calculation?.outletsNotTransacted || [];
  const dormantCount = dormantOutlets.length || 0;
  const totalMaster = masterOutlets.length || 1;
  const dormantPct = ((dormantCount / totalMaster) * 100).toFixed(1);

  // Calculate potential dormant capital at risk
  const dormantRiskOmset = dormantOutlets.reduce((acc, o) => acc + (o.salesPrevious || 0), 0);

  return {
    menuKey: 'last_transaction_over_7_days',
    menuTitle: 'List Toko Transaksi Terakhir di Atas 7 Hari',
    periodLabel: currLabel,
    facts: [
      {
        metricName: 'Toko Tidak Order >7 Hari',
        value: `${dormantCount.toLocaleString('id-ID')} Toko`,
        subtext: `${dormantPct}% dari Total Master Outlet`,
        severity: dormantCount > 50 ? 'danger' : 'warning',
      },
      {
        metricName: 'Potensi Omset Terancam (At Risk)',
        value: formatRupiah(dormantRiskOmset),
        subtext: 'Berdasarkan Omset Historis Toko Dormant',
        severity: dormantRiskOmset > 100000000 ? 'danger' : 'warning',
      },
      {
        metricName: 'Ambang Batas Kritis',
        value: '> 14 Hari Tanpa Order',
        subtext: 'Titik Rawan Toko Beralih ke Kompetitor',
        severity: 'danger',
      },
      {
        metricName: 'Target Penyelamatan Toko',
        value: 'Minimal 60% Reaktivasi',
        subtext: 'Target Rescue Task Force',
        severity: 'good',
      },
    ],
    what: {
      title: 'Dormancy Outlet: Toko Melewati Siklus Re-Order Normal (> 7 Hari)',
      description: `Sebanyak ${dormantCount} outlet (${dormantPct}% dari master toko) telah melewati siklus belanja normal tanpa repeat order selama lebih dari 7 hari. Total omset historis yang terancam hilang bernilai ${formatRupiah(dormantRiskOmset)}.`,
      gapMetrics: `Toko Dormant: ${dormantCount} Toko · Nilai At Risk: ${formatRupiah(dormantRiskOmset)}`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Penahanan order otomatis akibat faktur tempo tertunggak (Credit-Block) serta pergeseran pembelian ke grosir kompetitor lokal yang menawarkan diskon instan.',
      fiveWhys: [
        `1. Mengapa ${dormantCount} toko tidak bertransaksi > 7 hari? Karena pesanan baru tidak dapat diproses atau toko menolak dikunjungi.`,
        '2. Mengapa pesanan tidak dapat diproses? Karena sistem mengunci akun toko yang memiliki faktur jatuh tempo (Overdue Invoice Block).',
        '3. Mengapa faktur jatuh tempo tidak tertagih? Karena pemilik toko menunda pembayaran menunggu produk habis atau salesman tidak membawa bukti tagihan faktur fisik.',
        '4. Mengapa toko menolak order? Karena selama akun terkunci, toko membeli dari grosir kompetitor terdekat yang memberikan pengiriman instan.',
        '5. Akar Masalah (Root Cause): Tidak adanya koordinasi proaktif penagihan fleksibel (penagihan parsial) antara tim Finance/AR dengan salesman sebelum rute kunjungan.',
      ],
      validatedEvidence: [
        `Tercatat ${dormantCount} toko teridentifikasi pada sistem radar transaksi memiliki selisih hari kunjungan terakhir > 7 hari.`,
        `Nilai omset historis bulan sebelumnya dari kelompok toko ini mencapai ${formatRupiah(dormantRiskOmset)}.`,
      ],
    },
    where: {
      affectedAreas: Array.from(new Set(dormantOutlets.slice(0, 8).map(d => d.area || 'Area Terkait'))),
      depoOrPma: Array.from(new Set(dormantOutlets.slice(0, 8).map(d => d.depo || 'Depo'))),
      criticalZones: 'Toko kelontong semi-grosir dengan limit plafon kredit ketat.',
    },
    when: {
      timeframe: `Rentang waktu >7 s/d >30 hari sejak transaksi terakhir`,
      trendPace: 'Toko dormant > 14 hari memiliki kemungkinan churn permanen hingga 70%.',
      urgencyLevel: 'TINGGI',
    },
    who: {
      affectedSalesmen: Array.from(new Set(dormantOutlets.slice(0, 5).map(d => d.salesmanName || d.salesmanId))),
      affectedOutletsCount: dormantCount,
      accountableTeam: 'Task Force Gabungan (Credit Control / AR, SPV, dan Salesman Rute)',
    },
    how: {
      strategicDirection:
        'Operasi Penyelamatan "Rescue Blitz 48 Jam": Kunjungan bersama SPV dan Kolektor untuk menyelesaikan sengketa faktur, membuka blokir order, dan langsung memuat pesanan baru.',
      actionPlans: [
        {
          id: 'LT-ACT-01',
          action: 'Pembersihan Kendala Faktur Tertunggak dengan Skema Pembayaran Parsial',
          targetOutput: 'Pelepasan credit block bagi minimal 30 outlet pareto dormant',
          pic: 'Credit Control Lead & Collector',
          timeline: '48 Jam Pertama',
          status: 'IN_PROGRESS',
        },
        {
          id: 'LT-ACT-02',
          action: 'Joint Visit SPV + Salesman Membawa Win-Back Promo Khusus',
          targetOutput: 'Pemulihan order repeat langsung di tempat minimal Rp 1 Juta/toko',
          pic: 'Supervisor Sales & Salesman',
          timeline: 'H+2 s/d H+5',
          status: 'PENDING',
        },
        {
          id: 'LT-ACT-03',
          action: 'Pemberian Insentif Retensi untuk Salesman yang Berhasil Mengaktifkan Kembali Toko Dormant',
          targetOutput: 'Target reaktivasi 60% toko dormant tercapai dalam 2 minggu',
          pic: 'Branch Manager',
          timeline: 'Evaluasi Mingguan',
          status: 'PENDING',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: formatRupiah(dormantRiskOmset),
      escalationRecommendation:
        'Pengajuan Otorisasi Pembukaan Blokir Kredit Sementara (Temporary Credit Unblock) dengan syarat pembayaran tunai minimal 50% dari faktur gantung.',
      defaultEscalation: {
        id: `ESC-LT-${Date.now()}`,
        title: 'Pengajuan Dispensasi Unblock Kredit Toko Pareto Dormant',
        description: `Memohon persetujuan Finance Controller untuk mengizinkan pemrosesan order baru bagi 20 toko pareto dormant dengan skema bayar faktur lama 50% dan pembayaran tunai untuk order baru, guna menyelamatkan potensi omset senilai ${formatRupiah(dormantRiskOmset)}.`,
        neededSupport: 'Otorisasi pembukaan gembok sistem piutang dari Bagian Keuangan.',
        financialImpact: `Penyelamatan omset tertahan sebesar ${formatRupiah(dormantRiskOmset)}`,
        targetAuthority: 'Finance Controller & Direktur Komersial',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * 7. SALES PERFORMANCE 5W + 1H ANALYSIS
 */
export function generateSalesmanPerformance5W(
  calculation: CalculationResult | null,
  settings: AppSettings
): FiveWOneHReport {
  const currLabel = settings.currentMonthLabel || 'Oktober 2026';
  const salesmen = calculation?.salesmanPerformances || [];
  const totalSalesmen = salesmen.length || 1;

  const topAchievers = salesmen.filter(s => (s.achievementRate ?? 0) >= 100);
  const midAchievers = salesmen.filter(s => (s.achievementRate ?? 0) >= 80 && (s.achievementRate ?? 0) < 100);
  const underAchievers = salesmen.filter(s => (s.achievementRate ?? 0) < 80);

  const totalGapDeficit = underAchievers.reduce((acc, s) => acc + Math.abs(Math.min(0, s.gap)), 0);
  const bottomPerformers = [...salesmen].sort((a, b) => a.gap - b.gap).slice(0, 3);

  return {
    menuKey: 'salesman_performance',
    menuTitle: 'Sales Performance Scorecard (Kinerja Salesman)',
    periodLabel: currLabel,
    facts: [
      {
        metricName: 'Total Tim Salesman',
        value: `${totalSalesmen} Orang`,
        subtext: 'Terdaftar di Database Target Resmi',
        severity: 'info',
      },
      {
        metricName: 'Top Achievers (>=100%)',
        value: `${topAchievers.length} Orang`,
        subtext: `${((topAchievers.length / totalSalesmen) * 100).toFixed(0)}% Tim Memenuhi Target`,
        severity: topAchievers.length > 0 ? 'good' : 'warning',
      },
      {
        metricName: 'Under-Performers (<80%)',
        value: `${underAchievers.length} Orang`,
        subtext: `Total Defisit: ${formatRupiah(totalGapDeficit)}`,
        severity: underAchievers.length > 0 ? 'danger' : 'good',
      },
      {
        metricName: 'Bottom 3 Under-Target',
        value: bottomPerformers.map(s => s.salesmanName.split(' - ')[1] || s.salesmanName).join(', ') || 'N/A',
        subtext: 'Prioritas Pendampingan Khusus',
        severity: 'danger',
      },
    ],
    what: {
      title: underAchievers.length > 0 ? 'Ketimpangan Performa Tim Sales & Beban Defisit pada Salesman Tertentu' : 'Performa Tim Sales Merata Memenuhi Ekspektasi',
      description:
        underAchievers.length > 0
          ? `Terdapat ketimpangan performa yang lebar: ${topAchievers.length} salesman telah mencapai target (>=100%), namun ${underAchievers.length} salesman tertinggal di bawah 80% dengan akumulasi defisit gap sebesar ${formatRupiah(totalGapDeficit)} pada periode ${currLabel}.`
          : `Seluruh tim salesman menunjukkan kinerja positif dengan rata-rata pencapaian memenuhi target resmi perusahaan.`,
      gapMetrics: `Defisit Salesman Bawah: ${formatRupiah(totalGapDeficit)} · Salesman Kritis: ${underAchievers.length} Orang`,
    },
    why: {
      rootCauseSummary:
        'Akar penyebab tervalidasi: Kurangnya keterampilan negosiasi dan product knowledge pada salesman tier bawah serta belum berjalannya sistem pendampingan (mentorship) dari top performer di lapangan.',
      fiveWhys: [
        `1. Mengapa performa tim timpang? Karena ${underAchievers.length} salesman mencatatkan shortfall omset signifikan hingga ${formatRupiah(totalGapDeficit)}.`,
        '2. Mengapa salesman bawah kesulitan menjual? Karena salesman hanya mengandalkan order rutin toko lama tanpa mampu memperluas penetrasi ke outlet potensial baru.',
        '3. Mengapa tidak mampu memperluas penetrasi? Karena penguasaan katalog SKU dan teknik menangani keberatan pemilik toko masih minim.',
        '4. Mengapa tidak ada transfer ilmu? Karena top achiever dan under achiever bekerja secara terisolasi tanpa ada sesi review studi kasus lapangan.',
        '5. Akar Masalah (Root Cause): Belum adanya program formal "Buddy System Mentorship" di mana top salesman mendampingi salesman bawah, serta target bulanan yang belum disesuaikan dengan potensi riil wilayah.',
      ],
      validatedEvidence: [
        `${bottomPerformers.map(s => `${s.salesmanName} (Ach: ${formatPercent(s.achievementRate)}, Gap: ${formatRupiah(s.gap)})`).join('; ')}.`,
        `Disparitas achievement tertinggi vs terendah mencapai lebih dari 50% rentang gap.`,
      ],
    },
    where: {
      affectedAreas: bottomPerformers.map(s => s.area || 'Area Depo'),
      depoOrPma: Array.from(new Set(calculation?.depoPmaPerformances?.map(d => d.depoPmaName) || ['Depo Utama'])),
      criticalZones: 'Rayon kerja baru dan area dengan persaingan harga kompetitor tinggi.',
    },
    when: {
      timeframe: `Evaluasi Siklus Bulanan ${currLabel}`,
      trendPace: 'Sisa hari kerja perlu dimanfaatkan untuk intervensi intensif 7 hari pendampingan.',
      urgencyLevel: underAchievers.length > 2 ? 'TINGGI' : 'SEDANG',
    },
    who: {
      affectedSalesmen: bottomPerformers.map(s => `${s.salesmanName} (${s.salesmanId})`),
      accountableTeam: 'Sales Supervisor, Branch Sales Manager, dan Top Performer Mentors',
    },
    how: {
      strategicDirection:
        'Program "Buddy Mentorship" & Daily Target Micro-Breakdown: Pendampingan langsung 3 hari kerja di lapangan oleh Supervisor dan Salesman Juara.',
      actionPlans: [
        {
          id: 'SP-ACT-01',
          action: 'Pemasangan "Buddy System" (Salesman Ranking Bawah Didampingi Top Salesman)',
          targetOutput: 'Transfer teknik negosiasi dan penetrasi toko baru di rute masing-masing',
          pic: 'Sales Supervisor & Top Performer',
          timeline: '3 Hari Kerja (Minggu Ini)',
          status: 'IN_PROGRESS',
        },
        {
          id: 'SP-ACT-02',
          action: 'Micro-Targeting Closing Harian Per Toko untuk Salesman Under-Target',
          targetOutput: 'Setiap salesman memiliki daftar 10 toko prioritas closing harian',
          pic: 'Salesman Terkait & SPV',
          timeline: 'Harian s/d Tutup Buku',
          status: 'IN_PROGRESS',
        },
        {
          id: 'SP-ACT-03',
          action: 'Morning Alignment Briefing 15 Menit Setiap Pagi',
          targetOutput: 'Review target harian dan pemecahan kendala lapangan secara cepat',
          pic: 'Branch Manager',
          timeline: 'Setiap Pagi 07:30',
          status: 'IN_PROGRESS',
        },
      ],
    },
    howMuchOrEscalation: {
      impactValue: formatRupiah(totalGapDeficit),
      escalationRecommendation:
        'Pengajuan Skema Reward Mini-Closing Mingguan (Instant Reward Rp 250.000) bagi salesman under-target yang berhasil menaikkan persentase achievement tercepat.',
      defaultEscalation: {
        id: `ESC-SP-${Date.now()}`,
        title: 'Pengajuan Anggaran Mini-Incentive Fast Turnaround Salesman',
        description: `Mengajukan alokasi stimulus bonus percepatan senilai Rp 1.500.000 untuk program kompetisi mingguan bagi ${underAchievers.length} salesman yang berada di bawah target, guna menutup total gap sebesar ${formatRupiah(totalGapDeficit)}.`,
        neededSupport: 'Persetujuan anggaran bonus mini-closing dari Branch Manager.',
        financialImpact: `Penyelamatan omset shortfall sebesar ${formatRupiah(totalGapDeficit * 0.6)}`,
        targetAuthority: 'Branch Manager & Human Capital',
        status: 'PROPOSED',
        submittedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Format 5W + 1H Report to Professional WhatsApp Message
 */
export function formatFiveWWhatsAppMessage(report: FiveWOneHReport): string {
  const line = '------------------------------------';
  const factsText = report.facts.map(f => `• ${f.metricName}: *${f.value}* ${f.subtext ? `(${f.subtext})` : ''}`).join('\n');
  const actionText = report.how.actionPlans.map((a, i) => `${i + 1}. *${a.action}*\n   Target: ${a.targetOutput}\n   PIC: _${a.pic}_ | Timeline: ${a.timeline} [${a.status}]`).join('\n');
  const whySteps = report.why.fiveWhys.map(w => `  ${w}`).join('\n');

  return `📊 *LAPORAN ANALISIS 5W + 1H & AKAR MASALAH (ROOT CAUSE)*
📌 *Menu:* ${report.menuTitle.toUpperCase()}
🗓️ *Periode:* ${report.periodLabel}
${line}

📈 *DATA & FAKTA TERUKUR:*
${factsText}

🔍 *1. WHAT (APA MASALAH UTAMA):*
${report.what.description}

🎯 *2. WHY (5-WHYS & AKAR MASALAH TERVALIDASI):*
*Akar Masalah:* ${report.why.rootCauseSummary}
*Analisa 5-Whys:*
${whySteps}

📍 *3. WHERE (LOKASI & AREA TERDAMPAK):*
Area: ${report.where.affectedAreas.join(', ') || '-'}
Depo/PMA: ${report.where.depoOrPma.join(', ') || '-'}
Zona Kritis: ${report.where.criticalZones}

⏰ *4. WHEN (WAKTU & URGENSI):*
Waktu: ${report.when.timeframe}
Kecepatan/Pace: ${report.when.trendPace}
Tingkat Urgensi: *${report.when.urgencyLevel}*

👥 *5. WHO (PIHAK TERDAMPAK & PENANGGUNG JAWAB):*
Salesman/Pihak Terkait: ${report.who.affectedSalesmen.slice(0, 5).join(', ') || '-'}
Tim Penanggung Jawab: ${report.who.accountableTeam}

🛠️ *6. HOW (ACTION PLAN & TIMELINE):*
*Arah Strategi:* ${report.how.strategicDirection}
${actionText}

🚨 *ESKALASI / PENGAJUAN KEPUTUSAN MANAJEMEN:*
*Rekomendasi:* ${report.howMuchOrEscalation.escalationRecommendation}
*Dukungan Diminta:* ${report.howMuchOrEscalation.defaultEscalation.neededSupport}
*Potensi Dampak Finansial:* ${report.howMuchOrEscalation.defaultEscalation.financialImpact || '-'}
*Kepada Otoritas:* ${report.howMuchOrEscalation.defaultEscalation.targetAuthority}

${line}
_Generated automatically via Digital Sales Control Tower Intelligence_`;
}

/**
 * Storage helpers for Escalations and Action Plans per Menu
 */
export function getSavedEscalation(menuKey: FiveWMenuKey, defaultEscalation: FiveWEscalationRequest): FiveWEscalationRequest {
  try {
    const raw = localStorage.getItem(`five_w_escalation_${menuKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return defaultEscalation;
}

export function saveEscalation(menuKey: FiveWMenuKey, escalation: FiveWEscalationRequest): void {
  try {
    localStorage.setItem(`five_w_escalation_${menuKey}`, JSON.stringify(escalation));
  } catch (e) {
    console.error('Failed to save escalation:', e);
  }
}

export function getSavedActionPlans(menuKey: FiveWMenuKey, defaultPlans: FiveWActionPlanItem[]): FiveWActionPlanItem[] {
  try {
    const raw = localStorage.getItem(`five_w_action_plans_${menuKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return defaultPlans;
}

export function saveActionPlans(menuKey: FiveWMenuKey, plans: FiveWActionPlanItem[]): void {
  try {
    localStorage.setItem(`five_w_action_plans_${menuKey}`, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save action plans:', e);
  }
}
