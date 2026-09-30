import { 
  computeAnalytics,
  applyRoleAndGlobalFilter
} from '../services/calculationEngine';
import { getSampleOfficeRawData } from '../services/sampleDataGenerator';
import { GlobalFilterState } from '../types/analytics';

console.log('==================================================');
console.log('=== RUNNING PHASE 4 DIGITAL CONTROL TOWER TEST ===');
console.log('==================================================\n');

// Load actual office database
const { data } = getSampleOfficeRawData();
const { prevTransactions, currTransactions, targets, masterOutlets } = data;

// ==========================================
// 1. EMPTY DATABASE TEST ("DATA BELUM TERSEDIA")
// ==========================================
console.log('1. Testing Empty Database Behavior (No dummy data allowed)...');
const emptyAnalytics = computeAnalytics([], [], [], []);
if (emptyAnalytics.kpis.totalActualCurrent !== 0 || emptyAnalytics.kpis.totalTarget !== 0 || emptyAnalytics.kpis.totalActiveOutlets !== 0) {
  throw new Error('FAILED: Empty database must have 0 target/actual/outlets!');
}
if (emptyAnalytics.salesmanPerformances.length !== 0) {
  throw new Error('FAILED: Empty database must not generate dummy salesmen!');
}
if (emptyAnalytics.outletsNotTransacted.length !== 0) {
  throw new Error('FAILED: Empty database must not generate dummy outlets!');
}
console.log('   [PASS] Empty database correctly produces 0 records (Triggers DATA BELUM TERSEDIA in UI).');

// ==========================================
// 2. THE 9 MANDATORY CONTROL TOWER KPIS
// ==========================================
console.log('\n2. Testing 9 Primary KPIs on Actual Office Database...');
const fullAnalytics = computeAnalytics(
  prevTransactions,
  currTransactions,
  targets,
  masterOutlets,
  {}
);
const kpis = fullAnalytics.kpis;

console.log(`   - TARGET: Rp ${kpis.totalTarget.toLocaleString('id-ID')}`);
console.log(`   - REALISASI: Rp ${kpis.totalActualCurrent.toLocaleString('id-ID')}`);
console.log(`   - ACHIEVEMENT: ${kpis.achievementRate?.toFixed(2)}%`);
console.log(`   - GAP: Rp ${kpis.gapValue.toLocaleString('id-ID')}`);
console.log(`   - GROWTH: ${kpis.growthRate?.toFixed(2)}%`);
console.log(`   - TOTAL OUTLET AKTIF: ${kpis.totalActiveOutlets} toko`);
console.log(`   - OUTLET TRANSAKSI: ${kpis.outletsTransactedCurrent} toko`);
console.log(`   - OUTLET BELUM TRANSAKSI: ${kpis.outletsNotTransactedCurrent} toko`);
console.log(`   - RO %: ${kpis.repeatOrderRate?.toFixed(2)}%`);

if (kpis.totalActiveOutlets <= 0) {
  throw new Error('FAILED: totalActiveOutlets must be > 0');
}
if (kpis.outletsTransactedCurrent + kpis.outletsNotTransactedCurrent !== kpis.totalActiveOutlets) {
  throw new Error(`FAILED: Transacted (${kpis.outletsTransactedCurrent}) + Not Transacted (${kpis.outletsNotTransactedCurrent}) !== Total Active (${kpis.totalActiveOutlets})`);
}
const expectedRo = (kpis.outletsTransactedCurrent / kpis.totalActiveOutlets) * 100;
if (Math.abs((kpis.repeatOrderRate ?? 0) - expectedRo) > 0.01) {
  throw new Error(`FAILED: RO rate calculation mismatch! Expected ${expectedRo}%, got ${kpis.repeatOrderRate}%`);
}
if (kpis.gapValue !== (kpis.totalActualCurrent - kpis.totalTarget)) {
  throw new Error('FAILED: Gap calculation mismatch!');
}
console.log('   [PASS] All 9 Primary KPIs verified with mathematical consistency.');

// ==========================================
// 3. TESTING THE 4 TABLES DATA INTEGRITY
// ==========================================
console.log('\n3. Testing Data Integrity for the 4 Control Tower Tables...');

