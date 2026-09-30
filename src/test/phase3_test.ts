import { 
  calculateAchievement,
  calculateGap,
  calculateGrowth,
  calculateRO,
  calculateOutletStatus,
  isDropOutlet,
  isNewActiveOutlet,
  computeAnalytics
} from '../services/calculationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { normalizeTransactionRecords, normalizeTargetRecords, normalizeMasterOutletRecords } from '../services/normalizationEngine';
import { DEFAULT_SETTINGS } from '../services/storageService';

console.log('==============================================');
console.log('=== RUNNING PHASE 3 COMPREHENSIVE TEST SUITE ===');
console.log('==============================================\n');

// ==========================================
// 1. TEST FORMULA 1: ACHIEVEMENT %
// Achievement = Actual / Target × 100
// Denominator 0 -> null (N/A, never Infinity)
// ==========================================
console.log('1. Testing FORMULA 1: Achievement % (Actual / Target * 100)...');

const achStandard = calculateAchievement(85000000, 100000000);
if (achStandard === null || Math.abs(achStandard - 85.0) > 0.001) {
  throw new Error(`FAILED: Standard achievement failed, expected 85.0%, got: ${achStandard}`);
}

const achOver = calculateAchievement(120000000, 100000000);
if (achOver === null || Math.abs(achOver - 120.0) > 0.001) {
  throw new Error(`FAILED: Over-achievement failed, expected 120.0%, got: ${achOver}`);
}

// Zero target denominator test -> MUST BE null / N/A, NOT Infinity!
const achZeroTarget = calculateAchievement(50000000, 0);
if (achZeroTarget !== null) {
  throw new Error(`FAILED: Denominator 0 must return null (N/A), got: ${achZeroTarget}`);
}
if (!isFinite(achZeroTarget as any) && achZeroTarget !== null) {
  throw new Error('FAILED: Achievement produced Infinity on 0 target!');
}
console.log('   [PASS] Formula 1 (Achievement %): Normal calculation & zero denominator guard (N/A, no Infinity) verified.');

// ==========================================
// 2. TEST FORMULA 2: GAP
// Gap = Actual - Target
// ==========================================
console.log('\n2. Testing FORMULA 2: Gap (Actual - Target)...');

const gapSurplus = calculateGap(120000000, 100000000);
if (gapSurplus !== 20000000) {
  throw new Error(`FAILED: Gap surplus expected 20,000,000, got: ${gapSurplus}`);
}

const gapDeficit = calculateGap(80000000, 100000000);
if (gapDeficit !== -20000000) {
  throw new Error(`FAILED: Gap deficit expected -20,000,000, got: ${gapDeficit}`);
}
console.log('   [PASS] Formula 2 (Gap): Surplus and deficit calculations verified.');

// ==========================================
// 3. TEST FORMULA 3: GROWTH AGUSTUS VS SEPTEMBER
// Growth = (September - August) / August × 100
// Denominator 0 -> null (N/A, never Infinity)
// ==========================================
console.log('\n3. Testing FORMULA 3: Growth ( (September - August) / August * 100 )...');

const growthPos = calculateGrowth(110000000, 100000000);
if (growthPos === null || Math.abs(growthPos - 10.0) > 0.001) {
  throw new Error(`FAILED: Positive growth expected 10.0%, got: ${growthPos}`);
}

const growthNeg = calculateGrowth(75000000, 100000000);
if (growthNeg === null || Math.abs(growthNeg - (-25.0)) > 0.001) {
  throw new Error(`FAILED: Negative growth expected -25.0%, got: ${growthNeg}`);
}

// Zero August denominator test -> MUST BE null / N/A, NOT Infinity!
const growthZeroAug = calculateGrowth(50000000, 0);
if (growthZeroAug !== null) {
  throw new Error(`FAILED: Denominator 0 in growth must return null (N/A), got: ${growthZeroAug}`);
}
if (!isFinite(growthZeroAug as any) && growthZeroAug !== null) {
  throw new Error('FAILED: Growth produced Infinity on 0 August sales!');
}
console.log('   [PASS] Formula 3 (Growth): Positive, negative & zero denominator guard (N/A, no Infinity) verified.');

// ==========================================
// 4. TEST FORMULA 4: REPEAT ORDER (RO) %
// RO = Outlet Transaksi / Outlet Aktif × 100
// Denominator 0 -> null (N/A, never Infinity)
// ==========================================
console.log('\n4. Testing FORMULA 4: RO Aktif (Outlet Transaksi / Outlet Aktif * 100)...');

const roStandard = calculateRO(80, 100);
if (roStandard === null || Math.abs(roStandard - 80.0) > 0.001) {
  throw new Error(`FAILED: RO rate expected 80.0%, got: ${roStandard}`);
}

