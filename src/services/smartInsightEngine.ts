import { ControlTowerKPIs, SalesmanPerformanceItem, SmartInsightItem, InsightClassification } from '../types/analytics';
import { AppSettings, InsightThresholds } from '../types/database';
import { DEFAULT_THRESHOLDS } from './storageService';

export function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatPercent(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return 'N/A';
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

export function formatRate(val: number | null): string {
  if (val === null || isNaN(val) || !isFinite(val)) return 'N/A';
  return `${val.toFixed(1)}%`;
}

export function generateSmartInsights(
  kpis: ControlTowerKPIs,
  salesmanPerformances: SalesmanPerformanceItem[],
  settings: AppSettings
): SmartInsightItem[] {
  // If database is completely empty, return empty array to trigger "DATA BELUM TERSEDIA"
  if (
    kpis.totalActualCurrent === 0 &&
    kpis.totalActualPrevious === 0 &&
    kpis.totalTarget === 0 &&
    kpis.totalActiveOutlets === 0
  ) {
    return [];
  }

  const insights: SmartInsightItem[] = [];
  const currLabel = settings.currentMonthLabel || 'Bulan Ini';
  const prevLabel = settings.previousMonthLabel || 'Bulan Lalu';
  const th: InsightThresholds = settings.thresholds || DEFAULT_THRESHOLDS;

  // 1. DOMAIN: ACHIEVEMENT
  if (kpis.totalTarget > 0 && kpis.achievementRate !== null) {
    const ach = kpis.achievementRate;
    let classification: InsightClassification = 'OPPORTUNITY';
    let level: SmartInsightItem['level'] = 'positive';

    if (ach < th.achievementCritical) {
      classification = 'PRIORITY';
      level = 'critical';
    } else if (ach < th.achievementWarning) {
      classification = 'ATTENTION';
      level = 'warning';
    } else {
      classification = 'OPPORTUNITY';
      level = 'positive';
    }

    const gapFormatted = formatRupiah(Math.abs(kpis.gapValue));
    const headline = `Achievement saat ini ${ach.toFixed(1)}%.`;
    const narrative = ach >= 100
      ? `Realisasi penjualan ${currLabel} sebesar ${formatRupiah(kpis.totalActualCurrent)} telah melampaui target ${formatRupiah(kpis.totalTarget)} dengan kelebihan ${gapFormatted} (+${(ach - 100).toFixed(1)}%).`
      : `Realisasi penjualan ${currLabel} mencapai ${formatRupiah(kpis.totalActualCurrent)} dari target ${formatRupiah(kpis.totalTarget)}, dengan kekurangan defisit sebesar ${gapFormatted} (${(100 - ach).toFixed(1)}% belum tercapai).`;

    insights.push({
      id: 'ins-domain-achievement',
      category: 'ACHIEVEMENT',
      classification,
      type: 'achievement',
      level,
      headline,
      narrative,
      thresholdContext: `Ambang Batas: Warning < ${th.achievementWarning}%, Kritis < ${th.achievementCritical}%`,
      dataPoints: [
        { label: 'Achievement Saat Ini', value: `${ach.toFixed(1)}%` },
        { label: 'Total Target', value: formatRupiah(kpis.totalTarget) },
        { label: `Realisasi ${currLabel}`, value: formatRupiah(kpis.totalActualCurrent) },
        { label: 'Defisit / Surplus', value: (kpis.gapValue >= 0 ? '+' : '') + formatRupiah(kpis.gapValue) },
      ],
      recommendation: ach >= 100
        ? 'Pertahankan kestabilan suplai produk unggulan dan prioritaskan ketersediaan stok outlet pareto.'
        : `Lakukan akselerasi harian dengan target recovery minimal ${formatRupiah(Math.ceil(Math.abs(kpis.gapValue) / 7))} per minggu hingga akhir periode.`,
    });
  } else if (kpis.totalActualCurrent > 0) {
    insights.push({
      id: 'ins-domain-achievement',
      category: 'ACHIEVEMENT',
      classification: 'ATTENTION',
      type: 'achievement',
      level: 'warning',
      headline: 'Target penjualan belum ditetapkan pada database.',
      narrative: `Total realisasi penjualan ${currLabel} tercatat sebesar ${formatRupiah(kpis.totalActualCurrent)}, namun data target salesman belum terisi atau bernilai nol.`,
      thresholdContext: 'Target: 0 (Perlu data target resmi)',
      dataPoints: [
        { label: 'Total Target', value: 'Rp 0' },
        { label: `Realisasi ${currLabel}`, value: formatRupiah(kpis.totalActualCurrent) },
        { label: 'Achievement', value: 'N/A' },
      ],
      recommendation: 'Unggah file Target Salesman untuk mengaktifkan pelacakan achievement otomatis.',
    });
  }

  // 2. DOMAIN: GROWTH
  if (kpis.growthRate !== null) {
    const gr = kpis.growthRate;
    let classification: InsightClassification = 'OPPORTUNITY';
    let level: SmartInsightItem['level'] = 'positive';

    if (gr < th.growthCritical) {
      classification = 'PRIORITY';
      level = 'critical';
    } else if (gr < th.growthWarning) {
      classification = 'ATTENTION';
      level = 'warning';
    } else {
      classification = 'OPPORTUNITY';
      level = 'positive';
    }

    const diff = kpis.totalActualCurrent - kpis.totalActualPrevious;
    const headline = `Growth dibanding bulan lalu ${gr >= 0 ? '+' : ''}${gr.toFixed(1)}%.`;
    const narrative = gr >= 0
      ? `Terjadi kenaikan penjualan sebesar +${formatRupiah(diff)} dibanding ${prevLabel} (${formatRupiah(kpis.totalActualPrevious)} naik menjadi ${formatRupiah(kpis.totalActualCurrent)}).`
      : `Terjadi penurunan omset sebesar -${formatRupiah(Math.abs(diff))} dibanding ${prevLabel} (${formatRupiah(kpis.totalActualPrevious)} turun menjadi ${formatRupiah(kpis.totalActualCurrent)}).`;

    insights.push({
      id: 'ins-domain-growth',
      category: 'GROWTH',
      classification,
      type: 'growth',
      level,
      headline,
      narrative,
      thresholdContext: `Ambang Batas: Warning < ${th.growthWarning}%, Kritis < ${th.growthCritical}%`,
      dataPoints: [
        { label: 'Growth MoM', value: `${gr >= 0 ? '+' : ''}${gr.toFixed(1)}%` },
        { label: `Penjualan ${prevLabel}`, value: formatRupiah(kpis.totalActualPrevious) },
        { label: `Penjualan ${currLabel}`, value: formatRupiah(kpis.totalActualCurrent) },
        { label: 'Selisih Nilai', value: (diff >= 0 ? '+' : '') + formatRupiah(diff) },
      ],
      recommendation: gr >= 0
        ? 'Jaga ketersediaan inventori pada SKU fast-moving untuk menopang kelanjutan laju pertumbuhan.'
        : 'Identifikasi klaster outlet dengan penurunan nilai pemesanan terbesar dan tinjau daya beli pelanggan.',
    });
  } else if (kpis.growthStatus === 'NEW_SALES') {
    insights.push({
      id: 'ins-domain-growth',
      category: 'GROWTH',
      classification: 'OPPORTUNITY',
      type: 'growth',
      level: 'info',
      headline: 'Growth dibanding bulan lalu: Basis penjualan baru terbentuk.',
      narrative: `Data transaksi periode ${prevLabel} bernilai 0. Penjualan perdana tercatat sebesar ${formatRupiah(kpis.totalActualCurrent)} pada ${currLabel}.`,
      dataPoints: [
        { label: `Penjualan ${currLabel}`, value: formatRupiah(kpis.totalActualCurrent) },
        { label: 'Status Pertumbuhan', value: 'NEW SALES BASE' },
      ],
      recommendation: 'Pantau repeat order di periode berikutnya untuk mengukur retensi pelanggan.',
    });
  }

  // 3. DOMAIN: GAP TARGET
  if (kpis.totalTarget > 0) {
    const gap = kpis.gapValue;
    const isDeficit = gap < 0;
    const absGap = Math.abs(gap);
    let classification: InsightClassification = 'OPPORTUNITY';
    let level: SmartInsightItem['level'] = 'positive';

    if (isDeficit) {
      if (absGap >= th.gapShortageCritical) {
        classification = 'PRIORITY';
        level = 'critical';
      } else if (absGap >= th.gapShortageWarning) {
        classification = 'ATTENTION';
        level = 'warning';
      } else {
        classification = 'ATTENTION';
        level = 'warning';
      }
    } else {
      classification = 'OPPORTUNITY';
      level = 'positive';
    }

    const headline = isDeficit
      ? `Gap target defisit -${formatRupiah(absGap)} terhadap kuota penjualan ${currLabel}.`
      : `Gap target surplus +${formatRupiah(absGap)} melampaui sasaran target ${currLabel}.`;

    const narrative = isDeficit
      ? `Kekurangan omset saat ini sebesar ${formatRupiah(absGap)} (Target: ${formatRupiah(kpis.totalTarget)}, Realisasi: ${formatRupiah(kpis.totalActualCurrent)}). Diperlukan tindakan terfokus untuk menutup kekurangan ini.`
      : `Realisasi omset telah melampaui target kuota sebesar +${formatRupiah(absGap)} dengan performa surplus ${kpis.achievementRate?.toFixed(1)}%.`;

    insights.push({
      id: 'ins-domain-gap-target',
      category: 'GAP_TARGET',
      classification,
      type: 'achievement',
      level,
      headline,
      narrative,
      thresholdContext: `Ambang Defisit: Warning >= ${formatRupiah(th.gapShortageWarning)}, Kritis >= ${formatRupiah(th.gapShortageCritical)}`,
      dataPoints: [
        { label: 'Nilai Gap Target', value: (gap >= 0 ? '+' : '-') + formatRupiah(absGap) },
        { label: 'Target Kuota', value: formatRupiah(kpis.totalTarget) },
        { label: 'Realisasi Faktual', value: formatRupiah(kpis.totalActualCurrent) },
        { label: 'Status Gap', value: isDeficit ? 'DEFISIT (SHORTAGE)' : 'SURPLUS' },
      ],
      recommendation: isDeficit
        ? `Arahkan tim penjualan pada outlet pareto dan produk dengan margin omset tinggi untuk memangkas gap ${formatRupiah(absGap)}.`
        : 'Maksimalkan upsell dan perluasan portofolio produk ke outlet yang aktif bertransaksi.',
    });
  }

  // 4. DOMAIN: RO (REPEAT ORDER & OUTLET BELUM TRANSAKSI)
  if (kpis.totalActiveOutlets > 0) {
    const ro = kpis.repeatOrderRate ?? 0;
    const notTransacted = kpis.outletsNotTransactedCurrent;
    let classification: InsightClassification = 'OPPORTUNITY';
    let level: SmartInsightItem['level'] = 'positive';

    if (ro < th.roCritical) {
      classification = 'PRIORITY';
      level = 'critical';
    } else if (ro < th.roWarning || notTransacted >= th.untransactedOutletWarning) {
      classification = 'ATTENTION';
      level = 'warning';
    } else {
      classification = 'OPPORTUNITY';
      level = 'positive';
    }

    const headline = `Sebanyak ${notTransacted} outlet aktif belum melakukan transaksi.`;
    const narrative = `Dari total ${kpis.totalActiveOutlets} outlet berstatus aktif di master data, sebanyak ${kpis.outletsTransactedCurrent} telah bertransaksi (RO ${ro.toFixed(1)}%), sementara ${notTransacted} outlet belum melakukan pemesanan sama sekali pada ${currLabel}.`;

    insights.push({
      id: 'ins-domain-ro',
      category: 'RO',
      classification,
      type: 'ro',
      level,
      headline,
      narrative,
      thresholdContext: `Ambang Batas: Warning RO < ${th.roWarning}% atau Belum Transaksi >= ${th.untransactedOutletWarning} outlet`,
      dataPoints: [
        { label: 'Outlet Belum Transaksi', value: `${notTransacted} outlet` },
        { label: 'RO %', value: `${ro.toFixed(1)}%` },
        { label: 'Outlet Transaksi', value: `${kpis.outletsTransactedCurrent} outlet` },
        { label: 'Total Outlet Aktif', value: `${kpis.totalActiveOutlets} outlet` },
      ],
      recommendation: notTransacted > 0
        ? `Lakukan kunjungan canvasser terjadwal ke ${notTransacted} outlet aktif yang belum bertransaksi sebelum akhir bulan.`
        : 'Penetrasi outlet aktif sempurna mencapai 100%.',
    });
  }

  // 5. DOMAIN: DROP OUTLET
  {
    const dropCount = kpis.dropOutletCount;
    const lostRev = kpis.dropOutletLostRevenue;
    let classification: InsightClassification = 'OPPORTUNITY';
    let level: SmartInsightItem['level'] = 'positive';

    if (dropCount >= th.dropOutletCountCritical) {
      classification = 'PRIORITY';
      level = 'critical';
    } else if (dropCount >= th.dropOutletCountWarning) {
      classification = 'ATTENTION';
      level = 'warning';
    } else if (dropCount > 0) {
      classification = 'ATTENTION';
      level = 'warning';
    } else {
      classification = 'OPPORTUNITY';
      level = 'positive';
    }

    const headline = `Sebanyak ${dropCount} outlet mengalami drop.`;
    const narrative = dropCount > 0
      ? `Terdapat ${dropCount} outlet yang bertransaksi di ${prevLabel} namun belum melakukan pemesanan di ${currLabel}. Potensi omset yang hilang tercatat sebesar ${formatRupiah(lostRev)}.`
      : `Tidak ada outlet yang drop dibanding ${prevLabel}. Seluruh outlet yang bertransaksi periode lalu tetap aktif bertransaksi di ${currLabel}.`;

    insights.push({
      id: 'ins-domain-drop',
      category: 'DROP_OUTLET',
      classification,
      type: 'drop',
      level,
      headline,
      narrative,
      thresholdContext: `Ambang Drop: Warning >= ${th.dropOutletCountWarning} toko, Kritis >= ${th.dropOutletCountCritical} toko`,
      dataPoints: [
        { label: 'Jumlah Drop Outlet', value: `${dropCount} outlet` },
        { label: 'Omset Bulan Lalu Hilang', value: formatRupiah(lostRev) },
      ],
      recommendation: dropCount > 0
        ? `Bagikan daftar ${dropCount} outlet drop ke supervisor terkait untuk program reaktivasi darurat dan pemeriksaan kendala piutang/stok.`
        : 'Pertahankan program retensi outlet untuk menjaga tingkat repeat order tetap maksimal.',
    });
  }

  // 6. DOMAIN: NEW OUTLET
  {
    const newCount = kpis.newActiveOutletCount;
    const newRev = kpis.newActiveOutletRevenue;
    const classification: InsightClassification = newCount > 0 ? 'OPPORTUNITY' : 'ATTENTION';
    const level: SmartInsightItem['level'] = newCount > 0 ? 'positive' : 'warning';

    const headline = newCount > 0
      ? `Sebanyak ${newCount} outlet baru mulai bertransaksi dengan total omset ${formatRupiah(newRev)}.`
      : `Belum ada outlet baru yang mulai bertransaksi pada ${currLabel}.`;

    const narrative = newCount > 0
      ? `Keberhasilan akuisisi/reaktivasi ${newCount} outlet baru memberikan injeksi omset tambahan sebesar ${formatRupiah(newRev)} pada periode berjalan.`
      : `Belum terdeteksi pembukaan transaksi dari outlet baru pada periode berjalan. Perlu dorongan New Open Outlet (NOO) untuk memperluas pasar.`;

    insights.push({
      id: 'ins-domain-new-outlet',
      category: 'NEW_OUTLET',
      classification,
      type: 'new_outlet',
      level,
      headline,
      narrative,
      thresholdContext: newCount > 0 ? 'Peluang Ekspansi Penjualan Baru' : 'Perlu Aktivasi NOO',
      dataPoints: [
        { label: 'Outlet Baru Transaksi', value: `${newCount} outlet` },
        { label: 'Kontribusi Omset Baru', value: formatRupiah(newRev) },
      ],
      recommendation: newCount > 0
        ? 'Berikan insentif repeat order atau program bundling SKU kedua agar outlet baru menjadi pembeli rutin.'
        : 'Canvassing lokasi strategis untuk merekrut outlet baru dan mendaftarkannya pada master ROA.',
    });
  }

  // 7. DOMAIN: SALESMAN PERFORMANCE
  if (salesmanPerformances.length > 0) {
    const validSalesmen = salesmanPerformances.filter(s => s.achievementRate !== null);
    const criticalSalesmen = validSalesmen.filter(s => (s.achievementRate || 0) < th.salesmanAchCritical);
    const warningSalesmen = validSalesmen.filter(s => (s.achievementRate || 0) >= th.salesmanAchCritical && (s.achievementRate || 0) < th.salesmanAchWarning);
    const topSalesman = validSalesmen.length > 0
      ? [...validSalesmen].sort((a, b) => (b.achievementRate || 0) - (a.achievementRate || 0))[0]
      : salesmanPerformances[0];
    const lowestSalesman = validSalesmen.length > 0
      ? [...validSalesmen].sort((a, b) => (a.achievementRate || 0) - (b.achievementRate || 0))[0]
      : salesmanPerformances[salesmanPerformances.length - 1];

    let classification: InsightClassification = 'OPPORTUNITY';
    let level: SmartInsightItem['level'] = 'positive';
    let headline = '';

    if (criticalSalesmen.length > 0) {
      classification = 'PRIORITY';
      level = 'critical';
      headline = `Kinerja ${criticalSalesmen.length} salesman berada di bawah ambang kritis ${th.salesmanAchCritical}%.`;
    } else if (warningSalesmen.length > 0) {
      classification = 'ATTENTION';
      level = 'warning';
      headline = `Sebanyak ${warningSalesmen.length} salesman memerlukan perhatian dengan achievement di bawah ${th.salesmanAchWarning}%.`;
    } else {
      classification = 'OPPORTUNITY';
      level = 'positive';
      headline = `Seluruh salesman berkinerja sehat di atas ambang batas (Tertinggi: ${topSalesman.salesmanName} ${topSalesman.achievementRate?.toFixed(1)}%).`;
    }

    const narrative = `Dari ${salesmanPerformances.length} tenaga penjual, performa tertinggi diraih oleh ${topSalesman.salesmanName} (${formatRupiah(topSalesman.actualCurrent)}, Ach: ${topSalesman.achievementRate?.toFixed(1) || 'N/A'}%). Performa terendah dicatat oleh ${lowestSalesman.salesmanName} (${formatRupiah(lowestSalesman.actualCurrent)}, Ach: ${lowestSalesman.achievementRate?.toFixed(1) || 'N/A'}%, Gap: ${formatRupiah(Math.abs(lowestSalesman.gap))}, ${lowestSalesman.nonTransactingOutlets} outlet belum transaksi).`;

    insights.push({
      id: 'ins-domain-salesman',
      category: 'SALESMAN',
      classification,
      type: 'anomaly',
      level,
      headline,
      narrative,
      thresholdContext: `Ambang Batas: Warning < ${th.salesmanAchWarning}%, Kritis < ${th.salesmanAchCritical}%`,
      dataPoints: [
        { label: 'Top Performer', value: `${topSalesman.salesmanName} (${topSalesman.achievementRate?.toFixed(1) || '0'}%)` },
        { label: 'Lowest Performer', value: `${lowestSalesman.salesmanName} (${lowestSalesman.achievementRate?.toFixed(1) || '0'}%)` },
        { label: 'Defisit Terbesar', value: formatRupiah(Math.abs(lowestSalesman.gap)) },
        { label: 'Salesman Kritis (<' + th.salesmanAchCritical + '%)', value: `${criticalSalesmen.length} orang` },
      ],
      recommendation: criticalSalesmen.length > 0
        ? `Lakukan pendampingan supervisor lapangan ke rute salesman ${criticalSalesmen.map(s => s.salesmanName).join(', ')}.`
        : 'Bagikan formula sukses salesman terbaik untuk diadopsi ke seluruh tim penjualan.',
    });
  }

  return insights;
}
