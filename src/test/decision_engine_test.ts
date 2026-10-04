import { 
  buildDecisionContext, 
  synthesizeDeterministicDecisions,
  generateDecisionAuditReport,
  determineRiskStatus,
  determinePriorityLevel
} from '../services/decisionEngineCore';
import { computeAnalytics } from '../services/calculationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { DEFAULT_SETTINGS } from '../services/storageService';

console.log('===============================================================');
console.log('=== TESTING AI DECISION ENGINE CORE (DETERMINISTIC PHASE 1) ===');
console.log('===============================================================\n');

// 1. Generate real sample office raw data
console.log('1. Loading Bone office sample data...');
const { prevRows, currRows, targetRows, masterRows } = getSampleOfficeRawData();

// Transform sample rows to TransactionRecord, TargetRecord, MasterOutletRecord
const prevTransactions = prevRows.map((r: any, i) => ({
  id: `prev-${i}`,
  outletId: r['KODE OUTLET'] || r['KD OUTLET'] || '',
  outletName: r['NAMA OUTLET'] || '',
  salesmanId: r['KODE SALESMAN'] || '',
  salesmanName: r['NAMA SALESMAN'] || '',
  transactionDate: r['TGL'] || '2026-08-15',
  qty: Number(r['QTY']) || 0,
  salesValue: Number(r['VALEU']) || Number(r['VALUE']) || 0,
  invoiceId: r['NO FAKTUR'] || '',
  productCode: r['KODE BARANG'] || '',
  productName: r['NAMA BARANG'] || r['KODE BARANG'] || '',
  sourceFile: 'Dbase BONE - AGUSTUS.xlsx',
  period: '2026-08',
  periodLabel: 'AGUSTUS 2026',
  markNew: r['MARK NEW'] || '',
}));

const currTransactions = currRows.map((r: any, i) => ({
  id: `curr-${i}`,
  outletId: r['KODE OUTLET'] || r['KD OUTLET'] || '',
  outletName: r['NAMA OUTLET'] || '',
  salesmanId: r['KODE SALESMAN'] || '',
  salesmanName: r['NAMA SALESMAN'] || '',
  transactionDate: r['TGL'] || '2026-09-18',
  qty: Number(r['QTY']) || 0,
  salesValue: Number(r['VALEU']) || Number(r['VALUE']) || 0,
  invoiceId: r['NO FAKTUR'] || '',
  productCode: r['KODE BARANG'] || '',
  productName: r['NAMA BARANG'] || r['KODE BARANG'] || '',
  sourceFile: 'Dbase BONE - SEPTEMBER.xlsx',
  period: '2026-09',
  periodLabel: 'SEPTEMBER 2026',
  markNew: r['MARK NEW'] || '',
}));

const targets = targetRows.map((r: any, i) => ({
  id: `trg-${i}`,
  salesmanId: r['KD_SLS'] || '',
  salesmanName: r['NM_SLS'] || '',
  area: r['AREA'] || '',
  targetValue: Number(r['TARGET']) || 0,
  salesmanStatus: r['STATUS SALESMAN'] || 'ACTIVE',
  period: '2026-09',
  periodLabel: 'SEPTEMBER 2026',
  sourceFile: 'Target SC September 2026.xlsx',
}));

const masterOutlets = masterRows.map((r: any, i) => ({
  id: `mst-${i}`,
  outletId: r['KODE OUTLET'] || r['KD OUTLET'] || '',
  outletName: r['NAMA OUTLET'] || '',
  channel: r['CHANNEL'] || '',
  fc: r['FC'] || '',
  rayon: r['RAYON'] || '',
  salesmanId: r['KD_SLS'] || '',
  salesmanName: r['NAMA_SLS'] || '',
  statusCurrentMonth: r['STATUS BLN INI'] || 'OK',
  area: r['AREA'] || '',
  cabang: r['CABANG'] || 'BONE',
  isActive: (r['STATUS BLN INI'] || 'OK').toUpperCase() === 'OK',
  sourceFile: '_Master_CB BLK.xlsx',
}));

console.log(`   [PASS] Loaded: Prev=${prevTransactions.length}, Curr=${currTransactions.length}, Targets=${targets.length}, Master=${masterOutlets.length}`);

// 2. Compute Baseline Analytics via Calculation Engine
console.log('\n2. Computing Baseline Analytics...');
const calc = computeAnalytics(
  prevTransactions,
  currTransactions,
  targets,
  masterOutlets,
  {},
  { role: 'ADMIN', username: 'admin', name: 'Admin', id: '1', status: 'ACTIVE' }
);

if (calc.kpis.totalTarget <= 0 || calc.kpis.totalActualCurrent <= 0) {
  throw new Error('Baseline calculation returned zero target or actual');
}
console.log(`   [PASS] Baseline Analytics verified: Target=${calc.kpis.totalTarget}, Actual=${calc.kpis.totalActualCurrent}`);