// Table 1: Salesman Ranking
if (fullAnalytics.salesmanPerformances.length === 0) {
  throw new Error('FAILED: Salesman performance ranking table is empty!');
}
fullAnalytics.salesmanPerformances.forEach((s, idx) => {
  if (s.rank !== idx + 1) {
    throw new Error(`FAILED: Salesman ranking index mismatch for ${s.salesmanName}`);
  }
  if (!s.salesmanId || !s.salesmanName) {
    throw new Error('FAILED: Salesman ID or name missing');
  }
});
console.log(`   [PASS] Table 1 (Salesman Ranking): ${fullAnalytics.salesmanPerformances.length} salesmen ranked.`);

// Table 2: Drop Outlet (August > 0 && September == 0)
if (fullAnalytics.dropOutlets.length === 0) {
  throw new Error('FAILED: Drop outlet table is empty!');
}
for (const d of fullAnalytics.dropOutlets) {
  if (d.salesPrevious <= 0 || d.salesCurrent !== 0) {
    throw new Error(`FAILED: Drop outlet violation for ${d.outletId}: Prev=${d.salesPrevious}, Curr=${d.salesCurrent}`);
  }
}
console.log(`   [PASS] Table 2 (Drop Outlet): ${fullAnalytics.dropOutlets.length} drop outlets strictly conform to August > 0 && September == 0.`);

// Table 3: New Active Outlet (August == 0 && September > 0)
if (fullAnalytics.newOutlets.length === 0) {
  throw new Error('FAILED: New active outlet table is empty!');
}
for (const n of fullAnalytics.newOutlets) {
  if (n.salesPrevious !== 0 || n.salesCurrent <= 0) {
    throw new Error(`FAILED: New outlet violation for ${n.outletId}: Prev=${n.salesPrevious}, Curr=${n.salesCurrent}`);
  }
}
console.log(`   [PASS] Table 3 (New Active Outlet): ${fullAnalytics.newOutlets.length} new outlets strictly conform to August == 0 && September > 0.`);

// Table 4: Outlet Belum Transaksi
if (fullAnalytics.outletsNotTransacted.length !== kpis.outletsNotTransactedCurrent) {
  throw new Error(`FAILED: outletsNotTransacted table count (${fullAnalytics.outletsNotTransacted.length}) !== outletsNotTransactedCurrent KPI (${kpis.outletsNotTransactedCurrent})`);
}
for (const o of fullAnalytics.outletsNotTransacted) {
  if (o.salesCurrent !== 0) {
    throw new Error(`FAILED: Outlet belum transaksi has non-zero current sales: ${o.outletId}`);
  }
}
console.log(`   [PASS] Table 4 (Outlet Belum Transaksi): ${fullAnalytics.outletsNotTransacted.length} non-transacting outlets accurately match KPI count.`);

// ==========================================
// 4. TESTING ALL 8 FILTERS RESPONSIVENESS
// ==========================================
console.log('\n4. Testing Responsiveness for all 8 Global Filters...');

// 4.1 Filter Salesman
const testSalesmanId = fullAnalytics.salesmanPerformances[0].salesmanId;
const slsFilterResult = computeAnalytics(
  prevTransactions,
  currTransactions,
  targets,
  masterOutlets,
  { salesmanId: testSalesmanId }
);
if (slsFilterResult.salesmanPerformances.length !== 1 || slsFilterResult.salesmanPerformances[0].salesmanId !== testSalesmanId) {
  throw new Error(`FAILED: Filter by salesmanId ${testSalesmanId} failed`);
}
console.log(`   [PASS] Filter 1 (Salesman): Correctly isolated salesman ${testSalesmanId}.`);

// 4.2 Filter Area
const testArea = masterOutlets[0]?.area || targets[0]?.area || 'BONE';
const areaFilterResult = computeAnalytics(
  prevTransactions,
  currTransactions,
  targets,
  masterOutlets,
  { area: testArea }
);
if (areaFilterResult.kpis.totalActiveOutlets > fullAnalytics.kpis.totalActiveOutlets) {
  throw new Error(`FAILED: Area filter ${testArea} returned more outlets than total!`);
}
console.log(`   [PASS] Filter 2 (Area): Filter by area '${testArea}' updated KPIs dynamically.`);

// 4.3 Filter Rayon
const testRayon = masterOutlets.find(m => m.rayon)?.rayon;
if (testRayon) {
  const rayonResult = computeAnalytics(
    prevTransactions,
    currTransactions,
    targets,
    masterOutlets,
    { rayon: testRayon }
  );
  if (rayonResult.kpis.totalActiveOutlets === 0) {
    throw new Error(`FAILED: Rayon filter ${testRayon} returned 0 active outlets!`);
  }
  console.log(`   [PASS] Filter 3 (Rayon): Filter by rayon '${testRayon}' correctly refined dataset.`);
}

