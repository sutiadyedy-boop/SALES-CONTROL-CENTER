import { 
  CalculationResult, 
  OpportunityItem,
  InsightClassification 
} from '../types/analytics';
import { MasterOutletRecord, InsightThresholds } from '../types/database';
import { DEFAULT_THRESHOLDS } from './storageService';
import { formatRupiah } from './smartInsightEngine';

export function generateOpportunities(
  calc: CalculationResult,
  masterOutlets: MasterOutletRecord[],
  thresholds?: InsightThresholds
): OpportunityItem[] {
  const items: OpportunityItem[] = [];
  const th = thresholds || DEFAULT_THRESHOLDS;

  // Average basket size heuristic from current transacted outlets strictly computed from data
  const totalCurrSales = calc.kpis.totalActualCurrent;
  const transactedCount = calc.kpis.outletsTransactedCurrent;
  const avgBasketSize = transactedCount > 0 ? Math.round(totalCurrSales / transactedCount) : 1500000;

  // 1. OUTLET AKTIF BELUM TRANSAKSI
  if (calc.kpis.outletsNotTransactedCurrent > 0) {
    const estimatedValue = calc.kpis.outletsNotTransactedCurrent * avgBasketSize;
    const isPriority = calc.kpis.outletsNotTransactedCurrent >= th.untransactedOutletWarning;
    const classification: InsightClassification = isPriority ? 'PRIORITY' : 'ATTENTION';

    items.push({
      id: 'opp-untransacted-pool',
      category: 'OUTLET_BELUM_TRANSAKSI',
      classification,
      priority: isPriority ? 'HIGH' : 'MEDIUM',
      title: `${calc.kpis.outletsNotTransactedCurrent} Outlet Aktif Belum Melakukan Transaksi`,
      entityName: 'Seluruh Wilayah Aktif',
      identifier: 'ROA-PENDING',
      impactValue: estimatedValue,
      thresholdContext: `Ambang Warning: >= ${th.untransactedOutletWarning} outlet aktif tanpa transaksi`,
      detailText: `Terdapat ${calc.kpis.outletsNotTransactedCurrent} toko terdaftar aktif (Status OK) yang belum memesan sama sekali di bulan ini. Potensi recovery estimasi rata-rata per outlet: ${formatRupiah(avgBasketSize)}.`,
      actionRecommendation: 'Jadwalkan rute kunjungan canvassing khusus & broadcast promo SKU reguler kepada pemilik toko.',
    });
  }

  // 2. DROP OUTLET (Ranked strictly by Lost Sales from actual data)
  calc.dropOutlets.slice(0, 5).forEach((d, idx) => {
    const isPriority = d.salesPrevious >= th.gapShortageWarning || idx < 2;
    const classification: InsightClassification = isPriority ? 'PRIORITY' : 'ATTENTION';

    items.push({
      id: `opp-drop-${d.outletId}`,
      category: 'DROP_OUTLET',
      classification,
      priority: isPriority ? 'HIGH' : 'MEDIUM',
      title: `Drop Outlet: ${d.outletName}`,
      entityName: d.outletName,
      identifier: d.outletId,
      impactValue: d.salesPrevious,
      thresholdContext: `Omset Bulan Lalu Hilang: ${formatRupiah(d.salesPrevious)}`,
      detailText: `Outlet sebelumnya menyumbang ${formatRupiah(d.salesPrevious)} bulan lalu, namun bulan ini tercatat 0 transaksi. Terakhir order: ${d.lastTransactionDate || 'Bulan Lalu'}.`,
      actionRecommendation: `Hubungi supervisor & salesman ${d.salesmanName} untuk reaktivasi darurat dan cek kendala stok/kredit outlet.`,
      assignedSalesman: d.salesmanName,
      area: d.area,
    });
  });

  // 3. SALESMAN DENGAN GAP TARGET TINGGI (Strictly calculated gap shortage)
  const gapSalesmen = calc.salesmanPerformances
    .filter(s => s.gap < 0 && s.target > 0)
    .sort((a, b) => a.gap - b.gap); // most negative first

  gapSalesmen.slice(0, 4).forEach((s) => {
    const shortage = Math.abs(s.gap);
    const isPriority = shortage >= th.gapShortageCritical;
    const classification: InsightClassification = isPriority ? 'PRIORITY' : 'ATTENTION';

    items.push({
      id: `opp-gap-${s.salesmanId}`,
      category: 'HIGH_TARGET_GAP',
      classification,
      priority: isPriority ? 'HIGH' : 'MEDIUM',
      title: `Defisit Target Salesman: ${s.salesmanName}`,
      entityName: s.salesmanName,
      identifier: s.salesmanId,
      impactValue: shortage,
      thresholdContext: `Defisit: ${formatRupiah(shortage)} (Ambang Kritis: >= ${formatRupiah(th.gapShortageCritical)})`,
      detailText: `Target Rp ${formatRupiah(s.target)} baru terealisasi ${formatRupiah(s.actualCurrent)} (${s.achievementRate?.toFixed(1) || '0'}%). Kekurangan: ${formatRupiah(shortage)}.`,
      actionRecommendation: `Adakan sesi review harian dan arahkan salesman untuk mendorong volume bundle pada outlet tier A & B.`,
      assignedSalesman: s.salesmanName,
      area: s.area,
    });
  });

  // 4. SALESMAN DENGAN ACHIEVEMENT RENDAH (< salesmanAchWarning)
  const lowAchievers = calc.salesmanPerformances
    .filter(s => s.achievementRate !== null && s.achievementRate < th.salesmanAchWarning && s.target > 0)
    .sort((a, b) => (a.achievementRate || 0) - (b.achievementRate || 0));

  lowAchievers.slice(0, 3).forEach((s) => {
    const isPriority = (s.achievementRate || 0) < th.salesmanAchCritical;
    const classification: InsightClassification = isPriority ? 'PRIORITY' : 'ATTENTION';

    items.push({
      id: `opp-low-ach-${s.salesmanId}`,
      category: 'LOW_ACHIEVEMENT',
      classification,
      priority: isPriority ? 'HIGH' : 'MEDIUM',
      title: `Kinerja Rendah: ${s.salesmanName} (${s.achievementRate?.toFixed(1)}%)`,
      entityName: s.salesmanName,
      identifier: s.salesmanId,
      impactValue: Math.abs(s.gap),
      thresholdContext: `Pencapaian: ${s.achievementRate?.toFixed(1)}% (Ambang: < ${th.salesmanAchWarning}%)`,
      detailText: `Tingkat pencapaian target berada di bawah ambang batas performa (${th.salesmanAchWarning}%). Memiliki ${s.nonTransactingOutlets} outlet aktif yang belum bertransaksi.`,
      actionRecommendation: `Evaluasi call plan kunjungan harian dan dampingi oleh Area Supervisor / Asmen.`,
      assignedSalesman: s.salesmanName,
      area: s.area,
    });
  });

  // 5. AREA DENGAN RO RENDAH (< roWarning)
  const lowRoAreas = calc.areaBreakdown.filter(a => a.activeOutlets > 3 && a.roRate !== null && a.roRate < th.roWarning);
  lowRoAreas.forEach((area) => {
    const untransacted = area.activeOutlets - area.transactedOutlets;
    const roStr = area.roRate !== null ? `${area.roRate.toFixed(1)}%` : 'N/A';
    const isPriority = (area.roRate || 0) < th.roCritical;
    const classification: InsightClassification = isPriority ? 'PRIORITY' : 'ATTENTION';

    items.push({
      id: `opp-low-ro-area-${area.area}`,
      category: 'LOW_RO_AREA',
      classification,
      priority: isPriority ? 'HIGH' : 'MEDIUM',
      title: `Penetrasi RO Rendah Area ${area.area} (${roStr})`,
      entityName: `Area ${area.area}`,
      identifier: area.area,
      impactValue: untransacted * avgBasketSize,
      thresholdContext: `RO Area: ${roStr} (Ambang Warning: < ${th.roWarning}%)`,
      detailText: `Dari ${area.activeOutlets} outlet aktif di Area ${area.area}, baru ${area.transactedOutlets} yang bertransaksi (${untransacted} toko pasif).`,
      actionRecommendation: `Re-alokasi rute pengiriman dan cek availability produk pada depo yang melayani Area ${area.area}.`,
      area: area.area,
    });
  });

  // 6. NEW OUTLET EXPANSION (OPPORTUNITY classification)
  if (calc.kpis.newActiveOutletCount > 0) {
    items.push({
      id: 'opp-new-outlets-pool',
      category: 'NEW_OUTLET_EXPANSION',
      classification: 'OPPORTUNITY',
      priority: 'MEDIUM',
      title: `Retensi & Pembinaan ${calc.kpis.newActiveOutletCount} Outlet Baru`,
      entityName: 'Seluruh Outlet Baru',
      identifier: 'NOO-REVENUE',
      impactValue: calc.kpis.newActiveOutletRevenue,
      thresholdContext: `Kontribusi Baru: ${formatRupiah(calc.kpis.newActiveOutletRevenue)}`,
      detailText: `Sebanyak ${calc.kpis.newActiveOutletCount} toko baru berhasil menghasilkan transaksi dengan total omset ${formatRupiah(calc.kpis.newActiveOutletRevenue)}. Potensi repeat order harus dijaga agar tidak menjadi drop outlet pada bulan depan.`,
      actionRecommendation: 'Jadwalkan kunjungan follow-up minggu kedua setelah order pertama dan tawarkan diskon volume bundle.',
    });
  }

  // Sort overall by impact value descending
  return items.sort((a, b) => b.impactValue - a.impactValue);
}
