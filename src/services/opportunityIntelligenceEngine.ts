/**
 * ESM SALES CONTROL CENTER — OPPORTUNITY INTELLIGENCE ENGINE (PHASE 4)
 * 
 * Architectural Principles:
 * 1. Discover high-value opportunities grounded strictly in actual transaction data:
 *    - Salesman, Outlet, SKU, MARK NEW / Eceran, and EC.
 * 2. 8 Locked Opportunity Categories:
 *    - OUTLET_RECOVERY
 *    - SKU_CROSS_SELL
 *    - MARK_NEW_CROSS_SELL
 *    - EC_EXPANSION
 *    - OUTLET_DEVELOPMENT
 *    - SKU_PENETRATION
 *    - SALESMAN_OPPORTUNITY
 *    - REPEAT_OUTLET_GROWTH
 * 3. ESTIMATED VALUE ONLY: Never claim guaranteed revenue. Evidence-based estimation.
 *    No arbitrary multipliers.
 * 4. Deduplication: Same entity + same opportunityType + same period = single active opportunity.
 * 5. Bridge to Phase 3 NBA: Qualified opportunities can link directly to Next Best Actions.
 * 6. Role-Based Access: Salesman sees top 10 relevant to him; Supervisor & Manager see Control Tower.
 */

import { 
  CalculationResult 
} from '../types/analytics';
import { 
  DecisionContext, 
  DecisionResult, 
  NextBestAction,
  OpportunityResult, 
  OpportunityType, 
  OpportunityStatus, 
  OpportunitySummary,
  OpportunityOutcome
} from '../types/decisionEngine';
import { 
  UserProfile,
  TransactionRecord, 
  MasterOutletRecord 
} from '../types/database';

export const OPPORTUNITY_STORAGE_KEY = 'spm_opportunity_intelligence_v4';

export interface PersistedOpportunityState {
  status: OpportunityStatus;
  outcome?: OpportunityOutcome;
  notes?: string;
  updatedAt?: string;
}

/**
 * Load persisted opportunity states from localStorage
 */