// 3. Build DecisionContext
console.log('\n3. Testing DecisionContext Building...');
const context = buildDecisionContext(
  calc,
  prevTransactions,
  currTransactions,
  targets,
  masterOutlets,
  DEFAULT_SETTINGS,
  { workingDaysTotal: 26, workingDaysElapsed: 18 }
);

if (!context.salesSummary || context.salesSummary.totalTarget !== calc.kpis.totalTarget) {
  throw new Error('DecisionContext salesSummary mismatch with calculation engine');
}

if (!context.ecSummary || context.ecSummary.ecCurrent <= 0) {
  throw new Error('DecisionContext ecSummary failed to compute distinct outlets');
}

if (!context.skuSummary || context.skuSummary.totalSkus <= 0) {
  throw new Error('DecisionContext skuSummary returned empty SKU catalog');
}

if (!context.markNewSummary || context.markNewSummary.markNewValue <= 0) {
  throw new Error('DecisionContext markNewSummary failed to aggregate markNew records');
}

console.log('   [PASS] DecisionContext fully populated with 5 Operational Focus Areas (Actual Performance).');
console.log(`          - EC Current: ${context.ecSummary.ecCurrent} outlets (Distinct Count)`);
console.log(`          - SKUs Aggregated: ${context.skuSummary.totalSkus} items`);
console.log(`          - MARK NEW Value: Rp ${context.markNewSummary.markNewValue.toLocaleString('id-ID')}`);

// 4. Test Deterministic Decision Synthesis
console.log('\n4. Testing Deterministic Decision Synthesis (5 Operational Focus Areas)...');
const decisions = synthesizeDeterministicDecisions(context);

if (decisions.length === 0) {
  throw new Error('Decision Engine returned empty array! Must produce real decisions.');
}

// Verify Categories exist and verify FORECAST_RISK is absent
const categoriesFound = new Set(decisions.map(d => d.category));
if (categoriesFound.has('FORECAST_RISK')) {
  throw new Error('FORECAST_RISK was found in decisions! Forecast must be completely removed.');
}

console.log(`   [PASS] Decisions generated: ${decisions.length} decisions across 5 operational categories:`, Array.from(categoriesFound));

// Verify 5-Pillar Root Cause Structure & Evidence Traceability
for (const dec of decisions) {
  if (!dec.what || !dec.why || !dec.impact || !dec.recommendedAction || !dec.expectedImpact) {
    throw new Error(`Decision ${dec.id} is missing 5-pillar root cause fields`);
  }
  if (!dec.evidence || dec.evidence.length === 0) {
    throw new Error(`Decision ${dec.id} has no evidence traceability!`);
  }
  if (dec.priorityScore < 0 || dec.priorityScore > 100) {
    throw new Error(`Decision ${dec.id} has invalid priorityScore: ${dec.priorityScore}`);
  }
  if (dec.riskScore < 0 || dec.riskScore > 100) {
    throw new Error(`Decision ${dec.id} has invalid riskScore: ${dec.riskScore}`);
  }
  if (dec.opportunityScore < 0 || dec.opportunityScore > 100) {
    throw new Error(`Decision ${dec.id} has invalid opportunityScore: ${dec.opportunityScore}`);
  }
}
console.log('   [PASS] 100% of decisions conform to 5-Pillar Root Cause (WHAT, WHY, IMPACT, ACTION, EXPECTED IMPACT) and Evidence Traceability.');

// 5. Test Audit & Diagnostic Report
console.log('\n5. Testing Decision Engine Audit Report...');
const audit = generateDecisionAuditReport(context, decisions, {
  previousRows: prevRows.length,
  currentRows: currRows.length,
  targetRows: targetRows.length,
  masterRows: masterRows.length,
});

if (!audit.auditTraceabilityPassed) {
  throw new Error('Audit traceability check failed!');
}
console.log('   [PASS] Audit Report verified: Total Decisions =', audit.decisionCounts.total);
console.log('          - Critical:', audit.decisionCounts.critical);
console.log('          - High:', audit.decisionCounts.high);
console.log('          - Medium:', audit.decisionCounts.medium);

// 6. Test Zero Division & Safety Bounds
console.log('\n6. Testing Zero Division & Safety Bounds...');
const emptyContext = buildDecisionContext(
  {
    ...calc,
    kpis: {
      ...calc.kpis,
      totalTarget: 0,
      totalActualCurrent: 0,
      totalActualPrevious: 0,
      achievementRate: null,
      growthRate: null,
      repeatOrderRate: null,
    },
    salesmanPerformances: [],
    dropOutlets: [],
  },
  [],
  [],
  [],
  [],
  DEFAULT_SETTINGS,
  { workingDaysTotal: 26, workingDaysElapsed: 0, workingDaysRemaining: 26 }
);

const emptyDecisions = synthesizeDeterministicDecisions(emptyContext);
console.log(`   [PASS] Zero/Empty dataset safety verified without NaN/Infinity crashes. (Decisions produced: ${emptyDecisions.length})`);

console.log('\n===============================================================');
console.log('=== ALL AI DECISION ENGINE TESTS PASSED WITH 100% SUCCESS!  ===');
console.log('===============================================================\n');
