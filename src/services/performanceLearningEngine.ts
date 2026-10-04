/**
 * ESM SALES CONTROL CENTER — PHASE 5: PERFORMANCE & LEARNING ENGINE
 * 
 * Architecture Principles:
 * 1. DECISION -> OPPORTUNITY -> NBA -> ACTION -> OUTCOME -> MEASUREMENT -> LEARNING
 * 2. Absolute Safety: Never alters Phase 1-4 scores (Priority Score, Risk Score, Opportunity Score).
 * 3. Actual Value strictly from actual transaction data or confirmed user outcome. No fabricated values.
 * 4. Data Sufficiency & Minimum Sample Size (>= 5 completed actions) strictly enforced.
 * 5. Learning Memory records actual observed outcomes as factual evidence.
 */

import { 
  CalculationResult 
} from '../types/analytics';
import { 
  DecisionContext, 
  DecisionResult, 
  NextBestAction, 
  NextBestActionType,
  OpportunityResult, 
  OpportunityType,
  UserProfile 
} from '../types/decisionEngine';
import { 
  TransactionRecord 
} from '../types/database';
import { 
  PerformanceResult, 
  PerformanceStatus, 
  PerformanceOutcome, 
  LearningSignal, 
  LearningSignalType,
  PerformanceFunnel, 
  ActionTypePerformance, 
  OpportunityTypePerformance, 
  SalesmanExecutionPerformance, 
  PerformanceExecutiveSummary,
  ConfirmedOutcomeRecord
} from '../types/performanceEngine';

export const PERFORMANCE_STORAGE_KEY = 'spm_performance_learning_v5';
export const MIN_SAMPLE_SIZE = 5;

/**
 * Standard Action Types to evaluate in Performance Engine
 */
export const MONITORED_ACTION_TYPES: NextBestActionType[] = [
  'REACTIVATE_OUTLET',
  'INCREASE_OUTLET_COVERAGE',
  'CROSS_SELL_SKU',
  'PUSH_MARK_NEW',
  'IMPROVE_EC',
  'PROTECT_EXISTING_OUTLET',
  'REVIEW_SKU_PERFORMANCE',
  'FOLLOW_UP_HIGH_VALUE_OUTLET',
  'FOLLOW_UP_HIGH_PRIORITY_SALESMAN',
  'MONITOR'
];

/**
 * 8 Locked Opportunity Categories from Phase 4
 */
export const LOCKED_OPPORTUNITY_TYPES: OpportunityType[] = [
  'OUTLET_RECOVERY',
  'SKU_CROSS_SELL',
  'MARK_NEW_CROSS_SELL',
  'EC_EXPANSION',
  'OUTLET_DEVELOPMENT',
  'SKU_PENETRATION',
  'SALESMAN_OPPORTUNITY',
  'REPEAT_OUTLET_GROWTH'
];

/**
 * Utility to format Rupiah consistently
 */
export function formatRupiah(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

/**
 * Load confirmed outcome states from localStorage
 */
export function loadConfirmedOutcomes(): Record<string, ConfirmedOutcomeRecord> {
  try {
    const raw = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('[Performance Engine] Failed to load confirmed outcomes:', err);
  }
  return {};
}

/**
 * Save confirmed outcome states to localStorage
 */
export function saveConfirmedOutcomes(outcomes: Record<string, ConfirmedOutcomeRecord>): void {
  try {
    localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(outcomes));
  } catch (err) {
    console.error('[Performance Engine] Failed to save confirmed outcomes:', err);
  }
}

/**
 * STEP 1: Correlate Actions, Opportunities, and Actual Transactions into PerformanceResults
 */
