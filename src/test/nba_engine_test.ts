import { 
  synthesizeNextBestActions, 
  filterActionsByUserRole, 
  getTopActionsPerSalesman,
  computeNextBestActionSummary, 
  computeNextBestActionFunnel,
  mapScoreToPriority
} from '../services/nextBestActionEngine';
import { DecisionResult, DecisionContext } from '../types/decisionEngine';
import { UserProfile } from '../types/database';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`   [PASS] ${message}`);
}

console.log('====================================================');
console.log(' RUNNING PHASE 3 NEXT BEST ACTION (NBA) TEST SUITE  ');
console.log('====================================================\n');

// 1. Priority mapping test
console.log('1. Testing Priority Mapping (Section 11)...');
assert(mapScoreToPriority(95) === 'CRITICAL', 'Score 95 correctly maps to CRITICAL (81–100)');
assert(mapScoreToPriority(75) === 'HIGH', 'Score 75 correctly maps to HIGH (61–80)');
assert(mapScoreToPriority(50) === 'MEDIUM', 'Score 50 correctly maps to MEDIUM (41–60)');
assert(mapScoreToPriority(30) === 'LOW', 'Score 30 correctly maps to LOW (21–40)');
assert(mapScoreToPriority(15) === 'MONITOR', 'Score 15 correctly maps to MONITOR (0–20)');

// 2. TEST CASE 1: DROP OUTLET + HIGH PRIORITY -> REACTIVATE_OUTLET
console.log('\n2. TEST CASE 1: DROP OUTLET + HIGH PRIORITY...');
const dropDecision: DecisionResult = {
  id: 'dec-drop-toko-yasir',
  category: 'DROP_OUTLET_RECOVERY',
  entityType: 'OUTLET',
  entityId: 'OUT-001',
  entityName: 'Toko Pak Yasir',
  priorityScore: 78,
  riskScore: 85,
  opportunityScore: 70,
  status: 'HIGH',
  riskStatus: 'HIGH',
  what: 'Toko Pak Yasir mengalami drop',
  why: 'Outlet DROP dengan historical VALUE tinggi',
  impact: 'Kehilangan potensi omset Rp 17.112.082',
  recommendedAction: 'Kunjungi segera dan tawarkan reorder stimulus',
  expectedImpact: 'Historical VALUE menunjukkan potensi recovery sebesar Rp 17.112.082',
  expectedRevenueLift: 17112082,
  evidence: ['Nilai Agustus: Rp 17.112.082', 'Nilai September: Rp 0'],
  confidence: 0.95,
  sourcePeriod: 'SEPTEMBER 2026',
  assignedSalesmanId: 'SLS-101',
  assignedSalesmanName: 'Suherman',
  generatedAt: new Date().toISOString(),
  engineVersion: 'v1.0-deterministic',
};

const actionsDrop = synthesizeNextBestActions([dropDecision], null);
assert(actionsDrop.length === 1, 'Exactly 1 action generated for Drop Outlet');
assert(actionsDrop[0].actionType === 'REACTIVATE_OUTLET', 'Action Type is REACTIVATE_OUTLET');
assert(actionsDrop[0].priority === 'HIGH', 'Action Priority is HIGH');
assert(actionsDrop[0].who.includes('Suherman'), 'WHO correctly assigns Salesman Suherman');
assert(actionsDrop[0].where.includes('Toko Pak Yasir'), 'WHERE correctly targets Toko Pak Yasir');
assert(actionsDrop[0].expectedImpact.includes('Historical VALUE menunjukkan potensi recovery'), 'Expected Impact uses non-guaranteed benchmark phrasing');
assert(actionsDrop[0].expectedRevenueReference === 17112082, 'Expected revenue reference accurately matches historical value');

