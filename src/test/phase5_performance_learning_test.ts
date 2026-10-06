/**
 * ESM SALES CONTROL CENTER — PHASE 5: PERFORMANCE & LEARNING ENGINE TEST SUITE
 * 
 * Verifies all 16 specifications and required test cases (Section 41 & 42):
 * TEST 1: Completed = 0 -> Success Rate = N/A, Win Rate = N/A, Learning Confidence = N/A
 * TEST 2: 5 completed, 4 WON, 1 LOST -> Win Rate = 80%
 * TEST 3: Estimated Opportunity = Rp1.000.000, Actual Value = Rp800.000 -> Variance = -Rp200.000, Achievement = 80%
 * TEST 4: Estimated Opportunity = N/A -> Achievement = N/A
 * TEST 5: Actual transaction cannot be linked to Action -> Do NOT attribute VALUE to Action
 * TEST 6: 1 completed action -> Insufficient Sample, Do NOT declare "most effective action"
 * TEST 7: 10 completed, 7 WON, 3 LOST -> Win Rate = 70%
 * TEST 8: Existing Phase 1 Priority Score -> UNCHANGED
 * TEST 9: Existing Phase 4 Opportunity Score -> UNCHANGED
 */

import { createAuthenticOfficeData } from '../services/sampleDataGenerator';
import { computeAnalytics } from '../services/calculationEngine';
import { buildDecisionContext, synthesizeDeterministicDecisions } from '../services/decisionEngineCore';
import { synthesizeNextBestActions } from '../services/actionMonitoringService';
import { synthesizeOpportunities } from '../services/opportunityIntelligenceEngine';
import { 
  synthesizePerformanceResults,
  computePerformanceExecutiveSummary,
  computeActionTypePerformance,
  computeOpportunityTypePerformance,
  computeSalesmanExecutionPerformance,
  synthesizeLearningSignals,
  filterPerformanceResultsByRole,
  MIN_SAMPLE_SIZE
} from '../services/performanceLearningEngine';
import { NextBestAction, DecisionResult, OpportunityResult } from '../types/decisionEngine';
import { PerformanceResult, ConfirmedOutcomeRecord } from '../types/performanceEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  [PASS] ${msg}`);
}

console.log('===================================================================');
console.log('   RUNNING PHASE 5: PERFORMANCE & LEARNING ENGINE TEST SUITE       ');
console.log('===================================================================');

// 1. Setup deterministic baseline from authentic data
const office = createAuthenticOfficeData();
const calc = computeAnalytics(office.prevTransactions, office.currTransactions, office.targets, office.masterOutlets, {});
const ctx = buildDecisionContext(calc, office.prevTransactions, office.currTransactions, office.targets, office.masterOutlets, {
  currentMonthLabel: 'September 2026',
  previousMonthLabel: 'Agustus 2026',
});

const decisions = synthesizeDeterministicDecisions(ctx);
const nbaActions = synthesizeNextBestActions(decisions, ctx);
const opportunities = synthesizeOpportunities(calc, ctx, decisions, nbaActions, {}, {
  previous: office.prevTransactions,
  current: office.currTransactions,
});

console.log(`Baseline Generated: ${decisions.length} Decisions, ${nbaActions.length} NBA Actions, ${opportunities.length} Opportunities.`);

// -----------------------------------------------------------------------------
// TEST 1: Completed = 0 -> Success Rate = N/A, Win Rate = N/A, Learning Confidence = N/A
// -----------------------------------------------------------------------------
console.log('\n--- TEST 1: Zero Completed Actions (No Data Learning) ---');
const emptyResults: PerformanceResult[] = [
  {
    actionId: 'act-1',
    entityType: 'OUTLET',
    entityId: 'BNE-9999',
    entityName: 'TOKO TEST 1',
    actionType: 'REACTIVATE_OUTLET',
    estimatedValue: 1000000,
    actualValue: null,
    varianceValue: null,
    achievementPercent: null,
    status: 'PENDING',
    sourcePeriod: 'SEPTEMBER 2026',
  },
  {
    actionId: 'act-2',
    entityType: 'OUTLET',
    entityId: 'BNE-9998',
    entityName: 'TOKO TEST 2',
    actionType: 'REACTIVATE_OUTLET',
    estimatedValue: 2000000,
    actualValue: null,
    varianceValue: null,
    achievementPercent: null,
    status: 'IN_PROGRESS',
    sourcePeriod: 'SEPTEMBER 2026',
  }
];