export function synthesizePerformanceResults(
  actions: NextBestAction[],
  opportunities: OpportunityResult[],
  decisions: DecisionResult[],
  currTransactions: TransactionRecord[] = [],
  confirmedOutcomes: Record<string, ConfirmedOutcomeRecord> = {},
  period: string = 'SEPTEMBER 2026'
): PerformanceResult[] {
  // Index actual transactions by outlet and by outlet+product
  const actualSalesByOutlet = new Map<string, { total: number; txCount: number; invoices: string[]; dates: string[] }>();
  const actualSalesByOutletSku = new Map<string, number>();

  currTransactions.forEach(t => {
    const outletCode = (t.outletId || '').trim();
    if (!outletCode) return;
    const val = Number(t.salesValue || 0);

    if (!actualSalesByOutlet.has(outletCode)) {
      actualSalesByOutlet.set(outletCode, { total: 0, txCount: 0, invoices: [], dates: [] });
    }
    const oData = actualSalesByOutlet.get(outletCode)!;
    oData.total += val;
    oData.txCount++;
    if (t.invoiceId && !oData.invoices.includes(t.invoiceId)) oData.invoices.push(t.invoiceId);
    if (t.transactionDate && !oData.dates.includes(t.transactionDate.slice(0, 10))) oData.dates.push(t.transactionDate.slice(0, 10));

    const pCode = (t.productCode || '').trim();
    if (pCode) {
      const key = `${outletCode}___${pCode}`;
      actualSalesByOutletSku.set(key, (actualSalesByOutletSku.get(key) || 0) + val);
    }
  });

  // Map opportunities by entityId
  const oppByEntity = new Map<string, OpportunityResult>();
  const oppById = new Map<string, OpportunityResult>();
  opportunities.forEach(o => {
    oppById.set(o.id, o);
    oppByEntity.set(o.entityId, o);
  });

  // Map decisions by entityId
  const decByEntity = new Map<string, DecisionResult>();
  decisions.forEach(d => {
    decByEntity.set(d.entityId, d);
  });

  const results: PerformanceResult[] = [];

  actions.forEach(act => {
    const opp = oppByEntity.get(act.entityId) || oppById.get(act.id);
    const dec = decByEntity.get(act.entityId);
    const confirmed = confirmedOutcomes[act.id];

    // Estimated Value from linked Opportunity or NBA Reference
    const estimatedValue = opp?.opportunityValue !== undefined && opp.opportunityValue !== null
      ? opp.opportunityValue
      : (act.expectedRevenueReference !== undefined ? act.expectedRevenueReference : null);

    // Determine Actual Value strictly based on factual transaction evidence or user confirmed outcome
    let actualValue: number | null = null;
    let status: PerformanceStatus = 'PENDING';
    let outcome: PerformanceOutcome | undefined = undefined;
    const attributionEvidence: string[] = [];

    // Check if user confirmed outcome explicitly
    if (confirmed) {
      status = confirmed.status;
      outcome = confirmed.outcome;
      actualValue = confirmed.actualValue !== undefined ? confirmed.actualValue : null;
      if (confirmed.notes) {
        attributionEvidence.push(`Konfirmasi Pengguna: ${confirmed.notes}`);
      }
      if (confirmed.verifiedBy) {
        attributionEvidence.push(`Diverifikasi oleh: ${confirmed.verifiedBy}`);
      }
    } else {
      // Automatic factual correlation with actual transactions
      if (act.entityType === 'OUTLET') {
        const outletTx = actualSalesByOutlet.get(act.entityId);
        if (outletTx && outletTx.total > 0) {
          actualValue = outletTx.total;
          status = 'WON';
          outcome = 'WON';
          attributionEvidence.push(
            `Faktual Transaksi Terkonfirmasi: ${outletTx.txCount} transaksi ditemukan pada periode berjalan (${formatRupiah(outletTx.total)}).`
          );
          if (outletTx.invoices.length > 0) {
            attributionEvidence.push(`No Faktur: ${outletTx.invoices.slice(0, 3).join(', ')}${outletTx.invoices.length > 3 ? '...' : ''}`);
          }
        } else if (act.status === 'COMPLETED') {
          status = 'COMPLETED';
          outcome = 'IN_PROGRESS'; // Completed action awaiting outcome verification
          attributionEvidence.push('Tindakan lapangan tercatat selesai; menunggu sinkronisasi transaksi/konfirmasi hasil.');
        } else if (act.status === 'IN_PROGRESS') {
          status = 'IN_PROGRESS';
          outcome = 'IN_PROGRESS';
        } else if (act.status === 'DISMISSED') {
          status = 'DISMISSED';
          outcome = 'DISMISSED';
        } else {
          status = 'PENDING';
          outcome = 'PENDING';
        }
      } else if (act.entityType === 'SKU' || act.entityType === 'EC') {
        // For SKU / EC specific actions, check if matching outlet purchase exists
        const parts = act.entityId.split('_');
        const outletCode = parts[0];
        const outletTx = actualSalesByOutlet.get(outletCode);
        if (outletTx && outletTx.total > 0) {
          actualValue = outletTx.total;
          status = 'WON';
          outcome = 'WON';
          attributionEvidence.push(`Faktual Penjualan Terdeteksi: Outlet terkait bertransaksi ${formatRupiah(outletTx.total)}.`);
        } else if (act.status === 'COMPLETED') {
          status = 'COMPLETED';
          outcome = 'IN_PROGRESS';
        } else {
          status = act.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING';
          outcome = act.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING';
        }
      } else {
        // Salesman or other entities
        if (act.status === 'COMPLETED') {
          status = 'COMPLETED';
        } else if (act.status === 'IN_PROGRESS') {
          status = 'IN_PROGRESS';
        } else {
          status = 'PENDING';
        }
      }
    }

    // Variance Value = Actual - Estimated (Section 7)
    const varianceValue = actualValue !== null && estimatedValue !== null
      ? actualValue - estimatedValue
      : null;

    // Achievement % = (Actual / Estimated) * 100 (Section 7)
    const achievementPercent = actualValue !== null && estimatedValue !== null && estimatedValue > 0
      ? Number(((actualValue / estimatedValue) * 100).toFixed(1))
      : null;

    results.push({
      actionId: act.id,
      decisionId: act.decisionId || dec?.id,
      opportunityId: opp?.id,
      salesmanId: act.salesmanId,
      salesmanName: act.salesmanName,
      entityType: act.entityType,
      entityId: act.entityId,
      entityName: act.entityName,
      actionType: act.actionType,
      opportunityType: opp?.opportunityType,
      estimatedValue,
      actualValue,
      varianceValue,
      achievementPercent,
      status,
      outcome,
      completedAt: confirmed?.completedAt || (status === 'COMPLETED' || status === 'WON' ? new Date().toISOString() : undefined),
      sourcePeriod: act.sourcePeriod || period,
      attributionEvidence,
      notes: confirmed?.notes,
    });
  });

  return results;
}

