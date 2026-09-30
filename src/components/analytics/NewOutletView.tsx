import React from 'react';
import { Sparkles, DollarSign, Store, ArrowUpRight } from 'lucide-react';
import { CalculationResult, NewOutletItem } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface NewOutletViewProps {
  calculation: CalculationResult | null;
  settings: AppSettings;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function NewOutletView({
  calculation,
  settings,
  onNavigateToUpload,
  onLoadSampleData,
}: NewOutletViewProps) {
  if (!calculation || calculation.kpis.totalActualCurrent === 0) {
    return (
      <EmptyState
        title="DATA OUTLET BARU BELUM TERSEDIA"
        description="Upload Database Bulan Lalu dan Bulan Ini untuk melihat penambahan outlet aktif baru (New Active Outlets)."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const { newOutlets, kpis } = calculation;
  const currLabel = settings.currentMonthLabel || 'September 2026';
  const prevLabel = settings.previousMonthLabel || 'Agustus 2026';

  const columns: ColumnDef<NewOutletItem>[] = [
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
      header: `Sales ${prevLabel}`,
      align: 'right',
      render: () => <span className="font-mono text-slate-500">Rp 0 (Baru)</span>,
    },
    {
      key: 'salesCurrent',
      header: `Sales ${currLabel} (IDR)`,
      align: 'right',
      accessor: (row) => row.salesCurrent,
      render: (row) => (
        <span className="font-mono font-bold text-emerald-300">
          {formatRupiah(row.salesCurrent)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: () => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          🟢 NEW ACTIVE
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
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Analisa New Active Outlet (Outlet Baru Aktif Bertransaksi)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kriteria: Outlet yang sebelumnya tidak bertransaksi pada <span className="font-mono text-slate-300">{prevLabel}</span> namun <span className="text-emerald-400 font-semibold">mulai bertransaksi</span> pada <span className="font-mono text-slate-300">{currLabel}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`New_Active_Outlets_${currLabel.replace(/\s+/g, '_')}.jpg`}
            label="Capture JPG"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-emerald-500">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>JUMLAH OUTLET BARU</span>
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {kpis.newActiveOutletCount} Toko
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Outlet baru mulai order</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>KONTRIBUSI OMSET BARU</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-2">
            {formatRupiah(kpis.newActiveOutletRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total revenue pada {currLabel}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>RETENSI PROGRAM</span>
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-2">
            Program Onboarding & Repeat Order
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Amankan order berulang di bulan depan agar tidak drop.
          </div>
        </div>
      </div>

      {/* New Outlets DataTable */}
      <DataTable
        title={`Daftar New Active Outlets (${currLabel})`}
        columns={columns}
        data={newOutlets}
        searchPlaceholder="Cari toko atau salesman..."
        exportFileName={`New_Active_Outlets_${currLabel}.xlsx`}
      />
    </div>
  );
}