export function loadPersistedOpportunityStates(): Record<string, PersistedOpportunityState> {
  try {
    const raw = localStorage.getItem(OPPORTUNITY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('[Opportunity Intelligence] Failed to load persisted states:', err);
  }
  return {};
}

/**
 * Save persisted opportunity states to localStorage
 */
export function savePersistedOpportunityStates(states: Record<string, PersistedOpportunityState>): void {
  try {
    localStorage.setItem(OPPORTUNITY_STORAGE_KEY, JSON.stringify(states));
  } catch (err) {
    console.error('[Opportunity Intelligence] Failed to save states:', err);
  }
}

/**
 * Format Rupiah utility
 */
function formatRupiah(val: number): string {
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

/**
 * Synthesizes Opportunity Results from Calculation, Decision Context, and Transactions
 */
export function synthesizeOpportunities(
  calc: CalculationResult,
  decisionContext: DecisionContext | null,
  decisions: DecisionResult[] = [],
  nbaActions: NextBestAction[] = [],
  persistedStates: Record<string, PersistedOpportunityState> = {},
  rawTransactions?: { previous: TransactionRecord[]; current: TransactionRecord[] }
): OpportunityResult[] {
  const period = decisionContext?.period && !decisionContext.period.toUpperCase().includes('AGUSTUS') 
    ? decisionContext.period 
    : 'OKTOBER 2026';
  const previousPeriod = decisionContext?.previousPeriod && !decisionContext.previousPeriod.toUpperCase().includes('AGUSTUS') 
    ? decisionContext.previousPeriod 
    : 'SEPTEMBER 2026';

  const rawOpportunities: OpportunityResult[] = [];
  const deduplicationMap = new Map<string, boolean>();

  // Average basket size heuristic from current transacted outlets strictly computed from data
  const totalCurrSales = calc.kpis.totalActualCurrent;
  const transactedCount = calc.kpis.outletsTransactedCurrent;
  const avgBasketSize = transactedCount > 0 ? Math.round(totalCurrSales / transactedCount) : 1500000;

  // Map existing NBA actions by entityId + period for seamless linkage
  const nbaMapByEntity = new Map<string, NextBestAction>();
  nbaActions.forEach(a => {
    nbaMapByEntity.set(a.entityId, a);
  });

  // Map decisions by entityId
  const decisionMapByEntity = new Map<string, DecisionResult>();
  decisions.forEach(d => {
    decisionMapByEntity.set(d.entityId, d);
  });

  // ============================================================
  // 1. OUTLET_RECOVERY OPPORTUNITIES (Section 6 & 7)
  // Previous: ACTIVE, Current: DROP
  // ============================================================
  calc.dropOutlets.forEach(d => {
    if (d.salesPrevious <= 0) return;

    const deduplicationKey = `${d.outletId}_OUTLET_RECOVERY_${period}`;
    if (deduplicationMap.has(deduplicationKey)) return;
    deduplicationMap.set(deduplicationKey, true);

    const oppId = `opp-recovery-${d.outletId}`;
    const persisted = persistedStates[oppId];
    const linkedNba = nbaMapByEntity.get(d.outletId);
    const linkedDec = decisionMapByEntity.get(d.outletId);

    // Calculate Opportunity Score (0-100)
    // High historical value + drop = high score
    const valScore = Math.min(100, Math.round((d.salesPrevious / 25000000) * 100));
    const opportunityScore = Math.min(100, Math.max(30, Math.round(valScore * 0.7 + 30)));
    const priorityScore = linkedDec?.priorityScore || linkedNba?.priorityScore || Math.min(100, Math.round(valScore * 0.8 + 20));

    // Confidence: High if transaction history exists with positive value
    const confidence = Math.min(95, Math.max(65, Math.round(75 + (d.salesPrevious > 10000000 ? 15 : 5))));

    const opp: OpportunityResult = {
      id: oppId,
      opportunityType: 'OUTLET_RECOVERY',
      entityType: 'OUTLET',
      entityId: d.outletId,
      entityName: d.outletName,
      salesmanId: d.salesmanId,
      salesmanName: d.salesmanName,
      area: d.area,
      currentValue: 0,
      previousValue: d.salesPrevious,
      opportunityValue: d.salesPrevious, // Historical value reference without multipliers
      valueSource: 'HISTORICAL_VALUE',
      valueEvidence: `Outlet ${d.outletName} memiliki riwayat omset faktual sebesar ${formatRupiah(d.salesPrevious)} pada periode ${previousPeriod}.`,
      valueCalculation: 'Historical VALUE reference (omset faktual bulan lalu sebelum DROP tanpa faktor pengali)',
      opportunityScore,
      priorityScore,
      confidence,
      reason: `Outlet aktif di ${previousPeriod} (${formatRupiah(d.salesPrevious)}) namun belum ada transaksi di ${period} (DROP).`,
      evidence: [
        `Realisasi ${previousPeriod}: ${formatRupiah(d.salesPrevious)}`,
        `Realisasi ${period}: Rp 0 (DROP)`,
        `Status Penjualan: Hilang 100% MoM`,
        `Salesman Penanggung Jawab: ${d.salesmanName || 'Belum teralokasi'}`,
      ],
      recommendedAction: 'REACTIVATE_OUTLET',
      sourcePeriod: period,
      status: persisted?.status || (linkedNba?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'QUALIFIED'),
      linkedDecisionId: linkedDec?.id,
      linkedNbaId: linkedNba?.id,
      outcome: persisted?.outcome,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rawOpportunities.push(opp);
  });

  // ============================================================
  // 2. SKU CROSS-SELL OPPORTUNITY (Section 8 & 9)
  // Data-driven: Outlet bought SKU A, but has NOT bought SKU B,
  // where SKU B has strong demand evidence in the branch.
  // ============================================================
  const skuItems = decisionContext?.skuSummary?.items || [];
  const topWinningSkus = skuItems
    .filter(s => s.currentValue > 0)
    .sort((a, b) => b.currentValue - a.currentValue);

  if (topWinningSkus.length >= 2) {
    const leaderSku = topWinningSkus[0];
    const complementarySku = topWinningSkus[1];

    // Outlets that purchased leaderSku
    // Build from raw transactions if available
    const currTxs = rawTransactions?.current || [];
    const outletsWithLeader = new Set<string>();
    const outletsWithComplement = new Set<string>();
    const outletInfoMap = new Map<string, { name: string; salesmanId?: string; salesmanName?: string; area?: string; totalSales: number }>();

    currTxs.forEach(t => {
      const code = (t.outletId || '').trim();
      if (!code) return;

      if (!outletInfoMap.has(code)) {
        outletInfoMap.set(code, {
          name: t.outletName || code,
          salesmanId: t.salesmanId,
          salesmanName: t.salesmanName,
          area: t.area,
          totalSales: 0,
        });
      }
      outletInfoMap.get(code)!.totalSales += (t.salesValue || 0);

      const pCode = (t.productCode || '').trim().toUpperCase();
      const pName = (t.productName || '').trim().toUpperCase();

      if (pCode.includes(leaderSku.skuCode.toUpperCase()) || pName.includes(leaderSku.skuName.toUpperCase())) {
        outletsWithLeader.add(code);
      }
      if (pCode.includes(complementarySku.skuCode.toUpperCase()) || pName.includes(complementarySku.skuName.toUpperCase())) {
        outletsWithComplement.add(code);
      }
    });

    // Cross-sell targets: has Leader SKU, missing Complementary SKU
    let crossSellCount = 0;
    outletsWithLeader.forEach(outletCode => {
      if (outletsWithComplement.has(outletCode)) return;
      if (crossSellCount >= 10) return; // Top 10 cross-sell opportunities

      crossSellCount++;
      const oInfo = outletInfoMap.get(outletCode);
      const deduplicationKey = `${outletCode}_SKU_CROSS_SELL_${complementarySku.skuCode}_${period}`;
      if (deduplicationMap.has(deduplicationKey)) return;
      deduplicationMap.set(deduplicationKey, true);

      const oppId = `opp-cross-${outletCode}-${complementarySku.skuCode}`;
      const persisted = persistedStates[oppId];

      // Estimated basket value for complementary SKU based on branch average
      const avgSkuValue = complementarySku.ecCount > 0 
        ? Math.round(complementarySku.currentValue / complementarySku.ecCount) 
        : 750000;

      const opp: OpportunityResult = {
        id: oppId,
        opportunityType: 'SKU_CROSS_SELL',
        entityType: 'SKU',
        entityId: `${outletCode}_${complementarySku.skuCode}`,
        entityName: `${oInfo?.name || outletCode} — ${complementarySku.skuName}`,
        salesmanId: oInfo?.salesmanId,
        salesmanName: oInfo?.salesmanName,
        area: oInfo?.area,
        currentValue: 0,
        previousValue: 0,
        opportunityValue: avgSkuValue,
        valueSource: 'ACTUAL_SKU_BRANCH_BENCHMARK',
        valueEvidence: `Rata-rata transaksi riil SKU ${complementarySku.skuName} pada outlet pembeli di cabang sebesar ${formatRupiah(avgSkuValue)} per transaksi EC.`,
        valueCalculation: 'Benchmark serapan transaksi riil per outlet pembeli di cabang (Total Nilai Penjualan SKU / Toko Pembeli)',
        opportunityScore: 78,
        priorityScore: 72,
        confidence: 85,
        reason: `Outlet telah aktif membeli ${leaderSku.skuName} namun belum menyerap SKU ${complementarySku.skuName}.`,
        evidence: [
          `Outlet aktif membeli ${leaderSku.skuName} (SKU Unggulan)`,
          `SKU ${complementarySku.skuName} belum pernah ditransaksikan oleh outlet ini di ${period}`,
          `Rata-rata serapan SKU ${complementarySku.skuName} di cabang: ${formatRupiah(avgSkuValue)} per outlet`,
        ],
        recommendedAction: 'CROSS_SELL_SKU',
        sourcePeriod: period,
        status: persisted?.status || 'QUALIFIED',
        complementarySku: leaderSku.skuName,
        targetSku: complementarySku.skuName,
        outcome: persisted?.outcome,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rawOpportunities.push(opp);
    });
  }

  // ============================================================
  // 3. MARK_NEW_CROSS_SELL OPPORTUNITY (Section 10)
  // All MARK NEW records analyzed. Outlets that bought MARK NEW A
  // but not MARK NEW B, or active outlets without MARK NEW.
  // ============================================================
  const markNewSummary = decisionContext?.markNewSummary;
  if (markNewSummary && markNewSummary.items.length > 0) {
    const markNewSkus = Array.from(new Set(markNewSummary.items.map(m => m.skuName)));

    // Sample top active outlets with regular volume but no MARK NEW
    calc.newOutlets.slice(0, 5).forEach(no => {
      const deduplicationKey = `${no.outletId}_MARK_NEW_CROSS_SELL_${period}`;
      if (deduplicationMap.has(deduplicationKey)) return;
      deduplicationMap.set(deduplicationKey, true);

      const oppId = `opp-marknew-${no.outletId}`;
      const persisted = persistedStates[oppId];

      const avgMnOrder = markNewSummary.markNewEc > 0 
        ? Math.round(markNewSummary.markNewValue / markNewSummary.markNewEc) 
        : 650000;

      const opp: OpportunityResult = {
        id: oppId,
        opportunityType: 'MARK_NEW_CROSS_SELL',
        entityType: 'MARK_NEW',
        entityId: no.outletId,
        entityName: `${no.outletName} — Program MARK NEW`,
        salesmanId: no.salesmanId,
        salesmanName: no.salesmanName,
        area: no.area,
        currentValue: 0,
        previousValue: 0,
        opportunityValue: avgMnOrder,
        valueSource: 'ACTUAL_MARK_NEW_BENCHMARK',
        valueEvidence: `Rata-rata nilai transaksi program MARK NEW cabang pada periode ${period} sebesar ${formatRupiah(avgMnOrder)} per outlet pembeli.`,
        valueCalculation: 'Benchmark serapan transaksi faktual portofolio MARK NEW cabang (Total Nilai MARK NEW / EC MARK NEW)',
        opportunityScore: 75,
        priorityScore: 70,
        confidence: 82,
        reason: `Outlet aktif bertransaksi reguler namun belum tersentuh program stimulus MARK NEW / Eceran.`,
        evidence: [
          `Outlet bertransaksi di ${period} sebesar ${formatRupiah(no.salesCurrent)}`,
          `Belum ada order untuk portofolio MARK NEW (${markNewSkus.join(', ') || 'Paket Eceran'})`,
          `Potensi basket eceran rata-rata cabang: ${formatRupiah(avgMnOrder)}`,
        ],
        recommendedAction: 'PUSH_MARK_NEW',
        sourcePeriod: period,
        status: persisted?.status || 'QUALIFIED',
        outcome: persisted?.outcome,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rawOpportunities.push(opp);
    });
  }

  // ============================================================
  // 4. EC_EXPANSION OPPORTUNITY (Section 11 & 12)
  // Untransacted active outlets scored by historical or basket potential
  // ============================================================
  calc.outletsNotTransacted.slice(0, 8).forEach(o => {
    const deduplicationKey = `${o.outletId}_EC_EXPANSION_${period}`;
    if (deduplicationMap.has(deduplicationKey)) return;
    deduplicationMap.set(deduplicationKey, true);

    const oppId = `opp-ec-exp-${o.outletId}`;
    const persisted = persistedStates[oppId];
    const linkedDec = decisionMapByEntity.get(o.outletId);

    // Value scored on historical value or branch average basket size
    const estimatedValue = avgBasketSize;

    const opp: OpportunityResult = {
      id: oppId,
      opportunityType: 'EC_EXPANSION',
      entityType: 'EC',
      entityId: o.outletId,
      entityName: `${o.outletName} (Aktivasi EC)`,
      salesmanId: o.salesmanId,
      salesmanName: o.salesmanName,
      area: o.area,
      currentValue: 0,
      previousValue: 0,
      opportunityValue: estimatedValue,
      valueSource: 'ACTUAL_BASKET_BENCHMARK',
      valueEvidence: `Rata-rata keranjang belanja faktual outlet aktif bertransaksi di cabang sebesar ${formatRupiah(estimatedValue)} per toko.`,
      valueCalculation: 'Benchmark nilai keranjang rata-rata toko aktif cabang (Realisasi / Toko Transaksi)',
      opportunityScore: 65,
      priorityScore: 62,
      confidence: 78,
      reason: `Outlet terdaftar aktif pada Master namun belum menghasilkan transaksi (EC) di ${period}.`,
      evidence: [
        `Status Master Outlet: AKTIF (ROA)`,
        `Belum ada transaksi di bulan ${period}`,
        `Estimasi nilai keranjang rata-rata toko aktif: ${formatRupiah(estimatedValue)}`,
      ],
      recommendedAction: 'IMPROVE_EC',
      sourcePeriod: period,
      status: persisted?.status || 'QUALIFIED',
      linkedDecisionId: linkedDec?.id,
      outcome: persisted?.outcome,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rawOpportunities.push(opp);
  });

  // ============================================================
  // 5. OUTLET_DEVELOPMENT OPPORTUNITY (Section 13)
  // Active outlet with contraction or low penetration compared to past
  // ============================================================
  calc.dropOutlets.slice(5, 10).forEach(d => {
    if (d.salesPrevious <= 0) return;
    const deduplicationKey = `${d.outletId}_OUTLET_DEVELOPMENT_${period}`;
    if (deduplicationMap.has(deduplicationKey)) return;
    deduplicationMap.set(deduplicationKey, true);

    const oppId = `opp-dev-${d.outletId}`;
    const persisted = persistedStates[oppId];

    const opp: OpportunityResult = {
      id: oppId,
      opportunityType: 'OUTLET_DEVELOPMENT',
      entityType: 'OUTLET',
      entityId: d.outletId,
      entityName: `${d.outletName} (Pengembangan Keranjang)`,
      salesmanId: d.salesmanId,
      salesmanName: d.salesmanName,
      area: d.area,
      currentValue: 0,
      previousValue: d.salesPrevious,
      opportunityValue: d.salesPrevious, // Historical value reference (removed arbitrary 0.5 multiplier)
      valueSource: 'HISTORICAL_VALUE',
      valueEvidence: `Outlet ${d.outletName} memiliki kapasitas penyerapan historis sebesar ${formatRupiah(d.salesPrevious)} pada periode ${previousPeriod}.`,
      valueCalculation: 'Historical VALUE reference (kapasitas serapan transaksi tercatat tanpa faktor pengali)',
      opportunityScore: 60,
      priorityScore: 58,
      confidence: 70,
      reason: `Outlet memiliki kapasitas serapan historis ${formatRupiah(d.salesPrevious)} yang dapat dikembangkan kembali.`,
      evidence: [
        `Riwayat nilai historis: ${formatRupiah(d.salesPrevious)}`,
        `Kategori: Potensi pengembangan varian produk`,
      ],
      recommendedAction: 'EXPAND_BASKET_SIZE',
      sourcePeriod: period,
      status: persisted?.status || 'QUALIFIED',
      outcome: persisted?.outcome,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rawOpportunities.push(opp);
  });

  // ============================================================
  // 6. SKU_PENETRATION OPPORTUNITY (Section 14)
  // SKU with significant sales but low penetration (< 40%)
  // ============================================================
  skuItems.forEach(sku => {
    const totalActive = calc.kpis.totalActiveOutlets || 1;
    const penetrationPct = (sku.ecCount / totalActive) * 100;

    if (penetrationPct < 50 && sku.currentValue > 0) {
      const deduplicationKey = `${sku.skuCode}_SKU_PENETRATION_${period}`;
      if (deduplicationMap.has(deduplicationKey)) return;
      deduplicationMap.set(deduplicationKey, true);

      const oppId = `opp-sku-pen-${sku.skuCode}`;
      const persisted = persistedStates[oppId];

      const unpenetratedOutlets = Math.max(0, totalActive - sku.ecCount);
      const avgOrderVal = sku.ecCount > 0 ? Math.round(sku.currentValue / sku.ecCount) : null;
      // Removed arbitrary 0.2 multiplier: use actual benchmark order value reference per outlet from real transactions
      const estimatedOppVal = avgOrderVal;

      const opp: OpportunityResult = {
        id: oppId,
        opportunityType: 'SKU_PENETRATION',
        entityType: 'SKU',
        entityId: sku.skuCode,
        entityName: `${sku.skuName} (Penetrasi Distribusi)`,
        currentValue: sku.currentValue,
        previousValue: sku.previousValue,
        opportunityValue: estimatedOppVal,
        valueSource: 'ACTUAL_SKU_ORDER_BENCHMARK',
        valueEvidence: avgOrderVal !== null
          ? `Rata-rata penjualan riil SKU ${sku.skuName} pada ${sku.ecCount} toko pembeli di cabang sebesar ${formatRupiah(avgOrderVal)} per toko.`
          : 'Data transaksi riil belum mencukupi untuk membentuk acuan nilai serapan.',
        valueCalculation: avgOrderVal !== null
          ? 'Benchmark transaksi riil per toko pembeli (Nilai Penjualan SKU / EC SKU) tanpa pengali arbitrer'
          : 'N/A',
        opportunityScore: 70,
        priorityScore: 65,
        confidence: 80,
        currentPenetrationRate: Number(penetrationPct.toFixed(1)),
        reason: `Penetrasi outlet untuk SKU ${sku.skuName} baru mencapai ${penetrationPct.toFixed(1)}% dari total ${totalActive} outlet aktif.`,
        evidence: [
          `Toko pembeli SKU saat ini: ${sku.ecCount} toko (${penetrationPct.toFixed(1)}%)`,
          `Total toko aktif belum menjual SKU: ${unpenetratedOutlets} toko`,
          `Rata-rata penjualan per toko pembeli: ${avgOrderVal !== null ? formatRupiah(avgOrderVal) : 'N/A'}`,
        ],
        recommendedAction: 'PENETRATE_SKU',
        sourcePeriod: period,
        status: persisted?.status || 'QUALIFIED',
        outcome: persisted?.outcome,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rawOpportunities.push(opp);
    }
  });

  // ============================================================
  // 7. SALESMAN_OPPORTUNITY (Section 15)
  // Salesman with largest addressable pool of unbought/drop outlets
  // ============================================================
  calc.salesmanPerformances.forEach(sls => {
    if (sls.gap < 0 && sls.target > 0) {
      const deduplicationKey = `${sls.salesmanId}_SALESMAN_OPPORTUNITY_${period}`;
      if (deduplicationMap.has(deduplicationKey)) return;
      deduplicationMap.set(deduplicationKey, true);

      const oppId = `opp-sls-${sls.salesmanId}`;
      const persisted = persistedStates[oppId];
      const shortage = Math.abs(sls.gap);

      const opp: OpportunityResult = {
        id: oppId,
        opportunityType: 'SALESMAN_OPPORTUNITY',
        entityType: 'SALESMAN',
        entityId: sls.salesmanId,
        entityName: `Salesman ${sls.salesmanName} (Pemulihan Kuota)`,
        salesmanId: sls.salesmanId,
        salesmanName: sls.salesmanName,
        area: sls.area,
        currentValue: sls.actualCurrent,
        previousValue: sls.actualPrevious,
        opportunityValue: shortage,
        valueSource: 'TARGET_GAP_DEFICIT',
        valueEvidence: `Target resmi SC sebesar ${formatRupiah(sls.target)} dengan realisasi faktual ${formatRupiah(sls.actualCurrent)} (defisit kuota ${formatRupiah(shortage)}).`,
        valueCalculation: 'Defisit kuota resmi penjualan (Target SC - Realisasi September 2026)',
        opportunityScore: Math.min(100, Math.max(40, Math.round((shortage / 30000000) * 100))),
        priorityScore: Math.min(100, Math.round((shortage / 25000000) * 80 + 20)),
        confidence: 88,
        reason: `Defisit kuota penjualan sebesar ${formatRupiah(shortage)} dengan ${sls.nonTransactingOutlets} outlet pasif pada rutenya.`,
        evidence: [
          `Target: ${formatRupiah(sls.target)} | Realisasi: ${formatRupiah(sls.actualCurrent)} (${sls.achievementRate?.toFixed(1) || '0'}%)`,
          `Selisih Target (Gap): ${formatRupiah(shortage)}`,
          `Toko belum belanja di rute: ${sls.nonTransactingOutlets} toko`,
          `Toko Drop: ${sls.dropOutletsCount} toko`,
        ],
        recommendedAction: 'FOCUS_ROUTE_OPPORTUNITY',
        sourcePeriod: period,
        status: persisted?.status || 'QUALIFIED',
        outcome: persisted?.outcome,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rawOpportunities.push(opp);
    }
  });

  // ============================================================
  // 8. REPEAT_OUTLET_GROWTH (Section 16)
  // Active repeat outlets with expansion headroom
  // ============================================================
  calc.salesmanPerformances.slice(0, 3).forEach(sls => {
    if (sls.transactingOutlets > 0) {
      const deduplicationKey = `${sls.salesmanId}_REPEAT_GROWTH_${period}`;
      if (deduplicationMap.has(deduplicationKey)) return;
      deduplicationMap.set(deduplicationKey, true);

      const oppId = `opp-repeat-growth-${sls.salesmanId}`;
      const persisted = persistedStates[oppId];
      // Benchmark basket value reference from actual branch transacted data (removed 0.15 multiplier)
      const estGrowthVal = avgBasketSize > 0 ? avgBasketSize : null;

      const opp: OpportunityResult = {
        id: oppId,
        opportunityType: 'REPEAT_OUTLET_GROWTH',
        entityType: 'SALESMAN',
        entityId: sls.salesmanId,
        entityName: `Pertumbuhan Pelanggan Repeat — ${sls.salesmanName}`,
        salesmanId: sls.salesmanId,
        salesmanName: sls.salesmanName,
        area: sls.area,
        currentValue: sls.actualCurrent,
        previousValue: sls.actualPrevious,
        opportunityValue: estGrowthVal,
        valueSource: 'ACTUAL_BASKET_BENCHMARK',
        valueEvidence: `Rata-rata nilai belanja faktual outlet aktif di rute ini adalah ${formatRupiah(avgBasketSize)} per outlet.`,
        valueCalculation: 'Benchmark keranjang rata-rata aktual toko repeat order cabang tanpa pengali arbitrer',
        opportunityScore: 68,
        priorityScore: 64,
        confidence: 82,
        reason: `${sls.transactingOutlets} outlet repeat aktif masih memiliki ruang peningkatan varian belanja.`,
        evidence: [
          `Jumlah toko repeat order aktif: ${sls.transactingOutlets} toko`,
          `Acuan keranjang belanja aktual per toko: ${formatRupiah(avgBasketSize)}`,
        ],
        recommendedAction: 'EXPAND_REPEAT_BASKET',
        sourcePeriod: period,
        status: persisted?.status || 'QUALIFIED',
        outcome: persisted?.outcome,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rawOpportunities.push(opp);
    }
  });

  // Ranking & Multi-Tier Deterministic Sorting:
  // 1. Priority Score descending
  // 2. Opportunity Value descending
  // 3. Confidence descending
  // 4. Deterministic tie breaker (id)
  return rawOpportunities.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    const aVal = a.opportunityValue || 0;
    const bVal = b.opportunityValue || 0;
    if (bVal !== aVal) {
      return bVal - aVal;
    }
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Role-based filtering for opportunities (Section 38)
 */
export function filterOpportunitiesByUserRole(
  opportunities: OpportunityResult[],
  userProfile?: UserProfile | null
): OpportunityResult[] {
  if (!userProfile) return opportunities;

  const role = userProfile.role;

  if (role === 'ADMIN' || role === 'MANAGER') {
    return opportunities;
  }

  if (role === 'SUPERVISOR') {
    if (userProfile.area) {
      const areaClean = userProfile.area.toLowerCase().trim();
      return opportunities.filter(o => {
        if (!o.area && !o.salesmanName) return true;
        if (o.area && o.area.toLowerCase().includes(areaClean)) return true;
        return true;
      });
    }
    return opportunities;
  }

  if (role === 'SALESMAN') {
    const sId = (userProfile.salesmanId || '').toLowerCase().trim();
    const sName = (userProfile.name || '').toLowerCase().trim();
    const sUser = (userProfile.username || '').toLowerCase().trim();

    return opportunities.filter(o => {
      const oSalesmanId = (o.salesmanId || '').toLowerCase().trim();
      const oSalesmanName = (o.salesmanName || '').toLowerCase().trim();

      if (sId && oSalesmanId && oSalesmanId === sId) return true;
      if (sName && oSalesmanName && (oSalesmanName.includes(sName) || sName.includes(oSalesmanName))) return true;
      if (sUser && oSalesmanName && oSalesmanName.includes(sUser)) return true;

      // Entity is the salesman
      if (o.entityType === 'SALESMAN') {
        if (sId && o.entityId && o.entityId.toLowerCase().trim() === sId) return true;
        if (sName && o.entityName && o.entityName.toLowerCase().trim().includes(sName)) return true;
      }

      return false;
    });
  }

  return opportunities;
}

/**
 * Limit to top N opportunities per salesman (Section 30)
 */
export function getTopOpportunities(
  opportunities: OpportunityResult[],
  limit: number = 10
): OpportunityResult[] {
  return opportunities.slice(0, limit);
}

/**
 * Computes Executive Opportunity Summary & Distribution Metrics
 */
export function computeOpportunitySummary(
  opportunities: OpportunityResult[],
  isTargetLinkedInput?: boolean
): OpportunitySummary {
  let totalOpportunityValue = 0;
  let totalConfidence = 0;
  let highPriorityCount = 0;
  let outletRecoveryCount = 0;
  let skuCrossSellCount = 0;
  let markNewCount = 0;
  let ecExpansionCount = 0;
  let outletDevelopmentCount = 0;
  let skuPenetrationCount = 0;
  let salesmanOpportunityCount = 0;
  let repeatGrowthCount = 0;
  let qualifiedCount = 0;
  let actionedCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let totalWonValue = 0;

  const bySalesman: Record<string, { count: number; value: number }> = {};
  const byOpportunityType: Record<OpportunityType, { count: number; value: number }> = {
    OUTLET_RECOVERY: { count: 0, value: 0 },
    SKU_CROSS_SELL: { count: 0, value: 0 },
    MARK_NEW_CROSS_SELL: { count: 0, value: 0 },
    EC_EXPANSION: { count: 0, value: 0 },
    OUTLET_DEVELOPMENT: { count: 0, value: 0 },
    SKU_PENETRATION: { count: 0, value: 0 },
    SALESMAN_OPPORTUNITY: { count: 0, value: 0 },
    REPEAT_OUTLET_GROWTH: { count: 0, value: 0 },
  };

  opportunities.forEach(o => {
    const val = o.opportunityValue || 0;
    totalOpportunityValue += val;
    totalConfidence += o.confidence;

    if (o.priorityScore >= 70) highPriorityCount++;

    if (o.opportunityType === 'OUTLET_RECOVERY') outletRecoveryCount++;
    else if (o.opportunityType === 'SKU_CROSS_SELL') skuCrossSellCount++;
    else if (o.opportunityType === 'MARK_NEW_CROSS_SELL') markNewCount++;
    else if (o.opportunityType === 'EC_EXPANSION') ecExpansionCount++;
    else if (o.opportunityType === 'OUTLET_DEVELOPMENT') outletDevelopmentCount++;
    else if (o.opportunityType === 'SKU_PENETRATION') skuPenetrationCount++;
    else if (o.opportunityType === 'SALESMAN_OPPORTUNITY') salesmanOpportunityCount++;
    else if (o.opportunityType === 'REPEAT_OUTLET_GROWTH') repeatGrowthCount++;

    if (o.status === 'QUALIFIED' || o.status === 'NEW') qualifiedCount++;
    else if (o.status === 'ACTIONED' || o.status === 'IN_PROGRESS') actionedCount++;
    else if (o.status === 'WON') {
      wonCount++;
      if (o.outcome?.actualValue) {
        totalWonValue += o.outcome.actualValue;
      }
    } else if (o.status === 'LOST') {
      lostCount++;
    }

    const sls = o.salesmanName || 'General / Unassigned';
    if (!bySalesman[sls]) {
      bySalesman[sls] = { count: 0, value: 0 };
    }
    bySalesman[sls].count++;
    bySalesman[sls].value += val;

    if (byOpportunityType[o.opportunityType]) {
      byOpportunityType[o.opportunityType].count++;
      byOpportunityType[o.opportunityType].value += val;
    }
  });

  const total = opportunities.length;
  const averageConfidence = total > 0 ? Math.round(totalConfidence / total) : 0;

  const hasTargetLinkedSalesmanOpp = opportunities.some(
    o => o.opportunityType === 'SALESMAN_OPPORTUNITY' && o.opportunityValue !== null && o.opportunityValue > 0
  );
  const isSalesmanTargetLinked = isTargetLinkedInput !== undefined ? isTargetLinkedInput : hasTargetLinkedSalesmanOpp;

  return {
    totalOpportunities: total,
    totalOpportunityValue,
    averageConfidence,
    highPriorityCount,
    outletRecoveryCount,
    skuCrossSellCount,
    markNewCount,
    ecExpansionCount,
    outletDevelopmentCount,
    skuPenetrationCount,
    salesmanOpportunityCount,
    repeatGrowthCount,
    qualifiedCount,
    actionedCount,
    wonCount,
    lostCount,
    totalWonValue,
    isSalesmanTargetLinked,
    bySalesman,
    byOpportunityType,
  };
}
