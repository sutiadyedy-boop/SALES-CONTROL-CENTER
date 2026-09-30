import { 
  normalizeTransactionRecords, 
  normalizeTargetRecords, 
  normalizeMasterOutletRecords,
  cleanString,
  parseNumeric,
  formatDate
} from '../services/normalizationEngine';
import { performReconciliation } from '../services/reconciliationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { DEFAULT_SETTINGS } from '../services/storageService';
import { autoDetectMappings } from '../services/columnMapper';

console.log('==============================================');
console.log('=== RUNNING PHASE 2 COMPREHENSIVE TEST SUITE ===');
console.log('==============================================\n');

// ==========================================
// 1. TEST NORMALIZATION UTILS & DATA PARSING
// ==========================================
console.log('1. Testing Normalization Engine utility functions...');

// 1.1 Clean string
if (cleanString('   Toko  Maju   Jaya\t\n') !== 'Toko Maju Jaya') {
  throw new Error(`FAILED: cleanString failed: "${cleanString('   Toko  Maju   Jaya\t\n')}"`);
}
if (cleanString(null) !== '' || cleanString(undefined) !== '') {
  throw new Error('FAILED: cleanString on null/undefined must return empty string');
}

// 1.2 Parse numeric (Indonesian vs US vs Accounting)
if (parseNumeric('1.500.000,50') !== 1500000.5) {
  throw new Error(`FAILED: parseNumeric Indonesian format failed: ${parseNumeric('1.500.000,50')}`);
}
if (parseNumeric('Rp 2.750.000') !== 2750000) {
  throw new Error(`FAILED: parseNumeric currency prefix failed: ${parseNumeric('Rp 2.750.000')}`);
}
if (parseNumeric('(500.000)') !== -500000) {
  throw new Error(`FAILED: parseNumeric accounting negative parentheses failed: ${parseNumeric('(500.000)')}`);
}
if (parseNumeric(1250000) !== 1250000) {
  throw new Error(`FAILED: parseNumeric number passthrough failed: ${parseNumeric(1250000)}`);
}

// 1.3 Format date (Excel serial & strings)
// Excel date serial for 2026-09-01 is ~46266
const dateSerialStr = formatDate(46266);
if (!dateSerialStr.startsWith('2026-09')) {
  throw new Error(`FAILED: formatDate Excel serial failed, got: ${dateSerialStr}`);
}
if (formatDate('01/09/2026') !== '2026-09-01') {
  throw new Error(`FAILED: formatDate DD/MM/YYYY failed, got: ${formatDate('01/09/2026')}`);
}
console.log('   [PASS] Normalization utility functions 100% verified.');

// ==========================================
// 2. TEST BUSINESS KEY ENGINE & FALLBACKS
// ==========================================
console.log('\n2. Testing Business Key Engine & Priority Fallbacks...');