/**
 * STEP 2: Compute Executive Performance Control Tower Summary & Funnel
 */
export function computePerformanceExecutiveSummary(
  performanceResults: PerformanceResult[],
  decisions: DecisionResult[],
  opportunities: OpportunityResult[]
): PerformanceExecutiveSummary {
  const totalDecisions = decisions.length;
  const totalOpportunities = opportunities.length;
  const totalActions = performanceResults.length;

  let inProgressCount = 0;
  let completedActions = 0;
  let wonOpportunities = 0;
  let lostOpportunities = 0;
  let actualOutcomeValue = 0;
  let estimatedOpportunityValue = 0;

  performanceResults.forEach(r => {
    if (r.estimatedValue !== null && r.estimatedValue > 0) {
      estimatedOpportunityValue += r.estimatedValue;
    }
    if (r.actualValue !== null && r.actualValue > 0) {
      actualOutcomeValue += r.actualValue;
    }

    if (r.status === 'IN_PROGRESS') {
      inProgressCount++;
    } else if (r.status === 'COMPLETED' || r.status === 'WON' || r.status === 'LOST') {
      completedActions++;
    }

    if (r.status === 'WON' || r.outcome === 'WON') {
      wonOpportunities++;
    } else if (r.status === 'LOST' || r.outcome === 'LOST') {
      lostOpportunities++;
    }
  });

  // Action Completion Rate = Completed / Eligible * 100 (Section 14)
  const actionCompletionRate = totalActions > 0
    ? Number(((completedActions / totalActions) * 100).toFixed(1))
    : null;

  // Action Success Rate = Won / Completed Eligible * 100 (Section 15)
  const actionSuccessRate = completedActions > 0
    ? Number(((wonOpportunities / completedActions) * 100).toFixed(1))
    : null;

  // Opportunity Win Rate = Won / (Won + Lost) * 100 (Section 16)
  const closedCount = wonOpportunities + lostOpportunities;
  const opportunityWinRate = closedCount > 0
    ? Number(((wonOpportunities / closedCount) * 100).toFixed(1))
    : null;

  // Value Realization Rate = Actual / Estimated * 100 (Section 17)
  const valueRealizationRate = estimatedOpportunityValue > 0
    ? Number(((actualOutcomeValue / estimatedOpportunityValue) * 100).toFixed(1))
    : null;

  // Opportunity Achievement % (Section 12)
  const opportunityAchievementPercent = valueRealizationRate;

  // Data Sufficiency check (Section 13 & 24)
  const isDataSufficient = completedActions >= MIN_SAMPLE_SIZE;

  // Learning Confidence: 0-100 or null if sample < 5 (Section 25)
  let learningConfidence: number | null = null;
  if (isDataSufficient) {
    const base = 60;
    const sampleBonus = Math.min(25, (completedActions - MIN_SAMPLE_SIZE) * 3);
    const winConsistency = closedCount > 0 ? (wonOpportunities / closedCount >= 0.7 || wonOpportunities / closedCount <= 0.3 ? 15 : 5) : 0;
    learningConfidence = Math.min(95, Math.max(40, Math.round(base + sampleBonus + winConsistency)));
  }

  const funnel: PerformanceFunnel = {
    decisionCount: totalDecisions,
    opportunityCount: totalOpportunities,
    actionCount: totalActions,
    inProgressCount,
    completedCount: completedActions,
    wonCount: wonOpportunities,
    lostCount: lostOpportunities,
    actualValue: actualOutcomeValue,
  };

  return {
    totalDecisions,
    totalOpportunities,
    totalActions,
    completedActions,
    wonOpportunities,
    lostOpportunities,
    actualOutcomeValue,
    estimatedOpportunityValue,
    opportunityAchievementPercent,
    actionCompletionRate,
    actionSuccessRate,
    opportunityWinRate,
    valueRealizationRate,
    learningConfidence,
    isDataSufficient,
    funnel,
  };
}

