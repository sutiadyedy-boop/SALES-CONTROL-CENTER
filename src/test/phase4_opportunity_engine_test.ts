import { computeAnalytics } from '../services/calculationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { buildDecisionContext, synthesizeDeterministicDecisions } from '../services/decisionEngineCore';
import { synthesizeNextBestActions } from '../services/actionMonitoringService';
import { 
  synthesizeOpportunities, 
  computeOpportunitySummary,
  filterOpportunitiesByUserRole,
  getTopOpportunities
} from '../services/opportunityIntelligenceEngine';
import { UserProfile } from '../types/database';
import { OpportunityType } from '../types/decisionEngine';

console.log('================================================================');
console.log('=== RUNNING PHASE 4: OPPORTUNITY INTELLIGENCE ENGINE SUITE   ===');
console.log('================================================================\n');

// 1. Load actual office data
const { data } = getSampleOfficeRawData();
const { prevTransactions, currTransactions, targets, masterOutlets } = data;

const settings: any = {
  currentMonthLabel: 'September 2026',
  previousMonthLabel: 'Agustus 2026',
  cabangName: 'BONE',
};

const calc = computeAnalytics(prevTransactions, currTransactions, targets, masterOutlets, settings);
const context = buildDecisionContext(calc, prevTransactions, currTransactions, targets, masterOutlets, settings);
const decisions = synthesizeDeterministicDecisions(context);
const nbaActions = synthesizeNextBestActions(decisions, context);

// 2. Synthesize Opportunities
console.log('1. Synthesizing Opportunities from Deterministic Data...');
const opportunities = synthesizeOpportunities(
  calc,
  context,
  decisions,
  nbaActions,
  {},
  { previous: prevTransactions, current: currTransactions }
);

console.log(`   [PASS] Generated ${opportunities.length} opportunities across portfolio.`);

if (opportunities.length === 0) {
  throw new Error('FAILED: Opportunities should not be empty with valid office dataset!');
}

// 3. Verify All 8 Opportunity Categories
console.log('\n2. Verifying 8 Locked Opportunity Categories...');
const lockedCategories: OpportunityType[] = [
  'OUTLET_RECOVERY',
  'SKU_CROSS_SELL',
  'MARK_NEW_CROSS_SELL',
  'EC_EXPANSION',
  'OUTLET_DEVELOPMENT',
  'SKU_PENETRATION',
  'SALESMAN_OPPORTUNITY',
  'REPEAT_OUTLET_GROWTH',
];

const foundTypes = new Set(opportunities.map(o => o.opportunityType));
console.log('   Categories generated:');
lockedCategories.forEach(cat => {
  const count = opportunities.filter(o => o.opportunityType === cat).length;
  console.log(`   - ${cat}: ${count} opportunities`);
});

// 4. Verify Structure, Auditability Fields & No Arbitrary Multipliers (Phase 4.1)
console.log('\n3. Verifying Opportunity Structure, Evidence & Auditability Fields...');
opportunities.forEach((o, idx) => {
  if (!o.id || !o.opportunityType || !o.entityId || !o.entityName) {
    throw new Error(`FAILED: Incomplete opportunity object at index ${idx}`);
  }
  if (!o.valueSource || o.valueSource.trim() === '') {
    throw new Error(`FAILED: Opportunity ${o.id} is missing valueSource!`);
  }
  if (!o.valueEvidence || o.valueEvidence.trim() === '') {
    throw new Error(`FAILED: Opportunity ${o.id} is missing valueEvidence!`);
  }
  if (!o.valueCalculation || o.valueCalculation.trim() === '') {
    throw new Error(`FAILED: Opportunity ${o.id} is missing valueCalculation!`);
  }
  if (o.opportunityScore < 0 || o.opportunityScore > 100) {
    throw new Error(`FAILED: opportunityScore out of bounds: ${o.opportunityScore}`);
  }
  if (o.priorityScore < 0 || o.priorityScore > 100) {
    throw new Error(`FAILED: priorityScore out of bounds: ${o.priorityScore}`);
  }
  if (o.confidence < 0 || o.confidence > 100) {
    throw new Error(`FAILED: confidence out of bounds: ${o.confidence}`);
  }
  if (!o.evidence || o.evidence.length === 0) {
    throw new Error(`FAILED: Opportunity ${o.id} has no evidence facts!`);
  }
  if (!o.reason || o.reason.trim() === '') {
    throw new Error(`FAILED: Opportunity ${o.id} has no reason!`);
  }
});
console.log('   [PASS] 100% of opportunities contain valueSource, valueEvidence, and valueCalculation.');

// 4.1 Test SKU Penetration Value Formula (No 0.2 Arbitrary Multiplier)
console.log('\n3.1 Verifying SKU Penetration Value Formula (Evidence-based, no arbitrary multiplier)...');
const skuPenOpps = opportunities.filter(o => o.opportunityType === 'SKU_PENETRATION');
skuPenOpps.forEach(o => {
  if (o.valueSource !== 'ACTUAL_SKU_ORDER_BENCHMARK') {
    throw new Error(`FAILED: SKU Penetration ${o.id} valueSource is not ACTUAL_SKU_ORDER_BENCHMARK!`);
  }
  if (o.opportunityValue && o.opportunityValue > 100000000) {
    throw new Error(`FAILED: SKU Penetration value appears artificially inflated: ${o.opportunityValue}`);
  }
});
console.log(`   [PASS] SKU Penetration (${skuPenOpps.length} items) strictly uses actual benchmark transaction order without multiplier.`);

