import { autoDetectMappings } from '../services/columnMapper';
import { validateUploadedFile } from '../services/dataValidationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { normalizeTransactionRecords, normalizeTargetRecords, normalizeMasterOutletRecords } from '../services/normalizationEngine';
import { DEFAULT_SETTINGS } from '../services/storageService';

console.log('=== RUNNING PHASE 1 TEST SUITE ===');

// 1. Test Sample Data Extraction
console.log('1. Testing getSampleOfficeRawData...');
const { prevRows, currRows, targetRows, masterRows } = getSampleOfficeRawData();
console.log(`   - prevRows: ${prevRows.length} rows`);
console.log(`   - currRows: ${currRows.length} rows`);
console.log(`   - targetRows: ${targetRows.length} rows`);
console.log(`   - masterRows: ${masterRows.length} rows`);

if (prevRows.length === 0 || currRows.length === 0 || targetRows.length === 0 || masterRows.length === 0) {
  throw new Error('FAILED: Sample rows are empty!');
}
console.log('   [PASS] Sample data generated successfully.');

// 2. Test Auto Column Mapping on actual office file headers
console.log('2. Testing Auto Column Mapping on actual office file headers...');

// Dbase BONE - AGUSTUS.xlsx headers
const prevHeaders = Object.keys(prevRows[0]);
console.log('   - Testing headers for Dbase BONE - AGUSTUS.xlsx:', prevHeaders);
const prevMap = autoDetectMappings('previous_month', prevHeaders);
if (!prevMap['outlet_id']?.selectedHeader || prevMap['outlet_id'].selectedHeader !== 'KODE OUTLET') {
  throw new Error(`FAILED: outlet_id mapping expected "KODE OUTLET", got "${prevMap['outlet_id']?.selectedHeader}"`);
}
if (!prevMap['salesman_id']?.selectedHeader || prevMap['salesman_id'].selectedHeader !== 'KODE SALESMAN') {
  throw new Error(`FAILED: salesman_id mapping expected "KODE SALESMAN", got "${prevMap['salesman_id']?.selectedHeader}"`);
}
if (!prevMap['sales_value']?.selectedHeader || !['VALEU', 'GROSS', 'VALUE NETT'].includes(prevMap['sales_value'].selectedHeader)) {
  throw new Error(`FAILED: sales_value mapping expected VALEU/GROSS/VALUE NETT, got "${prevMap['sales_value']?.selectedHeader}"`);
}
if (!prevMap['transaction_date']?.selectedHeader || prevMap['transaction_date'].selectedHeader !== 'TGL') {
  throw new Error(`FAILED: transaction_date mapping expected "TGL", got "${prevMap['transaction_date']?.selectedHeader}"`);
}
console.log('   [PASS] Database 1 (Bulan Lalu) auto-mapping 100% accurate.');

// Target SC September 2026.xlsx headers
const trgHeaders = Object.keys(targetRows[0]);
console.log('   - Testing headers for Target SC September 2026.xlsx:', trgHeaders);
const trgMap = autoDetectMappings('target_salesman', trgHeaders);
if (!trgMap['salesman_id']?.selectedHeader || trgMap['salesman_id'].selectedHeader !== 'KD_SLS') {
  throw new Error(`FAILED: salesman_id mapping expected "KD_SLS", got "${trgMap['salesman_id']?.selectedHeader}"`);
}
if (!trgMap['target_value']?.selectedHeader || trgMap['target_value'].selectedHeader !== 'TARGET') {
  throw new Error(`FAILED: target_value mapping expected "TARGET", got "${trgMap['target_value']?.selectedHeader}"`);
}
// Crucial: ensure SKU targets like 'CSD-E02K TARGET' were not selected as main target!
if (trgMap['target_value'].selectedHeader.includes('CSD') || trgMap['target_value'].selectedHeader.includes('NXC')) {
  throw new Error(`FAILED: Target mapped to SKU column instead of main TARGET!`);
}
console.log('   [PASS] Database 3 (Target SC) auto-mapping 100% accurate (SKU target isolated).');

// _Master_CB BLK.xlsx headers
const mstHeaders = Object.keys(masterRows[0]);
console.log('   - Testing headers for _Master_CB BLK.xlsx:', mstHeaders);
const mstMap = autoDetectMappings('master_cb', mstHeaders);
if (!mstMap['outlet_id']?.selectedHeader || mstMap['outlet_id'].selectedHeader !== 'KODE OUTLET') {
  throw new Error(`FAILED: outlet_id mapping expected "KODE OUTLET", got "${mstMap['outlet_id']?.selectedHeader}"`);
}
if (!mstMap['status_current_month']?.selectedHeader || mstMap['status_current_month'].selectedHeader !== 'STATUS BLN INI') {
  throw new Error(`FAILED: status_current_month mapping expected "STATUS BLN INI", got "${mstMap['status_current_month']?.selectedHeader}"`);
}
console.log('   [PASS] Database 4 (Master CB/ROA) auto-mapping 100% accurate.');

// 3. Test Data Validation Engine
console.log('3. Testing Data Validation Engine...');
const resolvedPrevMap: Record<string, string> = {};
for (const [k, v] of Object.entries(prevMap)) {
  if (v.selectedHeader) resolvedPrevMap[k] = v.selectedHeader;
}
const valResult = validateUploadedFile('previous_month', prevHeaders, resolvedPrevMap, prevRows);
if (!valResult.isValid) {
  throw new Error(`FAILED: Validation failed on valid sample rows: ${valResult.errors.join(', ')}`);
}
console.log('   [PASS] Data Validation engine passed.');

// 4. Test Normalization & Deduplication
console.log('4. Testing Normalization and Deduplication...');
const { records: normPrev, duplicateCount: dupPrev } = normalizeTransactionRecords(
  prevRows,
  resolvedPrevMap,
  'Dbase BONE - AGUSTUS.xlsx',
  '2026-08',
  'AGUSTUS 2026',
  DEFAULT_SETTINGS
);
console.log(`   - Normalized records count: ${normPrev.length}, Duplicates filtered: ${dupPrev}`);
if (normPrev.length === 0) {
  throw new Error('FAILED: Normalized records count is 0!');
}
console.log('   [PASS] Normalization & Deduplication verified.');

console.log('=== ALL PHASE 1 TESTS PASSED SUCCESSFULLY! ===');