/**
 * STEP 3: Action Type Effectiveness (Section 18 & 19)
 */
export function computeActionTypePerformance(
  results: PerformanceResult[]
): ActionTypePerformance[] {
  const map = new Map<string, {
    totalActions: number;
    completed: number;
    won: number;
    lost: number;
    actualValue: number;
    estimatedValue: number;
  }>();

  MONITORED_ACTION_TYPES.forEach(type => {
    map.set(type, { totalActions: 0, completed: 0, won: 0, lost: 0, actualValue: 0, estimatedValue: 0 });
  });

  results.forEach(r => {
    if (!map.has(r.actionType)) {
      map.set(r.actionType, { totalActions: 0, completed: 0, won: 0, lost: 0, actualValue: 0, estimatedValue: 0 });
    }
    const entry = map.get(r.actionType)!;
    entry.totalActions++;

    if (r.estimatedValue !== null && r.estimatedValue > 0) {
      entry.estimatedValue += r.estimatedValue;
    }
    if (r.actualValue !== null && r.actualValue > 0) {
      entry.actualValue += r.actualValue;
    }

    if (r.status === 'COMPLETED' || r.status === 'WON' || r.status === 'LOST') {
      entry.completed++;
    }
    if (r.status === 'WON' || r.outcome === 'WON') {
      entry.won++;
    } else if (r.status === 'LOST' || r.outcome === 'LOST') {
      entry.lost++;
    }
  });

  const list: ActionTypePerformance[] = [];

  map.forEach((data, actionType) => {
    const isSufficient = data.completed >= MIN_SAMPLE_SIZE;
    const closed = data.won + data.lost;
    const winRate = closed > 0 ? Number(((data.won / closed) * 100).toFixed(1)) : null;
    const completionRate = data.totalActions > 0 ? Number(((data.completed / data.totalActions) * 100).toFixed(1)) : null;
    const realizationRate = data.estimatedValue > 0 ? Number(((data.actualValue / data.estimatedValue) * 100).toFixed(1)) : null;

    list.push({
      actionType,
      label: actionType.replace(/_/g, ' '),
      totalActions: data.totalActions,
      completed: data.completed,
      won: data.won,
      lost: data.lost,
      actualValue: data.actualValue,
      estimatedValue: data.estimatedValue,
      completionRate,
      winRate,
      realizationRate,
      sampleSufficiency: isSufficient ? 'SUFFICIENT' : 'INSUFFICIENT',
    });
  });

  return list.sort((a, b) => (b.won - a.won) || (b.completed - a.completed));
}

