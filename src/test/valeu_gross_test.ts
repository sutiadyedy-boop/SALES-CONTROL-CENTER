import { autoDetectMappings } from '../services/columnMapper';
import { normalizeTransactionRecords } from '../services/normalizationEngine';
import { DEFAULT_SETTINGS } from '../services/storageService';

console.log('======================================================');
console.log('=== TEST VERIFIKASI PEMBACAAN VALEU & GROSS UNTUK REALISASI ===');
console.log('======================================================\n');

// 1. Test autoDetectMappings dengan header VALEU
console.log('1. Menguji auto-detect kolom VALEU...');
const headersValeu = ['KODE OUTLET', 'NAMA OUTLET', 'KD_SLS', 'VALEU', 'TGL', 'NO FAKTUR'];
const detectedValeu = autoDetectMappings('current_month', headersValeu, {});
if (detectedValeu.sales_value.selectedHeader !== 'VALEU') {
  throw new Error(`FAILED: Expected 'VALEU', got: ${detectedValeu.sales_value.selectedHeader}`);
}
console.log(`   [PASS] Header VALEU berhasil terdeteksi sebagai sales_value (Confidence: ${detectedValeu.sales_value.confidence}%).`);

// 2. Test autoDetectMappings dengan header GROSS
console.log('2. Menguji auto-detect kolom GROSS...');
const headersGross = ['KODE OUTLET', 'NAMA OUTLET', 'KD_SLS', 'GROSS', 'TGL', 'NO FAKTUR'];
const detectedGross = autoDetectMappings('current_month', headersGross, {});
if (detectedGross.sales_value.selectedHeader !== 'GROSS') {
  throw new Error(`FAILED: Expected 'GROSS', got: ${detectedGross.sales_value.selectedHeader}`);
}
console.log(`   [PASS] Header GROSS berhasil terdeteksi sebagai sales_value (Confidence: ${detectedGross.sales_value.confidence}%).`);

// 3. Test autoDetectMappings dengan header huruf kecil / variasi: 'valeu gross'
console.log('3. Menguji auto-detect kolom "VALEU GROSS"...');
const headersValeuGross = ['KODE OUTLET', 'NAMA OUTLET', 'KD_SLS', 'VALEU GROSS', 'TGL', 'NO FAKTUR'];
const detectedVG = autoDetectMappings('current_month', headersValeuGross, {});
if (detectedVG.sales_value.selectedHeader !== 'VALEU GROSS') {
  throw new Error(`FAILED: Expected 'VALEU GROSS', got: ${detectedVG.sales_value.selectedHeader}`);
}
console.log(`   [PASS] Header VALEU GROSS berhasil terdeteksi sebagai sales_value.`);

// 4. Test bila ada kolom 'VALEU' DAN 'VALUE NETT', sistem harus memprioritaskan 'VALEU'
console.log('4. Menguji prioritas bila terdapat kolom VALEU dan VALUE NETT bersamaan...');
const headersBoth = ['KODE OUTLET', 'NAMA OUTLET', 'KD_SLS', 'VALEU', 'VALUE NETT', 'TGL', 'NO FAKTUR'];
const detectedBoth = autoDetectMappings('current_month', headersBoth, { sales_value: 'VALUE NETT' });
if (detectedBoth.sales_value.selectedHeader !== 'VALEU') {
  throw new Error(`FAILED: Expected 'VALEU' priority, got: ${detectedBoth.sales_value.selectedHeader}`);
}
console.log(`   [PASS] VALEU diprioritaskan di atas VALUE NETT.`);

// 5. Test bila ada kolom 'GROSS' DAN 'VALUE NETT', sistem harus memprioritaskan 'GROSS'
console.log('5. Menguji prioritas bila terdapat kolom GROSS dan VALUE NETT bersamaan...');
const headersGrossNett = ['KODE OUTLET', 'NAMA OUTLET', 'KD_SLS', 'GROSS', 'VALUE NETT', 'TGL', 'NO FAKTUR'];
const detectedGrossNett = autoDetectMappings('current_month', headersGrossNett, { sales_value: 'VALUE NETT' });
if (detectedGrossNett.sales_value.selectedHeader !== 'GROSS') {
  throw new Error(`FAILED: Expected 'GROSS' priority, got: ${detectedGrossNett.sales_value.selectedHeader}`);
}
console.log(`   [PASS] GROSS diprioritaskan di atas VALUE NETT.`);

