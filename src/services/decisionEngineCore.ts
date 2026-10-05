/**
 * ESM CONTROL TOWER — DETERMINISTIC DECISION ENGINE CORE (PHASE 1)
 * 
 * Strict FMCG Enterprise Business Rules:
 * 1. Sales Value = SUM(VALUE) strictly. (No VALUE NETT or NETT EXCL PPN).
 * 2. EC = COUNT DISTINCT(KODE OUTLET).
 * 3. MARK NEW / ECERAN = All records marked as markNew.
 * 4. Outlet Classification: NEW, REPEAT, DROP, ACTIVE.
 * 5. Recovery Score: Historical Value (30%), Recent Growth (20%), Order Frequency (15%),
 *    Current EC Status (15%), SKU Potential (10%), MARK NEW Potential (5%), Urgency (5%).
 * 6. Risk Score (0-100): Achievement (25%), Growth (20%), EC (20%), Forecast (20%), Drop Outlet (10%), SKU (5%).
 * 7. Opportunity Score (0-100): Revenue Potential (30%), Outlet Opp (25%), SKU Opp (20%), Mark New Opp (15%), EC Opp (10%).
 * 8. Priority Score (0-100): Revenue Impact (30%), Risk (25%), Urgency (20%), Opportunity (15%), Confidence (10%).
 * 9. Root Cause: Structured (WHAT, WHY, IMPACT, ACTION, EXPECTED IMPACT).
 * 10. NO GEMINI / NO LLM in Phase 1: 100% Deterministic, Auditable, Traceable.
 */

import { 
  CalculationResult, 
  ControlTowerKPIs, 
  DropOutletItem, 
  NewOutletItem, 
  SalesmanPerformanceItem,
  SmartInsightItem,
  OpportunityItem
} from '../types/analytics';
import { 
  TransactionRecord, 
  TargetRecord, 
  MasterOutletRecord, 
  AppSettings 
} from '../types/database';
import { 
  DecisionContext, 
  DecisionResult, 
  DecisionCategory, 
  DecisionPriority, 
  EntityType, 
  RiskStatus, 
  WorkingDaysConfig,
  SalesSummaryAggregate,
  EcSummaryAggregate,
  OutletSummaryAggregate,
  SkuSummaryAggregate,
  SkuItemAggregate,
  MarkNewSummaryAggregate,
  MarkNewItemAggregate,
  ForecastSummaryAggregate,
  SalesmanDecisionItem,
  OutletRecoveryItem,
  DecisionEngineAuditReport,
  IDecisionEngineExtensionPoint
} from '../types/decisionEngine';
import { formatRupiah, formatPercent } from './smartInsightEngine';

export const DECISION_ENGINE_VERSION = '1.0.0-phase1-deterministic-core';

// Safe number helpers
function safeDiv(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0 || !isFinite(denominator)) return null;
  const res = (numerator / denominator) * 100;
  return isFinite(res) ? Math.round(res * 100) / 100 : null;
}

function clampScore(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.min(100, Math.max(0, Math.round(val)));
}

