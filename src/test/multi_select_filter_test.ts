import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { computeAnalytics, applyRoleAndGlobalFilter, matchesMulti, toArray } from '../services/calculationEngine';

console.log('=========================================================');
console.log('TEST SUITE: MULTI-SELECT FILTER & SINKRONISASI DATA');
console.log('=========================================================');

// 1. Load actual office data
const { data } = getSampleOfficeRawData();
const { prevTransactions: prevTx, currTransactions: currTx, targets, masterOutlets: master } = data;

console.log(`\n1. Validasi Data Dasar:`);
console.log(`   - Master Outlets: ${master.length}`);
console.log(`   - Current Transactions: ${currTx.length}`);
console.log(`   - Targets: ${targets.length}`);

// Baseline without filters
const baseline = computeAnalytics(prevTx, currTx, targets, master, {});
console.log(`   - Baseline Target: Rp ${baseline.kpis.totalTarget.toLocaleString('id-ID')}`);
console.log(`   - Baseline Realisasi: Rp ${baseline.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Baseline Active Outlets: ${baseline.kpis.totalActiveOutlets}`);
console.log(`   - Baseline Salesmen: ${baseline.salesmanPerformances.length}`);

// 2. Test Multi-Select PMA Filter
console.log(`\n2. Menguji Multi-Select PMA Filter...`);
// Test single PMA as array
const pmaGold = computeAnalytics(prevTx, currTx, targets, master, { pma: ['GOLD'] });
// Test another PMA as array
const pmaSilver = computeAnalytics(prevTx, currTx, targets, master, { pma: ['SILVER'] });
// Test multiple PMAs simultaneously: GOLD + SILVER
const pmaMulti = computeAnalytics(prevTx, currTx, targets, master, { pma: ['GOLD', 'SILVER'] });

console.log(`   - PMA GOLD Realisasi: Rp ${pmaGold.kpis.totalActualCurrent.toLocaleString('id-ID')} (Active Outlets: ${pmaGold.kpis.totalActiveOutlets})`);
console.log(`   - PMA SILVER Realisasi: Rp ${pmaSilver.kpis.totalActualCurrent.toLocaleString('id-ID')} (Active Outlets: ${pmaSilver.kpis.totalActiveOutlets})`);
console.log(`   - PMA Multi [GOLD, SILVER] Realisasi: Rp ${pmaMulti.kpis.totalActualCurrent.toLocaleString('id-ID')} (Active Outlets: ${pmaMulti.kpis.totalActiveOutlets})`);

// Validation: Multi-select GOLD + SILVER should equal sum of GOLD and SILVER
const expectedActiveOutlets = pmaGold.kpis.totalActiveOutlets + pmaSilver.kpis.totalActiveOutlets;
const expectedRealization = pmaGold.kpis.totalActualCurrent + pmaSilver.kpis.totalActualCurrent;

if (pmaMulti.kpis.totalActiveOutlets !== expectedActiveOutlets) {
  throw new Error(`FAIL: Multi PMA active outlets mismatch! Expected ${expectedActiveOutlets}, got ${pmaMulti.kpis.totalActiveOutlets}`);
}
if (pmaMulti.kpis.totalActualCurrent !== expectedRealization) {
  throw new Error(`FAIL: Multi PMA realization mismatch! Expected ${expectedRealization}, got ${pmaMulti.kpis.totalActualCurrent}`);
}
console.log(`   [PASS] Multi-Select PMA [GOLD, SILVER] sinkron 100% secara aditif!`);

// Verify pmaBreakdown in multi-select
const multiPmaBreakdownKeys = pmaMulti.pmaBreakdown.map(b => b.pma);
for (const k of multiPmaBreakdownKeys) {
  if (k !== 'GOLD' && k !== 'SILVER') {
    throw new Error(`FAIL: pmaBreakdown contains unexpected PMA: ${k}`);
  }
}
console.log(`   [PASS] pmaBreakdown hanya memuat PMA terpilih: ${multiPmaBreakdownKeys.join(', ')}`);

// 3. Test Multi-Select Salesman Filter
console.log(`\n3. Menguji Multi-Select Salesman Filter...`);
const allSlsIds = baseline.salesmanPerformances.map(s => s.salesmanId);
const sls1 = allSlsIds[0];
const sls2 = allSlsIds[1];

const resSls1 = computeAnalytics(prevTx, currTx, targets, master, { salesmanId: [sls1] });
const resSls2 = computeAnalytics(prevTx, currTx, targets, master, { salesmanId: [sls2] });
const resSlsMulti = computeAnalytics(prevTx, currTx, targets, master, { salesmanId: [sls1, sls2] });

console.log(`   - Salesman ${sls1} Realisasi: Rp ${resSls1.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Salesman ${sls2} Realisasi: Rp ${resSls2.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Multi Salesman [${sls1}, ${sls2}] Realisasi: Rp ${resSlsMulti.kpis.totalActualCurrent.toLocaleString('id-ID')}`);

if (resSlsMulti.kpis.totalActualCurrent !== (resSls1.kpis.totalActualCurrent + resSls2.kpis.totalActualCurrent)) {
  throw new Error(`FAIL: Multi salesman realization mismatch!`);
}
if (resSlsMulti.salesmanPerformances.length !== 2) {
  throw new Error(`FAIL: Multi salesman list count should be 2, got ${resSlsMulti.salesmanPerformances.length}`);
}
console.log(`   [PASS] Multi-Select Salesman sinkron 100%!`);

// 4. Test Multi-Select Kombinasi (Multi PMA + Multi Salesman)
console.log(`\n4. Menguji Kombinasi Multi-Select (Multi PMA + Multi Salesman)...`);
const comboResult = computeAnalytics(prevTx, currTx, targets, master, {
  pma: ['GOLD', 'SILVER'],
  salesmanId: [sls1, sls2]
});

console.log(`   - Realisasi Kombinasi: Rp ${comboResult.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Active Outlets: ${comboResult.kpis.totalActiveOutlets}`);
console.log(`   - Salesmen Active: ${comboResult.salesmanPerformances.length}`);

// Every salesman in result must be either sls1 or sls2
for (const s of comboResult.salesmanPerformances) {
  if (s.salesmanId !== sls1 && s.salesmanId !== sls2) {
    throw new Error(`FAIL: Salesman ${s.salesmanId} not in selected multi salesman filter!`);
  }
}
console.log(`   [PASS] Kombinasi Multi-Select antar filter berfungsi presisi!`);

// 5. Test Backward Compatibility with Single String
console.log(`\n5. Menguji Backward Compatibility (Single String Filter)...`);
const singleStringRes = computeAnalytics(prevTx, currTx, targets, master, { pma: 'GOLD' });
if (singleStringRes.kpis.totalActualCurrent !== pmaGold.kpis.totalActualCurrent) {
  throw new Error(`FAIL: Single string filter did not match array filter!`);
}
console.log(`   [PASS] Format string tunggal dan format array multi-select 100% konsisten!`);

console.log('\n=========================================================');
console.log('SEMUA PENGUJIAN MULTI-SELECT FILTER BERHASIL 100% (PASS)');
console.log('=========================================================');