// 6. Test normalisasi data baris yang memiliki kolom VALEU
console.log('6. Menguji normalisasi dan penjumlahan kolom VALEU...');
const rowsValeu = [
  { 'KODE OUTLET': 'OUT-001', 'KD_SLS': 'SLS-01', 'VALEU': '1.500.000', 'TGL': '2026-09-01', 'NO FAKTUR': 'INV-1' },
  { 'KODE OUTLET': 'OUT-002', 'KD_SLS': 'SLS-01', 'VALEU': '2.750.000', 'TGL': '2026-09-02', 'NO FAKTUR': 'INV-2' },
  { 'KODE OUTLET': 'OUT-003', 'KD_SLS': 'SLS-02', 'VALEU': '3.250.000', 'TGL': '2026-09-03', 'NO FAKTUR': 'INV-3' },
];
const mappingValeu = { sales_value: 'VALEU', outlet_id: 'KODE OUTLET', salesman_id: 'KD_SLS' };
const normResultValeu = normalizeTransactionRecords(rowsValeu, mappingValeu, 'test_valeu.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);

const totalRealisasiValeu = normResultValeu.records.reduce((acc, r) => acc + r.salesValue, 0);
if (totalRealisasiValeu !== 7500000) {
  throw new Error(`FAILED: Total Realisasi VALEU expected 7,500,000, got: ${totalRealisasiValeu}`);
}
console.log(`   [PASS] Total Realisasi VALEU terhitung akurat: Rp ${totalRealisasiValeu.toLocaleString('id-ID')}`);

// 7. Test normalisasi data baris yang memiliki kolom GROSS
console.log('7. Menguji normalisasi dan penjumlahan kolom GROSS...');
const rowsGross = [
  { 'KODE OUTLET': 'OUT-001', 'KD_SLS': 'SLS-01', 'GROSS': 5000000, 'TGL': '2026-09-01', 'NO FAKTUR': 'INV-1' },
  { 'KODE OUTLET': 'OUT-002', 'KD_SLS': 'SLS-01', 'GROSS': 4500000, 'TGL': '2026-09-02', 'NO FAKTUR': 'INV-2' },
];
const mappingGross = { sales_value: 'GROSS', outlet_id: 'KODE OUTLET', salesman_id: 'KD_SLS' };
const normResultGross = normalizeTransactionRecords(rowsGross, mappingGross, 'test_gross.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);

const totalRealisasiGross = normResultGross.records.reduce((acc, r) => acc + r.salesValue, 0);
if (totalRealisasiGross !== 9500000) {
  throw new Error(`FAILED: Total Realisasi GROSS expected 9,500,000, got: ${totalRealisasiGross}`);
}
console.log(`   [PASS] Total Realisasi GROSS terhitung akurat: Rp ${totalRealisasiGross.toLocaleString('id-ID')}`);

// 8. Test auto-fallback jika mapping sales_value tidak didefinisikan secara manual
console.log('8. Menguji fallback otomatis membaca VALEU atau GROSS...');
const normResultAuto = normalizeTransactionRecords(rowsValeu, { outlet_id: 'KODE OUTLET', salesman_id: 'KD_SLS' }, 'test_auto.xlsx', '2026-09', 'SEPTEMBER 2026', DEFAULT_SETTINGS);
const totalAuto = normResultAuto.records.reduce((acc, r) => acc + r.salesValue, 0);
if (totalAuto !== 7500000) {
  throw new Error(`FAILED: Auto fallback VALEU expected 7,500,000, got: ${totalAuto}`);
}
console.log(`   [PASS] Auto-fallback berhasil menjumlahkan VALEU sebesar Rp ${totalAuto.toLocaleString('id-ID')}`);

console.log('\n======================================================');
console.log('=== SEMUA PENGUJIAN VALEU & GROSS 100% SUKSES (PASS) ===');
console.log('======================================================');