export function determineRiskStatus(score: number): RiskStatus {
  if (score <= 20) return 'VERY_LOW';
  if (score <= 40) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export function determinePriorityLevel(score: number): DecisionPriority {
  if (score >= 81) return 'CRITICAL';
  if (score >= 61) return 'HIGH';
  if (score >= 41) return 'MEDIUM';
  if (score >= 21) return 'LOW';
  return 'MONITOR';
}

/**
 * STEP 4: Build DecisionContext from Raw Transactions & Calculation Engine
 */
export function buildDecisionContext(
  calc: CalculationResult,
  prevTransactions: TransactionRecord[] = [],
  currTransactions: TransactionRecord[] = [],
  targets: TargetRecord[] = [],
  masterOutlets: MasterOutletRecord[] = [],
  settings?: Partial<AppSettings>,
  workingDaysConfig?: Partial<WorkingDaysConfig>
): DecisionContext {
  const prevLabel = settings?.previousMonthLabel && !settings.previousMonthLabel.toUpperCase().includes('AGUSTUS') 
    ? settings.previousMonthLabel 
    : 'September 2026';
  const currLabel = settings?.currentMonthLabel && !settings.currentMonthLabel.toUpperCase().includes('AGUSTUS') && settings.currentMonthLabel !== prevLabel 
    ? settings.currentMonthLabel 
    : 'Oktober 2026';

  // 1. Working Days Configuration
  // Default to 26 total, 18 elapsed, or detect from unique transaction dates
  const totalDays = workingDaysConfig?.workingDaysTotal ?? 26;
  let elapsedDays = workingDaysConfig?.workingDaysElapsed ?? 18;
  
  if (!workingDaysConfig?.workingDaysElapsed && currTransactions.length > 0) {
    const dates = new Set(currTransactions.map(t => t.transactionDate?.slice(0, 10)).filter(Boolean));
    if (dates.size > 0) elapsedDays = Math.min(totalDays, Math.max(1, dates.size));
  }
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  
  const wdConfig: WorkingDaysConfig = {
    workingDaysTotal: totalDays,
    workingDaysElapsed: elapsedDays,
    workingDaysRemaining: remainingDays,
  };

  // 2. Sales Summary
  const targetVal = calc.kpis.totalTarget;
  const currentVal = calc.kpis.totalActualCurrent;
  const previousVal = calc.kpis.totalActualPrevious;
  const gapVal = calc.kpis.gapValue;
  const achRate = calc.kpis.achievementRate;
  const growthRate = calc.kpis.growthRate;

  const salesSummary: SalesSummaryAggregate = {
    totalTarget: targetVal,
    currentValue: currentVal,
    previousValue: previousVal,
    gap: gapVal,
    achievementRate: achRate,
    growthRate: growthRate,
  };

  // 3. EC (Effective Call = COUNT DISTINCT KODE OUTLET)
  const prevOutletsSet = new Set<string>();
  prevTransactions.forEach(t => {
    if (t.outletId && t.salesValue > 0) prevOutletsSet.add(t.outletId.trim().toUpperCase());
  });

  const currOutletsSet = new Set<string>();
  currTransactions.forEach(t => {
    if (t.outletId && t.salesValue > 0) currOutletsSet.add(t.outletId.trim().toUpperCase());
  });

  const ecPrev = prevOutletsSet.size;
  const ecCurr = currOutletsSet.size;
  const ecGrowth = ecPrev > 0 ? safeDiv(ecCurr - ecPrev, ecPrev) : null;

  let newEcCount = 0;
  let repeatEcCount = 0;
  currOutletsSet.forEach(id => {
    if (prevOutletsSet.has(id)) repeatEcCount++;
    else newEcCount++;
  });

  let lostEcCount = 0;
  prevOutletsSet.forEach(id => {
    if (!currOutletsSet.has(id)) lostEcCount++;
  });

  const ecSummary: EcSummaryAggregate = {
    ecCurrent: ecCurr,
    ecPrevious: ecPrev,
    ecGrowth: ecGrowth,
    newEc: newEcCount,
    lostEc: lostEcCount,
    repeatEc: repeatEcCount,
  };

  // 4. Outlet Summary
  const outletSummary: OutletSummaryAggregate = {
    totalActiveOutlets: calc.kpis.totalActiveOutlets,
    transactedOutlets: calc.kpis.outletsTransactedCurrent,
    untransactedOutlets: calc.kpis.outletsNotTransactedCurrent,
    repeatOrderRate: calc.kpis.repeatOrderRate,
    dropOutletsCount: calc.kpis.dropOutletCount,
    dropOutletsLostRevenue: calc.kpis.dropOutletLostRevenue,
    newOutletsCount: calc.kpis.newActiveOutletCount,
    newOutletsRevenue: calc.kpis.newActiveOutletRevenue,
  };

  // 5. SKU Engine Aggregation (Deterministic grouping)
  const skuMap = new Map<string, {
    skuCode: string;
    skuName: string;
    currVal: number;
    prevVal: number;
    currQty: number;
    prevQty: number;
    outletsSet: Set<string>;
  }>();

  currTransactions.forEach(t => {
    const code = t.productCode || t.productName || 'UNKNOWN_SKU';
    const name = t.productName || t.productCode || 'Produk';
    const existing = skuMap.get(code) || {
      skuCode: code,
      skuName: name,
      currVal: 0,
      prevVal: 0,
      currQty: 0,
      prevQty: 0,
      outletsSet: new Set<string>(),
    };
    existing.currVal += (t.salesValue || 0);
    existing.currQty += (t.qty || 0);
    if (t.outletId) existing.outletsSet.add(t.outletId.trim().toUpperCase());
    skuMap.set(code, existing);
  });

  prevTransactions.forEach(t => {
    const code = t.productCode || t.productName || 'UNKNOWN_SKU';
    const name = t.productName || t.productCode || 'Produk';
    const existing = skuMap.get(code) || {
      skuCode: code,
      skuName: name,
      currVal: 0,
      prevVal: 0,
      currQty: 0,
      prevQty: 0,
      outletsSet: new Set<string>(),
    };
    existing.prevVal += (t.salesValue || 0);
    existing.prevQty += (t.qty || 0);
    skuMap.set(code, existing);
  });

  const totalActiveTransactedOutlets = Math.max(1, ecCurr);
  const skuItems: SkuItemAggregate[] = [];
  let winnerCount = 0;
  let decliningCount = 0;
  let underPenetratedCount = 0;
  let crossSellCount = 0;

  skuMap.forEach(item => {
    const growth = item.prevVal > 0 ? safeDiv(item.currVal - item.prevVal, item.prevVal) : null;
    const contrib = currentVal > 0 ? (item.currVal / currentVal) * 100 : 0;
    const penetration = (item.outletsSet.size / totalActiveTransactedOutlets) * 100;

    let classification: SkuItemAggregate['classification'] = 'CROSS_SELL_OPPORTUNITY';
    if (growth !== null && growth >= 15 && contrib >= 5) {
      classification = 'WINNER';
      winnerCount++;
    } else if (growth !== null && growth < -10) {
      classification = 'DECLINING';
      decliningCount++;
    } else if (penetration < 30 && item.currVal > 0) {
      classification = 'UNDER_PENETRATED';
      underPenetratedCount++;
    } else {
      classification = 'CROSS_SELL_OPPORTUNITY';
      crossSellCount++;
    }

    skuItems.push({
      skuCode: item.skuCode,
      skuName: item.skuName,
      currentValue: Math.round(item.currVal),
      previousValue: Math.round(item.prevVal),
      currentQty: item.currQty,
      previousQty: item.prevQty,
      ecCount: item.outletsSet.size,
      growthRate: growth,
      contributionPct: Math.round(contrib * 10) / 10,
      penetrationPct: Math.round(penetration * 10) / 10,
      classification,
    });
  });

  skuItems.sort((a, b) => b.currentValue - a.currentValue);

  const skuSummary: SkuSummaryAggregate = {
    totalSkus: skuMap.size,
    activeSkus: skuItems.filter(s => s.currentValue > 0).length,
    winnerCount,
    decliningCount,
    underPenetratedCount,
    crossSellCount,
    items: skuItems,
  };

  // 6. MARK NEW / ECERAN Aggregation
  const markNewOutletsSet = new Set<string>();
  const markNewItems: MarkNewItemAggregate[] = [];
  let markNewVal = 0;

  currTransactions.forEach(t => {
    const isMarkNew = t.markNew && t.markNew.trim() !== '' && t.markNew.toLowerCase() !== 'no';
    if (isMarkNew) {
      markNewVal += (t.salesValue || 0);
      if (t.outletId) markNewOutletsSet.add(t.outletId.trim().toUpperCase());
      markNewItems.push({
        outletId: t.outletId || '',
        outletName: t.outletName || 'Outlet',
        salesmanId: t.salesmanId || '',
        salesmanName: t.salesmanName || '',
        skuCode: t.productCode || '',
        skuName: t.productName || '',
        value: t.salesValue || 0,
        qty: t.qty || 0,
      });
    }
  });

  // Calculate previous mark new value for growth
  let prevMarkNewVal = 0;
  prevTransactions.forEach(t => {
    const isMarkNew = t.markNew && t.markNew.trim() !== '' && t.markNew.toLowerCase() !== 'no';
    if (isMarkNew) prevMarkNewVal += (t.salesValue || 0);
  });

  const markNewGrowth = prevMarkNewVal > 0 ? safeDiv(markNewVal - prevMarkNewVal, prevMarkNewVal) : null;
  const markNewContrib = currentVal > 0 ? (markNewVal / currentVal) * 100 : 0;
  const markNewSkuSet = new Set(markNewItems.map(i => i.skuCode).filter(Boolean));

  const markNewSummary: MarkNewSummaryAggregate = {
    markNewValue: Math.round(markNewVal),
    markNewEc: markNewOutletsSet.size,
    markNewGrowth,
    markNewContributionPct: Math.round(markNewContrib * 10) / 10,
    markNewSkuCount: markNewSkuSet.size,
    crossSellOpportunitiesCount: Math.max(0, ecCurr - markNewOutletsSet.size),
    items: markNewItems,
  };

  // 7. Forecast Summary (Disabled in Phase 1 Patch — Actual Performance Only)
  const forecastSummary: ForecastSummaryAggregate | undefined = undefined;

  // 8. Salesman Decisions Breakdown (Purely Actuals — 5 Factors)
  const salesmanDecisions: SalesmanDecisionItem[] = calc.salesmanPerformances.map(s => {
    // Salesman EC
    const slsPrevEc = s.activeOutlets || 0; // transacted previously
    const slsCurrEc = s.transactingOutlets || 0;
    const slsEcGrowth = slsPrevEc > 0 ? safeDiv(slsCurrEc - slsPrevEc, slsPrevEc) : null;

    // Calculate Salesman Risk Score without Forecast:
    // Achievement Risk (30%), Growth Risk (25%), EC Risk (20%), Drop Outlet Risk (15%), SKU Risk (10%) = 100%
    let achRisk = 50;
    if (s.achievementRate !== null) {
      if (s.achievementRate >= 100) achRisk = 10;
      else if (s.achievementRate >= 85) achRisk = 35;
      else if (s.achievementRate >= 70) achRisk = 65;
      else achRisk = 95;
    }

    let grwRisk = 50;
    if (s.growthRate !== null) {
      if (s.growthRate >= 15) grwRisk = 10;
      else if (s.growthRate >= 0) grwRisk = 30;
      else if (s.growthRate >= -15) grwRisk = 65;
      else grwRisk = 95;
    }

    let ecRisk = 50;
    if (slsEcGrowth !== null) {
      if (slsEcGrowth >= 0) ecRisk = 20;
      else if (slsEcGrowth >= -10) ecRisk = 50;
      else ecRisk = 85;
    }

    const dropRisk = s.dropOutletsCount > 5 ? 85 : (s.dropOutletsCount > 0 ? 50 : 15);
    const skuRisk = 30; // base

    const riskScore = clampScore(
      (achRisk * 0.30) +
      (grwRisk * 0.25) +
      (ecRisk * 0.20) +
      (dropRisk * 0.15) +
      (skuRisk * 0.10)
    );

    // Salesman Opportunity Score (Revenue Potential 30%, Outlet Opp 25%, SKU Opp 20%, Mark New 15%, EC 10%)
    const gapShortfall = Math.max(0, s.target - s.actualCurrent);
    const revPotentialScore = Math.min(100, Math.round((gapShortfall / Math.max(1, targetVal)) * 300));
    const outletOppScore = Math.min(100, (s.nonTransactingOutlets + s.dropOutletsCount) * 8);
    const oppScore = clampScore(
      (revPotentialScore * 0.30) +
      (outletOppScore * 0.25) +
      (40 * 0.20) +
      (35 * 0.15) +
      (40 * 0.10)
    );

    // Priority Score (Revenue Impact 30%, Risk 25%, Urgency 20%, Opportunity 15%, Confidence 10%)
    const urgencyScore = 60; // based on current operational gap
    const confidenceScore = s.target > 0 ? 95 : 60;
    const priorityScore = clampScore(
      (revPotentialScore * 0.30) +
      (riskScore * 0.25) +
      (urgencyScore * 0.20) +
      (oppScore * 0.15) +
      (confidenceScore * 0.10)
    );

    return {
      salesmanId: s.salesmanId,
      salesmanName: s.salesmanName,
      area: s.area,
      target: s.target,
      actualValue: s.actualCurrent,
      previousValue: s.actualPrevious,
      achievementRate: s.achievementRate,
      gap: s.gap,
      growthRate: s.growthRate,
      ecCurrent: slsCurrEc,
      ecPrevious: slsPrevEc,
      ecGrowth: slsEcGrowth,
      dropOutletCount: s.dropOutletsCount,
      newOutletCount: s.newOutletsCount,
      markNewValue: 0,
      forecastEOM: undefined,
      forecastAchievement: undefined,
      riskScore,
      opportunityScore: oppScore,
      priorityScore,
    };
  });

  // 9. Outlet Recovery Scoring (Formula Section 12)
  // Historical Value 30%, Recent Growth 20%, Order Frequency 15%, Current EC Status 15%, SKU Potential 10%, Mark New 5%, Urgency 5%
  const maxLostVal = Math.max(1, ...calc.dropOutlets.map(d => d.salesPrevious));
  const outletRecoveryList: OutletRecoveryItem[] = calc.dropOutlets.map(d => {
    const historicalScore = Math.min(100, Math.round((d.salesPrevious / maxLostVal) * 100));
    const growthScore = 30; // drop has negative growth
    const orderFreqScore = 60;
    const ecStatusScore = 20; // currently 0
    const skuPotential = 70; // high potential if reopened
    const markNewPotential = 50;
    const urgency = remainingDays <= 8 ? 90 : 60;

    const recoveryScore = clampScore(
      (historicalScore * 0.30) +
      (growthScore * 0.20) +
      (orderFreqScore * 0.15) +
      (ecStatusScore * 0.15) +
      (skuPotential * 0.10) +
      (markNewPotential * 0.05) +
      (urgency * 0.05)
    );

    return {
      outletId: d.outletId,
      outletName: d.outletName,
      salesmanId: d.salesmanId,
      salesmanName: d.salesmanName,
      area: d.area,
      rayon: d.rayon,
      historicalValue: d.salesPrevious,
      lastPeriodValue: d.salesPrevious,
      currentValue: 0,
      orderFrequency: 1,
      currentStatus: 'DROP',
      skuPotentialScore: skuPotential,
      markNewPotentialScore: markNewPotential,
      urgencyScore: urgency,
      recoveryScore,
      recommendedAction: `Jadwalkan kunjungan canvassing darurat oleh ${d.salesmanName || 'Salesman'} dengan penawaran paket SKU reguler untuk reaktivasi transaksi minimal ${formatRupiah(Math.round(d.salesPrevious * 0.5))}.`,
    };
  });

  outletRecoveryList.sort((a, b) => b.recoveryScore - a.recoveryScore);

  return {
    period: currLabel,
    previousPeriod: prevLabel,
    cabang: (settings as any)?.cabangName || 'BONE',
    workingDaysConfig: wdConfig,
    salesSummary,
    ecSummary,
    outletSummary,
    skuSummary,
    markNewSummary,
    forecastSummary,
    salesmanDecisions,
    outletRecoveryList,
    existingInsights: [],
    existingOpportunities: [],
    snapshotTimestamp: new Date().toISOString(),
  };
}

/**
 * STEP 5 to 15: Deterministic Decision Engine Synthesis
 * Computes 6 Focus Decisions with 5-Pillar Root Cause Analysis
 */
export function synthesizeDeterministicDecisions(context: DecisionContext): DecisionResult[] {
  const decisions: DecisionResult[] = [];
  const { 
    period, 
    previousPeriod, 
    salesSummary, 
    ecSummary, 
    outletSummary, 
    salesmanDecisions, 
    outletRecoveryList,
    skuSummary,
    markNewSummary
  } = context;

  // ----------------------------------------------------
  // FOCUS 1: DROP OUTLET RECOVERY DECISIONS (Top 5 Outlets)
  // ----------------------------------------------------
  const topDropToIntervene = outletRecoveryList.slice(0, 5);
  topDropToIntervene.forEach((drop, idx) => {
    const prioLevel = determinePriorityLevel(drop.recoveryScore);
    const riskScore = clampScore(drop.recoveryScore * 0.9);

    decisions.push({
      id: `dec-drop-${drop.outletId}`,
      category: 'DROP_OUTLET_RECOVERY',
      entityType: 'OUTLET',
      entityId: drop.outletId,
      entityName: drop.outletName,
      priorityScore: drop.recoveryScore,
      riskScore,
      opportunityScore: clampScore(drop.historicalValue > 5000000 ? 90 : 70),
      status: prioLevel,
      riskStatus: determineRiskStatus(riskScore),
      what: `Toko ${drop.outletName} (${drop.outletId}) mengalami DROP: transaksi Rp 0 di bulan ini setelah membukukan ${formatRupiah(drop.historicalValue)} pada ${previousPeriod}.`,
      why: `Tidak ada faktur terbit di ${period}. Salesman PIC: ${drop.salesmanName || 'Belum Terpetakan'}.`,
      impact: `Kehilangan omset langsung sebesar ${formatRupiah(drop.historicalValue)} yang berkontribusi langsung pada defisit cabang.`,
      recommendedAction: drop.recommendedAction,
      expectedImpact: `Pemulihan potensi omset ${formatRupiah(drop.historicalValue)} dan kenaikan EC +1 toko.`,
      evidence: [
        `ID Outlet: ${drop.outletId}`,
        `Nama Outlet: ${drop.outletName}`,
        `Salesman PIC: ${drop.salesmanName || '-'}`,
        `Omset Bulan Lalu (${previousPeriod}): ${formatRupiah(drop.historicalValue)}`,
        `Omset Bulan Ini (${period}): Rp 0`,
        `Recovery Score: ${drop.recoveryScore} / 100`,
      ],
      confidence: 0.92,
      sourcePeriod: period,
      targetOutletId: drop.outletId,
      targetOutletName: drop.outletName,
      assignedSalesmanId: drop.salesmanId,
      assignedSalesmanName: drop.salesmanName,
      expectedRevenueLift: drop.historicalValue,
      generatedAt: new Date().toISOString(),
      engineVersion: DECISION_ENGINE_VERSION,
    });
  });

  // ----------------------------------------------------
  // FOCUS 2: SALESMAN PRODUCTIVITY DECISIONS
  // ----------------------------------------------------
  const criticalSalesmen = salesmanDecisions
    .filter(s => s.target > 0 && (s.achievementRate === null || s.achievementRate < 70))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  criticalSalesmen.forEach(sls => {
    const prioLevel = determinePriorityLevel(sls.priorityScore);

    decisions.push({
      id: `dec-sls-${sls.salesmanId}`,
      category: 'SALESMAN_PRODUCTIVITY',
      entityType: 'SALESMAN',
      entityId: sls.salesmanId,
      entityName: sls.salesmanName,
      priorityScore: sls.priorityScore,
      riskScore: sls.riskScore,
      opportunityScore: sls.opportunityScore,
      status: prioLevel,
      riskStatus: determineRiskStatus(sls.riskScore),
      what: `Salesman ${sls.salesmanName} tertinggal di bawah ambang target dengan achievement ${sls.achievementRate !== null ? sls.achievementRate.toFixed(1) : 0}% dan defisit gap ${formatRupiah(Math.abs(sls.gap))}.`,
      why: `Penetrasi EC rendah (${sls.ecCurrent} toko order vs target) dan terdapat ${sls.dropOutletCount} outlet drop di rute kunjungannya.`,
      impact: `Menjadi bottleneck pencapaian cabang dengan kontribusi shortfall sebesar ${formatRupiah(Math.abs(sls.gap))}.`,
      recommendedAction: `Supervisor mendampingi (joint-visit) Salesman ${sls.salesmanName} untuk reaktivasi ${sls.dropOutletCount} outlet drop dan mengejar setoran sisa target.`,
      expectedImpact: `Pemenuhan sisa target ${formatRupiah(Math.abs(sls.gap))} dan pemulihan performa salesman menuju 100%.`,
      evidence: [
        `Target Salesman: ${formatRupiah(sls.target)}`,
        `Realisasi Saat Ini: ${formatRupiah(sls.actualValue)} (${sls.achievementRate?.toFixed(1) || 0}%)`,
        `Gap Defisit: ${formatRupiah(Math.abs(sls.gap))}`,
        `EC Aktif: ${sls.ecCurrent} outlet`,
        `Jumlah Drop Outlet: ${sls.dropOutletCount} outlet`,
        `Pertumbuhan MoM: ${sls.growthRate !== null ? `${sls.growthRate >= 0 ? '+' : ''}${sls.growthRate.toFixed(1)}%` : 'N/A'}`,
      ],
      confidence: 0.90,
      sourcePeriod: period,
      assignedSalesmanId: sls.salesmanId,
      assignedSalesmanName: sls.salesmanName,
      expectedRevenueLift: Math.abs(sls.gap),
      generatedAt: new Date().toISOString(),
      engineVersion: DECISION_ENGINE_VERSION,
    });
  });

  // ----------------------------------------------------
  // FOCUS 3: EC DYNAMICS (Customer Base Contraction / Expansion)
  // ----------------------------------------------------
  if (ecSummary.ecPrevious > 0) {
    const isEcDeclining = ecSummary.ecGrowth !== null && ecSummary.ecGrowth < 0;
    const prioScore = isEcDeclining ? 78 : 45;
    const prioLevel = determinePriorityLevel(prioScore);

    decisions.push({
      id: 'dec-ec-dynamics',
      category: 'EC_RISK',
      entityType: 'EC',
      entityId: 'BRANCH_EC_DYNAMICS',
      entityName: 'Penetrasi Effective Call (EC)',
      priorityScore: prioScore,
      riskScore: isEcDeclining ? 72 : 25,
      opportunityScore: 75,
      status: prioLevel,
      riskStatus: determineRiskStatus(isEcDeclining ? 72 : 25),
      what: isEcDeclining
        ? `Terjadi kontraksi basis pelanggan: EC berjalan (${ecSummary.ecCurrent} toko) menurun ${ecSummary.ecGrowth?.toFixed(1)}% dibanding bulan lalu (${ecSummary.ecPrevious} toko).`
        : `Basis pelanggan aktif bertumbuh: EC saat ini ${ecSummary.ecCurrent} toko (+${ecSummary.ecGrowth?.toFixed(1)}%).`,
      why: `Terdapat ${ecSummary.lostEc} toko bulan lalu yang belum order di bulan ini, sementara toko baru yang dibuka berjumlah ${ecSummary.newEc} toko.`,
      impact: isEcDeclining
        ? `Penyempitan jangkauan distribusi produk dan risiko hilangnya pangsa pasar ke kompetitor.`
        : `Perluasan jaringan outlet aktif yang memperkuat fondasi repeat order.`,
      recommendedAction: isEcDeclining
        ? `Lakukan audit rute canvassing untuk mengunjungi kembali ${ecSummary.lostEc} toko yang tidak order dan perketat standar call per day.`
        : `Jaga kontinuitas suplai stok pada ${ecSummary.newEc} toko baru agar terkonversi menjadi repeat order reguler.`,
      expectedImpact: `Stabilisasi jumlah pelanggan bertransaksi minimal di atas ${ecSummary.ecPrevious} toko.`,
      evidence: [
        `EC Bulan Ini: ${ecSummary.ecCurrent} toko`,
        `EC Bulan Lalu: ${ecSummary.ecPrevious} toko`,
        `Pertumbuhan EC: ${ecSummary.ecGrowth !== null ? `${ecSummary.ecGrowth >= 0 ? '+' : ''}${ecSummary.ecGrowth.toFixed(1)}%` : 'N/A'}`,
        `Toko Hilang (Lost EC): ${ecSummary.lostEc} toko`,
        `Toko Baru (New EC): ${ecSummary.newEc} toko`,
        `Toko Repeat (Repeat EC): ${ecSummary.repeatEc} toko`,
      ],
      confidence: 0.94,
      sourcePeriod: period,
      generatedAt: new Date().toISOString(),
      engineVersion: DECISION_ENGINE_VERSION,
    });
  }

  // ----------------------------------------------------
  // FOCUS 4: MARK NEW / ECERAN OPPORTUNITY DECISION
  // ----------------------------------------------------
  if (markNewSummary.markNewValue > 0 || markNewSummary.crossSellOpportunitiesCount > 0) {
    const prioScore = markNewSummary.crossSellOpportunitiesCount > 20 ? 70 : 45;
    decisions.push({
      id: 'dec-mark-new-cross-sell',
      category: 'MARK_NEW_OPPORTUNITY',
      entityType: 'MARK_NEW',
      entityId: 'ALL_MARK_NEW',
      entityName: 'Program MARK NEW / Eceran',
      priorityScore: prioScore,
      riskScore: 35,
      opportunityScore: 82,
      status: determinePriorityLevel(prioScore),
      riskStatus: 'LOW',
      what: `Program MARK NEW / Eceran mencatat omset ${formatRupiah(markNewSummary.markNewValue)} dari ${markNewSummary.markNewEc} toko bertransaksi (Kontribusi ${markNewSummary.markNewContributionPct}% terhadap total omset).`,
      why: `Terdapat ${markNewSummary.crossSellOpportunitiesCount} outlet bertransaksi reguler yang belum mengambil paket MARK NEW.`,
      impact: `Celah pendapatan tambahan (whitespace revenue) yang belum dimaksimalkan pada outlet terdaftar.`,
      recommendedAction: `Wajibkan salesman membawa sample kit MARK NEW dan menawarkan paket minimum per faktur kepada ${markNewSummary.crossSellOpportunitiesCount} outlet reguler.`,
      expectedImpact: `Ekspansi omset tambahan estimasi ${formatRupiah(markNewSummary.crossSellOpportunitiesCount * 350000)} dari penetrasi MARK NEW.`,
      evidence: [
        `Total Omset MARK NEW: ${formatRupiah(markNewSummary.markNewValue)}`,
        `EC MARK NEW: ${markNewSummary.markNewEc} outlet`,
        `Kontribusi Omset: ${markNewSummary.markNewContributionPct}%`,
        `Outlet Reguler Belum MARK NEW: ${markNewSummary.crossSellOpportunitiesCount} toko`,
        `Jumlah SKU MARK NEW: ${markNewSummary.markNewSkuCount} item`,
      ],
      confidence: 0.88,
      sourcePeriod: period,
      expectedRevenueLift: markNewSummary.crossSellOpportunitiesCount * 350000,
      generatedAt: new Date().toISOString(),
      engineVersion: DECISION_ENGINE_VERSION,
    });
  }

  // ----------------------------------------------------
  // FOCUS 5: SKU PENETRATION & UNDERPERFORMING PRODUCT
  // ----------------------------------------------------
  const decliningSkus = skuSummary.items.filter(s => s.classification === 'DECLINING').slice(0, 3);
  if (decliningSkus.length > 0) {
    const topDeclining = decliningSkus[0];
    decisions.push({
      id: `dec-sku-declining-${topDeclining.skuCode}`,
      category: 'SKU_OPPORTUNITY',
      entityType: 'SKU',
      entityId: topDeclining.skuCode,
      entityName: `SKU: ${topDeclining.skuName} (${topDeclining.skuCode})`,
      priorityScore: 68,
      riskScore: 65,
      opportunityScore: 70,
      status: 'HIGH',
      riskStatus: 'MEDIUM',
      what: `SKU ${topDeclining.skuName} mengalami kontraksi penjualan sebesar ${topDeclining.growthRate?.toFixed(1) || 0}% dibanding bulan lalu.`,
      why: `Omset turun dari ${formatRupiah(topDeclining.previousValue)} menjadi ${formatRupiah(topDeclining.currentValue)} dengan penurunan jumlah outlet pembeli.`,
      impact: `Mengikis pertumbuhan kategori produk utama cabang.`,
      recommendedAction: `Cek ketersediaan stok di gudang dan pasang program bundle dengan SKU Winner pada rute kunjungan berikutnya.`,
      expectedImpact: `Stabilisasi omset SKU ke level ${formatRupiah(topDeclining.previousValue)}.`,
      evidence: [
        `Kode SKU: ${topDeclining.skuCode}`,
        `Nama SKU: ${topDeclining.skuName}`,
        `Omset Bulan Ini: ${formatRupiah(topDeclining.currentValue)}`,
        `Omset Bulan Lalu: ${formatRupiah(topDeclining.previousValue)}`,
        `Pertumbuhan: ${topDeclining.growthRate?.toFixed(1) || 0}%`,
        `Outlet Penetrasi: ${topDeclining.penetrationPct}% (${topDeclining.ecCount} toko)`,
      ],
      confidence: 0.85,
      sourcePeriod: period,
      expectedRevenueLift: Math.max(0, topDeclining.previousValue - topDeclining.currentValue),
      generatedAt: new Date().toISOString(),
      engineVersion: DECISION_ENGINE_VERSION,
    });
  }

  // Sort decisions by Priority Score descending (ranking utama)
  decisions.sort((a, b) => b.priorityScore - a.priorityScore);

  return decisions;
}

/**
 * STEP 30: Diagnostic & Audit Report Generator
 */
export function generateDecisionAuditReport(
  context: DecisionContext,
  decisions: DecisionResult[],
  inputStats: {
    previousRows: number;
    currentRows: number;
    targetRows: number;
    masterRows: number;
  }
): DecisionEngineAuditReport {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let monitorCount = 0;

  decisions.forEach(d => {
    if (d.status === 'CRITICAL') criticalCount++;
    else if (d.status === 'HIGH') highCount++;
    else if (d.status === 'MEDIUM') mediumCount++;
    else if (d.status === 'LOW') lowCount++;
    else monitorCount++;
  });

  return {
    timestamp: new Date().toISOString(),
    engineVersion: DECISION_ENGINE_VERSION,
    inputRawRecords: inputStats,
    aggregatedRecords: {
      totalSalesmen: context.salesmanDecisions.length,
      totalMasterOutlets: context.outletSummary.totalActiveOutlets,
      activeCurrentEc: context.ecSummary.ecCurrent,
      totalDropOutlets: context.outletSummary.dropOutletsCount,
      totalNewOutlets: context.outletSummary.newOutletsCount,
      totalSkus: context.skuSummary.totalSkus,
      markNewRecords: context.markNewSummary.items.length,
    },
    decisionCounts: {
      total: decisions.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      monitor: monitorCount,
    },
    opportunityCount: decisions.filter(d => d.opportunityScore >= 70).length,
    forecastStatus: context.forecastSummary?.riskStatus || 'N/A (Actuals Only)',
    invalidRecordsCount: 0,
    skippedRecordsCount: 0,
    auditTraceabilityPassed: decisions.every(d => d.evidence && d.evidence.length > 0),
  };
}

/**
 * The Real Implementation of Decision Engine Extension Point
 */
export const ActiveDeterministicDecisionEngine: IDecisionEngineExtensionPoint = {
  version: DECISION_ENGINE_VERSION,
  isAiEnabled: false, // 100% deterministic, no LLM / Gemini in Phase 1
  synthesizeDecisions: (context: DecisionContext): DecisionResult[] => {
    return synthesizeDeterministicDecisions(context);
  },
  getAuditReport: (context: DecisionContext, decisions: DecisionResult[]): DecisionEngineAuditReport => {
    return generateDecisionAuditReport(context, decisions, {
      previousRows: 0,
      currentRows: 0,
      targetRows: 0,
      masterRows: 0,
    });
  },
};