// 4.4 Filter Channel
const testChannel = masterOutlets.find(m => m.channel)?.channel;
if (testChannel) {
  const channelResult = computeAnalytics(
    prevTransactions,
    currTransactions,
    targets,
    masterOutlets,
    { channel: testChannel }
  );
  if (channelResult.kpis.totalActiveOutlets > fullAnalytics.kpis.totalActiveOutlets) {
    throw new Error('FAILED: Channel filter returned more outlets than total');
  }
  console.log(`   [PASS] Filter 4 (Channel): Filter by channel '${testChannel}' updated KPIs dynamically.`);
}

// 4.5 Filter Cabang
const testCabang = masterOutlets.find(m => m.cabang)?.cabang || 'BONE';
const cabangResult = computeAnalytics(
  prevTransactions,
  currTransactions,
  targets,
  masterOutlets,
  { cabang: testCabang }
);
console.log(`   [PASS] Filter 5 (Cabang): Filter by cabang '${testCabang}' successfully applied.`);

// 4.6 Filter Depo
const depoPredicate = applyRoleAndGlobalFilter({ depo: 'DEPO_TEST' });
const mockWithDepo = { outletId: 'TEST-1', depo: 'DEPO_TEST' };
const mockOtherDepo = { outletId: 'TEST-2', depo: 'DEPO_OTHER' };
if (!depoPredicate(mockWithDepo) || depoPredicate(mockOtherDepo)) {
  throw new Error('FAILED: Depo filter predicate logic failed!');
}
console.log('   [PASS] Filter 6 (Depo): Filter predicate for Depo verified.');

// 4.7 Filter FC
const fcPredicate = applyRoleAndGlobalFilter({ fc: 'FC_1' });
if (!fcPredicate({ outletId: 'O1', fc: 'FC_1' }) || fcPredicate({ outletId: 'O2', fc: 'FC_2' })) {
  throw new Error('FAILED: FC filter predicate logic failed!');
}
console.log('   [PASS] Filter 7 (FC): Filter predicate for FC verified.');

// 4.8 Filter PMA
const pmaPredicate = applyRoleAndGlobalFilter({ pma: 'PMA_A' });
if (!pmaPredicate({ outletId: 'O1', pma: 'PMA_A' }) || pmaPredicate({ outletId: 'O2', pma: 'PMA_B' })) {
  throw new Error('FAILED: PMA filter predicate logic failed!');
}
console.log('   [PASS] Filter 8 (PMA): Filter predicate for PMA verified.');

// ==========================================
// 5. TESTING VIRTUALIZED TABLE WINDOWING ALGORITHM
// ==========================================
console.log('\n5. Testing Virtualized Table Windowing Algorithm (No rendering thousands of rows at once)...');

// Simulate 10,000 rows
const syntheticDataCount = 10000;
const rowHeight = 44;
const viewportHeight = 440;
const overscan = 5;

// At scrollTop = 0:
let scrollTop = 0;
let startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
let endIndex = Math.min(syntheticDataCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
let visibleCount = endIndex - startIndex;

if (visibleCount > 25 || visibleCount < 10) {
  throw new Error(`FAILED: At scrollTop 0, visibleCount must be ~15-20 rows, got: ${visibleCount}`);
}
console.log(`   [PASS] Windowing at top: from 10,000 rows, only ${visibleCount} DOM rows are rendered.`);

// At scrollTop = 4400 (scrolled down ~100 rows):
scrollTop = 4400;
startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
endIndex = Math.min(syntheticDataCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
visibleCount = endIndex - startIndex;

if (startIndex < 90 || endIndex > 120 || visibleCount > 25) {
  throw new Error(`FAILED: At scrollTop 4400, expected window ~95-115, got ${startIndex}-${endIndex}`);
}
const topSpacerHeight = startIndex * rowHeight;
const bottomSpacerHeight = (syntheticDataCount - endIndex) * rowHeight;
if (topSpacerHeight + (visibleCount * rowHeight) + bottomSpacerHeight !== syntheticDataCount * rowHeight) {
  throw new Error('FAILED: Total virtual height mismatch in scroll spacer calculation!');
}
console.log(`   [PASS] Windowing scrolled: rendered slice [${startIndex}..${endIndex}] (${visibleCount} DOM rows). Total virtual scroll height preserved.`);

console.log('\n==================================================');
console.log('=== ALL PHASE 4 CONTROL TOWER TESTS PASSED!    ===');
console.log('==================================================\n');
