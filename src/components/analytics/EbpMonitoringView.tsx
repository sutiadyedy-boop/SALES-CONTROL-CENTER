import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Store, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Minus, 
  Search, 
  Filter, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Building2, 
  Layers, 
  Lightbulb,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import { MasterOutletRecord, TransactionRecord, AppSettings, DatabaseCategory, RawUploadedFile } from '../../types/database';
import { GlobalFilterState } from '../../types/analytics';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

export interface EbpMonitoringViewProps {
  masterOutlets: MasterOutletRecord[];
  currTransactions: TransactionRecord[];
  prevTransactions: TransactionRecord[];
  uploadedFiles?: Record<DatabaseCategory, RawUploadedFile[]>;
  settings: AppSettings;
  filters?: GlobalFilterState;
  onFilterChange?: (newFilters: GlobalFilterState) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export type EbpStatus = 'GROWTH' | 'STABIL' | 'DECLINE' | 'NEW';

export interface EbpOutletItem {
  no: number;
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  depo: string;
  cabang: string;
  area: string;
  channel: string;
  rayon: string;
  epbPrev: number;
  epbCurr: number;
  diff: number;
  growthPercent: number;
  status: EbpStatus;
}

/**
 * Extracts EPB from a collection of transactions for an outlet.
 * Inspects the 'markNew' field (from column MARK NEW in raw uploaded data).
 * If values are numeric, sums them; if text flags/categories, counts records where MARK NEW is present.
 */
function calculateOutletEpb(txs: TransactionRecord[]): number {
  if (!txs || txs.length === 0) return 0;

  let numericSum = 0;
  let hasNumeric = false;
  let markNewCount = 0;

  for (const t of txs) {
    if (t.markNew !== undefined && t.markNew !== null) {
      const strVal = String(t.markNew).trim();
      if (strVal !== '' && strVal !== '-' && strVal !== '0') {
        const num = parseFloat(strVal.replace(/,/g, ''));
        if (!isNaN(num) && isFinite(num) && num > 0) {
          numericSum += num;
          hasNumeric = true;
        } else {
          markNewCount += 1;
        }
      }
    }
  }

  if (hasNumeric && numericSum > 0) {
    return Math.round(numericSum);
  }

  // If text categories like "ECERAN KIOS" or count of records
  return markNewCount > 0 ? markNewCount : (txs.length > 0 ? txs.length : 0);
}

export function EbpMonitoringView({
  masterOutlets = [],
  currTransactions = [],
  prevTransactions = [],
  settings,
  filters = {},
  onFilterChange,
  onNavigateToUpload,
  onLoadSampleData,
}: EbpMonitoringViewProps) {
  // Local Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');
  const [selectedDepo, setSelectedDepo] = useState<string>('ALL');
  const [selectedEpbCurrFilter, setSelectedEpbCurrFilter] = useState<'ALL' | 'HAS_EPB' | 'ZERO_EPB'>('ALL');
  const [selectedEpbPrevFilter, setSelectedEpbPrevFilter] = useState<'ALL' | 'HAS_EPB' | 'ZERO_EPB'>('ALL');
  const [activeRankingTab, setActiveRankingTab] = useState<'growth' | 'decline' | 'top_epb'>('growth');

  const prevLabel = settings.previousMonthLabel || 'BULAN LALU';
  const currLabel = settings.currentMonthLabel || 'BULAN INI';

  // 1. Check if Master CB is available
  if (!masterOutlets || masterOutlets.length === 0) {
    return (
      <EmptyState
        title="MASTER CB BELUM TERSEDIA"
        description="Upload Database Master CB (Database 4) sebagai sumber utama daftar toko untuk mengaktifkan EBP Monitoring (Monitoring Eceran Per Bulan)."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  // 2. Pre-index transactions by outletId and outletName for fast lookup
  const { prevTxsByOutletId, prevTxsByName } = useMemo(() => {
    const byId = new Map<string, TransactionRecord[]>();
    const byName = new Map<string, TransactionRecord[]>();
    for (const t of prevTransactions) {
      if (t.outletId) {
        const list = byId.get(t.outletId) || [];
        list.push(t);
        byId.set(t.outletId, list);
      }
      if (t.outletName) {
        const clean = t.outletName.toLowerCase().trim();
        const list = byName.get(clean) || [];
        list.push(t);
        byName.set(clean, list);
      }
    }
    return { prevTxsByOutletId: byId, prevTxsByName: byName };
  }, [prevTransactions]);

  const { currTxsByOutletId, currTxsByName } = useMemo(() => {
    const byId = new Map<string, TransactionRecord[]>();
    const byName = new Map<string, TransactionRecord[]>();
    for (const t of currTransactions) {
      if (t.outletId) {
        const list = byId.get(t.outletId) || [];
        list.push(t);
        byId.set(t.outletId, list);
      }
      if (t.outletName) {
        const clean = t.outletName.toLowerCase().trim();
        const list = byName.get(clean) || [];
        list.push(t);
        byName.set(clean, list);
      }
    }
    return { currTxsByOutletId: byId, currTxsByName: byName };
  }, [currTransactions]);

  // 3. Build complete EBP dataset strictly from Master CB
  const allEbpItems = useMemo<EbpOutletItem[]>(() => {
    return masterOutlets.map((m, index) => {
      // Find previous month transactions
      let pTxs = m.outletId ? prevTxsByOutletId.get(m.outletId) : undefined;
      if (!pTxs && m.outletName) {
        pTxs = prevTxsByName.get(m.outletName.toLowerCase().trim());
      }
      const epbPrev = pTxs ? calculateOutletEpb(pTxs) : 0;

      // Find current month transactions
      let cTxs = m.outletId ? currTxsByOutletId.get(m.outletId) : undefined;
      if (!cTxs && m.outletName) {
        cTxs = currTxsByName.get(m.outletName.toLowerCase().trim());
      }
      const epbCurr = cTxs ? calculateOutletEpb(cTxs) : 0;

      const diff = epbCurr - epbPrev;

      // Growth %: (Bulan Ini - Bulan Lalu) / Bulan Lalu * 100%
      // If EPB Bulan Lalu = 0: Bulan Ini > 0 -> NEW, Bulan Ini = 0 -> STABIL (no DIV/0!)
      let growthPercent = 0;
      if (epbPrev > 0) {
        growthPercent = ((epbCurr - epbPrev) / epbPrev) * 100;
      } else if (epbCurr > 0) {
        growthPercent = 100;
      } else {
        growthPercent = 0;
      }

      // Status determination
      let status: EbpStatus = 'STABIL';
      if (epbPrev === 0 && epbCurr > 0) {
        status = 'NEW';
      } else if (epbCurr > epbPrev) {
        status = 'GROWTH';
      } else if (epbCurr < epbPrev) {
        status = 'DECLINE';
      } else {
        status = 'STABIL';
      }

      return {
        no: index + 1,
        outletId: m.outletId || `OUTLET-${index + 1}`,
        outletName: m.outletName || 'Tanpa Nama',
        salesmanId: m.salesmanId || '',
        salesmanName: m.salesmanName || m.salesmanId || 'Unassigned',
        depo: m.depo || m.cabang || m.area || '-',
        cabang: m.cabang || '-',
        area: m.area || '-',
        channel: m.channel || '-',
        rayon: m.rayon || '-',
        epbPrev,
        epbCurr,
        diff,
        growthPercent,
        status,
      };
    });
  }, [masterOutlets, prevTxsByOutletId, prevTxsByName, currTxsByOutletId, currTxsByName]);

  // 4. Dropdown options for filters
  const uniqueSalesmen = useMemo(() => {
    const set = new Set<string>();
    allEbpItems.forEach(item => {
      if (item.salesmanName && item.salesmanName !== 'Unassigned') {
        set.add(item.salesmanName);
      }
    });
    return Array.from(set).sort();
  }, [allEbpItems]);

  const uniqueDepos = useMemo(() => {
    const set = new Set<string>();
    allEbpItems.forEach(item => {
      if (item.depo && item.depo !== '-') {
        set.add(item.depo);
      }
    });
    return Array.from(set).sort();
  }, [allEbpItems]);

  // 5. Apply filters
  const filteredItems = useMemo(() => {
    return allEbpItems.filter(item => {
      // Real-time Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          item.outletName.toLowerCase().includes(q) ||
          item.outletId.toLowerCase().includes(q) ||
          item.salesmanName.toLowerCase().includes(q) ||
          item.depo.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }

      // Salesman Filter
      if (selectedSalesman !== 'ALL' && item.salesmanName !== selectedSalesman) {
        return false;
      }

      // Depo Filter
      if (selectedDepo !== 'ALL' && item.depo !== selectedDepo) {
        return false;
      }

      // EPB Bulan Ini filter
      if (selectedEpbCurrFilter === 'HAS_EPB' && item.epbCurr === 0) return false;
      if (selectedEpbCurrFilter === 'ZERO_EPB' && item.epbCurr > 0) return false;

      // EPB Bulan Lalu filter
      if (selectedEpbPrevFilter === 'HAS_EPB' && item.epbPrev === 0) return false;
      if (selectedEpbPrevFilter === 'ZERO_EPB' && item.epbPrev > 0) return false;

      // Global filters if any
      if (filters?.salesmanId) {
        const val = Array.isArray(filters.salesmanId) ? filters.salesmanId : [filters.salesmanId];
        if (val.length > 0 && !val.includes('ALL') && !val.includes(item.salesmanId) && !val.includes(item.salesmanName)) {
          return false;
        }
      }
      if (filters?.depo) {
        const val = Array.isArray(filters.depo) ? filters.depo : [filters.depo];
        if (val.length > 0 && !val.includes('ALL') && !val.includes(item.depo)) {
          return false;
        }
      }
      if (filters?.area) {
        const val = Array.isArray(filters.area) ? filters.area : [filters.area];
        if (val.length > 0 && !val.includes('ALL') && !val.includes(item.area)) {
          return false;
        }
      }

      return true;
    });
  }, [allEbpItems, searchQuery, selectedStatus, selectedSalesman, selectedDepo, selectedEpbCurrFilter, selectedEpbPrevFilter, filters]);

  // Re-number filtered rows
  const numberedFilteredItems = useMemo(() => {
    return filteredItems.map((item, idx) => ({
      ...item,
      no: idx + 1,
    }));
  }, [filteredItems]);

  // 6. Calculate KPIs from filtered data
  const kpis = useMemo(() => {
    const totalToko = numberedFilteredItems.length;
    let epbBulanLalu = 0;
    let epbBulanIni = 0;
    let tokoGrowth = 0;
    let tokoDecline = 0;
    let tokoStabil = 0;
    let tokoNew = 0;

    for (const item of numberedFilteredItems) {
      epbBulanLalu += item.epbPrev;
      epbBulanIni += item.epbCurr;
      if (item.status === 'GROWTH') tokoGrowth++;
      else if (item.status === 'DECLINE') tokoDecline++;
      else if (item.status === 'STABIL') tokoStabil++;
      else if (item.status === 'NEW') tokoNew++;
    }

    const perubahanEpb = epbBulanIni - epbBulanLalu;
    const growthEpbPercent = epbBulanLalu > 0 
      ? ((epbBulanIni - epbBulanLalu) / epbBulanLalu) * 100 
      : (epbBulanIni > 0 ? 100 : 0);

    return {
      totalToko,
      epbBulanLalu,
      epbBulanIni,
      perubahanEpb,
      growthEpbPercent,
      tokoGrowth,
      tokoDecline,
      tokoStabil,
      tokoNew,
    };
  }, [numberedFilteredItems]);

  // 7. Automated Insights
  const insights = useMemo(() => {
    // Decline items sorted by largest decline
    const declineItems = numberedFilteredItems
      .filter(i => i.status === 'DECLINE')
      .sort((a, b) => a.diff - b.diff); // lowest (most negative) first

    // Growth items sorted by largest growth
    const growthItems = numberedFilteredItems
      .filter(i => i.status === 'GROWTH')
      .sort((a, b) => b.diff - a.diff);

    // New items sorted by highest epbCurr
    const newItems = numberedFilteredItems
      .filter(i => i.status === 'NEW')
      .sort((a, b) => b.epbCurr - a.epbCurr);

    // Stabil items
    const stabilItems = numberedFilteredItems.filter(i => i.status === 'STABIL');
    const stabilWithEpb = stabilItems.filter(i => i.epbCurr > 0);
    const stabilZero = stabilItems.filter(i => i.epbCurr === 0);

    return {
      declineItems: declineItems.slice(0, 5),
      growthItems: growthItems.slice(0, 5),
      newItems: newItems.slice(0, 5),
      totalDecline: declineItems.length,
      totalGrowth: growthItems.length,
      totalNew: newItems.length,
      totalStabil: stabilItems.length,
      stabilWithEpbCount: stabilWithEpb.length,
      stabilZeroCount: stabilZero.length,
    };
  }, [numberedFilteredItems]);

  // 8. Rankings
  const top10Growth = useMemo(() => {
    return numberedFilteredItems
      .filter(i => i.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 10);
  }, [numberedFilteredItems]);

  const top10Decline = useMemo(() => {
    return numberedFilteredItems
      .filter(i => i.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 10);
  }, [numberedFilteredItems]);

  const top10Epb = useMemo(() => {
    return numberedFilteredItems
      .filter(i => i.epbCurr > 0)
      .sort((a, b) => b.epbCurr - a.epbCurr)
      .slice(0, 10);
  }, [numberedFilteredItems]);

  // 9. Aggregation for visual comparisons (Top Salesman EPB comparison)
  const salesmanAggregates = useMemo(() => {
    const map = new Map<string, { name: string; prev: number; curr: number; stores: number }>();
    numberedFilteredItems.forEach(item => {
      const key = item.salesmanName || 'Unassigned';
      if (!map.has(key)) {
        map.set(key, { name: key, prev: 0, curr: 0, stores: 0 });
      }
      const entry = map.get(key)!;
      entry.prev += item.epbPrev;
      entry.curr += item.epbCurr;
      entry.stores += 1;
    });
    return Array.from(map.values())
      .sort((a, b) => (b.curr + b.prev) - (a.curr + a.prev))
      .slice(0, 6);
  }, [numberedFilteredItems]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedSalesman('ALL');
    setSelectedDepo('ALL');
    setSelectedEpbCurrFilter('ALL');
    setSelectedEpbPrevFilter('ALL');
    if (onFilterChange) onFilterChange({});
  };

  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    selectedStatus !== 'ALL' ||
    selectedSalesman !== 'ALL' ||
    selectedDepo !== 'ALL' ||
    selectedEpbCurrFilter !== 'ALL' ||
    selectedEpbPrevFilter !== 'ALL';

  // 10. Table Columns for DataTable
  const columns: ColumnDef<EbpOutletItem>[] = [
    {
      key: 'no',
      header: 'No',
      width: 'w-12',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-slate-400 text-xs">{row.no}</span>
      ),
    },
    {
      key: 'outletName',
      header: 'Toko',
      render: (row) => (
        <div className="py-0.5">
          <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{row.outletName}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
            <span className="text-cyan-400 font-semibold bg-cyan-950/40 px-1 rounded border border-cyan-800/40">
              {row.outletId}
            </span>
            {row.salesmanName && row.salesmanName !== 'Unassigned' && (
              <span className="text-slate-400 truncate max-w-[140px]" title={row.salesmanName}>
                &bull; {row.salesmanName}
              </span>
            )}
            {row.depo && row.depo !== '-' && (
              <span className="text-slate-500">
                &bull; {row.depo}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'epbPrev',
      header: `EPB ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.epbPrev,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-slate-300 font-semibold text-xs">
            {row.epbPrev.toLocaleString('id-ID')}
          </span>
          <div className="text-[10px] text-slate-500">EPB</div>
        </div>
      ),
    },
    {
      key: 'epbCurr',
      header: `EPB ${currLabel}`,
      align: 'right',
      accessor: (row) => row.epbCurr,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-amber-300 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {row.epbCurr.toLocaleString('id-ID')}
          </span>
          <div className="text-[10px] text-slate-500 mt-0.5">EPB</div>
        </div>
      ),
    },
    {
      key: 'diff',
      header: 'Selisih',
      align: 'right',
      accessor: (row) => row.diff,
      render: (row) => {
        const isPos = row.diff > 0;
        const isNeg = row.diff < 0;
        return (
          <div className="text-right font-mono text-xs font-bold">
            <span
              className={`inline-flex items-center gap-0.5 ${
                isPos
                  ? 'text-emerald-400'
                  : isNeg
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {isPos && <ArrowUpRight className="w-3 h-3" />}
              {isNeg && <ArrowDownRight className="w-3 h-3" />}
              {!isPos && !isNeg && <Minus className="w-3 h-3" />}
              <span>{isPos ? `+${row.diff}` : row.diff}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'growthPercent',
      header: 'Growth %',
      align: 'right',
      accessor: (row) => row.growthPercent,
      render: (row) => {
        if (row.status === 'NEW') {
          return (
            <span className="font-mono text-[11px] font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
              NEW (+100%)
            </span>
          );
        }
        if (row.status === 'STABIL' && row.epbPrev === 0 && row.epbCurr === 0) {
          return <span className="font-mono text-xs text-slate-500">0.0%</span>;
        }
        const isPos = row.growthPercent > 0;
        const isNeg = row.growthPercent < 0;
        return (
          <span
            className={`font-mono text-xs font-bold ${
              isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {isPos ? `+${row.growthPercent.toFixed(1)}%` : `${row.growthPercent.toFixed(1)}%`}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => {
        switch (row.status) {
          case 'GROWTH':
            return (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>GROWTH</span>
              </span>
            );
          case 'DECLINE':
            return (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>DECLINE</span>
              </span>
            );
          case 'NEW':
            return (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>NEW</span>
              </span>
            );
          case 'STABIL':
          default:
            return (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>STABIL</span>
              </span>
            );
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <span>EBP MONITORING</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MARK NEW
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Monitoring Eceran Per Bulan &bull; Sumber Utama Toko: <strong className="text-slate-200">Master CB</strong> &bull; Metrik: <strong className="text-amber-300 font-mono">MARK NEW</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`EBP_Monitoring_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Cards Section (9 KPI Cards as requested) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {/* KPI 1: TOTAL TOKO */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>TOTAL TOKO</span>
            <Store className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-100 mt-1.5">
            {kpis.totalToko.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Daftar Master CB</div>
        </div>

        {/* KPI 2: EPB BULAN LALU */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>EPB BLN LALU</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1.5">
            {kpis.epbBulanLalu.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{prevLabel}</div>
        </div>

        {/* KPI 3: EPB BULAN INI */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-amber-500/30 transition-all border-l-2 border-l-amber-500">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span className="text-amber-300 font-semibold">EPB BLN INI</span>
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300 mt-1.5">
            {kpis.epbBulanIni.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{currLabel}</div>
        </div>

        {/* KPI 4: PERUBAHAN EPB */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>PERUBAHAN</span>
            {kpis.perubahanEpb >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div
            className={`text-lg font-bold font-mono mt-1.5 ${
              kpis.perubahanEpb > 0
                ? 'text-emerald-400'
                : kpis.perubahanEpb < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {kpis.perubahanEpb > 0 ? `+${kpis.perubahanEpb}` : kpis.perubahanEpb}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Selisih Total EPB</div>
        </div>

        {/* KPI 5: GROWTH EPB */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>GROWTH %</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div
            className={`text-lg font-bold font-mono mt-1.5 ${
              kpis.growthEpbPercent > 0
                ? 'text-emerald-400'
                : kpis.growthEpbPercent < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {kpis.growthEpbPercent > 0 ? `+${kpis.growthEpbPercent.toFixed(1)}%` : `${kpis.growthEpbPercent.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Pertumbuhan EPB</div>
        </div>

        {/* KPI 6: TOKO GROWTH */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'GROWTH' ? 'ALL' : 'GROWTH')}
          className={`rounded-xl p-3 shadow-sm cursor-pointer transition-all border ${
            selectedStatus === 'GROWTH'
              ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="text-[11px] text-emerald-300 font-medium flex items-center justify-between">
            <span>TOKO GROWTH</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-300 mt-1.5">
            {kpis.tokoGrowth}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">EPB Meningkat &rarr;</div>
        </div>

        {/* KPI 7: TOKO DECLINE */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'DECLINE' ? 'ALL' : 'DECLINE')}
          className={`rounded-xl p-3 shadow-sm cursor-pointer transition-all border ${
            selectedStatus === 'DECLINE'
              ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div className="text-[11px] text-rose-300 font-medium flex items-center justify-between">
            <span>TOKO DECLINE</span>
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-300 mt-1.5">
            {kpis.tokoDecline}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">EPB Menurun &rarr;</div>
        </div>

        {/* KPI 8: TOKO STABIL */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'STABIL' ? 'ALL' : 'STABIL')}
          className={`rounded-xl p-3 shadow-sm cursor-pointer transition-all border ${
            selectedStatus === 'STABIL'
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="text-[11px] text-amber-300 font-medium flex items-center justify-between">
            <span>TOKO STABIL</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300 mt-1.5">
            {kpis.tokoStabil}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">EPB Tetap &rarr;</div>
        </div>

        {/* KPI 9: TOKO NEW */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'NEW' ? 'ALL' : 'NEW')}
          className={`rounded-xl p-3 shadow-sm cursor-pointer transition-all border ${
            selectedStatus === 'NEW'
              ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <div className="text-[11px] text-cyan-300 font-medium flex items-center justify-between">
            <span>TOKO NEW</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300 mt-1.5">
            {kpis.tokoNew}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Baru Ada EPB &rarr;</div>
        </div>
      </div>

      {/* 3. Visual Charts & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart A: Distribusi Status Toko */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Distribusi Status Toko EBP</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Total {kpis.totalToko} Toko
            </span>
          </div>

          {/* Multi-segment distribution progress bar */}
          <div className="w-full bg-slate-950 rounded-xl h-5 overflow-hidden flex border border-slate-800 my-3">
            {kpis.totalToko > 0 && (
              <>
                <div
                  className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-300 cursor-pointer"
                  style={{ width: `${(kpis.tokoGrowth / kpis.totalToko) * 100}%` }}
                  title={`Growth: ${kpis.tokoGrowth} toko (${((kpis.tokoGrowth / kpis.totalToko) * 100).toFixed(1)}%)`}
                  onClick={() => setSelectedStatus(selectedStatus === 'GROWTH' ? 'ALL' : 'GROWTH')}
                />
                <div
                  className="bg-cyan-500 hover:bg-cyan-400 transition-all duration-300 cursor-pointer"
                  style={{ width: `${(kpis.tokoNew / kpis.totalToko) * 100}%` }}
                  title={`New: ${kpis.tokoNew} toko (${((kpis.tokoNew / kpis.totalToko) * 100).toFixed(1)}%)`}
                  onClick={() => setSelectedStatus(selectedStatus === 'NEW' ? 'ALL' : 'NEW')}
                />
                <div
                  className="bg-amber-400 hover:bg-amber-300 transition-all duration-300 cursor-pointer"
                  style={{ width: `${(kpis.tokoStabil / kpis.totalToko) * 100}%` }}
                  title={`Stabil: ${kpis.tokoStabil} toko (${((kpis.tokoStabil / kpis.totalToko) * 100).toFixed(1)}%)`}
                  onClick={() => setSelectedStatus(selectedStatus === 'STABIL' ? 'ALL' : 'STABIL')}
                />
                <div
                  className="bg-rose-500 hover:bg-rose-400 transition-all duration-300 cursor-pointer"
                  style={{ width: `${(kpis.tokoDecline / kpis.totalToko) * 100}%` }}
                  title={`Decline: ${kpis.tokoDecline} toko (${((kpis.tokoDecline / kpis.totalToko) * 100).toFixed(1)}%)`}
                  onClick={() => setSelectedStatus(selectedStatus === 'DECLINE' ? 'ALL' : 'DECLINE')}
                />
              </>
            )}
          </div>

          {/* Interactive Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'GROWTH' ? 'ALL' : 'GROWTH')}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedStatus === 'GROWTH'
                  ? 'bg-emerald-950/40 border-emerald-500/60'
                  : 'bg-slate-950/40 border-slate-800 hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Growth</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-300 mt-1">
                {kpis.tokoGrowth}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({kpis.totalToko > 0 ? ((kpis.tokoGrowth / kpis.totalToko) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'NEW' ? 'ALL' : 'NEW')}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedStatus === 'NEW'
                  ? 'bg-cyan-950/40 border-cyan-500/60'
                  : 'bg-slate-950/40 border-slate-800 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>New</span>
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                {kpis.tokoNew}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({kpis.totalToko > 0 ? ((kpis.tokoNew / kpis.totalToko) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'STABIL' ? 'ALL' : 'STABIL')}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedStatus === 'STABIL'
                  ? 'bg-amber-950/40 border-amber-500/60'
                  : 'bg-slate-950/40 border-slate-800 hover:border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Stabil</span>
              </div>
              <div className="text-sm font-bold font-mono text-amber-300 mt-1">
                {kpis.tokoStabil}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({kpis.totalToko > 0 ? ((kpis.tokoStabil / kpis.totalToko) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </button>

            <button
              onClick={() => setSelectedStatus(selectedStatus === 'DECLINE' ? 'ALL' : 'DECLINE')}
              className={`p-2 rounded-xl text-left border transition-all ${
                selectedStatus === 'DECLINE'
                  ? 'bg-rose-950/40 border-rose-500/60'
                  : 'bg-slate-950/40 border-slate-800 hover:border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Decline</span>
              </div>
              <div className="text-sm font-bold font-mono text-rose-300 mt-1">
                {kpis.tokoDecline}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({kpis.totalToko > 0 ? ((kpis.tokoDecline / kpis.totalToko) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Chart B: EPB Bulan Ini vs Bulan Lalu (Top Salesman / Total) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Perbandingan EPB: {prevLabel} vs {currLabel}</span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                <span>{prevLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span>{currLabel}</span>
              </div>
            </div>
          </div>

          {/* Aggregated Overall Bar */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200">Total Keseluruhan EPB</span>
              <div className="font-mono text-xs">
                <span className="text-indigo-400 font-semibold">{kpis.epbBulanLalu.toLocaleString('id-ID')}</span>
                <span className="text-slate-500 mx-1.5">&rarr;</span>
                <span className="text-amber-400 font-bold">{kpis.epbBulanIni.toLocaleString('id-ID')}</span>
                <span className={`ml-2 font-bold ${kpis.perubahanEpb >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({kpis.perubahanEpb >= 0 ? `+${kpis.perubahanEpb}` : kpis.perubahanEpb})
                </span>
              </div>
            </div>

            {/* Total Comparison Bar */}
            <div className="space-y-1">
              {(() => {
                const maxVal = Math.max(kpis.epbBulanLalu, kpis.epbBulanIni, 1);
                const prevW = (kpis.epbBulanLalu / maxVal) * 100;
                const currW = (kpis.epbBulanIni / maxVal) * 100;
                return (
                  <>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${prevW}%` }} />
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${currW}%` }} />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Salesman mini breakdown bars */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Top Kontributor Salesman EPB:
            </div>
            {salesmanAggregates.map(item => {
              const maxSls = Math.max(...salesmanAggregates.map(s => Math.max(s.prev, s.curr)), 1);
              const prevWidth = (item.prev / maxSls) * 100;
              const currWidth = (item.curr / maxSls) * 100;
              const diff = item.curr - item.prev;

              return (
                <div key={item.name} className="text-xs">
                  <div className="flex items-center justify-between text-slate-300 mb-0.5">
                    <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                    <div className="font-mono text-[11px]">
                      <span className="text-slate-400">{item.prev}</span>
                      <span className="text-slate-600 mx-1">&rarr;</span>
                      <span className="text-amber-300 font-bold">{item.curr}</span>
                      <span className={`ml-1.5 font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ({diff >= 0 ? `+${diff}` : diff})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex gap-0.5">
                      <div className="bg-indigo-500/80 h-full rounded-full" style={{ width: `${prevWidth}%` }} />
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex gap-0.5">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${currWidth}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Automated Insights Section (🔎 INSIGHT EBP) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>🔎 INSIGHT EBP</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Analisa otomatis berbasis data aktual pergerakan EPB (kolom MARK NEW)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {numberedFilteredItems.length} Toko Dianalisis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card A: 🔴 Eceran yang Perlu Perhatian */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>🔴 Eceran Perlu Perhatian ({insights.totalDecline})</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Toko dengan penurunan EPB terbesar yang membutuhkan intervensi kunjungan.
              </p>

              {insights.declineItems.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">
                  Tidak ada toko yang mengalami penurunan EPB.
                </div>
              ) : (
                <div className="space-y-2">
                  {insights.declineItems.map(item => (
                    <div key={item.outletId} className="p-2 rounded-lg bg-slate-950/60 border border-rose-500/20 text-xs">
                      <div className="font-semibold text-slate-200 truncate">{item.outletName}</div>
                      <div className="text-[11px] text-rose-300 mt-1 font-mono">
                        {item.outletName} mengalami penurunan EPB dari{' '}
                        <strong className="text-slate-200">{item.epbPrev}</strong> menjadi{' '}
                        <strong className="text-rose-400">{item.epbCurr}</strong>, turun{' '}
                        <strong className="text-rose-400">{Math.abs(item.diff)} EPB</strong> ({item.growthPercent.toFixed(1)}%).
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {insights.totalDecline > 5 && (
              <button
                onClick={() => setSelectedStatus('DECLINE')}
                className="mt-3 text-[11px] text-rose-300 hover:text-rose-200 font-medium underline flex items-center gap-1"
              >
                <span>Lihat semua {insights.totalDecline} toko decline &rarr;</span>
              </button>
            )}
          </div>

          {/* Card B: 🟢 Eceran dengan Pertumbuhan Baik */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>🟢 Pertumbuhan Baik ({insights.totalGrowth})</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Toko dengan penambahan EPB paling signifikan dibanding bulan sebelumnya.
              </p>

              {insights.growthItems.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">
                  Belum ada toko yang mengalami peningkatan EPB.
                </div>
              ) : (
                <div className="space-y-2">
                  {insights.growthItems.map(item => (
                    <div key={item.outletId} className="p-2 rounded-lg bg-slate-950/60 border border-emerald-500/20 text-xs">
                      <div className="font-semibold text-slate-200 truncate">{item.outletName}</div>
                      <div className="text-[11px] text-emerald-300 mt-1 font-mono">
                        {item.outletName} meningkat dari{' '}
                        <strong className="text-slate-200">{item.epbPrev}</strong> menjadi{' '}
                        <strong className="text-emerald-400">{item.epbCurr} EPB</strong>, bertambah{' '}
                        <strong className="text-emerald-400">{item.diff} EPB</strong> (+{item.growthPercent.toFixed(1)}%).
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {insights.totalGrowth > 5 && (
              <button
                onClick={() => setSelectedStatus('GROWTH')}
                className="mt-3 text-[11px] text-emerald-300 hover:text-emerald-200 font-medium underline flex items-center gap-1"
              >
                <span>Lihat semua {insights.totalGrowth} toko growth &rarr;</span>
              </button>
            )}
          </div>

          {/* Card C: 🔵 Eceran Baru (NEW) */}
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>🔵 Eceran Baru / NEW ({insights.totalNew})</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Toko di Master CB yang bulan lalu EPB = 0 dan baru memiliki EPB bulan ini.
              </p>

              {insights.newItems.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">
                  Tidak ada toko berstatus NEW pada periode ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {insights.newItems.map(item => (
                    <div key={item.outletId} className="p-2 rounded-lg bg-slate-950/60 border border-cyan-500/20 text-xs">
                      <div className="font-semibold text-slate-200 truncate">{item.outletName}</div>
                      <div className="text-[11px] text-cyan-300 mt-1 font-mono">
                        {item.outletName} baru mulai bertransaksi eceran bulan ini dengan jumlah{' '}
                        <strong className="text-cyan-300">{item.epbCurr} EPB</strong> (sebelumnya 0 EPB).
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {insights.totalNew > 5 && (
              <button
                onClick={() => setSelectedStatus('NEW')}
                className="mt-3 text-[11px] text-cyan-300 hover:text-cyan-200 font-medium underline flex items-center gap-1"
              >
                <span>Lihat semua {insights.totalNew} toko new &rarr;</span>
              </button>
            )}
          </div>

          {/* Card D: 🟡 Eceran Stabil */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>🟡 Eceran Stabil ({insights.totalStabil})</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Toko dengan jumlah EPB identik antara bulan lalu dan bulan berjalan.
              </p>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Konsisten Ber-EPB:</span>
                  <span className="font-mono font-bold text-amber-300">{insights.stabilWithEpbCount} Toko</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Belum Transaksi (EPB = 0):</span>
                  <span className="font-mono font-bold text-slate-400">{insights.stabilZeroCount} Toko</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  Toko stabil yang aktif mempertahankan ritme belanja eceran secara reguler setiap bulannya.
                </div>
              </div>
            </div>

            {insights.totalStabil > 0 && (
              <button
                onClick={() => setSelectedStatus('STABIL')}
                className="mt-3 text-[11px] text-amber-300 hover:text-amber-200 font-medium underline flex items-center gap-1"
              >
                <span>Lihat daftar {insights.totalStabil} toko stabil &rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Ranking Section (TOP 10 GROWTH, TOP 10 DECLINE, TOP 10 EPB) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Peringkat Toko EBP (Top 10 Rankings)
              </h3>
              <p className="text-[11px] text-slate-400">
                Ranking dinamis berbasis pergerakan dan akumulasi EPB bulan berjalan
              </p>
            </div>
          </div>

          {/* Ranking Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveRankingTab('growth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRankingTab === 'growth'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 Top 10 Growth
            </button>
            <button
              onClick={() => setActiveRankingTab('decline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRankingTab === 'decline'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔴 Top 10 Decline
            </button>
            <button
              onClick={() => setActiveRankingTab('top_epb')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeRankingTab === 'top_epb'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⭐ Top 10 EPB Tertinggi
            </button>
          </div>
        </div>

        {/* Ranking List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                <th className="py-2.5 px-3">Nama Toko</th>
                <th className="py-2.5 px-3">Salesman</th>
                <th className="py-2.5 px-3">Depo</th>
                <th className="py-2.5 px-3 text-right">EPB Lalu</th>
                <th className="py-2.5 px-3 text-right">EPB Ini</th>
                <th className="py-2.5 px-3 text-right">Selisih</th>
                <th className="py-2.5 px-3 text-right">Growth %</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(() => {
                const list = 
                  activeRankingTab === 'growth' ? top10Growth :
                  activeRankingTab === 'decline' ? top10Decline : top10Epb;

                if (list.length === 0) {
                  return (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                        Tidak ada data toko untuk kategori ranking ini.
                      </td>
                    </tr>
                  );
                }

                return list.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  const isThird = idx === 2;

                  return (
                    <tr key={item.outletId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-center font-mono">
                        {isFirst ? (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold inline-flex items-center justify-center text-[10px]">1</span>
                        ) : isSecond ? (
                          <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-bold inline-flex items-center justify-center text-[10px]">2</span>
                        ) : isThird ? (
                          <span className="w-5 h-5 rounded-full bg-amber-700 text-amber-100 font-bold inline-flex items-center justify-center text-[10px]">3</span>
                        ) : (
                          <span className="text-slate-500">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-200">{item.outletName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.outletId}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-400">{item.salesmanName}</td>
                      <td className="py-2 px-3 text-slate-400">{item.depo}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{item.epbPrev}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-300 font-bold">{item.epbCurr}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span className={item.diff > 0 ? 'text-emerald-400' : item.diff < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        <span className={item.diff > 0 ? 'text-emerald-400' : item.diff < 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {item.status === 'NEW' ? 'NEW (+100%)' : `${item.growthPercent >= 0 ? '+' : ''}${item.growthPercent.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.status === 'GROWTH' ? 'bg-emerald-500/20 text-emerald-300' :
                          item.status === 'DECLINE' ? 'bg-rose-500/20 text-rose-300' :
                          item.status === 'NEW' ? 'bg-cyan-500/20 text-cyan-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Filter Toolbar Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box (Real-time) */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Cari Nama Toko, Kode Toko, Salesman, Depo..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="GROWTH">🟢 GROWTH</option>
                <option value="STABIL">🟡 STABIL</option>
                <option value="DECLINE">🔴 DECLINE</option>
                <option value="NEW">🔵 NEW</option>
              </select>
            </div>

            {/* Filter Salesman */}
            {uniqueSalesmen.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px]">Salesman:</span>
                <select
                  value={selectedSalesman}
                  onChange={(e) => setSelectedSalesman(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[140px]"
                >
                  <option value="ALL">Semua Salesman ({uniqueSalesmen.length})</option>
                  {uniqueSalesmen.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Depo */}
            {uniqueDepos.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px]">Depo:</span>
                <select
                  value={selectedDepo}
                  onChange={(e) => setSelectedDepo(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[130px]"
                >
                  <option value="ALL">Semua Depo ({uniqueDepos.length})</option>
                  {uniqueDepos.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter EPB Bulan Ini */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">EPB Ini:</span>
              <select
                value={selectedEpbCurrFilter}
                onChange={(e) => setSelectedEpbCurrFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua</option>
                <option value="HAS_EPB">Ada EPB (&gt; 0)</option>
                <option value="ZERO_EPB">EPB = 0</option>
              </select>
            </div>

            {/* Filter EPB Bulan Lalu */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">EPB Lalu:</span>
              <select
                value={selectedEpbPrevFilter}
                onChange={(e) => setSelectedEpbPrevFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua</option>
                <option value="HAS_EPB">Ada EPB (&gt; 0)</option>
                <option value="ZERO_EPB">EPB = 0</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Status Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 mr-1">Quick Filter Status:</span>
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedStatus === 'ALL'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Semua Toko ({allEbpItems.length})
          </button>
          <button
            onClick={() => setSelectedStatus('GROWTH')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedStatus === 'GROWTH'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/30'
            }`}
          >
            🟢 GROWTH ({allEbpItems.filter(i => i.status === 'GROWTH').length})
          </button>
          <button
            onClick={() => setSelectedStatus('STABIL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedStatus === 'STABIL'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 border border-amber-500/30'
            }`}
          >
            🟡 STABIL ({allEbpItems.filter(i => i.status === 'STABIL').length})
          </button>
          <button
            onClick={() => setSelectedStatus('DECLINE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedStatus === 'DECLINE'
                ? 'bg-rose-500 text-slate-950 shadow-sm'
                : 'bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 border border-rose-500/30'
            }`}
          >
            🔴 DECLINE ({allEbpItems.filter(i => i.status === 'DECLINE').length})
          </button>
          <button
            onClick={() => setSelectedStatus('NEW')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedStatus === 'NEW'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 border border-cyan-500/30'
            }`}
          >
            🔵 NEW ({allEbpItems.filter(i => i.status === 'NEW').length})
          </button>

          <span className="ml-auto text-[11px] font-mono text-slate-500">
            Menampilkan {numberedFilteredItems.length} dari {allEbpItems.length} Toko Master CB
          </span>
        </div>
      </div>

      {/* 7. Monitoring Table (DataTable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <DataTable<EbpOutletItem>
          title="Tabel Monitoring EPB (Eceran Per Bulan)"
          columns={columns}
          data={numberedFilteredItems}
          searchPlaceholder="Cari toko pada tabel..."
          exportFileName={`EBP_Monitoring_Master_CB_${prevLabel}_vs_${currLabel}.xlsx`}
          emptyMessage="Tidak ada toko yang cocok dengan kriteria filter."
        />
      </div>

      {/* 8. Data Validation & Audit Note Footer */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200">
            Validasi Data & Integritas Master CB:
          </div>
          <div>
            Daftar toko diambil 100% dari <strong>Master CB</strong> dengan pencocokan <strong>Kode Toko</strong> sebagai primary key.
            Jika toko di Master CB belum memiliki transaksi eceran (kolom <code className="text-amber-300">MARK NEW</code>) pada periode tertentu, sistem secara otomatis menetapkan <code className="text-slate-300">EPB = 0</code> tanpa menghapus toko dari monitoring.
          </div>
        </div>
      </div>
    </div>
  );
}