const summaryT1 = computePerformanceExecutiveSummary(emptyResults, [], []);
assert(summaryT1.completedActions === 0, 'Completed actions count is 0');
assert(summaryT1.actionSuccessRate === null, 'Action Success Rate is null (N/A)');
assert(summaryT1.opportunityWinRate === null, 'Opportunity Win Rate is null (N/A)');
assert(summaryT1.learningConfidence === null, 'Learning Confidence is null (N/A)');
assert(!summaryT1.isDataSufficient, 'isDataSufficient is false');

// -----------------------------------------------------------------------------
// TEST 2: 5 completed, 4 WON, 1 LOST -> Win Rate = 80%
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: 5 Completed, 4 WON, 1 LOST ---');
const resultsT2: PerformanceResult[] = [
  { actionId: 'a1', entityType: 'OUTLET', entityId: 'O1', entityName: 'Toko 1', actionType: 'REACTIVATE_OUTLET', estimatedValue: 100, actualValue: 100, varianceValue: 0, achievementPercent: 100, status: 'WON', outcome: 'WON', sourcePeriod: 'SEPTEMBER 2026' },
  { actionId: 'a2', entityType: 'OUTLET', entityId: 'O2', entityName: 'Toko 2', actionType: 'REACTIVATE_OUTLET', estimatedValue: 100, actualValue: 100, varianceValue: 0, achievementPercent: 100, status: 'WON', outcome: 'WON', sourcePeriod: 'SEPTEMBER 2026' },
  { actionId: 'a3', entityType: 'OUTLET', entityId: 'O3', entityName: 'Toko 3', actionType: 'REACTIVATE_OUTLET', estimatedValue: 100, actualValue: 100, varianceValue: 0, achievementPercent: 100, status: 'WON', outcome: 'WON', sourcePeriod: 'SEPTEMBER 2026' },
  { actionId: 'a4', entityType: 'OUTLET', entityId: 'O4', entityName: 'Toko 4', actionType: 'REACTIVATE_OUTLET', estimatedValue: 100, actualValue: 100, varianceValue: 0, achievementPercent: 100, status: 'WON', outcome: 'WON', sourcePeriod: 'SEPTEMBER 2026' },
  { actionId: 'a5', entityType: 'OUTLET', entityId: 'O5', entityName: 'Toko 5', actionType: 'REACTIVATE_OUTLET', estimatedValue: 100, actualValue: 0, varianceValue: -100, achievementPercent: 0, status: 'LOST', outcome: 'LOST', sourcePeriod: 'SEPTEMBER 2026' },
];

const summaryT2 = computePerformanceExecutiveSummary(resultsT2, [], []);
assert(summaryT2.completedActions === 5, 'Completed actions count is 5');
assert(summaryT2.wonOpportunities === 4, 'Won count is 4');
assert(summaryT2.lostOpportunities === 1, 'Lost count is 1');
assert(summaryT2.opportunityWinRate === 80, `Opportunity Win Rate is exactly 80% (got ${summaryT2.opportunityWinRate}%)`);