// Zero Active Outlet denominator test -> MUST BE null / N/A, NOT Infinity!
const roZeroActive = calculateRO(10, 0);
if (roZeroActive !== null) {
  throw new Error(`FAILED: Denominator 0 in RO must return null (N/A), got: ${roZeroActive}`);
}
if (!isFinite(roZeroActive as any) && roZeroActive !== null) {
  throw new Error('FAILED: RO produced Infinity on 0 active outlets!');
}
console.log('   [PASS] Formula 4 (RO %): Rate calculation & zero denominator guard (N/A, no Infinity) verified.');

// ==========================================
// 5. TEST FORMULA 5 & 6: OUTLET TRANSAKSI & BELUM TRANSAKSI
// ==========================================
console.log('\n5. Testing FORMULA 5 & 6: Outlet Transaksi & Outlet Belum Transaksi...');

const outletStatus = calculateOutletStatus(103, 85);
if (outletStatus.outletTransaksi !== 85) {
  throw new Error(`FAILED: outletTransaksi expected 85, got: ${outletStatus.outletTransaksi}`);
}
if (outletStatus.outletBelumTransaksi !== 18) {
  throw new Error(`FAILED: outletBelumTransaksi expected 18, got: ${outletStatus.outletBelumTransaksi}`);
}
console.log('   [PASS] Formula 5 & 6 (Outlet Transaksi & Belum Transaksi): exact difference verified.');

// ==========================================
// 6. TEST FORMULA 7: DROP OUTLET
// August transaction > 0 AND September transaction = 0
// ==========================================
console.log('\n6. Testing FORMULA 7: Drop Outlet (August > 0 && September == 0)...');

if (!isDropOutlet(5000000, 0)) {
  throw new Error('FAILED: isDropOutlet should return TRUE for (5000000, 0)');
}
if (isDropOutlet(5000000, 1000000)) {
  throw new Error('FAILED: isDropOutlet should return FALSE for (5000000, 1000000)');
}
if (isDropOutlet(0, 5000000)) {
  throw new Error('FAILED: isDropOutlet should return FALSE for (0, 5000000)');
}
if (isDropOutlet(0, 0)) {
  throw new Error('FAILED: isDropOutlet should return FALSE for (0, 0)');
}
console.log('   [PASS] Formula 7 (Drop Outlet logic): verified.');

// ==========================================
// 7. TEST FORMULA 8: NEW ACTIVE OUTLET
// August transaction = 0 AND September transaction > 0
// ==========================================
console.log('\n7. Testing FORMULA 8: New Active Outlet (August == 0 && September > 0)...');

if (!isNewActiveOutlet(0, 2500000)) {
  throw new Error('FAILED: isNewActiveOutlet should return TRUE for (0, 2500000)');
}
if (isNewActiveOutlet(1000000, 2500000)) {
  throw new Error('FAILED: isNewActiveOutlet should return FALSE for (1000000, 2500000)');
}
if (isNewActiveOutlet(2500000, 0)) {
  throw new Error('FAILED: isNewActiveOutlet should return FALSE for (2500000, 0)');
}
if (isNewActiveOutlet(0, 0)) {
  throw new Error('FAILED: isNewActiveOutlet should return FALSE for (0, 0)');
}
console.log('   [PASS] Formula 8 (New Active Outlet logic): verified.');

// ==========================================
// 8. TEST INTEGRATION WITH ACTUAL OFFICE DATABASE
// (Agustus 2026 Bone, September 2026 KSNI, Target SC, Master CB BLK)
// ==========================================
console.log('\n8. Testing Full Analytics & Calculation Engine on Actual Office Datasets...');

const { prevRows, currRows, targetRows, masterRows } = getSampleOfficeRawData();

const prevMap = { outlet_id: 'KODE OUTLET', salesman_id: 'KODE SALESMAN', transaction_date: 'TGL', sales_value: 'VALUE NETT', invoice_id: 'NO FAKTUR' };
const currMap = { outlet_id: 'KODE OUTLET', salesman_id: 'KODE SALESMAN', transaction_date: 'TGL', sales_value: 'VALUE NETT', invoice_id: 'NO FAKTUR' };
const trgMap = { salesman_id: 'KD_SLS', salesman_name: 'NM_SLS', target_value: 'TARGET', area: 'AREA', salesman_status: 'STATUS SALESMAN' };
const mstMap = { outlet_id: 'KODE OUTLET', outlet_name: 'NAMA OUTLET', channel: 'CHANNEL', fc: 'FC', rayon: 'RAYON', salesman_id: 'KD_SLS', salesman_name: 'NAMA_SLS', status_current_month: 'STATUS BLN INI' };