/**
 * STEP 4: Opportunity Type Performance (Section 20)
 */
export function computeOpportunityTypePerformance(
  results: PerformanceResult[],
  opportunities: OpportunityResult[]
): OpportunityTypePerformance[] {
  const map = new Map<OpportunityType, {
    totalOpps: number;
    actionsGenerated: number;
    completed: number;
    won: number;
    lost: number;
    actualValue: number;
    estimatedValue: number;
  }>();

  LOCKED_OPPORTUNITY_TYPES.forEach(type => {
    map.set(type, { totalOpps: 0, actionsGenerated: 0, completed: 0, won: 0, lost: 0, actualValue: 0, estimatedValue: 0 });
  });

  opportunities.forEach(o => {
    if (map.has(o.opportunityType)) {
      const entry = map.get(o.opportunityType)!;
      entry.totalOpps++;
      if (o.opportunityValue !== null && o.opportunityValue > 0) {
        entry.estimatedValue += o.opportunityValue;
      }
    }
  });

  results.forEach(r => {
    if (r.opportunityType && map.has(r.opportunityType)) {
      const entry = map.get(r.opportunityType)!;
      entry.actionsGenerated++;
      if (r.actualValue !== null && r.actualValue > 0) {
        entry.actualValue += r.actualValue;
      }
      if (r.status === 'COMPLETED' || r.status === 'WON' || r.status === 'LOST') {
        entry.completed++;
      }
      if (r.status === 'WON' || r.outcome === 'WON') {
        entry.won++;
      } else if (r.status === 'LOST' || r.outcome === 'LOST') {
        entry.lost++;
      }
    }
  });

  const list: OpportunityTypePerformance[] = [];

  map.forEach((data, opportunityType) => {
    const isSufficient = data.completed >= MIN_SAMPLE_SIZE;
    const closed = data.won + data.lost;
    const winRate = closed > 0 ? Number(((data.won / closed) * 100).toFixed(1)) : null;
    const realizationRate = data.estimatedValue > 0 ? Number(((data.actualValue / data.estimatedValue) * 100).toFixed(1)) : null;

    list.push({
      opportunityType,
      label: opportunityType.replace(/_/g, ' '),
      totalOpportunities: data.totalOpps,
      actionsGenerated: data.actionsGenerated,
      completed: data.completed,
      won: data.won,
      lost: data.lost,
      actualValue: data.actualValue,
      estimatedValue: data.estimatedValue,
      winRate,
      realizationRate,
      sampleSufficiency: isSufficient ? 'SUFFICIENT' : 'INSUFFICIENT',
    });
  });

  return list;
}