// 3. TEST CASE 2: SKU CROSS-SELL OPPORTUNITY -> CROSS_SELL_SKU
console.log('\n3. TEST CASE 2: SKU CROSS-SELL OPPORTUNITY...');
const skuDecision: DecisionResult = {
  id: 'dec-sku-cross-sell',
  category: 'SKU_OPPORTUNITY',
  entityType: 'SKU',
  entityId: 'SKU-CSD',
  entityName: 'CSD-E02K',
  priorityScore: 68,
  riskScore: 40,
  opportunityScore: 88,
  status: 'HIGH',
  riskStatus: 'LOW',
  what: 'Cross-sell opportunity CSD-E02K pada outlet reguler',
  why: 'Outlet telah membeli SKU A namun belum membeli CSD-E02K',
  impact: 'Potensi penambahan revenue per toko',
  recommendedAction: 'Tawarkan CSD-E02K pada Call Plan pekan ini',
  expectedImpact: 'Peningkatan penetrasi SKU CSD-E02K',
  expectedRevenueLift: 5000000,
  evidence: ['64 outlet aktif belum order SKU CSD-E02K'],
  confidence: 0.90,
  sourcePeriod: 'SEPTEMBER 2026',
  generatedAt: new Date().toISOString(),
  engineVersion: 'v1.0-deterministic',
};

const actionsSku = synthesizeNextBestActions([skuDecision], null);
assert(actionsSku[0].actionType === 'CROSS_SELL_SKU', 'Action Type is CROSS_SELL_SKU');
assert(actionsSku[0].what.includes('Tawarkan SKU'), 'WHAT accurately prescribes offering complementary SKU');

// 4. TEST CASE 3: MARK NEW OPPORTUNITY -> PUSH_MARK_NEW
console.log('\n4. TEST CASE 3: MARK NEW OPPORTUNITY...');
const markNewDecision: DecisionResult = {
  id: 'dec-mark-new-opp',
  category: 'MARK_NEW_OPPORTUNITY',
  entityType: 'MARK_NEW',
  entityId: 'MN-PROGRAM',
  entityName: 'MARK NEW ECERAN',
  priorityScore: 72,
  riskScore: 30,
  opportunityScore: 90,
  status: 'HIGH',
  riskStatus: 'LOW',
  what: 'Celah penetrasi program MARK NEW',
  why: 'Peluang cross-sell MARK NEW pada outlet reguler',
  impact: 'Potensi omset eceran tambahan',
  recommendedAction: 'Prioritaskan penawaran MARK NEW',
  expectedImpact: 'Perluasan outlet terdaftar paket MARK NEW',
  expectedRevenueLift: 8000000,
  evidence: ['Penjualan MARK NEW saat ini Rp 4.250.000'],
  confidence: 0.88,
  sourcePeriod: 'SEPTEMBER 2026',
  generatedAt: new Date().toISOString(),
  engineVersion: 'v1.0-deterministic',
};

const actionsMarkNew = synthesizeNextBestActions([markNewDecision], null);
assert(actionsMarkNew[0].actionType === 'PUSH_MARK_NEW', 'Action Type is PUSH_MARK_NEW');

// 5. TEST CASE 4: EC RISK -> IMPROVE_EC
console.log('\n5. TEST CASE 4: EC RISK...');
const ecDecision: DecisionResult = {
  id: 'dec-ec-risk',
  category: 'EC_RISK',
  entityType: 'EC',
  entityId: 'EC-CABANG',
  entityName: 'EC CABANG BONE',
  priorityScore: 82,
  riskScore: 88,
  opportunityScore: 50,
  status: 'CRITICAL',
  riskStatus: 'CRITICAL',
  what: 'Penurunan jumlah toko bertransaksi (EC)',
  why: 'EC turun dari 75 menjadi 64 toko aktif',
  impact: 'Penyusutan jangkauan distribusi aktif',
  recommendedAction: 'Audit toko pasif dan amankan transaksi',
  expectedImpact: 'Reaktivasi minimal 11 toko',
  evidence: ['EC Agustus: 75 toko', 'EC September: 64 toko', 'EC Growth: -14.67%'],
  confidence: 0.95,
  sourcePeriod: 'SEPTEMBER 2026',
  generatedAt: new Date().toISOString(),
  engineVersion: 'v1.0-deterministic',
};

const actionsEc = synthesizeNextBestActions([ecDecision], null);
assert(actionsEc[0].actionType === 'IMPROVE_EC', 'Action Type is IMPROVE_EC');
assert(actionsEc[0].priority === 'CRITICAL', 'Action Priority is CRITICAL');

