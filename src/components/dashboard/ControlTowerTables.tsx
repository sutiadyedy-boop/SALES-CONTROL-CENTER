import React, { useState } from 'react';
import { 
  Trophy, 
  UserX, 
  UserCheck, 
  Store, 
  Layers
} from 'lucide-react';
import { 
  CalculationResult, 
  SalesmanPerformanceItem, 
  DropOutletItem, 
  NewOutletItem, 
  NonTransactingOutletItem 
} from '../../types/analytics';
import { VirtualizedTable, VirtualizedColumnDef } from '../common/VirtualizedTable';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';

interface ControlTowerTablesProps {
  calculation: CalculationResult;
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
}

type TableTabKey = 'salesman_ranking' | 'drop_outlets' | 'new_active' | 'belum_transaksi';

export function ControlTowerTables({
  calculation,
  currentPeriodLabel = 'Oktober 2026',
  previousPeriodLabel = 'September 2026',
}: ControlTowerTablesProps) {
  const [activeTab, setActiveTab] = useState<TableTabKey>('salesman_ranking');
  const { salesmanPerformances, dropOutlets, newOutlets, outletsNotTransacted } = calculation;

  // ==========================================
  // TABLE 1: SALESMAN RANKING COLUMNS
  // ==========================================
  const salesmanColumns: VirtualizedColumnDef<SalesmanPerformanceItem>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '60px',
      align: 'center',
      accessor: row => row.rank,
      render: row => (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold font-mono ${
            row.rank === 1
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              : row.rank === 2
              ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
              : row.rank === 3
              ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
              : 'text-slate-400'
          }`}
        >
          {row.rank}
        </span>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman',
      width: '200px',
      accessor: row => row.salesmanName,
      render: row => (
        <div>
          <div className="font-semibold text-slate-200 truncate">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">
            {row.salesmanId} · {row.area || 'AREA'} {row.rayon ? `· ${row.rayon}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Target Resmi',
      width: '140px',
      align: 'right',
      accessor: row => row.target,
      render: row => (
        <span className="text-slate-300">{row.target > 0 ? formatRupiah(row.target) : 'N/A'}</span>
      ),
    },
    {
      key: 'actualCurrent',
      header: `Realisasi (${currentPeriodLabel})`,
      width: '150px',
      align: 'right',
      accessor: row => row.actualCurrent,
      render: row => (
        <span className="font-bold text-cyan-300">{formatRupiah(row.actualCurrent)}</span>
      ),
    },
    {
      key: 'achievementRate',
      header: 'Achievement %',
      width: '130px',
      align: 'right',
      accessor: row => row.achievementRate ?? -1,
      render: row => {
        if (row.achievementRate === null) {
          return <span className="text-slate-500 text-[11px]">N/A</span>;
        }
        const isGood = row.achievementRate >= 100;
        return (
          <div className="inline-flex items-center gap-1.5 justify-end">
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                isGood
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {row.achievementRate.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'gap',
      header: 'Gap Target',
      width: '140px',
      align: 'right',
      accessor: row => row.gap,
      render: row => (
        <span
          className={`font-semibold ${
            row.gap >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {(row.gap >= 0 ? '+' : '') + formatRupiah(row.gap)}
        </span>
      ),
    },
    {
      key: 'growthRate',
      header: 'Growth MoM',
      width: '120px',
      align: 'right',
      accessor: row => row.growthRate ?? -999,
      render: row => (
        <span
          className={`font-semibold ${
            row.growthRate !== null && row.growthRate >= 0
              ? 'text-emerald-400'
              : row.growthRate === null
              ? 'text-slate-400'
              : 'text-rose-400'
          }`}
        >
          {formatPercent(row.growthRate)}
        </span>
      ),
    },
    {
      key: 'roRate',
      header: 'RO Aktif %',
      width: '130px',
      align: 'center',
      accessor: row => row.roRate ?? -1,
      render: row => (
        <div>
          <span className="font-bold text-cyan-400">
            {row.roRate !== null ? `${row.roRate.toFixed(0)}%` : 'N/A'}
          </span>
          <div className="text-[10px] text-slate-500 font-mono">
            {row.transactingOutlets}/{row.activeOutlets} Toko
          </div>
        </div>
      ),
    },
  ];

  // ==========================================
  // TABLE 2: DROP OUTLET COLUMNS
  // August > 0 && September == 0
  // ==========================================
  const dropColumns: VirtualizedColumnDef<DropOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet',
      width: '120px',
      accessor: row => row.outletId,
      render: row => (
        <span className="font-mono font-semibold text-rose-300">{row.outletId}</span>
      ),
    },
    {
      key: 'outletName',
      header: 'Nama Toko / Outlet',
      width: '220px',
      accessor: row => row.outletName,
      render: row => (
        <div>
          <div className="font-semibold text-slate-200 truncate">{row.outletName}</div>
          <div className="text-[10px] text-slate-500">
            {row.channel || 'GENERAL'} {row.rayon ? `· ${row.rayon}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman Penanggung Jawab',
      width: '180px',
      accessor: row => row.salesmanName,
      render: row => (
        <div>
          <div className="text-slate-200 truncate">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'salesPrevious',
      header: `Omset ${previousPeriodLabel}`,
      width: '150px',
      align: 'right',
      accessor: row => row.salesPrevious,
      render: row => (
        <span className="font-bold text-slate-200">{formatRupiah(row.salesPrevious)}</span>
      ),
    },
    {
      key: 'salesCurrent',
      header: `Omset ${currentPeriodLabel}`,
      width: '130px',
      align: 'right',
      accessor: row => row.salesCurrent,
      render: () => (
        <span className="font-mono text-rose-400 font-semibold">Rp 0</span>
      ),
    },
    {
      key: 'lostValue',
      header: 'Potensi Omset Hilang',
      width: '160px',
      align: 'right',
      accessor: row => row.salesPrevious,
      render: row => (
        <span className="font-bold text-rose-400 font-mono">
          -{formatRupiah(row.salesPrevious)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      align: 'center',
      accessor: () => 'DROP_OUTLET',
      render: () => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
          DROP OUTLET
        </span>
      ),
    },
  ];

  // ==========================================
  // TABLE 3: NEW ACTIVE OUTLET COLUMNS
  // August == 0 && September > 0
  // ==========================================
  const newActiveColumns: VirtualizedColumnDef<NewOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet',
      width: '120px',
      accessor: row => row.outletId,
      render: row => (
        <span className="font-mono font-semibold text-emerald-300">{row.outletId}</span>
      ),
    },
    {
      key: 'outletName',
      header: 'Nama Toko / Outlet',
      width: '220px',
      accessor: row => row.outletName,
      render: row => (
        <div>
          <div className="font-semibold text-slate-200 truncate">{row.outletName}</div>
          <div className="text-[10px] text-slate-500">
            {row.channel || 'GENERAL'} {row.rayon ? `· ${row.rayon}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman Penanggung Jawab',
      width: '180px',
      accessor: row => row.salesmanName,
      render: row => (
        <div>
          <div className="text-slate-200 truncate">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'salesPrevious',
      header: `Omset ${previousPeriodLabel}`,
      width: '130px',
      align: 'right',
      accessor: () => 0,
      render: () => (
        <span className="font-mono text-slate-500">Rp 0</span>
      ),
    },
    {
      key: 'salesCurrent',
      header: `Omset Baru (${currentPeriodLabel})`,
      width: '160px',
      align: 'right',
      accessor: row => row.salesCurrent,
      render: row => (
        <span className="font-bold text-emerald-400 font-mono">
          +{formatRupiah(row.salesCurrent)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      align: 'center',
      accessor: () => 'NEW_ACTIVE',
      render: () => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          NEW ACTIVE
        </span>
      ),
    },
  ];

  // ==========================================
  // TABLE 4: OUTLET BELUM TRANSAKSI COLUMNS
  // Master Active outlets with 0 September sales
  // ==========================================
  const notTransactedColumns: VirtualizedColumnDef<NonTransactingOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet',
      width: '120px',
      accessor: row => row.outletId,
      render: row => (
        <span className="font-mono font-semibold text-amber-300">{row.outletId}</span>
      ),
    },
    {
      key: 'outletName',
      header: 'Nama Toko / Outlet',
      width: '230px',
      accessor: row => row.outletName,
      render: row => (
        <div>
          <div className="font-semibold text-slate-200 truncate">{row.outletName}</div>
          <div className="text-[10px] text-slate-500">
            Channel: {row.channel || 'GENERAL'} {row.rayon ? `· Rayon: ${row.rayon}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman',
      width: '180px',
      accessor: row => row.salesmanName,
      render: row => (
        <div>
          <div className="text-slate-200 truncate">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'salesPrevious',
      header: `Histori Omset (${previousPeriodLabel})`,
      width: '160px',
      align: 'right',
      accessor: row => row.salesPrevious,
      render: row => (
        <span className="font-mono text-slate-300">
          {row.salesPrevious > 0 ? formatRupiah(row.salesPrevious) : '-'}
        </span>
      ),
    },
    {
      key: 'salesCurrent',
      header: `Omset ${currentPeriodLabel}`,
      width: '140px',
      align: 'right',
      accessor: () => 0,
      render: () => (
        <span className="font-mono font-semibold text-amber-400">Rp 0 (NOL)</span>
      ),
    },
    {
      key: 'statusMaster',
      header: 'Status Master',
      width: '120px',
      align: 'center',
      accessor: () => 'AKTIF',
      render: () => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          AKTIF
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Transaksi',
      width: '140px',
      align: 'center',
      accessor: () => 'BELUM_TRANSAKSI',
      render: () => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
          BELUM TRANSAKSI
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Table Selection Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Control Tower Intelligence Tables
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            (Virtualized Table Rendering)
          </span>
        </div>

        {/* Navigation Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('salesman_ranking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'salesman_ranking'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Salesman Ranking</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
              {salesmanPerformances.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('drop_outlets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'drop_outlets'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>Drop Outlet</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-rose-300">
              {dropOutlets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('new_active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'new_active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Active Outlet</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-emerald-300">
              {newOutlets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('belum_transaksi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'belum_transaksi'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Outlet Belum Transaksi</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-amber-300">
              {outletsNotTransacted.length}
            </span>
          </button>
        </div>
      </div>

      {/* Render Active Virtualized Table */}
      {activeTab === 'salesman_ranking' && (
        <VirtualizedTable
          columns={salesmanColumns}
          data={salesmanPerformances}
          title="Ranking Performance Salesman"
          subtitle={`Urutan salesman berdasarkan persentase Achievement terhadap Target Resmi periode ${currentPeriodLabel}.`}
          searchPlaceholder="Cari salesman / ID / area..."
          exportFileName={`Salesman_Ranking_${currentPeriodLabel.replace(/\s+/g, '_')}`}
          emptyMessage="DATA BELUM TERSEDIA"
          viewportHeight={460}
          rowHeight={46}
        />
      )}

      {activeTab === 'drop_outlets' && (
        <VirtualizedTable
          columns={dropColumns}
          data={dropOutlets}
          title="Daftar Drop Outlet"
          subtitle={`Outlet yang bertransaksi pada ${previousPeriodLabel} (>0) namun TIDAK bertransaksi pada ${currentPeriodLabel} (=0).`}
          searchPlaceholder="Cari kode outlet / nama toko / salesman..."
          exportFileName={`Drop_Outlets_${currentPeriodLabel.replace(/\s+/g, '_')}`}
          emptyMessage="DATA BELUM TERSEDIA"
          viewportHeight={460}
          rowHeight={46}
        />
      )}

      {activeTab === 'new_active' && (
        <VirtualizedTable
          columns={newActiveColumns}
          data={newOutlets}
          title="Daftar New Active Outlet"
          subtitle={`Outlet yang TIDAK bertransaksi pada ${previousPeriodLabel} (=0) namun BERTRANSAKSI pada ${currentPeriodLabel} (>0).`}
          searchPlaceholder="Cari kode outlet / nama toko / salesman..."
          exportFileName={`New_Active_Outlets_${currentPeriodLabel.replace(/\s+/g, '_')}`}
          emptyMessage="DATA BELUM TERSEDIA"
          viewportHeight={460}
          rowHeight={46}
        />
      )}

      {activeTab === 'belum_transaksi' && (
        <VirtualizedTable
          columns={notTransactedColumns}
          data={outletsNotTransacted}
          title="Daftar Outlet Belum Transaksi"
          subtitle={`Seluruh outlet master dengan status AKTIF yang belum melakukan transaksi pada periode ${currentPeriodLabel}.`}
          searchPlaceholder="Cari kode outlet / nama toko / salesman..."
          exportFileName={`Outlet_Belum_Transaksi_${currentPeriodLabel.replace(/\s+/g, '_')}`}
          emptyMessage="DATA BELUM TERSEDIA"
          viewportHeight={460}
          rowHeight={46}
        />
      )}
    </div>
  );
}
