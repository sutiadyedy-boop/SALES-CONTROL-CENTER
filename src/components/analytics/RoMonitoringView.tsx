import React, { useState, useMemo } from 'react';
import { 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Zap, 
  Layers, 
  MapPin, 
  Users,
  Filter,
  Search,
  RotateCcw,
  Building2,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  X
} from 'lucide-react';
import { 
  CalculationResult, 
  SalesmanPerformanceItem, 
  NonTransactingOutletItem, 
  GlobalFilterState 
} from '../../types/analytics';
import { AppSettings, MasterOutletRecord, TransactionRecord } from '../../types/database';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { formatRupiah } from '../../services/smartInsightEngine';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface RoMonitoringViewProps {
  calculation: CalculationResult | null;
  settings: AppSettings;
  masterOutlets?: MasterOutletRecord[];
  currTransactions?: TransactionRecord[];
  prevTransactions?: TransactionRecord[];
  filters?: GlobalFilterState;
  onFilterChange?: (newFilters: GlobalFilterState) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function RoMonitoringView({
  calculation,
  settings,
  masterOutlets = [],
  currTransactions = [],
  prevTransactions = [],
  filters = {},
  onFilterChange,
  onNavigateToUpload,
  onLoadSampleData,
}: RoMonitoringViewProps) {
  // Navigation tabs: 'belum_transaksi' as a primary view alongside others
  const [activeTab, setActiveTab] = useState<'belum_transaksi' | 'salesman' | 'channel' | 'rayon' | 'area' | 'pma'>('belum_transaksi');

  // Local quick filters for non-transacting outlets table
  const [historySegment, setHistorySegment] = useState<'ALL' | 'DROP_POTENTIAL' | 'DORMANT'>('ALL');
  const [localSalesmanFilter, setLocalSalesmanFilter] = useState<string>('ALL');
  const [localChannelFilter, setLocalChannelFilter] = useState<string>('ALL');
  const [localAreaFilter, setLocalAreaFilter] = useState<string>('ALL');

  if (!calculation || calculation.kpis.totalActiveOutlets === 0) {
    return (
      <EmptyState
        title="MASTER CB / ROA BELUM TERSEDIA"
        description="Upload Database Master CB/ROA (Database 4) untuk mengaktifkan analisa Repeat Order (RO) dan penetrasi outlet aktif."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const { 
    kpis, 
    salesmanPerformances, 
    channelBreakdown, 
    rayonBreakdown, 
    areaBreakdown, 
    pmaBreakdown = [], 
    outletsNotTransacted = [] 
  } = calculation;

  const prevLabel = settings.previousMonthLabel && !settings.previousMonthLabel.toUpperCase().includes('AGUSTUS') 
    ? settings.previousMonthLabel 
    : 'SEPTEMBER 2026';
  const currLabel = settings.currentMonthLabel && !settings.currentMonthLabel.toUpperCase().includes('AGUSTUS') && settings.currentMonthLabel !== prevLabel 
    ? settings.currentMonthLabel 
    : 'OKTOBER 2026';

  // 1. Identify active global filters
  const activeFiltersSummary: { label: string; value: string }[] = [];
  if (filters.salesmanId) {
    const val = Array.isArray(filters.salesmanId) ? filters.salesmanId.join(', ') : filters.salesmanId;
    if (val && val !== 'ALL') activeFiltersSummary.push({ label: 'Salesman', value: val });
  }
  if (filters.channel) {
    const val = Array.isArray(filters.channel) ? filters.channel.join(', ') : filters.channel;
    if (val && val !== 'ALL') activeFiltersSummary.push({ label: 'Channel', value: val });
  }
  if (filters.area) {
    const val = Array.isArray(filters.area) ? filters.area.join(', ') : filters.area;
    if (val && val !== 'ALL') activeFiltersSummary.push({ label: 'Area', value: val });
  }
  if (filters.rayon) {
    const val = Array.isArray(filters.rayon) ? filters.rayon.join(', ') : filters.rayon;
    if (val && val !== 'ALL') activeFiltersSummary.push({ label: 'Rayon', value: val });
  }
  if (filters.cabang) {
    const val = Array.isArray(filters.cabang) ? filters.cabang.join(', ') : filters.cabang;
    if (val && val !== 'ALL') activeFiltersSummary.push({ label: 'Cabang', value: val });
  }
  if (filters.pma) {
    const val = Array.isArray(filters.pma) ? filters.pma.join(', ') : filters.pma;
    if (val && val !== 'ALL') activeFiltersSummary.push({ label: 'PMA', value: val });
  }

  const hasActiveGlobalFilters = activeFiltersSummary.length > 0;

  // Extract unique filter dropdown options from outletsNotTransacted & calculation
  const uniqueSalesmen = useMemo(() => {
    const map = new Map<string, string>();
    outletsNotTransacted.forEach(o => {
      if (o.salesmanId) {
        map.set(o.salesmanId, o.salesmanName || o.salesmanId);
      }
    });
    salesmanPerformances.forEach(s => {
      if (s.salesmanId) {
        map.set(s.salesmanId, s.salesmanName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [outletsNotTransacted, salesmanPerformances]);

  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    outletsNotTransacted.forEach(o => {
      if (o.channel) set.add(o.channel);
    });
    channelBreakdown.forEach(c => {
      if (c.channel) set.add(c.channel);
    });
    return Array.from(set).sort();
  }, [outletsNotTransacted, channelBreakdown]);

  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    outletsNotTransacted.forEach(o => {
      if (o.area) set.add(o.area);
    });
    areaBreakdown.forEach(a => {
      if (a.area) set.add(a.area);
    });
    return Array.from(set).sort();
  }, [outletsNotTransacted, areaBreakdown]);

  // Handle bidirectional filter change
  const handleSalesmanFilterChange = (slsId: string) => {
    setLocalSalesmanFilter(slsId);
    if (onFilterChange) {
      if (slsId === 'ALL') {
        const { salesmanId, ...rest } = filters;
        onFilterChange(rest);
      } else {
        onFilterChange({ ...filters, salesmanId: slsId });
      }
    }
  };

  const handleChannelFilterChange = (ch: string) => {
    setLocalChannelFilter(ch);
    if (onFilterChange) {
      if (ch === 'ALL') {
        const { channel, ...rest } = filters;
        onFilterChange(rest);
      } else {
        onFilterChange({ ...filters, channel: ch });
      }
    }
  };

  const handleAreaFilterChange = (area: string) => {
    setLocalAreaFilter(area);
    if (onFilterChange) {
      if (area === 'ALL') {
        const { area: a, ...rest } = filters;
        onFilterChange(rest);
      } else {
        onFilterChange({ ...filters, area });
      }
    }
  };

  const handleResetFilters = () => {
    setLocalSalesmanFilter('ALL');
    setLocalChannelFilter('ALL');
    setLocalAreaFilter('ALL');
    setHistorySegment('ALL');
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  // 2. Filter non-transacting outlets based on history segment & local selections
  const displayedNonTransacting = useMemo(() => {
    return outletsNotTransacted.filter(row => {
      // History Segment filter
      if (historySegment === 'DROP_POTENTIAL' && row.salesPrevious <= 0) return false;
      if (historySegment === 'DORMANT' && row.salesPrevious > 0) return false;

      // Local Salesman filter (if not already handled by calculation)
      if (localSalesmanFilter !== 'ALL' && row.salesmanId !== localSalesmanFilter) {
        return false;
      }

      // Local Channel filter
      if (localChannelFilter !== 'ALL' && row.channel !== localChannelFilter) {
        return false;
      }

      // Local Area filter
      if (localAreaFilter !== 'ALL' && row.area !== localAreaFilter) {
        return false;
      }

      return true;
    });
  }, [outletsNotTransacted, historySegment, localSalesmanFilter, localChannelFilter, localAreaFilter]);

  // Aggregate summary for non-transacting outlets
  const nonTransactingStats = useMemo(() => {
    const total = displayedNonTransacting.length;
    const dropPotential = displayedNonTransacting.filter(o => o.salesPrevious > 0);
    const dormant = displayedNonTransacting.filter(o => !o.salesPrevious || o.salesPrevious === 0);
    const lostRevenuePotential = dropPotential.reduce((acc, o) => acc + (o.salesPrevious || 0), 0);
    const paretoHighRisk = dropPotential.filter(o => o.salesPrevious >= 5000000);

    return {
      total,
      dropPotentialCount: dropPotential.length,
      dormantCount: dormant.length,
      lostRevenuePotential,
      paretoHighRiskCount: paretoHighRisk.length,
    };
  }, [displayedNonTransacting]);

  // Columns for OUTLET BELUM TRANSAKSI
  const nonTransactingColumns: ColumnDef<NonTransactingOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet',
      width: '130px',
      render: (row) => (
        <span className="font-mono text-cyan-400 font-bold text-xs tracking-wider">
          {row.outletId}
        </span>
      ),
    },
    {
      key: 'outletName',
      header: 'Nama Outlet',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-100 text-xs">{row.outletName}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
              {row.channel || 'GENERAL'}
            </span>
            <span>·</span>
            <span>{row.rayon || row.area || 'Pusat'}</span>
            {row.pma && (
              <>
                <span>·</span>
                <span className="text-amber-400/90 font-mono">PMA: {row.pma}</span>
              </>
            )}
            {row.fc && (
              <>
                <span>·</span>
                <span className="text-cyan-400/90 font-mono">FC: {row.fc}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman (KD SLS)',
      render: (row) => (
        <div>
          <div className="text-slate-200 font-medium text-xs">{row.salesmanName || '-'}</div>
          <div className="text-[10px] text-cyan-400 font-mono">{row.salesmanId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Wilayah / Rayon',
      render: (row) => (
        <div className="text-xs">
          <div className="text-slate-300 font-medium">{row.area || '-'}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.rayon || '-'}</div>
        </div>
      ),
    },
    {
      key: 'salesPrevious',
      header: `Sales ${prevLabel} (IDR)`,
      align: 'right',
      accessor: (row) => row.salesPrevious,
      render: (row) => (
        <div className="text-right">
          {row.salesPrevious > 0 ? (
            <div>
              <span className="font-mono font-bold text-amber-300 text-xs">
                {formatRupiah(row.salesPrevious)}
              </span>
              <div className="text-[10px] text-rose-400 font-semibold">Pernah Order</div>
            </div>
          ) : (
            <div>
              <span className="font-mono text-slate-500 text-xs">Rp 0</span>
              <div className="text-[10px] text-slate-500">Belum Ada Order</div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'salesCurrent',
      header: `Sales ${currLabel} (IDR)`,
      align: 'right',
      accessor: () => 0,
      render: () => (
        <div className="text-right">
          <span className="font-mono text-rose-400 font-bold text-xs bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Rp 0
          </span>
          <div className="text-[10px] text-rose-400/80 mt-0.5">Belum Transaksi</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Kategori',
      align: 'center',
      render: (row) => {
        if (row.salesPrevious > 0) {
          return (
            <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap inline-flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-pulse" />
              <span>Potensi Drop RO</span>
            </span>
          );
        }
        return (
          <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap inline-flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            <span>Belum Order (Dormant)</span>
          </span>
        );
      },
    },
    {
      key: 'recommendation',
      header: 'Rekomendasi Tindakan',
      render: (row) => {
        if (row.salesPrevious >= 5000000) {
          return (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Prioritas Tinggi: Kunjungan Segera (Pareto)</span>
            </div>
          );
        }
        if (row.salesPrevious > 0) {
          return (
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Follow-up Repeat Order (Cek Stok)</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Kunjungan Penetrasi & Program Baru</span>
          </div>
        );
      },
    },
  ];

  // Salesman RO columns
  const slsColumns: ColumnDef<SalesmanPerformanceItem>[] = [
    {
      key: 'salesmanId',
      header: 'KD SLS',
      render: (row) => <span className="font-mono text-cyan-400 text-xs font-semibold">{row.salesmanId}</span>,
    },
    {
      key: 'salesmanName',
      header: 'Nama Salesman',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.area || '-'}</div>
        </div>
      ),
    },
    {
      key: 'activeOutlets',
      header: 'Outlet Aktif',
      align: 'right',
      accessor: (row) => row.activeOutlets,
      render: (row) => <span className="font-mono text-slate-200 font-semibold">{row.activeOutlets}</span>,
    },
    {
      key: 'transactingOutlets',
      header: 'Sudah Transaksi',
      align: 'right',
      accessor: (row) => row.transactingOutlets,
      render: (row) => <span className="font-mono text-emerald-400 font-semibold">{row.transactingOutlets}</span>,
    },
    {
      key: 'nonTransactingOutlets',
      header: 'Belum Transaksi',
      align: 'right',
      accessor: (row) => row.nonTransactingOutlets,
      render: (row) => (
        <button
          onClick={() => {
            handleSalesmanFilterChange(row.salesmanId);
            setActiveTab('belum_transaksi');
          }}
          className="font-mono text-amber-400 font-semibold hover:underline flex items-center justify-end gap-1 ml-auto group"
          title="Klik untuk melihat daftar outlet belum transaksi salesman ini"
        >
          <span>{row.nonTransactingOutlets}</span>
          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ),
    },
    {
      key: 'roRate',
      header: 'RO % (Repeat Order)',
      align: 'right',
      accessor: (row) => row.roRate ?? -1,
      render: (row) => {
        if (row.roRate === null) {
          return <span className="font-mono text-slate-500 text-xs">N/A</span>;
        }
        const isGood = row.roRate >= 70;
        return (
          <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
            isGood ? 'bg-emerald-500/20 text-emerald-300' : row.roRate >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {row.roRate.toFixed(1)}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span>RO Monitoring (Repeat Order Penetrasi Outlet Aktif)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Berdasarkan Master CB/ROA dengan aturan aktif: <span className="font-mono text-slate-300">{settings.outletActiveRule.columnName} = "{settings.outletActiveRule.expectedValue}"</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`RO_Monitoring_Penetrasi_Outlet_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          {/* Global Filter Indicator Badge */}
          {hasActiveGlobalFilters && (
            <div className="flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/50 rounded-xl px-3 py-1.5 text-xs text-cyan-300">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filter Aktif ({activeFiltersSummary.length}): {activeFiltersSummary.map(f => `${f.label}: ${f.value}`).join(' | ')}</span>
              <button
                onClick={handleResetFilters}
                className="ml-2 text-[11px] underline hover:text-white"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 RO Core KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Total Outlet Aktif */}
        <div 
          onClick={() => setActiveTab('salesman')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>TOTAL OUTLET AKTIF</span>
            <Store className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-2">
            {kpis.totalActiveOutlets} Toko
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Master CB (Status OK)</div>
        </div>

        {/* 2. Outlet Sudah Transaksi */}
        <div 
          onClick={() => setActiveTab('salesman')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-emerald-500 hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>OUTLET SUDAH TRANSAKSI</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-2">
            {kpis.outletsTransactedCurrent} Toko
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Transaksi &gt; 0 pada {currLabel}</div>
        </div>

        {/* 3. Outlet Belum Transaksi (Clickable to switch to OUTLET BELUM TRANSAKSI tab) */}
        <div 
          onClick={() => setActiveTab('belum_transaksi')}
          className={`rounded-xl p-4 shadow-sm border-l-4 border-l-amber-500 transition-all cursor-pointer group ${
            activeTab === 'belum_transaksi'
              ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-400/40 shadow-amber-950/20'
              : 'bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80'
          }`}
        >
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>OUTLET BELUM TRANSAKSI</span>
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-2 flex items-center justify-between">
            <span>{kpis.outletsNotTransactedCurrent} Toko</span>
            <span className="text-[10px] font-sans font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              Lihat Detail &rarr;
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Target Akselerasi Kunjungan</div>
        </div>

        {/* 4. Repeat Order (RO) % */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-cyan-500">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>REPEAT ORDER (RO) %</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-2">
            {kpis.repeatOrderRate !== null ? `${kpis.repeatOrderRate.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Transaksi / Aktif &times; 100</div>
        </div>
      </div>

      {/* Visual Segment Distribution Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center justify-between">
          <span>Rasio Penetrasi Outlet Aktif Bulan {currLabel}</span>
          <span className="font-mono text-cyan-400 text-xs font-semibold">
            {kpis.outletsTransactedCurrent} dari {kpis.totalActiveOutlets} Outlet Telah Order
          </span>
        </h3>

        {/* Stacked Progress Bar */}
        <div className="w-full bg-slate-950 rounded-xl h-5 overflow-hidden flex border border-slate-800">
          <div
            className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-slate-950 transition-all duration-500"
            style={{ width: `${kpis.repeatOrderRate || 0}%` }}
          >
            {kpis.repeatOrderRate !== null && kpis.repeatOrderRate > 10 ? `${kpis.repeatOrderRate.toFixed(1)}% Transaksi` : ''}
          </div>
          <div
            onClick={() => setActiveTab('belum_transaksi')}
            className="bg-slate-700 hover:bg-slate-600 cursor-pointer h-full flex items-center justify-center text-[10px] font-bold text-slate-300 transition-all duration-500"
            style={{ width: `${100 - (kpis.repeatOrderRate || 0)}%` }}
            title="Klik untuk membuka daftar Outlet Belum Transaksi"
          >
            {kpis.repeatOrderRate !== null && (100 - kpis.repeatOrderRate > 10) ? `${(100 - kpis.repeatOrderRate).toFixed(1)}% Belum Transaksi` : ''}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
          <button
            onClick={() => setActiveTab('salesman')}
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
          >
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Outlet Sudah Transaksi ({kpis.outletsTransactedCurrent} Toko)</span>
          </button>
          <button
            onClick={() => setActiveTab('belum_transaksi')}
            className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors font-medium"
          >
            <span className="w-3 h-3 rounded-full bg-slate-700 border border-amber-400" />
            <span>Outlet Belum Transaksi ({kpis.outletsNotTransactedCurrent} Toko) - <strong className="underline">Klik untuk Buka Tabel</strong></span>
          </button>
        </div>
      </div>

      {/* Breakdown Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {/* Tab 1: OUTLET BELUM TRANSAKSI */}
        <button
          onClick={() => setActiveTab('belum_transaksi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'belum_transaksi'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-500/30'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Outlet Belum Transaksi ({displayedNonTransacting.length})</span>
        </button>

        {/* Tab 2: Salesman RO */}
        <button
          onClick={() => setActiveTab('salesman')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'salesman'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>RO per Salesman ({salesmanPerformances.length})</span>
        </button>

        {/* Tab 3: Channel RO */}
        <button
          onClick={() => setActiveTab('channel')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'channel'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>RO per Channel ({channelBreakdown.length})</span>
        </button>

        {/* Tab 4: Rayon RO */}
        <button
          onClick={() => setActiveTab('rayon')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'rayon'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>RO per Rayon ({rayonBreakdown.length})</span>
        </button>

        {/* Tab 5: Area RO */}
        <button
          onClick={() => setActiveTab('area')}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'area'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>RO per Area ({areaBreakdown.length})</span>
        </button>

        {/* Tab 6: PMA RO */}
        {pmaBreakdown.length > 0 && (
          <button
            onClick={() => setActiveTab('pma')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'pma'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>RO per PMA ({pmaBreakdown.length})</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB: OUTLET BELUM TRANSAKSI                              */}
      {/* ======================================================== */}
      {activeTab === 'belum_transaksi' && (
        <div className="space-y-5">
          {/* Synchronized Notice Banner */}
          {hasActiveGlobalFilters && (
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Data Outlet Belum Transaksi tersinkronisasi penuh dengan Filter Global: Menampilkan <strong>{displayedNonTransacting.length}</strong> toko.
                </span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-[11px] underline hover:text-white"
              >
                Reset Semua Filter
              </button>
            </div>
          )}

          {/* Sub-KPI Summary Cards for Belum Transaksi */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Total Belum Transaksi</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-2">
                {nonTransactingStats.total} Toko
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Outlet Aktif Tanpa Order {currLabel}</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-rose-500">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Potensi Drop (Pernah Beli)</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-300 mt-2">
                {nonTransactingStats.dropPotentialCount} Toko
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Order pada {prevLabel}, Masih Rp 0</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-amber-500">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Estimasi Omset Berisiko</span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-300 mt-2 truncate">
                {formatRupiah(nonTransactingStats.lostRevenuePotential)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Total Sales {prevLabel} yang Hilang</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-slate-600">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Belum Order (Dormant)</span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-300 mt-2">
                {nonTransactingStats.dormantCount} Toko
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Tidak Ada Riwayat 2 Bulan Terakhir</div>
            </div>
          </div>

          {/* Quick Filter Control Bar (Tersinkron dengan Global Filter) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* History Segment Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: `Semua Belum Transaksi (${outletsNotTransacted.length})` },
                  { id: 'DROP_POTENTIAL', label: `Potensi Drop / Pernah Beli (${outletsNotTransacted.filter(o => o.salesPrevious > 0).length})` },
                  { id: 'DORMANT', label: `Belum Pernah Order (${outletsNotTransacted.filter(o => !o.salesPrevious || o.salesPrevious === 0).length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setHistorySegment(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      historySegment === tab.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Reset filter button if any local or global filter is set */}
              {(historySegment !== 'ALL' || localSalesmanFilter !== 'ALL' || localChannelFilter !== 'ALL' || localAreaFilter !== 'ALL' || hasActiveGlobalFilters) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* In-view Synchronized Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
              {/* Salesman filter */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-400 whitespace-nowrap">Salesman:</span>
                <select
                  value={localSalesmanFilter}
                  onChange={(e) => handleSalesmanFilterChange(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">Semua Salesman</option>
                  {uniqueSalesmen.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900">
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel filter */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-400 whitespace-nowrap">Channel:</span>
                <select
                  value={localChannelFilter}
                  onChange={(e) => handleChannelFilterChange(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">Semua Channel</option>
                  {uniqueChannels.map(c => (
                    <option key={c} value={c} className="bg-slate-900">{c}</option>
                  ))}
                </select>
              </div>

              {/* Area filter */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs text-slate-400 whitespace-nowrap">Area:</span>
                <select
                  value={localAreaFilter}
                  onChange={(e) => handleAreaFilterChange(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">Semua Area</option>
                  {uniqueAreas.map(a => (
                    <option key={a} value={a} className="bg-slate-900">{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DataTable of OUTLET BELUM TRANSAKSI */}
          <DataTable
            title={`Daftar Outlet Belum Transaksi (${currLabel})`}
            columns={nonTransactingColumns}
            data={displayedNonTransacting}
            searchPlaceholder="Cari kode outlet, nama toko, salesman, atau channel..."
            pageSizeDefault={15}
            exportFileName={`Daftar_Outlet_Belum_Transaksi_${currLabel}.xlsx`}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: SALESMAN RO                                         */}
      {/* ======================================================== */}
      {activeTab === 'salesman' && (
        <DataTable
          title="Tabel Monitoring RO per Salesman"
          columns={slsColumns}
          data={salesmanPerformances}
          searchPlaceholder="Cari salesman..."
          exportFileName={`RO_Monitoring_Salesman_${currLabel}.xlsx`}
        />
      )}

      {/* ======================================================== */}
      {/* TAB: CHANNEL RO                                          */}
      {/* ======================================================== */}
      {activeTab === 'channel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 mb-4">Penetrasi RO Berdasarkan Channel Outlet</h3>
          <div className="space-y-4">
            {channelBreakdown.map(ch => (
              <div key={ch.channel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{ch.channel}</span>
                  <div className="font-mono text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">{ch.transactedOutlets}</span> / {ch.activeOutlets} Outlet
                    <span className="text-cyan-400 font-bold ml-2">({ch.roRate !== null ? `${ch.roRate.toFixed(1)}%` : 'N/A'})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${ch.roRate || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: RAYON RO                                            */}
      {/* ======================================================== */}
      {activeTab === 'rayon' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 mb-4">Penetrasi RO Berdasarkan Rayon</h3>
          <div className="space-y-4">
            {rayonBreakdown.map(ry => (
              <div key={ry.rayon} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{ry.rayon}</span>
                  <div className="font-mono text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">{ry.transactedOutlets}</span> / {ry.activeOutlets} Outlet
                    <span className="text-cyan-400 font-bold ml-2">({ry.roRate !== null ? `${ry.roRate.toFixed(1)}%` : 'N/A'})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${ry.roRate || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: AREA RO                                             */}
      {/* ======================================================== */}
      {activeTab === 'area' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 mb-4">Penetrasi RO Berdasarkan Area</h3>
          <div className="space-y-4">
            {areaBreakdown.map(ar => (
              <div key={ar.area} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{ar.area}</span>
                  <div className="font-mono text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">{ar.transactedOutlets}</span> / {ar.activeOutlets} Outlet
                    <span className="text-cyan-400 font-bold ml-2">({ar.roRate !== null ? `${ar.roRate.toFixed(1)}%` : 'N/A'})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${ar.roRate || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: PMA RO                                              */}
      {/* ======================================================== */}
      {activeTab === 'pma' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 mb-4">Penetrasi RO Berdasarkan Klasifikasi PMA</h3>
          <div className="space-y-4">
            {pmaBreakdown.map(pm => (
              <div key={pm.pma} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">PMA: {pm.pma}</span>
                  <div className="font-mono text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">{pm.transactedOutlets}</span> / {pm.activeOutlets} Outlet
                    <span className="text-cyan-400 font-bold ml-2">({pm.roRate !== null ? `${pm.roRate.toFixed(1)}%` : 'N/A'})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pm.roRate || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