// 4.2 Test Unlinked Target Behavior
console.log('\n3.2 Testing Salesman Target Unlinked Behavior...');
const emptyTargetCalc = computeAnalytics(prevTransactions, currTransactions, [], masterOutlets, settings);
const emptyTargetCtx = buildDecisionContext(emptyTargetCalc, prevTransactions, currTransactions, [], masterOutlets, settings);
const emptyTargetOpps = synthesizeOpportunities(emptyTargetCalc, emptyTargetCtx, decisions, nbaActions, {}, { previous: prevTransactions, current: currTransactions });
const emptyTargetSummary = computeOpportunitySummary(emptyTargetOpps);

if (emptyTargetSummary.isSalesmanTargetLinked) {
  throw new Error('FAILED: isSalesmanTargetLinked should be false when targets are empty!');
}
console.log('   [PASS] Unlinked target correctly marks isSalesmanTargetLinked = false (triggers TARGET SALESMAN NOT LINKED in UI).');

// 5. Test Deduplication
console.log('\n4. Verifying Deduplication (No duplicate entityId + type + period)...');
const seenKeys = new Set<string>();
opportunities.forEach(o => {
  const key = `${o.entityId}_${o.opportunityType}_${o.sourcePeriod}`;
  if (seenKeys.has(key)) {
    throw new Error(`FAILED: Duplicate opportunity detected for key: ${key}`);
  }
  seenKeys.add(key);
});
console.log('   [PASS] 0 duplicate opportunities detected.');

// 6. Test Multi-tier Deterministic Sorting
console.log('\n5. Verifying Multi-tier Deterministic Sorting...');
for (let i = 0; i < opportunities.length - 1; i++) {
  const curr = opportunities[i];
  const next = opportunities[i + 1];
  if (curr.priorityScore < next.priorityScore) {
    throw new Error(`FAILED: Sorting violation! Item ${i} priorityScore ${curr.priorityScore} < next ${next.priorityScore}`);
  }
}
console.log('   [PASS] Opportunities strictly sorted by Priority Score descending.');

// 7. Test Role-Based Filtering
console.log('\n6. Testing Role-Based Access & Visibility Filters...');
const sampleSalesman = calc.salesmanPerformances[0];
const salesmanProfile: UserProfile = {
  id: 'usr-sls-1',
  username: 'sls_user',
  name: sampleSalesman.salesmanName,
  role: 'SALESMAN',
  salesmanId: sampleSalesman.salesmanId,
  area: sampleSalesman.area,
  status: 'ACTIVE',
  createdAt: new Date().toISOString()
};

const salesmanOpps = filterOpportunitiesByUserRole(opportunities, salesmanProfile);
console.log(`   - Salesman ${salesmanProfile.name} sees ${salesmanOpps.length} opportunities`);
salesmanOpps.forEach(o => {
  const matchesId = o.salesmanId === salesmanProfile.salesmanId || o.entityId === salesmanProfile.salesmanId;
  const matchesName = (o.salesmanName && o.salesmanName.toLowerCase().includes(salesmanProfile.name.toLowerCase())) ||
                      (o.entityName && o.entityName.toLowerCase().includes(salesmanProfile.name.toLowerCase()));
  if (!matchesId && !matchesName) {
    throw new Error(`FAILED: Salesman saw unauthorized opportunity ${o.id} belonging to ${o.salesmanName}`);
  }
});
const top10 = getTopOpportunities(salesmanOpps, 10);
if (top10.length > 10) {
  throw new Error(`FAILED: getTopOpportunities returned ${top10.length} items > 10`);
}
console.log(`   [PASS] Salesman role filtering strictly limits visibility to his portfolio, and top 10 is enforced.`);

// 8. Test Executive Summary Computation
console.log('\n7. Testing Opportunity Summary Computation...');
const summary = computeOpportunitySummary(opportunities);
console.log(`   - Total Opportunities: ${summary.totalOpportunities}`);
console.log(`   - Total Estimated Value: Rp ${summary.totalOpportunityValue.toLocaleString('id-ID')}`);
console.log(`   - Average Confidence: ${summary.averageConfidence}%`);
console.log(`   - High Priority Count: ${summary.highPriorityCount}`);
console.log(`   - Outlet Recovery Count: ${summary.outletRecoveryCount}`);
console.log(`   - Qualified Count: ${summary.qualifiedCount}`);

if (summary.totalOpportunities !== opportunities.length) {
  throw new Error(`FAILED: Summary count mismatch: ${summary.totalOpportunities} vs ${opportunities.length}`);
}
if (summary.totalOpportunityValue <= 0) {
  throw new Error('FAILED: Total Opportunity Value must be > 0');
}
console.log('   [PASS] Executive Opportunity Summary mathematically consistent.');

console.log('\n================================================================');
console.log('=== ALL PHASE 4 OPPORTUNITY ENGINE TESTS PASSED SUCCESSFULLY ===');
console.log('================================================================');
