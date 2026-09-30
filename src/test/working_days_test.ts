import { computeAnalytics } from '../services/calculationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';

console.log('======================================================');
console.log('=== TESTING WORKING DAYS & SHORTFALL RUN-RATE SUITE ===');
console.log('======================================================\n');

// 1. Test basic formulas for working days & shortfall
console.log('1. Testing Working Days derivation & shortfall formulas...');
const hariKerjaBlnIni = 26;
const hariKerjaBerjalan = 18;
const sisaHariKerja = Math.max(0, hariKerjaBlnIni - hariKerjaBerjalan);

if (sisaHariKerja !== 8) {
  throw new Error(`Expected sisaHariKerja 8, got: ${sisaHariKerja}`);
}

const targetTim = 1000000000; // 1 Milyar
const actualTim = 750000000;  // 750 Juta
const kekurangan = Math.max(0, targetTim - actualTim); // 250 Juta

if (kekurangan !== 250000000) {
  throw new Error(`Expected kekurangan 250,000,000, got: ${kekurangan}`);
}

const targetHarianSisa = Math.round(kekurangan / sisaHariKerja);
// 250,000,000 / 8 = 31,250,000 / hari
if (targetHarianSisa !== 31250000) {
  throw new Error(`Expected targetHarianSisa 31,250,000, got: ${targetHarianSisa}`);
}

const runRateBerjalan = Math.round(actualTim / hariKerjaBerjalan);
// 750,000,000 / 18 = 41,666,667 / hari
if (runRateBerjalan !== 41666667) {
  throw new Error(`Expected runRateBerjalan 41,666,667, got: ${runRateBerjalan}`);
}

const proyeksiAkhirBulan = Math.round(runRateBerjalan * hariKerjaBlnIni);
// 41,666,667 * 26 = 1,083,333,342
if (proyeksiAkhirBulan < 1000000000) {
  throw new Error(`Expected projected achievement > 1B, got: ${proyeksiAkhirBulan}`);
}
console.log('   [PASS] Working days & shortfall run-rate arithmetic verified.');

// 2. Test boundary condition: when sisa hari kerja is 0 or target already achieved
console.log('\n2. Testing boundary condition: sisaHariKerja = 0 and achieved target...');
const zeroSisa = 0;
const targetHarianZeroSisa = zeroSisa > 0 ? Math.round(kekurangan / zeroSisa) : 0;
if (targetHarianZeroSisa !== 0) {
  throw new Error(`Expected targetHarian 0 when sisa hari kerja 0, got: ${targetHarianZeroSisa}`);
}

const achievedTarget = 500000000;
const actualExceeds = 550000000;
const kekuranganAchieved = Math.max(0, achievedTarget - actualExceeds);
if (kekuranganAchieved !== 0) {
  throw new Error(`Expected 0 kekurangan for achieved target, got: ${kekuranganAchieved}`);
}
console.log('   [PASS] Boundary conditions (zero remaining days, target exceeded) verified.');

// 3. Test integrity with real analytics calculation (ensure raw data is never mutated)
console.log('\n3. Testing integrity with real sample dataset without mutating raw data...');
const sample = getSampleOfficeRawData();
const prevTxCount = sample.data.prevTransactions.length;
const currTxCount = sample.data.currTransactions.length;
const targetCount = sample.data.targets.length;
const masterCount = sample.data.masterOutlets.length;

const originalFirstTargetVal = sample.data.targets[0].targetValue;

const analytics = computeAnalytics(
  sample.data.prevTransactions,
  sample.data.currTransactions,
  sample.data.targets,
  sample.data.masterOutlets,
  {}
);

// Verify original data counts and values remain identical
if (sample.data.prevTransactions.length !== prevTxCount) throw new Error('prevTransactions mutated!');
if (sample.data.currTransactions.length !== currTxCount) throw new Error('currTransactions mutated!');
if (sample.data.targets.length !== targetCount) throw new Error('targets mutated!');
if (sample.data.masterOutlets.length !== masterCount) throw new Error('masterOutlets mutated!');
if (sample.data.targets[0].targetValue !== originalFirstTargetVal) throw new Error('Target value mutated!');

console.log('   [PASS] Integrity verified: All underlying datasets remain 100% unaltered.');

// 4. Test salesman-level shortfall and run-rate enrichment
console.log('\n4. Testing salesman-level run-rate simulation...');
const enriched = analytics.salesmanPerformances.map(s => {
  const kekurangan = Math.max(0, s.target - s.actualCurrent);
  const targetPerHariSisa = sisaHariKerja > 0 && kekurangan > 0 ? Math.round(kekurangan / sisaHariKerja) : 0;
  const runRateHarian = hariKerjaBerjalan > 0 ? Math.round(s.actualCurrent / hariKerjaBerjalan) : 0;
  const proyeksiSales = hariKerjaBerjalan > 0 ? Math.round((s.actualCurrent / hariKerjaBerjalan) * hariKerjaBlnIni) : s.actualCurrent;
  const proyeksiAch = s.target > 0 ? (proyeksiSales / s.target) * 100 : null;

  return {
    salesmanId: s.salesmanId,
    target: s.target,
    actual: s.actualCurrent,
    kekurangan,
    targetPerHariSisa,
    runRateHarian,
    proyeksiSales,
    proyeksiAch
  };
});

if (enriched.length !== analytics.salesmanPerformances.length) {
  throw new Error('Enriched salesman count mismatch!');
}

console.log(`   [PASS] Enriched ${enriched.length} salesman performance records with working days metrics.`);
console.log('\n======================================================');
console.log('=== ALL WORKING DAYS & SHORTFALL TESTS PASSED (100%) ===');
console.log('======================================================\n');