/**
 * STEP 5: Salesman Execution Quality & Performance (Section 21 & 22)
 */
export function computeSalesmanExecutionPerformance(
  results: PerformanceResult[]
): SalesmanExecutionPerformance[] {
  const map = new Map<string, {
    salesmanName: string;
    actionsAssigned: number;
    actionsCompleted: number;
    won: number;
    lost: number;
    actualValue: number;
    estimatedOpportunity: number;
  }>();

  results.forEach(r => {
    const slsId = r.salesmanId || 'UNASSIGNED';
    const slsName = r.salesmanName || 'General / Belum Teralokasi';

    if (!map.has(slsId)) {
      map.set(slsId, {
        salesmanName: slsName,
        actionsAssigned: 0,
        actionsCompleted: 0,
        won: 0,
        lost: 0,
        actualValue: 0,
        estimatedOpportunity: 0,
      });
    }

    const entry = map.get(slsId)!;
    entry.actionsAssigned++;
    if (r.estimatedValue !== null && r.estimatedValue > 0) {
      entry.estimatedOpportunity += r.estimatedValue;
    }
    if (r.actualValue !== null && r.actualValue > 0) {
      entry.actualValue += r.actualValue;
    }
    if (r.status === 'COMPLETED' || r.status === 'WON' || r.status === 'LOST') {
      entry.actionsCompleted++;
    }
    if (r.status === 'WON' || r.outcome === 'WON') {
      entry.won++;
    } else if (r.status === 'LOST' || r.outcome === 'LOST') {
      entry.lost++;
    }
  });

  const list: SalesmanExecutionPerformance[] = [];

  map.forEach((data, salesmanId) => {
    const isSufficient = data.actionsCompleted >= MIN_SAMPLE_SIZE;
    const completionRate = data.actionsAssigned > 0
      ? Number(((data.actionsCompleted / data.actionsAssigned) * 100).toFixed(1))
      : null;
    const closed = data.won + data.lost;
    const opportunityWinRate = closed > 0
      ? Number(((data.won / closed) * 100).toFixed(1))
      : null;
    const realizationRate = data.estimatedOpportunity > 0
      ? Number(((data.actualValue / data.estimatedOpportunity) * 100).toFixed(1))
      : null;

    let executionQualityLabel: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    if (isSufficient && opportunityWinRate !== null) {
      if (opportunityWinRate >= 70 && (completionRate || 0) >= 60) {
        executionQualityLabel = 'EXCELLENT';
      } else if (opportunityWinRate >= 45) {
        executionQualityLabel = 'GOOD';
      } else {
        executionQualityLabel = 'NEEDS_IMPROVEMENT';
      }
    }

    list.push({
      salesmanId,
      salesmanName: data.salesmanName,
      actionsAssigned: data.actionsAssigned,
      actionsCompleted: data.actionsCompleted,
      completionRate,
      won: data.won,
      lost: data.lost,
      actualValue: data.actualValue,
      estimatedOpportunity: data.estimatedOpportunity,
      realizationRate,
      opportunityWinRate,
      executionQualityLabel,
      sampleSufficiency: isSufficient ? 'SUFFICIENT' : 'INSUFFICIENT',
    });
  });

  return list.sort((a, b) => (b.won - a.won) || (b.actualValue - a.actualValue));
}

/**
 * STEP 6: Learning Signals Generation (Section 23, 24, 25, 26)
 * Detects POSITIVE, NEGATIVE, or NEUTRAL patterns strictly from actual completed actions.
 */