// 6. TEST CASE 5: HIGH ACHIEVEMENT + NEGATIVE EC GROWTH -> Salesman Attention Action
console.log('\n6. TEST CASE 5: HIGH ACHIEVEMENT + NEGATIVE EC GROWTH...');
const salesmanDecision: DecisionResult = {
  id: 'dec-sls-hidden-risk',
  category: 'SALESMAN_PRODUCTIVITY',
  entityType: 'SALESMAN',
  entityId: 'SLS-102',
  entityName: 'Andi Sales',
  priorityScore: 74,
  riskScore: 70,
  opportunityScore: 40,
  status: 'HIGH',
  riskStatus: 'HIGH',
  what: 'Kinerja Salesman Andi Sales',
  why: 'Achievement tinggi tetapi momentum melemah akibat penurunan toko aktif',
  impact: 'Ketergantungan sempit pada segelintir toko besar',
  recommendedAction: 'Dampingi rute kunjungan dan pulihkan EC',
  expectedImpact: 'Pengamanan kesinambungan omset jangka panjang',
  evidence: ['Achievement: 108%', 'EC Growth: -8.5%', 'Drop Outlets: 4 toko'],
  confidence: 0.92,
  sourcePeriod: 'SEPTEMBER 2026',
  assignedSalesmanId: 'SLS-102',
  assignedSalesmanName: 'Andi Sales',
  generatedAt: new Date().toISOString(),
  engineVersion: 'v1.0-deterministic',
};

const mockContext: DecisionContext = {
  period: 'SEPTEMBER 2026',
  previousPeriod: 'AGUSTUS 2026',
  salesSummary: { totalTarget: 1000000, currentValue: 1080000, previousValue: 900000, gap: 80000, achievementRate: 108, growthRate: 20 },
  ecSummary: { ecCurrent: 20, ecPrevious: 25, ecGrowth: -20, newEc: 2, lostEc: 7, repeatEc: 18 },
  outletSummary: { totalActiveOutlets: 30, transactedOutlets: 20, untransactedOutlets: 10, repeatOrderRate: 66.7, dropOutletsCount: 4, dropOutletsLostRevenue: 15000000, newOutletsCount: 2, newOutletsRevenue: 3000000 },
  skuSummary: { totalSkus: 10, activeSkus: 8, winnerCount: 3, decliningCount: 2, underPenetratedCount: 3, crossSellCount: 2, items: [] },
  markNewSummary: { markNewValue: 2000000, markNewEc: 10, markNewGrowth: 5, markNewContributionPct: 5, markNewSkuCount: 2, crossSellOpportunitiesCount: 4, items: [] },
  salesmanDecisions: [{
    salesmanId: 'SLS-102',
    salesmanName: 'Andi Sales',
    target: 50000000,
    actualValue: 54000000,
    previousValue: 45000000,
    achievementRate: 108,
    gap: 4000000,
    growthRate: 20,
    ecCurrent: 20,
    ecPrevious: 25,
    ecGrowth: -20,
    dropOutletCount: 4,
    newOutletCount: 2,
    markNewValue: 2000000,
    riskScore: 70,
    opportunityScore: 40,
    priorityScore: 74,
  }],
  outletRecoveryList: [],
  snapshotTimestamp: new Date().toISOString(),
};

const actionsSalesman = synthesizeNextBestActions([salesmanDecision], mockContext);
assert(actionsSalesman[0].actionType === 'FOLLOW_UP_HIGH_PRIORITY_SALESMAN', 'High achievement with negative EC triggers FOLLOW_UP_HIGH_PRIORITY_SALESMAN');
assert(actionsSalesman[0].why.includes('momentum melemah'), 'Root cause correctly identifies hidden momentum risk');

// 7. TEST CASE 6: Existing PENDING action + same entity + same action type + same period -> NO DUPLICATE
console.log('\n7. TEST CASE 6: DUPLICATION PREVENTION (Section 23)...');
const duplicateDecisions = [dropDecision, { ...dropDecision, id: 'dec-drop-toko-yasir-duplicate' }];
const deduplicatedActions = synthesizeNextBestActions(duplicateDecisions, null);
assert(deduplicatedActions.length === 1, 'Duplicate decision for same entity + actionType + period successfully deduplicated to 1 active action');

