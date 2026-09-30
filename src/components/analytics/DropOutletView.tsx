import React from 'react';
import { AlertOctagon, TrendingDown, DollarSign, Calendar, Download } from 'lucide-react';
import { CalculationResult, DropOutletItem } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface DropOutletViewProps {
  calculation: CalculationResult | null;
  settings: AppSettings;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function DropOutletView({
  calculation,
  settings,
  onNavigateToUpload,
  onLoadSampleData,
}: DropOutletViewProps) {
  if (!calculation || (calculation.kpis.totalActualPrevious === 0 && calculation.kpis.totalActualCurrent === 0)) {
    return (
      <EmptyState
        title="DATA DROP OUTLET BELUM TERSEDIA"
        description="Upload Database Bulan Lalu dan Bulan Ini untuk mendeteksi outlet yang mengalami drop order."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const { dropOutlets, kpis } = calculation;
  const prevLabel = settings.previousMonthLabel || 'Agustus 2026';
  const currLabel = settings.currentMonthLabel || 'September 2026';

  const columns: ColumnDef<DropOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet',
      width: '130px',
      render: (row) => <span className="font-mono text-cyan-400 font-semibold text-xs">{row.outletId}</span>,
    },
    {
      key: 'outletName',
      header: 'Nama Outlet',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200">{row.outletName}</div>
          <div className="text-[10px] text-slate-500 font-mono">
            {row.channel || 'General Trade'} · {row.rayon || 'Rayon Pusat'}
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman',
      render: (row) => (
        <div>
          <div className="text-slate-300 font-medium">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      render: (row) => <span className="text-slate-400 text-xs">{row.area || '-'}</span>,
    },
    {
      key: 'salesPrevious',
      header: `Sales ${prevLabel} (IDR)`,
      align: 'right',
      accessor: (row) => row.salesPrevious,
      render: (row) => (
        <span className="font-mono font-bold text-rose-300">
          {formatRupiah(row.salesPrevious)}
        </span>
      ),
    },
    {
      key: 'salesCurrent',
      header: `Sales ${currLabel} (IDR)`,
      align: 'right',
      accessor: (row) => row.salesCurrent,
      render: () => <span className="font-mono text-slate-500">Rp 0</span>,
    },
    {
      key: 'lastTransactionDate',
      header: 'Transaksi Terakhir',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-slate-400 text-xs">
          {row.lastTransactionDate || prevLabel}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: () => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          🔴 DROP OUTLET
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <span>Analisa Drop Outlet (Bulan Lalu Transaksi &rarr; Bulan Ini Nol)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kriteria: Outlet yang bertransaksi pada <span className="font-mono text-slate-300">{prevLabel}</span> namun <span className="text-rose-400 font-semibold">tidak memiliki transaksi sama sekali</span> pada <span className="font-mono text-slate-300">{currLabel}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Drop_Outlets_${currLabel.replace(/\s+/g, '_')}.jpg`}
            label="Capture JPG"
          />
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-rose-500">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>JUMLAH DROP OUTLET</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {kpis.dropOutletCount} Toko
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Outlet berhenti memesan</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>POTENSI OMSET HILANG</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {formatRupiah(kpis.dropOutletLostRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Berdasarkan total order {prevLabel}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>REKOMENDASI AKSI</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-2">
            Canvassing Reaktivasi Darurat
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Unduh data dan bagikan ke masing-masing salesman terkait.
          </div>
        </div>
      </div>

      {/* Drop Outlet DataTable */}
      <DataTable
        title={`Daftar Lengkap Drop Outlet (${currLabel})`}
        columns={columns}
        data={dropOutlets}
        searchPlaceholder="Cari nama toko, kode, atau salesman..."
        exportFileName={`Drop_Outlets_${currLabel}.xlsx`}
      />
    </div>
  );
}
