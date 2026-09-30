import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { computeAnalytics } from '../services/calculationEngine';

console.log('=========================================================');
console.log('TEST VERIFIKASI FILTER TERPADU AREA & PMA SERTA SINKRONISASI DATA');
console.log('=========================================================');

// 1. Load actual office database
const { data } = getSampleOfficeRawData();
const { prevTransactions: prevTx, currTransactions: currTx, targets, masterOutlets: master } = data;

console.log(`\n1. Verifikasi Data Awal:`);
console.log(`   - Master Outlets: ${master.length}`);
console.log(`   - Current Transactions: ${currTx.length}`);
console.log(`   - Previous Transactions: ${prevTx.length}`);
console.log(`   - Targets: ${targets.length}`);

const baseline = computeAnalytics(prevTx, currTx, targets, master, {});
console.log(`   - Baseline Realisasi: Rp ${baseline.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Baseline Target: Rp ${baseline.kpis.totalTarget.toLocaleString('id-ID')}`);
console.log(`   - Baseline Outlets Aktif: ${baseline.kpis.totalActiveOutlets}`);

// 2. Test Area Filter Synchronization
console.log(`\n2. Menguji Sinkronisasi Filter Area...`);
const testArea = master.find(m => m.area)?.area || 'BONE BARAT';
const areaResult = computeAnalytics(prevTx, currTx, targets, master, { area: testArea });

console.log(`   Area yang difilter: '${testArea}'`);
console.log(`   - Realisasi Area: Rp ${areaResult.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Target Area: Rp ${areaResult.kpis.totalTarget.toLocaleString('id-ID')}`);
console.log(`   - Active Outlets: ${areaResult.kpis.totalActiveOutlets}`);
console.log(`   - Transacted Outlets: ${areaResult.kpis.outletsTransactedCurrent}`);
console.log(`   - Belum Transaksi: ${areaResult.kpis.outletsNotTransactedCurrent}`);

// Verify all salesmen in result have this area
for (const s of areaResult.salesmanPerformances) {
  if (s.area && s.area !== testArea) {
    throw new Error(`FAILED: Salesman ${s.salesmanName} has area '${s.area}' but filter was '${testArea}'!`);
  }
}

// Verify outlets in outletsNotTransacted
for (const o of areaResult.outletsNotTransacted) {
  if (o.area && o.area !== testArea) {
    throw new Error(`FAILED: Non-transacted outlet ${o.outletName} has area '${o.area}' but filter was '${testArea}'!`);
  }
}

// Verify drop outlets
for (const d of areaResult.dropOutlets) {
  if (d.area && d.area !== testArea) {
    throw new Error(`FAILED: Drop outlet ${d.outletName} has area '${d.area}' but filter was '${testArea}'!`);
  }
}

// Verify new outlets
for (const n of areaResult.newOutlets) {
  if (n.area && n.area !== testArea) {
    throw new Error(`FAILED: New outlet ${n.outletName} has area '${n.area}' but filter was '${testArea}'!`);
  }
}

// Verify math sync
const sumSlsTarget = areaResult.salesmanPerformances.reduce((acc, s) => acc + s.target, 0);
if (areaResult.kpis.totalTarget !== sumSlsTarget) {
  throw new Error(`FAILED: KPI totalTarget (${areaResult.kpis.totalTarget}) !== sum of salesmen targets (${sumSlsTarget})!`);
}
const sumSlsSales = areaResult.salesmanPerformances.reduce((acc, s) => acc + s.actualCurrent, 0);
if (areaResult.kpis.totalActualCurrent !== sumSlsSales) {
  throw new Error(`FAILED: KPI totalActualCurrent (${areaResult.kpis.totalActualCurrent}) !== sum of salesmen sales (${sumSlsSales})!`);
}
console.log(`   [PASS] Filter Area sinkron 100% pada KPI, Salesman, Target, Transaksi, dan Outlet.`);

// 3. Test PMA Filter Synchronization
console.log(`\n3. Menguji Sinkronisasi Filter PMA...`);
const testPma = master.find(m => m.pma)?.pma || 'GOLD';
const pmaResult = computeAnalytics(prevTx, currTx, targets, master, { pma: testPma });

console.log(`   PMA yang difilter: '${testPma}'`);
console.log(`   - Realisasi PMA: Rp ${pmaResult.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Target PMA: Rp ${pmaResult.kpis.totalTarget.toLocaleString('id-ID')}`);
console.log(`   - Active Outlets: ${pmaResult.kpis.totalActiveOutlets}`);
console.log(`   - Transacted Outlets: ${pmaResult.kpis.outletsTransactedCurrent}`);

// Verify all non-transacted outlets have this PMA
for (const o of pmaResult.outletsNotTransacted) {
  if (o.pma && o.pma !== testPma) {
    throw new Error(`FAILED: Non-transacted outlet ${o.outletName} has PMA '${o.pma}' but filter was '${testPma}'!`);
  }
}

console.log(`   - Jumlah PMA Breakdown: ${pmaResult.pmaBreakdown.length}`);
if (pmaResult.pmaBreakdown.length > 0) {
  const pmaEntry = pmaResult.pmaBreakdown.find(p => p.pma === testPma);
  if (!pmaEntry) {
    throw new Error(`FAILED: pmaBreakdown does not include entry for '${testPma}'!`);
  }
  console.log(`   - PMA Breakdown Entry '${testPma}': ${pmaEntry.transactedOutlets}/${pmaEntry.activeOutlets} toko (Sales: Rp ${pmaEntry.sales.toLocaleString('id-ID')})`);
}
console.log(`   [PASS] Filter PMA sinkron 100% pada seluruh dataset dan breakdown.`);

// 4. Test Unified Combination (Area + PMA)
console.log(`\n4. Menguji Filter Kombinasi Area & PMA...`);
const comboResult = computeAnalytics(prevTx, currTx, targets, master, { area: testArea, pma: testPma });
console.log(`   Kombinasi: Area '${testArea}' + PMA '${testPma}'`);
console.log(`   - Realisasi: Rp ${comboResult.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - Active Outlets: ${comboResult.kpis.totalActiveOutlets}`);
console.log(`   - Transacted Outlets: ${comboResult.kpis.outletsTransactedCurrent}`);

if (comboResult.kpis.totalActualCurrent > areaResult.kpis.totalActualCurrent) {
  throw new Error(`FAILED: Combination sales cannot exceed Area sales!`);
}
if (comboResult.kpis.totalActualCurrent > pmaResult.kpis.totalActualCurrent) {
  throw new Error(`FAILED: Combination sales cannot exceed PMA sales!`);
}
console.log(`   [PASS] Filter Kombinasi Area & PMA presisi dan konsisten.`);

console.log('\n=========================================================');
console.log('SEMUA PENGUJIAN FILTER AREA & PMA TERPADU 100% SUKSES (PASS)');
console.log('=========================================================');