// 8. TEST CASE 7: Insufficient evidence -> MONITOR / NOT ENOUGH DATA (Section 22)
console.log('\n8. TEST CASE 7: INSUFFICIENT EVIDENCE SAFETY...');
const weakDecision: DecisionResult = {
  id: 'dec-weak-evidence',
  category: 'REVENUE_GAP',
  entityType: 'OUTLET',
  entityId: 'OUT-999',
  entityName: 'Toko Tanpa Bukti',
  priorityScore: 12,
  riskScore: 10,
  opportunityScore: 15,
  status: 'MONITOR',
  riskStatus: 'VERY_LOW',
  what: 'Observasi umum',
  why: 'Data historis minim',
  impact: 'N/A',
  recommendedAction: 'Observasi',
  expectedImpact: 'N/A',
  evidence: [], // empty evidence
  confidence: 0.1, // low confidence
  sourcePeriod: 'SEPTEMBER 2026',
  generatedAt: new Date().toISOString(),
  engineVersion: 'v1.0-deterministic',
};

const actionsWeak = synthesizeNextBestActions([weakDecision], null);
assert(actionsWeak[0].actionType === 'MONITOR', 'Insufficient evidence correctly maps to MONITOR');
assert(actionsWeak[0].why.includes('Data pendukung belum mencukupi'), 'Prescribes data insufficiency guardrail');

// 9. Role-based filtering test (Section 32)
console.log('\n9. Testing Role-Based Filtering (Section 32)...');
const combinedActions = [...actionsDrop, ...actionsSku, ...actionsSalesman];

const salesmanUser: UserProfile = {
  id: 'usr-sls-101',
  username: 'suherman',
  name: 'Suherman',
  role: 'SALESMAN',
  status: 'ACTIVE',
  salesmanId: 'SLS-101',
  createdAt: '',
  updatedAt: '',
};

const adminUser: UserProfile = {
  id: 'usr-admin',
  username: 'admin',
  name: 'Administrator',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
};

const filteredForSalesman = filterActionsByUserRole(combinedActions, salesmanUser);
assert(filteredForSalesman.every(a => a.salesmanId === 'SLS-101' || a.salesmanName === 'Suherman'), 'Salesman only sees actions assigned to him');

const filteredForAdmin = filterActionsByUserRole(combinedActions, adminUser);
assert(filteredForAdmin.length === combinedActions.length, 'Admin sees all actions across all salesmen');

// 10. Multi-Tier Sorting & Top 10 Limit Test (Section 12 & 24)
console.log('\n10. Testing Multi-Tier Sorting & Top 10 per Salesman (Section 12 & 24)...');
const top10 = getTopActionsPerSalesman(combinedActions, undefined, 2);
assert(top10.length === 2, 'Top limit correctly respects max requested actions count');
assert(top10[0].priorityScore >= top10[1].priorityScore, 'Sorted strictly by Priority Score descending');

// 11. Funnel & Summary Computation (Section 25, 26, 27)
console.log('\n11. Testing Funnel & Effectiveness Metrics...');
const summaryMetrics = computeNextBestActionSummary(combinedActions);
assert(summaryMetrics.totalActions === combinedActions.length, 'Summary total actions accurate');
assert(summaryMetrics.successRate === null, 'Success rate is null when completed count < 3 (prevents premature metric distortion)');

const funnelMetrics = computeNextBestActionFunnel(10, combinedActions);
assert(funnelMetrics.decisionsTotal === 10, 'Decisions total in funnel matches input');
assert(funnelMetrics.actionsTotal === combinedActions.length, 'Actions total in funnel matches generated actions');

// 12. Forecast Absence Verification (Section 28)
console.log('\n12. Verifying Total Forecast Absence (Section 28)...');
combinedActions.forEach(a => {
  assert(!a.actionDescription.includes('Forecast EOM'), 'Action description contains NO Forecast EOM');
  assert(!a.actionDescription.includes('Forecast Achievement'), 'Action description contains NO Forecast Achievement');
  assert(!a.expectedImpact.includes('Forecast Closing'), 'Expected impact contains NO Forecast Closing');
});
assert(true, 'Zero forecast traces verified across all generated actions.');

console.log('\n====================================================');
console.log(' ALL NEXT BEST ACTION TEST CASES PASSED (100%) !   ');
console.log('====================================================');