// 2.1 Outlet Key priority (KODE OUTLET -> KD OUTLET)
const sampleRowOutlet1 = { 'KODE OUTLET': 'OUT-PRIMARY', 'KD OUTLET': 'OUT-FALLBACK', 'VALUE NETT': 100000 };
const sampleRowOutlet2 = { 'KD OUTLET': 'OUT-FALLBACK-ONLY', 'VALUE NETT': 200000 };
const normOutlet1 = normalizeTransactionRecords([sampleRowOutlet1], { sales_value: 'VALUE NETT' }, 'test.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
const normOutlet2 = normalizeTransactionRecords([sampleRowOutlet2], { sales_value: 'VALUE NETT' }, 'test.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);

if (normOutlet1.records[0].outletId !== 'OUT-PRIMARY') {
  throw new Error(`FAILED: Outlet Key expected primary "OUT-PRIMARY", got "${normOutlet1.records[0].outletId}"`);
}
if (normOutlet2.records[0].outletId !== 'OUT-FALLBACK-ONLY') {
  throw new Error(`FAILED: Outlet Key expected fallback "OUT-FALLBACK-ONLY", got "${normOutlet2.records[0].outletId}"`);
}
console.log('   [PASS] Outlet Key priority: KODE OUTLET (primary) -> KD OUTLET (fallback) verified.');

// 2.2 Salesman Key priority (KD_SLS / KODE SALESMAN -> NIK SALESMAN -> NAMA SALESMAN)
const slsRowPrimary = { 'KODE OUTLET': 'O-1', 'KODE SALESMAN': 'SLS-PRI', 'NIK SALESMAN': 'NIK-999', 'NAMA SALESMAN': 'BUDI' };
const slsRowFallbackNik = { 'KODE OUTLET': 'O-2', 'NIK SALESMAN': 'NIK-888', 'NAMA SALESMAN': 'ANDI' };
const slsRowFallbackName = { 'KODE OUTLET': 'O-3', 'NAMA SALESMAN': 'CITRA' };

const normSls1 = normalizeTransactionRecords([slsRowPrimary], {}, 'test.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
const normSls2 = normalizeTransactionRecords([slsRowFallbackNik], {}, 'test.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
const normSls3 = normalizeTransactionRecords([slsRowFallbackName], {}, 'test.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);

if (normSls1.records[0].salesmanId !== 'SLS-PRI') {
  throw new Error(`FAILED: Salesman Key expected primary "SLS-PRI", got "${normSls1.records[0].salesmanId}"`);
}
if (normSls2.records[0].salesmanId !== 'NIK-888') {
  throw new Error(`FAILED: Salesman Key expected NIK fallback "NIK-888", got "${normSls2.records[0].salesmanId}"`);
}
if (normSls3.records[0].salesmanId !== 'CITRA') {
  throw new Error(`FAILED: Salesman Key expected Name fallback "CITRA", got "${normSls3.records[0].salesmanId}"`);
}
console.log('   [PASS] Salesman Key priority: KODE SALESMAN -> NIK -> NAMA verified.');

// 2.3 Single Sales Value Rule (VALUE NETT only, never sum VALUE + VALUE NETT)
const multiValRow = {
  'KODE OUTLET': 'O-10',
  'VALUE': 1200000,
  'VALUE NETT': 1000000,
  'NETT EXCL PPN': 900000
};
const normVal = normalizeTransactionRecords([multiValRow], { sales_value: 'VALUE NETT' }, 'test.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
if (normVal.records[0].salesValue !== 1000000) {
  throw new Error(`FAILED: Single Sales Value rule breached! Expected 1,000,000, got: ${normVal.records[0].salesValue}`);
}
console.log('   [PASS] Single Sales Value rule: strictly uses designated column (VALUE NETT).');

// 2.4 Master Active Rule: STATUS BLN INI = "OK" -> isActive = true
const masterSampleRows = [
  { 'KODE OUTLET': 'OUT-A', 'NAMA OUTLET': 'Toko A', 'STATUS BLN INI': 'OK' },
  { 'KODE OUTLET': 'OUT-B', 'NAMA OUTLET': 'Toko B', 'STATUS BLN INI': 'NO' },
  { 'KODE OUTLET': 'OUT-C', 'NAMA OUTLET': 'Toko C', 'STATUS BLN INI': 'ok' }, // case insensitive
  { 'KODE OUTLET': 'OUT-D', 'NAMA OUTLET': 'Toko D', 'STATUS BLN INI': '' },
];
const normMaster = normalizeMasterOutletRecords(masterSampleRows, { status_current_month: 'STATUS BLN INI' }, 'master.xlsx', DEFAULT_SETTINGS);
const masterMap = new Map(normMaster.map(m => [m.outletId, m.isActive]));
if (masterMap.get('OUT-A') !== true) throw new Error('FAILED: OUT-A with "OK" must be active');
if (masterMap.get('OUT-B') !== false) throw new Error('FAILED: OUT-B with "NO" must be inactive');
if (masterMap.get('OUT-C') !== true) throw new Error('FAILED: OUT-C with "ok" (case insensitive) must be active');
if (masterMap.get('OUT-D') !== false) throw new Error('FAILED: OUT-D with "" must be inactive');
console.log('   [PASS] Master Active rule: STATUS BLN INI = "OK" evaluation verified.');

// 2.5 Target Salesman Rule: KD_SLS -> TARGET, do NOT sum SKU columns into main TARGET
const targetSampleRows = [
  {
    'KD_SLS': 'SLS-001',
    'NM_SLS': 'AHMAD HIDAYAT',
    'TARGET': 85000000,
    'CSD-E02K TARGET': 20000000,
    'NXC-E02K TARGET': 15000000,
    'PST-E500 TARGET': 10000000,
  }
];
const normTarget = normalizeTargetRecords(targetSampleRows, { target_value: 'TARGET' }, 'target.xlsx', '2026-09', 'SEPTEMBER 2026');
if (normTarget[0].targetValue !== 85000000) {
  throw new Error(`FAILED: Target value corrupted by SKU columns! Expected 85,000,000, got: ${normTarget[0].targetValue}`);
}
if (normTarget[0].skuTargets?.['CSD-E02K TARGET'] !== 20000000) {
  throw new Error('FAILED: SKU targets not preserved for SKU module');
}
console.log('   [PASS] Target rule: KD_SLS -> TARGET extracted accurately without SKU pollution.');

// ==========================================
// 3. TEST DUPLICATE DETECTION & ZERO DOUBLE COUNTING
// ==========================================
console.log('\n3. Testing Duplicate Detection & Zero Double Counting...');
const duplicateTxRows = [
  { 'KODE OUTLET': 'OUT-DUP-1', 'NO FAKTUR': 'INV-1001', 'VALUE NETT': 500000, 'TGL': '2026-09-01' },
  { 'KODE OUTLET': 'OUT-DUP-1', 'NO FAKTUR': 'INV-1001', 'VALUE NETT': 500000, 'TGL': '2026-09-01' }, // Duplicate invoice!
  { 'KODE OUTLET': 'OUT-DUP-2', 'NO FAKTUR': 'INV-1002', 'VALUE NETT': 750000, 'TGL': '2026-09-02' },
  { 'KODE OUTLET': 'OUT-DUP-2', 'NO FAKTUR': 'INV-1002', 'VALUE NETT': 750000, 'TGL': '2026-09-02' }, // Duplicate invoice!
  { 'KODE OUTLET': 'OUT-DUP-3', 'NO FAKTUR': 'INV-1003', 'VALUE NETT': 300000, 'TGL': '2026-09-03' },
];

const dedupResult = normalizeTransactionRecords(duplicateTxRows, {}, 'test_dup.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
if (dedupResult.records.length !== 3) {
  throw new Error(`FAILED: Duplicate detection failed! Expected 3 records, got: ${dedupResult.records.length}`);
}
if (dedupResult.duplicateCount !== 2) {
  throw new Error(`FAILED: Duplicate count mismatch! Expected 2 duplicates, got: ${dedupResult.duplicateCount}`);
}

const totalSalesCalculated = dedupResult.records.reduce((acc, r) => acc + r.salesValue, 0);
const expectedSales = 500000 + 750000 + 300000;
if (totalSalesCalculated !== expectedSales) {
  throw new Error(`FAILED: Double counting occurred! Expected ${expectedSales}, got: ${totalSalesCalculated}`);
}
console.log(`   [PASS] Deduplication engine prevented double counting (Filtered ${dedupResult.duplicateCount} duplicates, exact sum verified).`);

// ==========================================
// 4. TEST ACTUAL OFFICE FILES & RECONCILIATION
// ==========================================
console.log('\n4. Testing Reconciliation Engine on Actual Office Datasets (Agustus & September 2026)...');
const { prevRows, currRows, targetRows, masterRows } = getSampleOfficeRawData();

// Map and normalize actual office datasets
const prevMap = { outlet_id: 'KODE OUTLET', salesman_id: 'KODE SALESMAN', transaction_date: 'TGL', sales_value: 'VALUE NETT', invoice_id: 'NO FAKTUR' };
const currMap = { outlet_id: 'KODE OUTLET', salesman_id: 'KODE SALESMAN', transaction_date: 'TGL', sales_value: 'VALUE NETT', invoice_id: 'NO FAKTUR' };
const trgMap = { salesman_id: 'KD_SLS', salesman_name: 'NM_SLS', target_value: 'TARGET', area: 'AREA', salesman_status: 'STATUS SALESMAN' };
const mstMap = { outlet_id: 'KODE OUTLET', outlet_name: 'NAMA OUTLET', channel: 'CHANNEL', fc: 'FC', rayon: 'RAYON', salesman_id: 'KD_SLS', salesman_name: 'NAMA_SLS', status_current_month: 'STATUS BLN INI' };

const normPrevActual = normalizeTransactionRecords(prevRows, prevMap, 'Dbase BONE - AGUSTUS.xlsx', '2026-08', 'AGUSTUS 2026', DEFAULT_SETTINGS);
const normCurrActual = normalizeTransactionRecords(currRows, currMap, '_dBase KSNI BNE.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
const normTargetsActual = normalizeTargetRecords(targetRows, trgMap, 'Target SC September 2026.xlsx', '2026-09', 'SEPTEMBER 2026');
const normMasterActual = normalizeMasterOutletRecords(masterRows, mstMap, '_Master_CB BLK.xlsx', DEFAULT_SETTINGS);

console.log(`   - Normalized August Transactions: ${normPrevActual.records.length} records`);
console.log(`   - Normalized September Transactions: ${normCurrActual.records.length} records`);
console.log(`   - Normalized Targets: ${normTargetsActual.length} salesmen`);
console.log(`   - Normalized Master Outlets: ${normMasterActual.length} outlets`);

const reconciliation = performReconciliation(
  normPrevActual.records,
  normCurrActual.records,
  normTargetsActual,
  normMasterActual,
  normPrevActual.duplicateCount,
  normCurrActual.duplicateCount
);

console.log('   Reconciliation Report Metrics:');
console.log(`     * Total Master Outlets: ${reconciliation.status.totalMasterOutlets}`);
console.log(`     * Active Master Outlets: ${reconciliation.status.activeMasterOutlets}`);
console.log(`     * Matched Master Outlets with Transactions: ${reconciliation.status.matchedMasterOutletsWithTransactions}`);
console.log(`     * Matched Salesmen with Target: ${reconciliation.status.matchedSalesmenWithTarget}`);
console.log(`     * Duplicate Details: ${reconciliation.duplicateDetails.length} period reports`);

if (reconciliation.status.totalMasterOutlets === 0) {
  throw new Error('FAILED: Reconciliation totalMasterOutlets is 0');
}
if (reconciliation.status.matchedMasterOutletsWithTransactions === 0) {
  throw new Error('FAILED: No outlets matched between Master and Transactions');
}
if (reconciliation.status.matchedSalesmenWithTarget === 0) {
  throw new Error('FAILED: No salesmen matched between Targets and Transactions');
}
if (reconciliation.matchedOutlets.length === 0) {
  throw new Error('FAILED: matchedOutlets list is empty');
}

console.log('   [PASS] Reconciliation Engine executed successfully with 0 errors.');

console.log('\n==============================================');
console.log('=== ALL PHASE 2 TESTS COMPLETED SUCCESSFULLY! ===');
console.log('==============================================');