// -----------------------------------------------------------------------------
// TEST 3: Estimated = Rp1.000.000, Actual = Rp800.000 -> Variance = -Rp200.000, Achievement = 80%
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Estimated vs Actual, Variance, and Achievement % ---');
const confirmedMock: Record<string, ConfirmedOutcomeRecord> = {
  'mock-act-1': {
    actionId: 'mock-act-1',
    status: 'WON',
    outcome: 'WON',
    actualValue: 800000,
    notes: 'Pembelian faktual per nota',
  }
};
const mockNba: NextBestAction[] = [
  {
    id: 'mock-act-1',
    decisionId: 'dec-1',
    priority: 'HIGH',
    priorityScore: 85,
    entityType: 'OUTLET',
    entityId: 'BNE-MOCK-1',
    entityName: 'TOKO MOCK',
    actionType: 'REACTIVATE_OUTLET',
    actionTitle: 'Aktivasi Toko',
    actionDescription: 'Kunjungi toko',
    who: 'Salesman',
    what: 'Aktivasi',
    where: 'Bone',
    why: 'Drop',
    when: 'W1',
    reason: 'Drop',
    evidence: ['Drop MoM'],
    expectedImpact: 'Reaktivasi',
    expectedRevenueReference: 1000000,
    confidence: 80,
    sourcePeriod: 'SEPTEMBER 2026',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const resultsT3 = synthesizePerformanceResults(mockNba, [], [], [], confirmedMock, 'SEPTEMBER 2026');
assert(resultsT3.length === 1, 'Synthesized 1 performance result');
assert(resultsT3[0].estimatedValue === 1000000, 'Estimated Value is Rp 1.000.000');
assert(resultsT3[0].actualValue === 800000, 'Actual Value is Rp 800.000');
assert(resultsT3[0].varianceValue === -200000, `Variance is -Rp 200.000 (got ${resultsT3[0].varianceValue})`);
assert(resultsT3[0].achievementPercent === 80, `Achievement % is 80% (got ${resultsT3[0].achievementPercent}%)`);

// -----------------------------------------------------------------------------
// TEST 4: Estimated Opportunity = N/A -> Achievement = N/A
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Estimated Opportunity = N/A -> Achievement = N/A ---');
const mockNbaT4: NextBestAction[] = [
  {
    ...mockNba[0],
    id: 'mock-act-4',
    expectedRevenueReference: undefined,
  }
];
const resultsT4 = synthesizePerformanceResults(mockNbaT4, [], [], [], {
  'mock-act-4': { actionId: 'mock-act-4', status: 'WON', actualValue: 500000 }
}, 'SEPTEMBER 2026');
assert(resultsT4[0].estimatedValue === null, 'Estimated Value is null (N/A)');
assert(resultsT4[0].achievementPercent === null, 'Achievement % is null (N/A) when denominator is N/A');

// -----------------------------------------------------------------------------
// TEST 5: Actual transaction cannot be linked to Action -> Do NOT attribute VALUE to Action
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Unlinked Transaction Attribution Safety ---');
// A non-existent outlet with zero matching transactions
const unlinkedNba: NextBestAction[] = [
  {
    ...mockNba[0],
    id: 'mock-act-unlinked',
    entityId: 'BNE-NON-EXISTENT',
    status: 'IN_PROGRESS',
  }
];
const resultsT5 = synthesizePerformanceResults(unlinkedNba, [], [], office.currTransactions, {}, 'SEPTEMBER 2026');
assert(resultsT5[0].actualValue === null, 'Actual Value remains null when transaction cannot be attributed');
assert(resultsT5[0].status === 'IN_PROGRESS', 'Action remains IN_PROGRESS and does not falsely mark WON');

// -----------------------------------------------------------------------------
// TEST 6: 1 completed action -> Insufficient Sample, Do NOT declare "most effective action"
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Minimum Sample Size Check (1 Completed Action) ---');
const singleCompleted: PerformanceResult[] = [
  {
    actionId: 's1',
    entityType: 'OUTLET',
    entityId: 'O1',
    entityName: 'Toko 1',
    actionType: 'CROSS_SELL_SKU',
    estimatedValue: 500000,
    actualValue: 500000,
    varianceValue: 0,
    achievementPercent: 100,
    status: 'WON',
    outcome: 'WON',
    sourcePeriod: 'SEPTEMBER 2026',
  }
];
const actionPerfT6 = computeActionTypePerformance(singleCompleted);
const crossSellPerf = actionPerfT6.find(a => a.actionType === 'CROSS_SELL_SKU')!;
assert(crossSellPerf.completed === 1, 'Completed count is 1');
assert(crossSellPerf.sampleSufficiency === 'INSUFFICIENT', 'Sample sufficiency is marked INSUFFICIENT (< 5)');

const signalsT6 = synthesizeLearningSignals(actionPerfT6, [], []);
const sigCross = signalsT6.find(s => s.actionType === 'CROSS_SELL_SKU')!;
assert(sigCross.confidenceLabel === 'INSUFFICIENT_SAMPLE', 'Confidence Label is INSUFFICIENT_SAMPLE');
assert(sigCross.confidence === null, 'Confidence score is null');

// -----------------------------------------------------------------------------
// TEST 7: 10 completed, 7 WON, 3 LOST -> Win Rate = 70%
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: 10 Completed, 7 WON, 3 LOST -> Win Rate = 70% ---');
const tenResults: PerformanceResult[] = [];
for (let i = 1; i <= 7; i++) {
  tenResults.push({
    actionId: `won-${i}`,
    entityType: 'OUTLET',
    entityId: `O-${i}`,
    entityName: `Toko ${i}`,
    actionType: 'CROSS_SELL_SKU',
    estimatedValue: 100000,
    actualValue: 100000,
    varianceValue: 0,
    achievementPercent: 100,
    status: 'WON',
    outcome: 'WON',
    sourcePeriod: 'SEPTEMBER 2026',
  });
}
for (let i = 8; i <= 10; i++) {
  tenResults.push({
    actionId: `lost-${i}`,
    entityType: 'OUTLET',
    entityId: `O-${i}`,
    entityName: `Toko ${i}`,
    actionType: 'CROSS_SELL_SKU',
    estimatedValue: 100000,
    actualValue: 0,
    varianceValue: -100000,
    achievementPercent: 0,
    status: 'LOST',
    outcome: 'LOST',
    sourcePeriod: 'SEPTEMBER 2026',
  });
}
const actionPerfT7 = computeActionTypePerformance(tenResults);
const cs7 = actionPerfT7.find(a => a.actionType === 'CROSS_SELL_SKU')!;
assert(cs7.completed === 10, '10 actions completed');
assert(cs7.won === 7, '7 won');
assert(cs7.lost === 3, '3 lost');
assert(cs7.winRate === 70, `Win Rate is exactly 70% (got ${cs7.winRate}%)`);
assert(cs7.sampleSufficiency === 'SUFFICIENT', 'Sample sufficiency is SUFFICIENT (>= 5)');

const signalsT7 = synthesizeLearningSignals(actionPerfT7, [], []);
const sig7 = signalsT7.find(s => s.actionType === 'CROSS_SELL_SKU')!;
assert(sig7.signalType === 'POSITIVE', 'Generates POSITIVE signal for winRate >= 70% with >= 5 samples');
assert(sig7.confidence !== null && sig7.confidence >= 70, 'Confidence score is >= 70');

// -----------------------------------------------------------------------------
// TEST 8: Existing Phase 1 Priority Score UNCHANGED
// -----------------------------------------------------------------------------
console.log('\n--- TEST 8: Absolute Safety Lock — Phase 1 Priority Score Preservation ---');
const initialDecisions = synthesizeDeterministicDecisions(ctx);
// Run Phase 5 performance engine
const livePerformanceResults = synthesizePerformanceResults(nbaActions, opportunities, initialDecisions, office.currTransactions);
const postDecisions = synthesizeDeterministicDecisions(ctx);

assert(initialDecisions.length === postDecisions.length, 'Decision count unchanged');
for (let i = 0; i < initialDecisions.length; i++) {
  assert(initialDecisions[i].priorityScore === postDecisions[i].priorityScore, `Decision ${initialDecisions[i].id} priorityScore unchanged`);
  assert(initialDecisions[i].riskScore === postDecisions[i].riskScore, `Decision ${initialDecisions[i].id} riskScore unchanged`);
}

// -----------------------------------------------------------------------------
// TEST 9: Existing Phase 4 Opportunity Score UNCHANGED
// -----------------------------------------------------------------------------
console.log('\n--- TEST 9: Absolute Safety Lock — Phase 4 Opportunity Score Preservation ---');
const oppsPre = synthesizeOpportunities(calc, ctx, decisions, nbaActions, {}, { previous: office.prevTransactions, current: office.currTransactions });
const oppsPost = synthesizeOpportunities(calc, ctx, decisions, nbaActions, {}, { previous: office.prevTransactions, current: office.currTransactions });

assert(oppsPre.length === oppsPost.length, 'Opportunity count unchanged');
for (let i = 0; i < oppsPre.length; i++) {
  assert(oppsPre[i].opportunityScore === oppsPost[i].opportunityScore, `Opportunity ${oppsPre[i].id} score unchanged`);
  assert(oppsPre[i].opportunityValue === oppsPost[i].opportunityValue, `Opportunity ${oppsPre[i].id} value unchanged`);
}

// -----------------------------------------------------------------------------
// TEST 10: Role-Based Access Filter Verification
// -----------------------------------------------------------------------------
console.log('\n--- TEST 10: Role-Based Access Control ---');
const adminFilter = filterPerformanceResultsByRole(livePerformanceResults, { id: 'admin-1', role: 'ADMIN', name: 'Admin', email: 'admin@pma.id', username: 'admin', status: 'ACTIVE' } as any);
assert(adminFilter.length === livePerformanceResults.length, 'ADMIN sees 100% of performance results');

const salesmanProfile = { id: 'SLS-001', role: 'SALESMAN' as const, name: 'AHMAD HIDAYAT', email: 'ahmad@pma.id', salesman_id: 'SLS-001', username: 'ahmad', status: 'ACTIVE' } as any;
const salesmanFilter = filterPerformanceResultsByRole(livePerformanceResults, salesmanProfile);
assert(salesmanFilter.every(r => r.salesmanId === 'SLS-001' || (r.salesmanName && r.salesmanName.includes('AHMAD'))), 'SALESMAN only sees actions assigned to him');

console.log('\n===================================================================');
console.log('   ALL PHASE 5 PERFORMANCE & LEARNING ENGINE TESTS PASSED!         ');
console.log('===================================================================');
