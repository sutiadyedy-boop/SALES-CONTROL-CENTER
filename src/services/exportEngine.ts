import * as XLSX from 'xlsx';
import { CalculationResult, OpportunityItem } from '../types/analytics';
import { AppSettings } from '../types/database';
import { formatPercent, formatRupiah } from './smartInsightEngine';

export function exportToExcel(
  calc: CalculationResult,
  opportunities: OpportunityItem[],
  settings: AppSettings,
  fileName: string = 'Laporan_Sales_Control_Tower.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Ringkasan Eksekutif
  const summaryData = [
    ['SALES PERFORMANCE MONITORING - EXECUTIVE SUMMARY'],
    ['Periode Berjalan', settings.currentMonthLabel || 'Oktober 2026'],
    ['Periode Pembanding', settings.previousMonthLabel || 'September 2026'],
    ['Tanggal Generate', new Date().toLocaleString('id-ID')],
    [],
    ['METRIK UTAMA', 'NILAI', 'STATUS / CATATAN'],
    ['Total Target Sales', calc.kpis.totalTarget, 'Target Resmi'],
    ['Total Realisasi Bulan Ini', calc.kpis.totalActualCurrent, settings.currentMonthLabel],
    ['Total Realisasi Bulan Lalu', calc.kpis.totalActualPrevious, settings.previousMonthLabel],
    ['Achievement Rate (%)', calc.kpis.achievementRate ? `${calc.kpis.achievementRate.toFixed(1)}%` : 'N/A', calc.kpis.achievementRate && calc.kpis.achievementRate >= 100 ? 'Achieved' : 'Under Target'],
    ['Gap Target (Realisasi - Target)', calc.kpis.gapValue, calc.kpis.gapValue >= 0 ? 'Surplus' : 'Defisit'],
    ['Growth Rate (%)', calc.kpis.growthRate ? `${calc.kpis.growthRate.toFixed(1)}%` : calc.kpis.growthStatus, 'MoM Growth'],
    [],
    ['METRIK REPEAT ORDER (RO)', 'NILAI', 'KETERANGAN'],
    ['Total Outlet Aktif (Master CB)', calc.kpis.totalActiveOutlets, 'Status OK'],
    ['Outlet Sudah Transaksi', calc.kpis.outletsTransactedCurrent, 'Sales > 0'],
    ['Outlet Belum Transaksi', calc.kpis.outletsNotTransactedCurrent, 'Potensi Follow Up'],
    ['Repeat Order (RO) %', calc.kpis.repeatOrderRate !== null ? `${calc.kpis.repeatOrderRate.toFixed(1)}%` : 'N/A', 'Penetrasi Order'],
    [],
    ['STATUS PERGERAKAN OUTLET', 'JUMLAH', 'NILAI (IDR)'],
    ['Drop Outlet (Transacted Prev, 0 Curr)', calc.kpis.dropOutletCount, calc.kpis.dropOutletLostRevenue],
    ['New Active Outlet (0 Prev, Transacted Curr)', calc.kpis.newActiveOutletCount, calc.kpis.newActiveOutletRevenue],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Eksekutif');

  // 2. Sheet: Target vs Realisasi Salesman
  const slsData = calc.salesmanPerformances.map(s => ({
    'Rank': s.rank,
    'Kode Salesman': s.salesmanId,
    'Nama Salesman': s.salesmanName,
    'Area': s.area || '-',
    'Target (IDR)': s.target,
    'Realisasi (IDR)': s.actualCurrent,
    'Achievement (%)': s.achievementRate ? `${s.achievementRate.toFixed(1)}%` : 'N/A',
    'Gap (IDR)': s.gap,
    'Sales Bulan Lalu': s.actualPrevious,
    'Growth (%)': s.growthRate ? `${s.growthRate.toFixed(1)}%` : s.growthStatus,
    'Total Outlet': s.totalMasterOutlets,
    'Outlet Aktif': s.activeOutlets,
    'Outlet Transaksi': s.transactingOutlets,
    'RO (%)': s.roRate !== null ? `${s.roRate.toFixed(1)}%` : 'N/A',
    'Drop Outlet': s.dropOutletsCount,
    'New Outlet': s.newOutletsCount,
  }));
  const wsSls = XLSX.utils.json_to_sheet(slsData);
  XLSX.utils.book_append_sheet(wb, wsSls, 'Performa_Salesman');

  // 3. Sheet: Drop Outlets
  const dropData = calc.dropOutlets.map(d => ({
    'Kode Outlet': d.outletId,
    'Nama Outlet': d.outletName,
    'Kode Salesman': d.salesmanId,
    'Nama Salesman': d.salesmanName,
    'Area': d.area || '-',
    'Rayon': d.rayon || '-',
    'Channel': d.channel || '-',
    'Sales Bulan Lalu (IDR)': d.salesPrevious,
    'Sales Bulan Ini (IDR)': d.salesCurrent,
    'Transaksi Terakhir': d.lastTransactionDate || '-',
    'Status': d.status,
  }));
  const wsDrop = XLSX.utils.json_to_sheet(dropData);
  XLSX.utils.book_append_sheet(wb, wsDrop, 'Drop_Outlets');

  // 4. Sheet: New Active Outlets
  const newData = calc.newOutlets.map(n => ({
    'Kode Outlet': n.outletId,
    'Nama Outlet': n.outletName,
    'Kode Salesman': n.salesmanId,
    'Nama Salesman': n.salesmanName,
    'Area': n.area || '-',
    'Rayon': n.rayon || '-',
    'Channel': n.channel || '-',
    'Sales Bulan Ini (IDR)': n.salesCurrent,
    'Status': n.status,
  }));
  const wsNew = XLSX.utils.json_to_sheet(newData);
  XLSX.utils.book_append_sheet(wb, wsNew, 'New_Active_Outlets');

  // 5. Sheet: Prioritas Opportunity
  const oppData = opportunities.map(o => ({
    'Prioritas': o.priority,
    'Kategori': o.category,
    'Entitas': o.entityName,
    'ID / Kode': o.identifier,
    'Nilai Dampak (IDR)': o.impactValue,
    'Deskripsi': o.detailText,
    'Rekomendasi Tindakan': o.actionRecommendation,
    'PIC Salesman': o.assignedSalesman || '-',
  }));
  const wsOpp = XLSX.utils.json_to_sheet(oppData);
  XLSX.utils.book_append_sheet(wb, wsOpp, 'Prioritas_Opportunity');

  XLSX.writeFile(wb, fileName);
}

/**
 * Export array of tabular data directly to an Excel (.xlsx) file
 */
export function exportTableToExcel(
  rows: Record<string, any>[],
  fileName: string = 'export.xlsx',
  sheetName: string = 'Data'
) {
  if (rows.length === 0) return;
  const cleanFileName = fileName.toLowerCase().endsWith('.xlsx')
    ? fileName
    : fileName.replace(/\.csv$/i, '') + '.xlsx';

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Format headers and auto-adjust widths if possible
  const validSheetName = (sheetName || 'Data').replace(/[\/\\\?\*\]\[:]/g, '_').substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, validSheetName);

  XLSX.writeFile(wb, cleanFileName);
}

export function exportTableToCsv(rows: Record<string, any>[], fileName: string = 'export.csv') {
  if (rows.length === 0) return;
  // If user requests Excel conversion or by default, prefer Excel format
  if (fileName.toLowerCase().endsWith('.xlsx')) {
    exportTableToExcel(rows, fileName);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