const { records: normPrev } = normalizeTransactionRecords(prevRows, prevMap, 'Dbase BONE - AGUSTUS.xlsx', '2026-08', 'AGUSTUS 2026', DEFAULT_SETTINGS);
const { records: normCurr } = normalizeTransactionRecords(currRows, currMap, '_dBase KSNI BNE.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
const normTargets = normalizeTargetRecords(targetRows, trgMap, 'Target SC September 2026.xlsx', '2026-09', 'SEPTEMBER 2026');
const normMaster = normalizeMasterOutletRecords(masterRows, mstMap, '_Master_CB BLK.xlsx', DEFAULT_SETTINGS);

const analytics = computeAnalytics(
  normPrev,
  normCurr,
  normTargets,
  normMaster,
  {}
);

console.log('   Calculated Analytics Results:');
console.log(`     * Total Target: Rp ${analytics.kpis.totalTarget.toLocaleString('id-ID')}`);
console.log(`     * Realisasi September: Rp ${analytics.kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`     * Realisasi Agustus: Rp ${analytics.kpis.totalActualPrevious.toLocaleString('id-ID')}`);
console.log(`     * Achievement %: ${analytics.kpis.achievementRate?.toFixed(2)}%`);
console.log(`     * Gap Target: Rp ${analytics.kpis.gapValue.toLocaleString('id-ID')}`);
console.log(`     * MoM Growth %: ${analytics.kpis.growthRate?.toFixed(2)}%`);
console.log(`     * Total Master Outlets Aktif: ${analytics.kpis.totalActiveOutlets} toko`);
console.log(`     * Outlets Transaksi (September): ${analytics.kpis.outletsTransactedCurrent} toko`);
console.log(`     * Outlets Belum Transaksi: ${analytics.kpis.outletsNotTransactedCurrent} toko`);
console.log(`     * RO Aktif %: ${analytics.kpis.repeatOrderRate?.toFixed(2)}%`);
console.log(`     * Drop Outlets: ${analytics.dropOutlets.length} toko (Lost Rev: Rp ${analytics.kpis.dropOutletLostRevenue.toLocaleString('id-ID')})`);
console.log(`     * New Active Outlets: ${analytics.newOutlets.length} toko (New Rev: Rp ${analytics.kpis.newActiveOutletRevenue.toLocaleString('id-ID')})`);
console.log(`     * Salesman Performance Scorecards: ${analytics.salesmanPerformances.length} salesmen`);

// Assertions on actual calculations
if (analytics.kpis.totalTarget <= 0) {
  throw new Error('FAILED: Total Target must be > 0');
}
if (analytics.kpis.totalActualCurrent <= 0) {
  throw new Error('FAILED: Total Actual Current must be > 0');
}
if (analytics.kpis.achievementRate === null || isNaN(analytics.kpis.achievementRate) || !isFinite(analytics.kpis.achievementRate)) {
  throw new Error('FAILED: Achievement rate is invalid!');
}
if (analytics.kpis.gapValue !== (analytics.kpis.totalActualCurrent - analytics.kpis.totalTarget)) {
  throw new Error('FAILED: Gap value mismatch with Actual - Target formula');
}
if (analytics.kpis.growthRate === null || isNaN(analytics.kpis.growthRate) || !isFinite(analytics.kpis.growthRate)) {
  throw new Error('FAILED: Growth rate is invalid!');
}
if (analytics.kpis.repeatOrderRate === null || isNaN(analytics.kpis.repeatOrderRate) || !isFinite(analytics.kpis.repeatOrderRate)) {
  throw new Error('FAILED: RO rate is invalid!');
}
if (analytics.kpis.outletsNotTransactedCurrent !== (analytics.kpis.totalActiveOutlets - analytics.kpis.outletsTransactedCurrent)) {
  throw new Error('FAILED: Outlets not transacted mismatch!');
}

// Verify Drop Outlets
for (const drop of analytics.dropOutlets) {
  if (drop.salesPrevious <= 0 || drop.salesCurrent !== 0) {
    throw new Error(`FAILED: Drop outlet violated rule (August > 0 & September == 0): ${JSON.stringify(drop)}`);
  }
}
console.log('   [PASS] All drop outlets strictly conform to August > 0 && September == 0.');

// Verify New Active Outlets
for (const newOut of analytics.newOutlets) {
  if (newOut.salesPrevious !== 0 || newOut.salesCurrent <= 0) {
    throw new Error(`FAILED: New outlet violated rule (August == 0 & September > 0): ${JSON.stringify(newOut)}`);
  }
}
console.log('   [PASS] All new active outlets strictly conform to August == 0 && September > 0.');

// Verify Salesman Ranking & Scorecards
for (let i = 0; i < analytics.salesmanPerformances.length; i++) {
  const s = analytics.salesmanPerformances[i];
  if (s.rank !== i + 1) {
    throw new Error(`FAILED: Salesman rank expected ${i + 1}, got: ${s.rank}`);
  }
  if (s.target > 0) {
    const expectedAch = (s.actualCurrent / s.target) * 100;
    if (s.achievementRate === null || Math.abs(s.achievementRate - expectedAch) > 0.01) {
      throw new Error(`FAILED: Salesman ${s.salesmanId} achievement rate mismatch`);
    }
  }
}
console.log('   [PASS] Salesman Performance scorecards, ranking, and formulas verified.');

console.log('\n==============================================');
console.log('=== ALL PHASE 3 TESTS COMPLETED SUCCESSFULLY! ===');
console.log('==============================================');
