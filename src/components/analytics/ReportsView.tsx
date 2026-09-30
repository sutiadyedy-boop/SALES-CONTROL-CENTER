import React from 'react';
import { FileText, Download, Printer, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { CalculationResult, OpportunityItem } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { exportToExcel } from '../../services/exportEngine';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface ReportsViewProps {
  calculation: CalculationResult | null;
  opportunities: OpportunityItem[];
  settings: AppSettings;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function ReportsView({
  calculation,
  opportunities,
  settings,
  onNavigateToUpload,
  onLoadSampleData,
}: ReportsViewProps) {
  if (!calculation || (calculation.kpis.totalActualCurrent === 0 && calculation.kpis.totalTarget === 0)) {
    return (
      <EmptyState
        title="LAPORAN BELUM TERSEDIA"
        description="Silakan upload database transaksi kantor untuk meng-generate laporan resmi manajemen dan export Excel."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const { kpis, salesmanPerformances } = calculation;
  const currLabel = settings.currentMonthLabel || 'September 2026';
  const prevLabel = settings.previousMonthLabel || 'Agustus 2026';

  const handleExportFullExcel = () => {
    exportToExcel(calculation, opportunities, settings, `Laporan_Eksekutif_${currLabel}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Pusat Laporan Eksekutif & Export Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ekspor data komprehensif ke format Excel Multi-Sheet (.xlsx) atau cetak ringkasan manajemen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Laporan_Eksekutif_${currLabel.replace(/\s+/g, '_')}.jpg`}
            label="Capture JPG"
          />

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Cetak / PDF</span>
          </button>

          <button
            onClick={handleExportFullExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Workbook Excel Lengkap (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Printable Executive Summary Sheet */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm print:bg-white print:text-black print:p-0">
        <div className="border-b border-slate-800 pb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono tracking-wider uppercase text-cyan-400 font-semibold block mb-1">
              MANAGEMENT CONTROL TOWER
            </span>
            <h1 className="text-xl font-bold text-slate-100">
              Laporan Kinerja Penjualan FMCG ({currLabel})
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Periode Pembanding: {prevLabel} · Basis Sales: {settings.salesValueField}
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
            <div>Tanggal: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
            <div className="text-[11px] text-slate-500">Status Database: Verified & Deduped</div>
          </div>
        </div>

        {/* Section 1: KPI Highlights */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            I. Indikator Kinerja Utama (Top KPI)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Target Penjualan</span>
              <span className="font-mono text-sm font-bold text-slate-200 mt-1 block">
                {formatRupiah(kpis.totalTarget)}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Realisasi Penjualan</span>
              <span className="font-mono text-sm font-bold text-cyan-400 mt-1 block">
                {formatRupiah(kpis.totalActualCurrent)}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Tingkat Pencapaian</span>
              <span className="font-mono text-sm font-bold text-emerald-400 mt-1 block">
                {kpis.achievementRate !== null ? `${kpis.achievementRate.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Pertumbuhan MoM</span>
              <span className="font-mono text-sm font-bold text-purple-400 mt-1 block">
                {formatPercent(kpis.growthRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: RO and Outlets */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            II. Penetrasi Pasar & Repeat Order (RO)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Total Outlet Aktif (Master)</span>
              <span className="font-mono text-sm font-bold text-slate-200 mt-1 block">
                {kpis.totalActiveOutlets} Toko
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Outlet Sudah Transaksi</span>
              <span className="font-mono text-sm font-bold text-emerald-400 mt-1 block">
                {kpis.outletsTransactedCurrent} Toko
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Outlet Belum Transaksi</span>
              <span className="font-mono text-sm font-bold text-amber-400 mt-1 block">
                {kpis.outletsNotTransactedCurrent} Toko
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block">Repeat Order (RO) %</span>
              <span className="font-mono text-sm font-bold text-cyan-400 mt-1 block">
                {kpis.repeatOrderRate !== null ? `${kpis.repeatOrderRate.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Salesman Leaderboard Snapshot */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            III. Ringkasan Peringkat Salesman
          </h3>
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2 px-3 text-center">Rank</th>
                  <th className="py-2 px-3">Salesman</th>
                  <th className="py-2 px-3 text-right">Target</th>
                  <th className="py-2 px-3 text-right">Realisasi</th>
                  <th className="py-2 px-3 text-right">Ach %</th>
                  <th className="py-2 px-3 text-right">Growth</th>
                  <th className="py-2 px-3 text-center">RO %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {salesmanPerformances.map(s => (
                  <tr key={s.salesmanId}>
                    <td className="py-2 px-3 text-center font-bold text-slate-300">{s.rank}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">
                      {s.salesmanName} <span className="text-slate-500 font-mono text-[10px]">({s.salesmanId})</span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">{formatRupiah(s.target)}</td>
                    <td className="py-2 px-3 text-right text-cyan-300 font-semibold">{formatRupiah(s.actualCurrent)}</td>
                    <td className="py-2 px-3 text-right font-bold">{s.achievementRate !== null ? `${s.achievementRate.toFixed(1)}%` : 'N/A'}</td>
                    <td className="py-2 px-3 text-right">{formatPercent(s.growthRate)}</td>
                    <td className="py-2 px-3 text-center">{s.roRate !== null ? `${s.roRate.toFixed(0)}%` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