export function synthesizeLearningSignals(
  actionTypePerformances: ActionTypePerformance[],
  opportunityTypePerformances: OpportunityTypePerformance[],
  salesmanPerformances: SalesmanExecutionPerformance[],
  period: string = 'SEPTEMBER 2026'
): LearningSignal[] {
  const signals: LearningSignal[] = [];

  // 1. Action Type Signals
  actionTypePerformances.forEach(at => {
    if (at.completed === 0) return;

    let signalType: LearningSignalType = 'NEUTRAL';
    let confidence: number | null = null;
    let confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_SAMPLE' | 'N/A' = 'INSUFFICIENT_SAMPLE';

    if (at.completed < MIN_SAMPLE_SIZE) {
      confidenceLabel = 'INSUFFICIENT_SAMPLE';
      signalType = 'NEUTRAL';
    } else {
      if (at.winRate !== null && at.winRate >= 70) {
        signalType = 'POSITIVE';
        confidence = Math.min(95, 70 + (at.completed - MIN_SAMPLE_SIZE) * 3);
        confidenceLabel = confidence >= 85 ? 'HIGH' : 'MEDIUM';
      } else if (at.winRate !== null && at.winRate <= 30) {
        signalType = 'NEGATIVE';
        confidence = Math.min(90, 65 + (at.completed - MIN_SAMPLE_SIZE) * 3);
        confidenceLabel = confidence >= 80 ? 'HIGH' : 'MEDIUM';
      } else {
        signalType = 'NEUTRAL';
        confidence = 60;
        confidenceLabel = 'MEDIUM';
      }
    }

    const evidence: string[] = [
      `Total Tindakan: ${at.totalActions} aksi`,
      `Selesai Dieksekusi: ${at.completed} aksi (Tingkat Selesai: ${at.completionRate !== null ? at.completionRate + '%' : 'N/A'})`,
      `Hasil Tercapai (WON): ${at.won} | Tidak Tercapai (LOST): ${at.lost}`,
      `Total Nilai Realisasi: ${formatRupiah(at.actualValue)}`,
    ];

    if (at.completed < MIN_SAMPLE_SIZE) {
      evidence.push(`Catatan Kecukupan Sampel: Belum memenuhi ambang batas minimum ${MIN_SAMPLE_SIZE} tindakan selesai untuk validitas sinyal.`);
    }

    signals.push({
      id: `sig-act-${at.actionType}`,
      actionType: at.actionType,
      entityType: 'OUTLET',
      signalType,
      positiveCount: at.won,
      negativeCount: at.lost,
      totalCompleted: at.completed,
      actualValue: at.actualValue,
      winRate: at.winRate,
      realizationRate: at.realizationRate,
      confidence,
      confidenceLabel,
      period,
      evidence,
      recommendationNotes: signalType === 'POSITIVE'
        ? `Tindakan ${at.label} menunjukkan efektivitas tinggi (${at.winRate}% WON). Direkomendasikan sebagai prioritas intervensi serupa.`
        : signalType === 'NEGATIVE'
        ? `Tindakan ${at.label} memiliki tingkat konversi rendah (${at.winRate}% WON). Evaluasi kendala lapangan atau tinjau kriteria kelayakan target.`
        : `Data hasil observasi ${at.label} masih dalam pengumpulan (${at.completed}/${MIN_SAMPLE_SIZE} sampel).`,
    });
  });

  return signals;
}

/**
 * Filter Performance Results by User Role
 */
export function filterPerformanceResultsByRole(
  results: PerformanceResult[],
  userProfile?: UserProfile
): PerformanceResult[] {
  if (!userProfile) return results;
  const role = userProfile.role;

  if (role === 'ADMIN' || role === 'SUPERVISOR' || role === 'MANAGER') {
    return results;
  }

  if (role === 'SALESMAN') {
    const slsId = userProfile.salesman_id || userProfile.id;
    const slsName = (userProfile.name || userProfile.full_name || '').toUpperCase();
    return results.filter(r => {
      if (r.salesmanId && r.salesmanId === slsId) return true;
      if (r.salesmanName && r.salesmanName.toUpperCase().includes(slsName)) return true;
      return false;
    });
  }

  return results;
}
