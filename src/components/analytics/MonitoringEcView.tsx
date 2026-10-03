import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  Store, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  Building2, 
  Search, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Lightbulb, 
  ChevronRight, 
  Layers, 
  Info,
  CalendarDays,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  LineChart,
  Filter
} from 'lucide-react';
import { MasterOutletRecord, TransactionRecord, AppSettings } from '../../types/database';
import { GlobalFilterState } from '../../types/analytics';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

/**
 * Generates a smooth cubic Bezier SVG path through the given coordinates
 */
function getSmoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
  }

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const tension = 0.2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface MonitoringEcViewProps {
  masterOutlets: MasterOutletRecord[];
  currTransactions: TransactionRecord[];
  prevTransactions: TransactionRecord[];
  settings: AppSettings;
  filters?: GlobalFilterState;
  onFilterChange?: (newFilters: GlobalFilterState) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export type EcStatus = 'GROWTH' | 'STABIL' | 'DECLINE';

export interface DailyEcPmaRow {
  id: string;
  day: number;
  dateLabel: string;
  pma: string;
  ecPrev: number;
  ecCurr: number;
  diff: number;
  growthPercent: number | null;
  status: EcStatus;
}

export interface SummaryEcPmaRow {
  pma: string;
  ecPrev: number;
  ecCurr: number;
  diff: number;
  growthPercent: number | null;
  avgEcPerDay: number;
  status: EcStatus;
}

export interface DailyEcSalesRow {
  id: string;
  day: number;
  dateLabel: string;
  salesmanId: string;
  salesmanName: string;
  pma: string;
  ecPrev: number;
  ecCurr: number;
  diff: number;
  growthPercent: number | null;
  status: EcStatus;
}

export interface SummaryEcSalesRow {
  salesmanId: string;
  salesmanName: string;
  pma: string;
  ecPrev: number;
  ecCurr: number;
  diff: number;
  growthPercent: number | null;
  avgEcPerDay: number;
  status: EcStatus;
}

export interface DailyEcSummaryRow {
  id: string;
  day: number;
  dateLabel: string;
  ecPrev: number;
  ecCurr: number;
  diff: number;
  growthPercent: number | null;
  status: EcStatus;
}

export interface DailyTrendItem {
  day: number;
  dateLabel: string;
  ecPrev: number;
  ecCurr: number;
  diff: number;
  growthPercent: number | null;
}

/**
 * Extracts day of month (1..31) from various date formats
 */
function getTxDay(dateStr?: string): number | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 3) {
      const d = parseInt(parts[2].slice(0, 2), 10);
      return !isNaN(d) && d >= 1 && d <= 31 ? d : null;
    }
  }
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      return !isNaN(d) && d >= 1 && d <= 31 ? d : null;
    }
  }
  return null;
}

export function MonitoringEcView({
  masterOutlets = [],
  currTransactions = [],
  prevTransactions = [],
  settings,
  filters = {},
  onFilterChange,
  onNavigateToUpload,
  onLoadSampleData,
}: MonitoringEcViewProps) {
  const prevLabel = settings.previousMonthLabel || 'AGUSTUS 2026';
  const currLabel = settings.currentMonthLabel || 'SEPTEMBER 2026';

  // Navigation tab within the Monitoring EC view (Default: Daily Vertical Date Summary)
  const [activeTab, setActiveTab] = useState<'daily' | 'pma' | 'sales'>('daily');

  // Interactive Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPma, setSelectedPma] = useState<string>('ALL');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Chart visual type: 'line' (Grafik Line default) or 'bar'
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Master outlet map for enrichment (supports both outletId and outletName lookup)
  const masterMap = useMemo(() => {
    const byId = new Map<string, MasterOutletRecord>();
    const byName = new Map<string, MasterOutletRecord>();
    masterOutlets.forEach(m => {
      if (m.outletId) {
        byId.set(m.outletId.trim(), m);
        byId.set(m.outletId.trim().toLowerCase(), m);
      }
      if (m.outletName) {
        byName.set(m.outletName.trim().toLowerCase(), m);
      }
    });
    return {
      get: (id?: string, name?: string) => {
        if (id) {
          const direct = byId.get(id.trim()) || byId.get(id.trim().toLowerCase());
          if (direct) return direct;
        }
        if (name) {
          const direct = byName.get(name.trim().toLowerCase());
          if (direct) return direct;
        }
        return undefined;
      }
    };
  }, [masterOutlets]);

  // Working days auto-detection & persistence (synced with target_work_days if exists)
  const storageKey = `target_work_days_${currLabel.replace(/\s+/g, '_')}`;

  const defaultWorkingDays = useMemo(() => {
    // Count unique days with transactions in current month
    const daysSet = new Set<number>();
    currTransactions.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) daysSet.add(d);
    });
    const elapsed = daysSet.size > 0 ? daysSet.size : 20;
    return Math.min(26, Math.max(1, elapsed));
  }, [currTransactions]);

  const [hariKerjaBerjalan, setHariKerjaBerjalan] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.berjalan === 'number' && parsed.berjalan > 0) {
          return parsed.berjalan;
        }
      }
    } catch {
      // ignore
    }
    return defaultWorkingDays;
  });

  // Keep saved when modified
  const handleUpdateHariKerja = (val: number) => {
    const clamped = Math.max(1, Math.min(31, val));
    setHariKerjaBerjalan(clamped);
    try {
      const saved = localStorage.getItem(storageKey);
      const prevObj = saved ? JSON.parse(saved) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...prevObj, berjalan: clamped }));
    } catch {
      // ignore
    }
  };

  // Helper for multi-value filtering synchronized with Global Dashboard Filters
  const matchesFilter = (item: {
    cabang?: string;
    depo?: string;
    area?: string;
    rayon?: string;
    salesmanId?: string;
    salesmanName?: string;
    channel?: string;
    fc?: string;
    pma?: string;
    outletId?: string;
    outletName?: string;
  }) => {
    if (!filters) return true;

    const cleanStr = (s?: string) => (s || '').trim().toLowerCase().replace(/^pma\s+/i, '');

    const matchesMulti = (filterVal: string | string[] | undefined, actualVal: string | undefined, secondaryVal?: string | undefined): boolean => {
      if (!filterVal) return true;
      const vals = Array.isArray(filterVal) ? filterVal : [filterVal];
      if (vals.length === 0 || vals.includes('ALL')) return true;

      const checkMatch = (target?: string) => {
        if (!target || target === '-') return false;
        const ct = cleanStr(target);
        return vals.some(v => {
          const cv = cleanStr(v);
          return cv === ct || ct.includes(cv) || cv.includes(ct);
        });
      };

      return checkMatch(actualVal) || (secondaryVal ? checkMatch(secondaryVal) : false);
    };

    if (!matchesMulti(filters.cabang, item.cabang)) return false;
    if (!matchesMulti(filters.depo, item.depo)) return false;
    if (!matchesMulti(filters.area, item.area, item.pma)) return false;
    if (!matchesMulti(filters.rayon, item.rayon)) return false;
    if (!matchesMulti(filters.channel, item.channel)) return false;
    if (!matchesMulti(filters.fc, item.fc)) return false;
    if (!matchesMulti(filters.pma, item.pma, item.area)) return false;

    if (filters.salesmanId) {
      const vals = Array.isArray(filters.salesmanId) ? filters.salesmanId : [filters.salesmanId];
      if (vals.length > 0 && !vals.includes('ALL')) {
        const match = vals.some(v => {
          const cleanV = v.trim().toLowerCase();
          return (
            (item.salesmanId && item.salesmanId.trim().toLowerCase() === cleanV) ||
            (item.salesmanName && item.salesmanName.trim().toLowerCase() === cleanV) ||
            (item.salesmanName && item.salesmanName.toLowerCase().includes(cleanV)) ||
            (cleanV.includes(item.salesmanName?.toLowerCase() || ''))
          );
        });
        if (!match) return false;
      }
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      const match =
        (item.outletId && item.outletId.toLowerCase().includes(q)) ||
        (item.outletName && item.outletName.toLowerCase().includes(q)) ||
        (item.salesmanId && item.salesmanId.toLowerCase().includes(q)) ||
        (item.salesmanName && item.salesmanName.toLowerCase().includes(q)) ||
        (item.area && item.area.toLowerCase().includes(q)) ||
        (item.depo && item.depo.toLowerCase().includes(q)) ||
        (item.cabang && item.cabang.toLowerCase().includes(q)) ||
        (item.rayon && item.rayon.toLowerCase().includes(q)) ||
        (item.channel && item.channel.toLowerCase().includes(q)) ||
        (item.fc && item.fc.toLowerCase().includes(q)) ||
        (item.pma && item.pma.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  };

  // Enriched Transactions with PMA & Master Metadata
  const enrichedPrevTxs = useMemo(() => {
    return prevTransactions
      .map(t => {
        const m = masterMap.get(t.outletId, t.outletName);
        const pma = (t.pma || m?.pma || m?.area || 'PMA REGULER').trim().toUpperCase();
        const slsName = t.salesmanName || m?.salesmanName || t.salesmanId || 'Salesman Unassigned';
        const slsId = t.salesmanId || m?.salesmanId || '';
        const day = getTxDay(t.transactionDate);
        const outletKey = t.outletId || t.outletName;
        return {
          ...t,
          pma,
          salesmanId: slsId,
          salesmanName: slsName,
          cabang: t.cabang || m?.cabang,
          depo: t.depo || m?.depo,
          area: t.area || m?.area,
          rayon: t.rayon || m?.rayon,
          channel: t.channel || m?.channel,
          fc: t.fc || m?.fc,
          day,
          outletKey,
        };
      })
      .filter(t => matchesFilter(t));
  }, [prevTransactions, masterMap, filters]);

  const enrichedCurrTxs = useMemo(() => {
    return currTransactions
      .map(t => {
        const m = masterMap.get(t.outletId, t.outletName);
        const pma = (t.pma || m?.pma || m?.area || 'PMA REGULER').trim().toUpperCase();
        const slsName = t.salesmanName || m?.salesmanName || t.salesmanId || 'Salesman Unassigned';
        const slsId = t.salesmanId || m?.salesmanId || '';
        const day = getTxDay(t.transactionDate);
        const outletKey = t.outletId || t.outletName;
        return {
          ...t,
          pma,
          salesmanId: slsId,
          salesmanName: slsName,
          cabang: t.cabang || m?.cabang,
          depo: t.depo || m?.depo,
          area: t.area || m?.area,
          rayon: t.rayon || m?.rayon,
          channel: t.channel || m?.channel,
          fc: t.fc || m?.fc,
          day,
          outletKey,
        };
      })
      .filter(t => matchesFilter(t));
  }, [currTransactions, masterMap, filters]);

  // List of all unique PMAs and Salesmen for dropdowns
  const allPmas = useMemo(() => {
    const set = new Set<string>();
    masterOutlets.forEach(m => { 
      if (matchesFilter(m) && m.pma) set.add(m.pma.trim().toUpperCase()); 
    });
    enrichedPrevTxs.forEach(t => { if (t.pma) set.add(t.pma); });
    enrichedCurrTxs.forEach(t => { if (t.pma) set.add(t.pma); });
    return Array.from(set).sort();
  }, [masterOutlets, enrichedPrevTxs, enrichedCurrTxs, filters]);

  const allSalesmen = useMemo(() => {
    const map = new Map<string, string>();
    masterOutlets.forEach(m => {
      if (matchesFilter(m) && m.salesmanId) map.set(m.salesmanId, m.salesmanName || m.salesmanId);
    });
    enrichedPrevTxs.forEach(t => {
      if (t.salesmanId) map.set(t.salesmanId, t.salesmanName);
    });
    enrichedCurrTxs.forEach(t => {
      if (t.salesmanId) map.set(t.salesmanId, t.salesmanName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [masterOutlets, enrichedPrevTxs, enrichedCurrTxs, filters]);

  // If no transactions available
  if (prevTransactions.length === 0 && currTransactions.length === 0) {
    return (
      <EmptyState
        title="DATA TRANSAKSI BELUM TERSEDIA"
        description="Upload Database Bulan Lalu dan Bulan Berjalan untuk mengaktifkan Monitoring EC (Toko Transaksi Unik per PMA dan Sales)."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  // =========================================================================
  // 1. DISTINCT EC INDEXING: (Day, PMA) and (Day, Sales)
  // =========================================================================
  const {
    ecPerDayPmaPrev,
    ecPerDayPmaCurr,
    ecPerDaySalesPrev,
    ecPerDaySalesCurr,
    pmaSalesMap,
    dailyOverallPrev,
    dailyOverallCurr
  } = useMemo(() => {
    // Map<"day_pma", Set<outletKey>>
    const pmaPrevMap = new Map<string, Set<string>>();
    const pmaCurrMap = new Map<string, Set<string>>();

    // Map<"day_salesId", Set<outletKey>>
    const slsPrevMap = new Map<string, Set<string>>();
    const slsCurrMap = new Map<string, Set<string>>();

    // Mapping salesId -> PMA
    const sPmaMap = new Map<string, string>();

    // Overall day sets
    const dayPrevSetMap = new Map<number, Set<string>>();
    const dayCurrSetMap = new Map<number, Set<string>>();

    // Index previous month
    enrichedPrevTxs.forEach(t => {
      if (t.day && t.outletKey) {
        // PMA
        const pKey = `${t.day}_${t.pma}`;
        if (!pmaPrevMap.has(pKey)) pmaPrevMap.set(pKey, new Set());
        pmaPrevMap.get(pKey)!.add(t.outletKey);

        // Sales
        const sKey = `${t.day}_${t.salesmanId}`;
        if (!slsPrevMap.has(sKey)) slsPrevMap.set(sKey, new Set());
        slsPrevMap.get(sKey)!.add(t.outletKey);

        if (!sPmaMap.has(t.salesmanId)) sPmaMap.set(t.salesmanId, t.pma);

        // Overall day
        if (!dayPrevSetMap.has(t.day)) dayPrevSetMap.set(t.day, new Set());
        dayPrevSetMap.get(t.day)!.add(t.outletKey);
      }
    });

    // Index current month
    enrichedCurrTxs.forEach(t => {
      if (t.day && t.outletKey) {
        // PMA
        const pKey = `${t.day}_${t.pma}`;
        if (!pmaCurrMap.has(pKey)) pmaCurrMap.set(pKey, new Set());
        pmaCurrMap.get(pKey)!.add(t.outletKey);

        // Sales
        const sKey = `${t.day}_${t.salesmanId}`;
        if (!slsCurrMap.has(sKey)) slsCurrMap.set(sKey, new Set());
        slsCurrMap.get(sKey)!.add(t.outletKey);

        if (!sPmaMap.has(t.salesmanId)) sPmaMap.set(t.salesmanId, t.pma);

        // Overall day
        if (!dayCurrSetMap.has(t.day)) dayCurrSetMap.set(t.day, new Set());
        dayCurrSetMap.get(t.day)!.add(t.outletKey);
      }
    });

    return {
      ecPerDayPmaPrev: pmaPrevMap,
      ecPerDayPmaCurr: pmaCurrMap,
      ecPerDaySalesPrev: slsPrevMap,
      ecPerDaySalesCurr: slsCurrMap,
      pmaSalesMap: sPmaMap,
      dailyOverallPrev: dayPrevSetMap,
      dailyOverallCurr: dayCurrSetMap
    };
  }, [enrichedPrevTxs, enrichedCurrTxs]);

  // =========================================================================
  // 1B. RINGKASAN PERFORMA EC / TOKO TRANSAKSI PER TANGGAL (VERTIKAL)
  // =========================================================================
  const dailySummaryList = useMemo<DailyEcSummaryRow[]>(() => {
    const list: DailyEcSummaryRow[] = [];

    for (let d = 1; d <= 31; d++) {
      let ecPrev = 0;
      let ecCurr = 0;

      if (selectedPma !== 'ALL') {
        const pKey = `${d}_${selectedPma}`;
        ecPrev = ecPerDayPmaPrev.get(pKey)?.size || 0;
        ecCurr = ecPerDayPmaCurr.get(pKey)?.size || 0;
      } else if (selectedSalesman !== 'ALL') {
        const sKey = `${d}_${selectedSalesman}`;
        ecPrev = ecPerDaySalesPrev.get(sKey)?.size || 0;
        ecCurr = ecPerDaySalesCurr.get(sKey)?.size || 0;
      } else {
        ecPrev = dailyOverallPrev.get(d)?.size || 0;
        ecCurr = dailyOverallCurr.get(d)?.size || 0;
      }

      const diff = ecCurr - ecPrev;
      const growthPercent = ecPrev > 0 ? (diff / ecPrev) * 100 : (ecCurr > 0 ? null : 0);

      let status: EcStatus = 'STABIL';
      if (ecCurr > ecPrev) status = 'GROWTH';
      else if (ecCurr < ecPrev) status = 'DECLINE';

      list.push({
        id: `daily_summary_${d}`,
        day: d,
        dateLabel: `Tgl ${String(d).padStart(2, '0')}`,
        ecPrev,
        ecCurr,
        diff,
        growthPercent,
        status,
      });
    }

    return list;
  }, [selectedPma, selectedSalesman, ecPerDayPmaPrev, ecPerDayPmaCurr, ecPerDaySalesPrev, ecPerDaySalesCurr, dailyOverallPrev, dailyOverallCurr]);

  // =========================================================================
  // 2. BAGIAN 1: MONITORING EC PER PMA
  // =========================================================================

  // A. Ringkasan Per PMA
  const summaryPmaList = useMemo<SummaryEcPmaRow[]>(() => {
    return allPmas.map(pma => {
      // Sum of daily distinct ECs across the month
      let totalPrev = 0;
      let totalCurr = 0;

      for (let d = 1; d <= 31; d++) {
        const pKey = `${d}_${pma}`;
        totalPrev += ecPerDayPmaPrev.get(pKey)?.size || 0;
        totalCurr += ecPerDayPmaCurr.get(pKey)?.size || 0;
      }

      const diff = totalCurr - totalPrev;
      const growthPercent = totalPrev > 0 ? (diff / totalPrev) * 100 : (totalCurr > 0 ? null : 0);
      const avgEcPerDay = hariKerjaBerjalan > 0 ? parseFloat((totalCurr / hariKerjaBerjalan).toFixed(1)) : 0;

      let status: EcStatus = 'STABIL';
      if (totalCurr > totalPrev) status = 'GROWTH';
      else if (totalCurr < totalPrev) status = 'DECLINE';

      return {
        pma,
        ecPrev: totalPrev,
        ecCurr: totalCurr,
        diff,
        growthPercent,
        avgEcPerDay,
        status,
      };
    });
  }, [allPmas, ecPerDayPmaPrev, ecPerDayPmaCurr, hariKerjaBerjalan]);

  // B. Harian Per PMA (Toko Transaksi per Hari per PMA)
  const dailyPmaList = useMemo<DailyEcPmaRow[]>(() => {
    const rows: DailyEcPmaRow[] = [];

    for (let d = 1; d <= 31; d++) {
      for (const pma of allPmas) {
        const pKey = `${d}_${pma}`;
        const ecPrev = ecPerDayPmaPrev.get(pKey)?.size || 0;
        const ecCurr = ecPerDayPmaCurr.get(pKey)?.size || 0;

        // Only include if at least one month had transactions, or for selected PMA
        if (ecPrev > 0 || ecCurr > 0) {
          const diff = ecCurr - ecPrev;
          const growthPercent = ecPrev > 0 ? (diff / ecPrev) * 100 : (ecCurr > 0 ? null : 0);

          let status: EcStatus = 'STABIL';
          if (ecCurr > ecPrev) status = 'GROWTH';
          else if (ecCurr < ecPrev) status = 'DECLINE';

          rows.push({
            id: `pma_${d}_${pma}`,
            day: d,
            dateLabel: `Tgl ${String(d).padStart(2, '0')}`,
            pma,
            ecPrev,
            ecCurr,
            diff,
            growthPercent,
            status,
          });
        }
      }
    }

    return rows.sort((a, b) => a.day - b.day || a.pma.localeCompare(b.pma));
  }, [allPmas, ecPerDayPmaPrev, ecPerDayPmaCurr]);

  // =========================================================================
  // 3. BAGIAN 2: MONITORING EC PER SALES
  // =========================================================================

  // A. Ringkasan Per Sales
  const summarySalesList = useMemo<SummaryEcSalesRow[]>(() => {
    return allSalesmen.map(sls => {
      let totalPrev = 0;
      let totalCurr = 0;

      for (let d = 1; d <= 31; d++) {
        const sKey = `${d}_${sls.id}`;
        totalPrev += ecPerDaySalesPrev.get(sKey)?.size || 0;
        totalCurr += ecPerDaySalesCurr.get(sKey)?.size || 0;
      }

      const diff = totalCurr - totalPrev;
      const growthPercent = totalPrev > 0 ? (diff / totalPrev) * 100 : (totalCurr > 0 ? null : 0);
      const avgEcPerDay = hariKerjaBerjalan > 0 ? parseFloat((totalCurr / hariKerjaBerjalan).toFixed(1)) : 0;
      const pma = pmaSalesMap.get(sls.id) || 'PMA REGULER';

      let status: EcStatus = 'STABIL';
      if (totalCurr > totalPrev) status = 'GROWTH';
      else if (totalCurr < totalPrev) status = 'DECLINE';

      return {
        salesmanId: sls.id,
        salesmanName: sls.name,
        pma,
        ecPrev: totalPrev,
        ecCurr: totalCurr,
        diff,
        growthPercent,
        avgEcPerDay,
        status,
      };
    });
  }, [allSalesmen, ecPerDaySalesPrev, ecPerDaySalesCurr, hariKerjaBerjalan, pmaSalesMap]);

  // B. Harian Per Sales (Toko Transaksi per Hari per Sales)
  const dailySalesList = useMemo<DailyEcSalesRow[]>(() => {
    const rows: DailyEcSalesRow[] = [];

    for (let d = 1; d <= 31; d++) {
      for (const sls of allSalesmen) {
        const sKey = `${d}_${sls.id}`;
        const ecPrev = ecPerDaySalesPrev.get(sKey)?.size || 0;
        const ecCurr = ecPerDaySalesCurr.get(sKey)?.size || 0;

        if (ecPrev > 0 || ecCurr > 0) {
          const diff = ecCurr - ecPrev;
          const growthPercent = ecPrev > 0 ? (diff / ecPrev) * 100 : (ecCurr > 0 ? null : 0);
          const pma = pmaSalesMap.get(sls.id) || 'PMA REGULER';

          let status: EcStatus = 'STABIL';
          if (ecCurr > ecPrev) status = 'GROWTH';
          else if (ecCurr < ecPrev) status = 'DECLINE';

          rows.push({
            id: `sls_${d}_${sls.id}`,
            day: d,
            dateLabel: `Tgl ${String(d).padStart(2, '0')}`,
            salesmanId: sls.id,
            salesmanName: sls.name,
            pma,
            ecPrev,
            ecCurr,
            diff,
            growthPercent,
            status,
          });
        }
      }
    }

    return rows.sort((a, b) => a.day - b.day || a.salesmanName.localeCompare(b.salesmanName));
  }, [allSalesmen, ecPerDaySalesPrev, ecPerDaySalesCurr, pmaSalesMap]);

  // =========================================================================
  // 4. TREND EC HARIAN (Grafik / Kurva Hari ke Hari)
  // =========================================================================
  const dailyTrendData = useMemo<DailyTrendItem[]>(() => {
    const items: DailyTrendItem[] = [];

    for (let d = 1; d <= 31; d++) {
      // If PMA or Salesman filter is active, compute filtered daily totals
      let dayPrev = 0;
      let dayCurr = 0;

      if (selectedPma !== 'ALL') {
        const pKey = `${d}_${selectedPma}`;
        dayPrev = ecPerDayPmaPrev.get(pKey)?.size || 0;
        dayCurr = ecPerDayPmaCurr.get(pKey)?.size || 0;
      } else if (selectedSalesman !== 'ALL') {
        const sKey = `${d}_${selectedSalesman}`;
        dayPrev = ecPerDaySalesPrev.get(sKey)?.size || 0;
        dayCurr = ecPerDaySalesCurr.get(sKey)?.size || 0;
      } else {
        dayPrev = dailyOverallPrev.get(d)?.size || 0;
        dayCurr = dailyOverallCurr.get(d)?.size || 0;
      }

      const diff = dayCurr - dayPrev;
      const growthPercent = dayPrev > 0 ? (diff / dayPrev) * 100 : (dayCurr > 0 ? null : 0);

      items.push({
        day: d,
        dateLabel: `Tgl ${String(d).padStart(2, '0')}`,
        ecPrev: dayPrev,
        ecCurr: dayCurr,
        diff,
        growthPercent,
      });
    }

    return items;
  }, [selectedPma, selectedSalesman, ecPerDayPmaPrev, ecPerDayPmaCurr, ecPerDaySalesPrev, ecPerDaySalesCurr, dailyOverallPrev, dailyOverallCurr]);

  // =========================================================================
  // 5. KPI UTAMA (Summary Metrics)
  // =========================================================================
  const totalEcBulanLalu = useMemo(() => {
    return summaryPmaList.reduce((sum, item) => sum + item.ecPrev, 0);
  }, [summaryPmaList]);

  const totalEcBulanIni = useMemo(() => {
    return summaryPmaList.reduce((sum, item) => sum + item.ecCurr, 0);
  }, [summaryPmaList]);

  const selisihEc = totalEcBulanIni - totalEcBulanLalu;
  const growthEcPercent = totalEcBulanLalu > 0 
    ? (selisihEc / totalEcBulanLalu) * 100 
    : (totalEcBulanIni > 0 ? 100 : 0);

  const avgEcHarian = hariKerjaBerjalan > 0 
    ? parseFloat((totalEcBulanIni / hariKerjaBerjalan).toFixed(1)) 
    : 0;

  const totalSalesActive = useMemo(() => {
    return summarySalesList.filter(s => s.ecCurr > 0 || s.ecPrev > 0).length;
  }, [summarySalesList]);

  const totalPmaActive = useMemo(() => {
    return summaryPmaList.filter(p => p.ecCurr > 0 || p.ecPrev > 0).length;
  }, [summaryPmaList]);

  // =========================================================================
  // 6. INSIGHT OTOMATIS (Berdasarkan Angka Aktual)
  // =========================================================================
  const insights = useMemo(() => {
    // PMA Insights
    const pmaGrowth = [...summaryPmaList]
      .filter(p => p.diff > 0)
      .sort((a, b) => b.diff - a.diff);

    const pmaDecline = [...summaryPmaList]
      .filter(p => p.diff < 0)
      .sort((a, b) => a.diff - b.diff);

    const pmaTopAvg = [...summaryPmaList]
      .sort((a, b) => b.avgEcPerDay - a.avgEcPerDay);

    // Sales Insights
    const salesGrowth = [...summarySalesList]
      .filter(s => s.diff > 0)
      .sort((a, b) => b.diff - a.diff);

    const salesDecline = [...summarySalesList]
      .filter(s => s.diff < 0)
      .sort((a, b) => a.diff - b.diff);

    const salesTopAvg = [...summarySalesList]
      .sort((a, b) => b.avgEcPerDay - a.avgEcPerDay);

    return {
      pmaGrowth,
      pmaDecline,
      pmaTopAvg,
      salesGrowth,
      salesDecline,
      salesTopAvg,
    };
  }, [summaryPmaList, summarySalesList]);

  // =========================================================================
  // 7. FILTERED LISTS
  // =========================================================================
  const filteredDailySummary = useMemo(() => {
    return dailySummaryList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.dateLabel.toLowerCase().includes(q) && !String(item.day).includes(q)) return false;
      }
      if (selectedDay !== 'ALL' && item.day !== parseInt(selectedDay, 10)) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [dailySummaryList, searchQuery, selectedDay, selectedStatus]);

  const filteredSummaryPma = useMemo(() => {
    return summaryPmaList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.pma.toLowerCase().includes(q)) return false;
      }
      if (selectedPma !== 'ALL' && item.pma !== selectedPma) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [summaryPmaList, searchQuery, selectedPma, selectedStatus]);

  const filteredDailyPma = useMemo(() => {
    return dailyPmaList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.pma.toLowerCase().includes(q) && !item.dateLabel.toLowerCase().includes(q)) return false;
      }
      if (selectedPma !== 'ALL' && item.pma !== selectedPma) return false;
      if (selectedDay !== 'ALL' && item.day !== parseInt(selectedDay, 10)) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [dailyPmaList, searchQuery, selectedPma, selectedDay, selectedStatus]);

  const filteredSummarySales = useMemo(() => {
    return summarySalesList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          item.salesmanName.toLowerCase().includes(q) ||
          item.salesmanId.toLowerCase().includes(q) ||
          item.pma.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedPma !== 'ALL' && item.pma !== selectedPma) return false;
      if (selectedSalesman !== 'ALL' && item.salesmanId !== selectedSalesman) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [summarySalesList, searchQuery, selectedPma, selectedSalesman, selectedStatus]);

  const filteredDailySales = useMemo(() => {
    return dailySalesList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          item.salesmanName.toLowerCase().includes(q) ||
          item.salesmanId.toLowerCase().includes(q) ||
          item.pma.toLowerCase().includes(q) ||
          item.dateLabel.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedPma !== 'ALL' && item.pma !== selectedPma) return false;
      if (selectedSalesman !== 'ALL' && item.salesmanId !== selectedSalesman) return false;
      if (selectedDay !== 'ALL' && item.day !== parseInt(selectedDay, 10)) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      return true;
    });
  }, [dailySalesList, searchQuery, selectedPma, selectedSalesman, selectedDay, selectedStatus]);

  const hasActiveDashboardFilters = Boolean(
    (filters?.cabang && (Array.isArray(filters.cabang) ? filters.cabang.length > 0 : filters.cabang !== 'ALL')) ||
    (filters?.depo && (Array.isArray(filters.depo) ? filters.depo.length > 0 : filters.depo !== 'ALL')) ||
    (filters?.area && (Array.isArray(filters.area) ? filters.area.length > 0 : filters.area !== 'ALL')) ||
    (filters?.rayon && (Array.isArray(filters.rayon) ? filters.rayon.length > 0 : filters.rayon !== 'ALL')) ||
    (filters?.salesmanId && (Array.isArray(filters.salesmanId) ? filters.salesmanId.length > 0 : filters.salesmanId !== 'ALL')) ||
    (filters?.channel && (Array.isArray(filters.channel) ? filters.channel.length > 0 : filters.channel !== 'ALL')) ||
    (filters?.fc && (Array.isArray(filters.fc) ? filters.fc.length > 0 : filters.fc !== 'ALL')) ||
    (filters?.pma && (Array.isArray(filters.pma) ? filters.pma.length > 0 : filters.pma !== 'ALL')) ||
    filters?.searchQuery
  );

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPma('ALL');
    setSelectedSalesman('ALL');
    setSelectedDay('ALL');
    setSelectedStatus('ALL');
    if (onFilterChange) onFilterChange({});
  };

  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    selectedPma !== 'ALL' ||
    selectedSalesman !== 'ALL' ||
    selectedDay !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    hasActiveDashboardFilters;

  // =========================================================================
  // 8. TABLE COLUMN DEFINITIONS
  // =========================================================================

  // Columns for Ringkasan Performa EC / Toko Transaksi Per Tanggal (Vertikal)
  const dailySummaryColumns: ColumnDef<DailyEcSummaryRow>[] = [
    {
      key: 'dateLabel',
      header: 'Tanggal (Vertikal)',
      accessor: (row) => row.day,
      render: (row) => (
        <div className="flex items-center gap-2 py-0.5">
          <div className="p-1 rounded bg-amber-500/10 text-amber-400">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          </div>
          <div>
            <div className="font-mono font-bold text-slate-100 text-xs">
              {row.dateLabel}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Hari ke-{row.day}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'ecPrev',
      header: `EC Bulan Lalu (${prevLabel})`,
      align: 'right',
      accessor: (row) => row.ecPrev,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-slate-300 font-semibold text-xs">
            {row.ecPrev.toLocaleString('id-ID')} Toko
          </span>
          <div className="text-[10px] text-slate-500">Bulan Lalu</div>
        </div>
      ),
    },
    {
      key: 'ecCurr',
      header: `EC Bulan Ini (${currLabel})`,
      align: 'right',
      accessor: (row) => row.ecCurr,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-amber-300 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {row.ecCurr.toLocaleString('id-ID')} Toko
          </span>
          <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">Bulan Ini</div>
        </div>
      ),
    },
    {
      key: 'diff',
      header: 'Selisih',
      align: 'right',
      accessor: (row) => row.diff,
      render: (row) => (
        <span className={`font-mono text-xs font-bold inline-flex items-center gap-0.5 ${
          row.diff > 0 ? 'text-emerald-400' : row.diff < 0 ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {row.diff > 0 && <ArrowUpRight className="w-3 h-3" />}
          {row.diff < 0 && <ArrowDownRight className="w-3 h-3" />}
          {!row.diff && <Minus className="w-3 h-3" />}
          <span>{row.diff > 0 ? `+${row.diff}` : row.diff}</span>
        </span>
      ),
    },
    {
      key: 'growthPercent',
      header: 'Growth %',
      align: 'right',
      accessor: (row) => row.growthPercent ?? 0,
      render: (row) => {
        if (row.growthPercent === null) {
          return <span className="font-mono text-xs text-cyan-300 font-semibold">NEW</span>;
        }
        return (
          <span className={`font-mono text-xs font-bold ${
            row.growthPercent > 0 ? 'text-emerald-400' : row.growthPercent < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {row.growthPercent >= 0 ? `+${row.growthPercent.toFixed(1)}%` : `${row.growthPercent.toFixed(1)}%`}
          </span>
        );
      },
    },
    {
      key: 'visual',
      header: 'Komparasi Visual (Lalu vs Ini)',
      render: (row) => {
        const maxVal = Math.max(row.ecPrev, row.ecCurr, 1);
        const prevWidth = Math.round((row.ecPrev / maxVal) * 100);
        const currWidth = Math.round((row.ecCurr / maxVal) * 100);
        return (
          <div className="w-36 space-y-1 py-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded bg-indigo-500 shrink-0" />
              <div className="flex-1 bg-slate-950 rounded h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded" style={{ width: `${prevWidth}%` }} />
              </div>
              <span className="w-6 text-right text-slate-300">{row.ecPrev}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300">
              <span className="w-2 h-2 rounded bg-amber-400 shrink-0" />
              <div className="flex-1 bg-slate-950 rounded h-1.5 overflow-hidden">
                <div className="bg-amber-400 h-full rounded" style={{ width: `${currWidth}%` }} />
              </div>
              <span className="w-6 text-right font-bold text-amber-300">{row.ecCurr}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
          row.status === 'GROWTH'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : row.status === 'DECLINE'
            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            row.status === 'GROWTH' ? 'bg-emerald-400 animate-pulse' : row.status === 'DECLINE' ? 'bg-rose-400' : 'bg-amber-400'
          }`} />
          <span>{row.status}</span>
        </span>
      ),
    },
  ];

  // Columns for Summary PMA Table
  const summaryPmaColumns: ColumnDef<SummaryEcPmaRow>[] = [
    {
      key: 'pma',
      header: 'PMA / Wilayah',
      render: (row) => (
        <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
          <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{row.pma}</span>
        </div>
      ),
    },
    {
      key: 'ecPrev',
      header: `EC ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.ecPrev,
      render: (row) => (
        <span className="font-mono text-slate-300 font-semibold text-xs">
          {row.ecPrev.toLocaleString('id-ID')} Toko
        </span>
      ),
    },
    {
      key: 'ecCurr',
      header: `EC ${currLabel}`,
      align: 'right',
      accessor: (row) => row.ecCurr,
      render: (row) => (
        <span className="font-mono text-amber-300 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {row.ecCurr.toLocaleString('id-ID')} Toko
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Selisih',
      align: 'right',
      accessor: (row) => row.diff,
      render: (row) => (
        <span className={`font-mono text-xs font-bold inline-flex items-center gap-0.5 ${
          row.diff > 0 ? 'text-emerald-400' : row.diff < 0 ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {row.diff > 0 && <ArrowUpRight className="w-3 h-3" />}
          {row.diff < 0 && <ArrowDownRight className="w-3 h-3" />}
          {!row.diff && <Minus className="w-3 h-3" />}
          <span>{row.diff > 0 ? `+${row.diff}` : row.diff}</span>
        </span>
      ),
    },
    {
      key: 'growthPercent',
      header: 'Growth %',
      align: 'right',
      accessor: (row) => row.growthPercent ?? 0,
      render: (row) => {
        if (row.growthPercent === null) {
          return <span className="font-mono text-xs text-cyan-300 font-semibold">NEW</span>;
        }
        return (
          <span className={`font-mono text-xs font-bold ${
            row.growthPercent > 0 ? 'text-emerald-400' : row.growthPercent < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {row.growthPercent >= 0 ? `+${row.growthPercent.toFixed(1)}%` : `${row.growthPercent.toFixed(1)}%`}
          </span>
        );
      },
    },
    {
      key: 'avgEcPerDay',
      header: 'Rata-rata EC/Hari',
      align: 'right',
      accessor: (row) => row.avgEcPerDay,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-cyan-300 font-bold text-xs bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            {row.avgEcPerDay} EC/Hari
          </span>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            / {hariKerjaBerjalan} HK
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
          row.status === 'GROWTH'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : row.status === 'DECLINE'
            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            row.status === 'GROWTH' ? 'bg-emerald-400 animate-pulse' : row.status === 'DECLINE' ? 'bg-rose-400' : 'bg-amber-400'
          }`} />
          <span>{row.status}</span>
        </span>
      ),
    },
  ];

  // Columns for Daily PMA Table
  const dailyPmaColumns: ColumnDef<DailyEcPmaRow>[] = [
    {
      key: 'dateLabel',
      header: 'Tanggal',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
          <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
          <span>{row.dateLabel}</span>
        </div>
      ),
    },
    {
      key: 'pma',
      header: 'PMA',
      render: (row) => (
        <span className="font-semibold text-cyan-300 text-xs">{row.pma}</span>
      ),
    },
    {
      key: 'ecPrev',
      header: `EC ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.ecPrev,
      render: (row) => (
        <span className="font-mono text-slate-300 text-xs">{row.ecPrev} Toko</span>
      ),
    },
    {
      key: 'ecCurr',
      header: `EC ${currLabel}`,
      align: 'right',
      accessor: (row) => row.ecCurr,
      render: (row) => (
        <span className="font-mono text-amber-300 font-bold text-xs">{row.ecCurr} Toko</span>
      ),
    },
    {
      key: 'diff',
      header: 'Perubahan',
      align: 'right',
      accessor: (row) => row.diff,
      render: (row) => (
        <span className={`font-mono text-xs font-bold ${
          row.diff > 0 ? 'text-emerald-400' : row.diff < 0 ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {row.diff > 0 ? `+${row.diff}` : row.diff}
        </span>
      ),
    },
    {
      key: 'growthPercent',
      header: 'Growth %',
      align: 'right',
      accessor: (row) => row.growthPercent ?? 0,
      render: (row) => {
        if (row.growthPercent === null) {
          return <span className="font-mono text-xs text-cyan-300">NEW</span>;
        }
        return (
          <span className={`font-mono text-xs font-bold ${
            row.growthPercent > 0 ? 'text-emerald-400' : row.growthPercent < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {row.growthPercent >= 0 ? `+${row.growthPercent.toFixed(1)}%` : `${row.growthPercent.toFixed(1)}%`}
          </span>
        );
      },
    },
  ];

  // Columns for Summary Sales Table
  const summarySalesColumns: ColumnDef<SummaryEcSalesRow>[] = [
    {
      key: 'salesmanName',
      header: 'Salesman',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{row.salesmanName}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {row.salesmanId}
          </div>
        </div>
      ),
    },
    {
      key: 'pma',
      header: 'PMA',
      render: (row) => (
        <span className="text-slate-300 text-xs font-medium">{row.pma}</span>
      ),
    },
    {
      key: 'ecPrev',
      header: `EC ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.ecPrev,
      render: (row) => (
        <span className="font-mono text-slate-300 font-semibold text-xs">
          {row.ecPrev.toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'ecCurr',
      header: `EC ${currLabel}`,
      align: 'right',
      accessor: (row) => row.ecCurr,
      render: (row) => (
        <span className="font-mono text-amber-300 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {row.ecCurr.toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Selisih',
      align: 'right',
      accessor: (row) => row.diff,
      render: (row) => (
        <span className={`font-mono text-xs font-bold inline-flex items-center gap-0.5 ${
          row.diff > 0 ? 'text-emerald-400' : row.diff < 0 ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {row.diff > 0 && <ArrowUpRight className="w-3 h-3" />}
          {row.diff < 0 && <ArrowDownRight className="w-3 h-3" />}
          {!row.diff && <Minus className="w-3 h-3" />}
          <span>{row.diff > 0 ? `+${row.diff}` : row.diff}</span>
        </span>
      ),
    },
    {
      key: 'growthPercent',
      header: 'Growth %',
      align: 'right',
      accessor: (row) => row.growthPercent ?? 0,
      render: (row) => {
        if (row.growthPercent === null) {
          return <span className="font-mono text-xs text-cyan-300 font-semibold">NEW</span>;
        }
        return (
          <span className={`font-mono text-xs font-bold ${
            row.growthPercent > 0 ? 'text-emerald-400' : row.growthPercent < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {row.growthPercent >= 0 ? `+${row.growthPercent.toFixed(1)}%` : `${row.growthPercent.toFixed(1)}%`}
          </span>
        );
      },
    },
    {
      key: 'avgEcPerDay',
      header: 'Rata-rata EC/Hari',
      align: 'right',
      accessor: (row) => row.avgEcPerDay,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-cyan-300 font-bold text-xs bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            {row.avgEcPerDay} EC/Hari
          </span>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            / {hariKerjaBerjalan} HK
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
          row.status === 'GROWTH'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : row.status === 'DECLINE'
            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            row.status === 'GROWTH' ? 'bg-emerald-400 animate-pulse' : row.status === 'DECLINE' ? 'bg-rose-400' : 'bg-amber-400'
          }`} />
          <span>{row.status}</span>
        </span>
      ),
    },
  ];

  // Columns for Daily Sales Table
  const dailySalesColumns: ColumnDef<DailyEcSalesRow>[] = [
    {
      key: 'dateLabel',
      header: 'Tanggal',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
          <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
          <span>{row.dateLabel}</span>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200 text-xs">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'pma',
      header: 'PMA',
      render: (row) => (
        <span className="text-slate-300 text-xs font-medium">{row.pma}</span>
      ),
    },
    {
      key: 'ecPrev',
      header: `EC ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.ecPrev,
      render: (row) => (
        <span className="font-mono text-slate-300 text-xs">{row.ecPrev} Toko</span>
      ),
    },
    {
      key: 'ecCurr',
      header: `EC ${currLabel}`,
      align: 'right',
      accessor: (row) => row.ecCurr,
      render: (row) => (
        <span className="font-mono text-amber-300 font-bold text-xs">{row.ecCurr} Toko</span>
      ),
    },
    {
      key: 'diff',
      header: 'Perubahan',
      align: 'right',
      accessor: (row) => row.diff,
      render: (row) => (
        <span className={`font-mono text-xs font-bold ${
          row.diff > 0 ? 'text-emerald-400' : row.diff < 0 ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {row.diff > 0 ? `+${row.diff}` : row.diff}
        </span>
      ),
    },
    {
      key: 'growthPercent',
      header: 'Growth %',
      align: 'right',
      accessor: (row) => row.growthPercent ?? 0,
      render: (row) => {
        if (row.growthPercent === null) {
          return <span className="font-mono text-xs text-cyan-300">NEW</span>;
        }
        return (
          <span className={`font-mono text-xs font-bold ${
            row.growthPercent > 0 ? 'text-emerald-400' : row.growthPercent < 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {row.growthPercent >= 0 ? `+${row.growthPercent.toFixed(1)}%` : `${row.growthPercent.toFixed(1)}%`}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <span>MONITORING EC</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DISTINCT TOKO TRANSAKSI
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Monitoring Toko Bertransaksi (EC) &bull; Analisa Harian Berjalan &bull; Perbandingan {prevLabel} vs {currLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Monitoring_EC_${new Date().toISOString().split('T')[0]}.jpg`}
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

      {/* Synchronized Dashboard Filters Banner */}
      {hasActiveDashboardFilters && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tersinkronisasi dengan Filter Dashboard:</span>
            </span>
            {filters?.cabang && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Cabang: {Array.isArray(filters.cabang) ? filters.cabang.join(', ') : filters.cabang}
              </span>
            )}
            {filters?.depo && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Depo: {Array.isArray(filters.depo) ? filters.depo.join(', ') : filters.depo}
              </span>
            )}
            {filters?.area && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Area: {Array.isArray(filters.area) ? filters.area.join(', ') : filters.area}
              </span>
            )}
            {filters?.rayon && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Rayon: {Array.isArray(filters.rayon) ? filters.rayon.join(', ') : filters.rayon}
              </span>
            )}
            {filters?.salesmanId && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Salesman: {Array.isArray(filters.salesmanId) ? filters.salesmanId.join(', ') : filters.salesmanId}
              </span>
            )}
            {filters?.pma && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                PMA: {Array.isArray(filters.pma) ? filters.pma.join(', ') : filters.pma}
              </span>
            )}
            {filters?.channel && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Channel: {Array.isArray(filters.channel) ? filters.channel.join(', ') : filters.channel}
              </span>
            )}
            {filters?.fc && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                FC: {Array.isArray(filters.fc) ? filters.fc.join(', ') : filters.fc}
              </span>
            )}
            {filters?.searchQuery && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Cari: "{filters.searchQuery}"
              </span>
            )}
          </div>
          <button
            onClick={() => onFilterChange && onFilterChange({})}
            className="text-cyan-400 hover:text-cyan-200 text-xs font-semibold underline shrink-0 ml-2"
          >
            Reset Filter Dashboard
          </button>
        </div>
      )}

      {/* 2. KPI Cards Utama (7 Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* KPI 1: HARI KERJA BERJALAN (Interactive Config) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-cyan-500/40 transition-all border-l-2 border-l-cyan-500">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span className="text-cyan-300 font-semibold">HARI KERJA</span>
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <div className="text-lg font-bold font-mono text-cyan-300">
              {hariKerjaBerjalan} <span className="text-xs font-normal text-slate-400">Hari</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleUpdateHariKerja(hariKerjaBerjalan - 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center border border-slate-700 font-mono"
                title="Kurangi 1 hari kerja"
              >
                -
              </button>
              <button
                onClick={() => handleUpdateHariKerja(hariKerjaBerjalan + 1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center border border-slate-700 font-mono"
                title="Tambah 1 hari kerja"
              >
                +
              </button>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Hari Kerja Berjalan</div>
        </div>

        {/* KPI 2: TOTAL EC BULAN LALU */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>EC BLN LALU</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1.5">
            {totalEcBulanLalu.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{prevLabel}</div>
        </div>

        {/* KPI 3: TOTAL EC BULAN INI */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-amber-500/40 transition-all border-l-2 border-l-amber-500">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span className="text-amber-300 font-semibold">EC BLN INI</span>
            <Store className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300 mt-1.5">
            {totalEcBulanIni.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{currLabel}</div>
        </div>

        {/* KPI 4: GROWTH EC */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>GROWTH EC</span>
            {selisihEc >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-lg font-bold font-mono mt-1.5 ${
            selisihEc > 0 ? 'text-emerald-400' : selisihEc < 0 ? 'text-rose-400' : 'text-slate-300'
          }`}>
            {growthEcPercent >= 0 ? `+${growthEcPercent.toFixed(1)}%` : `${growthEcPercent.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Selisih: {selisihEc >= 0 ? `+${selisihEc}` : selisihEc} EC
          </div>
        </div>

        {/* KPI 5: RATA-RATA EC HARIAN */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>RATA-RATA EC</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300 mt-1.5">
            {avgEcHarian} <span className="text-xs font-normal text-slate-400">/ Hari</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Total EC / {hariKerjaBerjalan} HK
          </div>
        </div>

        {/* KPI 6: TOTAL SALES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>TOTAL SALES</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1.5">
            {totalSalesActive}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Sales Aktif Ber-EC</div>
        </div>

        {/* KPI 7: TOTAL PMA */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>TOTAL PMA</span>
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1.5">
            {totalPmaActive}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">PMA Aktif Ber-EC</div>
        </div>
      </div>

      {/* 3. Trend EC Harian Chart Visual (Grafik Line) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <LineChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>GRAFIK LINE TREND EC HARIAN (HARI KE-1 S/D 31)</span>
                {selectedPma !== 'ALL' && (
                  <span className="text-[10px] bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40 font-mono">
                    PMA: {selectedPma}
                  </span>
                )}
                {selectedSalesman !== 'ALL' && (
                  <span className="text-[10px] bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800/40 font-mono">
                    Sales: {allSalesmen.find(s => s.id === selectedSalesman)?.name || selectedSalesman}
                  </span>
                )}
                {selectedDay !== 'ALL' && (
                  <button
                    onClick={() => setSelectedDay('ALL')}
                    className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 hover:bg-amber-500/30 font-mono transition-colors flex items-center gap-1"
                    title="Klik untuk reset filter tanggal"
                  >
                    <span>Filter: Tgl {selectedDay}</span>
                    <span className="text-amber-400 font-bold">✕</span>
                  </button>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Visualisasi kurva garis (line chart) tren toko transaksi aktif per tanggal antara {prevLabel} (Ungu) vs {currLabel} (Kuning Amber)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Legend */}
            <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-1 bg-indigo-500 rounded" />
                <span className="text-[11px]">{prevLabel}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <span className="w-3 h-1.5 bg-amber-400 rounded" />
                <span className="text-[11px]">{currLabel}</span>
              </div>
            </div>

            {/* View Switcher: Line (Default) vs Bar */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  chartType === 'line'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan Grafik Line"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  chartType === 'bar'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan Grafik Batang"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Batang</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Display: LINE or BAR */}
        {chartType === 'line' ? (
          <div className="pt-1">
            {(() => {
              const maxValRaw = Math.max(...dailyTrendData.map(d => Math.max(d.ecPrev, d.ecCurr)), 1);
              const maxDaily = Math.ceil(maxValRaw * 1.15); // Headroom for aesthetics
              const svgW = 1000;
              const svgH = 260;
              const padLeft = 45;
              const padRight = 25;
              const padTop = 25;
              const padBottom = 40;
              const plotW = svgW - padLeft - padRight;
              const plotH = svgH - padTop - padBottom;

              const pointsPrev = dailyTrendData.map((d, i) => ({
                x: padLeft + (i / 30) * plotW,
                y: padTop + plotH - (d.ecPrev / maxDaily) * plotH,
                d,
              }));

              const pointsCurr = dailyTrendData.map((d, i) => ({
                x: padLeft + (i / 30) * plotW,
                y: padTop + plotH - (d.ecCurr / maxDaily) * plotH,
                d,
              }));

              const pathPrev = getSmoothLinePath(pointsPrev);
              const pathCurr = getSmoothLinePath(pointsCurr);

              const areaPrev = `${pathPrev} L ${pointsPrev[pointsPrev.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L ${pointsPrev[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;
              const areaCurr = `${pathCurr} L ${pointsCurr[pointsCurr.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L ${pointsCurr[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;

              // Determine current inspection item
              const activeDayNum = hoveredDay || (selectedDay !== 'ALL' ? parseInt(selectedDay, 10) : null);
              const activeItem = dailyTrendData.find(d => d.day === activeDayNum);
              const activeCurrPoint = pointsCurr.find(p => p.d.day === activeDayNum);

              const gridSteps = [0, 0.25, 0.5, 0.75, 1.0];

              return (
                <div className="space-y-2">
                  {/* Interactive Status Tooltip Banner */}
                  <div className="flex items-center justify-between min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs transition-all">
                    {activeItem ? (
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {activeItem.dateLabel}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded bg-indigo-500" />
                          <span className="text-slate-400">{prevLabel}:</span>
                          <strong className="font-mono text-slate-200">{activeItem.ecPrev} Toko</strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <span className="w-2 h-2 rounded bg-amber-400" />
                          <span className="text-amber-400/80">{currLabel}:</span>
                          <strong className="font-mono text-amber-300">{activeItem.ecCurr} Toko</strong>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400">Selisih:</span>
                          <span className={`font-mono font-bold inline-flex items-center ${
                            activeItem.diff > 0 ? 'text-emerald-400' : activeItem.diff < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {activeItem.diff > 0 ? `+${activeItem.diff}` : activeItem.diff} Toko
                            {activeItem.growthPercent !== null && ` (${activeItem.growthPercent >= 0 ? '+' : ''}${activeItem.growthPercent.toFixed(1)}%)`}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          activeItem.diff > 0
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : activeItem.diff < 0
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {activeItem.diff > 0 ? '🟢 GROWTH' : activeItem.diff < 0 ? '🔴 DECLINE' : '🟡 STABIL'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Arahkan kursor / tap pada titik garis untuk melihat detail performa harian. Klik titik tanggal untuk memfilter tabel di bawah.</span>
                      </div>
                    )}

                    {selectedDay !== 'ALL' && (
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 shrink-0">
                        Filter Aktif: Tgl {selectedDay}
                      </span>
                    )}
                  </div>

                  {/* SVG Line Chart Container */}
                  <div className="relative bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80 overflow-hidden">
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-64 sm:h-72 select-none overflow-visible"
                    >
                      <defs>
                        {/* Area Gradients */}
                        <linearGradient id="ecGradCurr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.30" />
                          <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.00" />
                        </linearGradient>
                        <linearGradient id="ecGradPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                        </linearGradient>

                        {/* Line Stroke Gradients */}
                        <linearGradient id="strokeCurr" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      {gridSteps.map((step, idx) => {
                        const y = padTop + plotH - step * plotH;
                        const labelVal = Math.round(step * maxDaily);
                        return (
                          <g key={idx}>
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={padLeft + plotW}
                              y2={y}
                              stroke="#334155"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                              strokeOpacity="0.35"
                            />
                            <text
                              x={padLeft - 8}
                              y={y + 3.5}
                              textAnchor="end"
                              className="text-[10px] font-mono fill-slate-500"
                            >
                              {labelVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fills Under Lines */}
                      <path d={areaPrev} fill="url(#ecGradPrev)" />
                      <path d={areaCurr} fill="url(#ecGradCurr)" />

                      {/* Smooth Lines */}
                      {/* Bulan Lalu Line */}
                      <path
                        d={pathPrev}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeDasharray="5 3"
                        strokeOpacity="0.85"
                      />

                      {/* Bulan Ini Line */}
                      <path
                        d={pathCurr}
                        fill="none"
                        stroke="url(#strokeCurr)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* X Axis Baseline */}
                      <line
                        x1={padLeft}
                        y1={padTop + plotH}
                        x2={padLeft + plotW}
                        y2={padTop + plotH}
                        stroke="#475569"
                        strokeWidth="1.5"
                        strokeOpacity="0.7"
                      />

                      {/* Active Day Vertical Guideline & Indicator */}
                      {activeCurrPoint && (
                        <g>
                          <line
                            x1={activeCurrPoint.x}
                            y1={padTop}
                            x2={activeCurrPoint.x}
                            y2={padTop + plotH}
                            stroke="#06b6d4"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        </g>
                      )}

                      {/* Circles for Points */}
                      {pointsPrev.map((p, idx) => {
                        const isDaySelected = selectedDay === String(p.d.day);
                        const isDayHovered = hoveredDay === p.d.day;
                        return (
                          <circle
                            key={`prev_dot_${idx}`}
                            cx={p.x}
                            cy={p.y}
                            r={isDayHovered || isDaySelected ? 5.5 : 2.5}
                            fill="#6366f1"
                            stroke={isDayHovered || isDaySelected ? '#ffffff' : '#0f172a'}
                            strokeWidth={isDayHovered || isDaySelected ? 2 : 1}
                            className="transition-all"
                          />
                        );
                      })}

                      {pointsCurr.map((p, idx) => {
                        const isDaySelected = selectedDay === String(p.d.day);
                        const isDayHovered = hoveredDay === p.d.day;
                        return (
                          <g key={`curr_dot_${idx}`}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isDayHovered || isDaySelected ? 6.5 : 3.5}
                              fill="#fbbf24"
                              stroke={isDayHovered || isDaySelected ? '#ffffff' : '#0f172a'}
                              strokeWidth={isDayHovered || isDaySelected ? 2.5 : 1.5}
                              className="transition-all"
                            />
                            {isDaySelected && (
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="11"
                                fill="none"
                                stroke="#fbbf24"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                                className="animate-spin"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* X Axis Labels */}
                      {dailyTrendData.map((d, idx) => {
                        const x = padLeft + (idx / 30) * plotW;
                        const isSelected = selectedDay === String(d.day);
                        const isHovered = hoveredDay === d.day;
                        const shouldShowLabel = 
                          d.day === 1 || 
                          d.day % 3 === 0 || 
                          d.day === 31 || 
                          isSelected || 
                          isHovered;

                        return (
                          <g key={`x_tick_${d.day}`}>
                            <line
                              x1={x}
                              y1={padTop + plotH}
                              x2={x}
                              y2={padTop + plotH + 4}
                              stroke={isSelected || isHovered ? '#fbbf24' : '#475569'}
                              strokeWidth={isSelected || isHovered ? '2' : '1'}
                            />
                            {shouldShowLabel && (
                              <text
                                x={x}
                                y={padTop + plotH + 18}
                                textAnchor="middle"
                                className={`text-[10px] font-mono transition-colors ${
                                  isSelected
                                    ? 'fill-cyan-300 font-bold'
                                    : isHovered
                                    ? 'fill-amber-300 font-bold'
                                    : 'fill-slate-400'
                                }`}
                              >
                                {d.day}
                              </text>
                            )}

                            {/* Transparent Hit Area for Touch & Mouse Events */}
                            <rect
                              x={x - (plotW / 30) / 2}
                              y={padTop}
                              width={plotW / 30}
                              height={plotH + padBottom}
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredDay(d.day)}
                              onMouseLeave={() => setHoveredDay(null)}
                              onClick={() => setSelectedDay(selectedDay === String(d.day) ? 'ALL' : String(d.day))}
                            >
                              <title>{`Tgl ${d.day}: Lalu=${d.ecPrev} EC, Ini=${d.ecCurr} EC (Selisih: ${d.diff >= 0 ? '+' : ''}${d.diff})`}</title>
                            </rect>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Alternate Bar Chart View */
          <div className="pt-2">
            {(() => {
              const maxDaily = Math.max(...dailyTrendData.map(d => Math.max(d.ecPrev, d.ecCurr)), 1);

              return (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-1">
                    {dailyTrendData.map(item => {
                      const prevH = (item.ecPrev / maxDaily) * 100;
                      const currH = (item.ecCurr / maxDaily) * 100;
                      const isSelected = selectedDay === String(item.day);

                      return (
                        <div
                          key={item.day}
                          onClick={() => setSelectedDay(selectedDay === String(item.day) ? 'ALL' : String(item.day))}
                          className={`flex flex-col items-center p-1 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-950/60 border border-cyan-500/60 ring-1 ring-cyan-500/40'
                              : 'hover:bg-slate-800/60 border border-transparent'
                          }`}
                          title={`Tgl ${item.day}: Lalu=${item.ecPrev} EC, Ini=${item.ecCurr} EC (Selisih: ${item.diff >= 0 ? '+' : ''}${item.diff})`}
                        >
                          <div className="h-20 w-full flex items-end justify-center gap-0.5 bg-slate-950/40 rounded p-0.5">
                            <div
                              className="w-1.5 bg-indigo-500/80 rounded-t transition-all"
                              style={{ height: `${Math.max(4, prevH)}%` }}
                            />
                            <div
                              className="w-1.5 bg-amber-400 rounded-t transition-all"
                              style={{ height: `${Math.max(4, currH)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono mt-1 ${
                            isSelected ? 'font-bold text-cyan-300' : 'text-slate-500'
                          }`}>
                            {item.day}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-amber-300">
                            {item.ecCurr > 0 ? item.ecCurr : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 4. Automated Insights Section (🔎 INSIGHT MONITORING EC) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>🔎 INSIGHT MONITORING EC</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Temuan analitik otomatis berbasis data toko transaksi aktual
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {hariKerjaBerjalan} Hari Kerja Berjalan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Insight PMA */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Analisa Performa PMA</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">{allPmas.length} PMA Terdata</span>
            </div>

            <div className="space-y-2 text-xs">
              {insights.pmaGrowth.length > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>PMA Pertumbuhan EC Terbaik:</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    <strong className="text-emerald-300">{insights.pmaGrowth[0].pma}</strong> meningkat sebesar{' '}
                    <strong className="text-emerald-400 font-mono">+{insights.pmaGrowth[0].diff} EC</strong>{' '}
                    ({insights.pmaGrowth[0].growthPercent !== null ? `+${insights.pmaGrowth[0].growthPercent.toFixed(1)}%` : 'NEW'}){' '}
                    dari {insights.pmaGrowth[0].ecPrev} menjadi {insights.pmaGrowth[0].ecCurr} toko bertransaksi.
                  </div>
                </div>
              )}

              {insights.pmaDecline.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                  <div className="font-semibold text-rose-300 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>PMA Penurunan EC (Perlu Perhatian):</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    <strong className="text-rose-300">{insights.pmaDecline[0].pma}</strong> mengalami penurunan{' '}
                    <strong className="text-rose-400 font-mono">{insights.pmaDecline[0].diff} EC</strong>{' '}
                    ({insights.pmaDecline[0].growthPercent?.toFixed(1)}%) dengan rata-rata{' '}
                    <strong className="text-slate-200 font-mono">{insights.pmaDecline[0].avgEcPerDay} EC/hari</strong>.
                  </div>
                </div>
              )}

              {insights.pmaTopAvg.length > 0 && (
                <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-slate-300">
                  <span className="font-semibold text-cyan-300">Rata-rata EC Harian Tertinggi:</span>{' '}
                  <strong className="text-slate-100">{insights.pmaTopAvg[0].pma}</strong> mencatat rata-rata{' '}
                  <strong className="text-cyan-300 font-mono">{insights.pmaTopAvg[0].avgEcPerDay} EC/hari</strong>{' '}
                  selama {hariKerjaBerjalan} hari kerja berjalan.
                </div>
              )}
            </div>
          </div>

          {/* Box 2: Insight Sales */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Analisa Performa Salesman</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">{allSalesmen.length} Sales Terdata</span>
            </div>

            <div className="space-y-2 text-xs">
              {insights.salesGrowth.length > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Salesman Akselerasi EC Tertinggi:</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    <strong className="text-emerald-300">{insights.salesGrowth[0].salesmanName}</strong> ({insights.salesGrowth[0].pma}) bertambah{' '}
                    <strong className="text-emerald-400 font-mono">+{insights.salesGrowth[0].diff} EC</strong>{' '}
                    ({insights.salesGrowth[0].growthPercent !== null ? `+${insights.salesGrowth[0].growthPercent.toFixed(1)}%` : 'NEW'}){' '}
                    dengan rata-rata <strong className="text-slate-100 font-mono">{insights.salesGrowth[0].avgEcPerDay} EC/hari</strong>.
                  </div>
                </div>
              )}

              {insights.salesDecline.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                  <div className="font-semibold text-rose-300 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Salesman Perlu Perhatian (Penurunan EC):</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    <strong className="text-rose-300">{insights.salesDecline[0].salesmanName}</strong> turun{' '}
                    <strong className="text-rose-400 font-mono">{insights.salesDecline[0].diff} EC</strong>{' '}
                    ({insights.salesDecline[0].growthPercent?.toFixed(1)}%) dari {insights.salesDecline[0].ecPrev} menjadi {insights.salesDecline[0].ecCurr} EC.
                  </div>
                </div>
              )}

              {insights.salesTopAvg.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[11px] text-slate-300">
                  <span className="font-semibold text-amber-300">Top Rata-rata EC Harian:</span>{' '}
                  <strong className="text-slate-100">{insights.salesTopAvg[0].salesmanName}</strong> memimpin dengan{' '}
                  <strong className="text-amber-300 font-mono">{insights.salesTopAvg[0].avgEcPerDay} EC/hari</strong>{' '}
                  (Total {insights.salesTopAvg[0].ecCurr} EC / {hariKerjaBerjalan} HK).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Filter Toolbar Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box Real-Time */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Cari PMA, Salesman, Toko, Tanggal..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
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
            {/* Filter PMA */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">PMA:</span>
              <select
                value={selectedPma}
                onChange={(e) => setSelectedPma(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[130px]"
              >
                <option value="ALL">Semua PMA ({allPmas.length})</option>
                {allPmas.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Filter Salesman */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Sales:</span>
              <select
                value={selectedSalesman}
                onChange={(e) => setSelectedSalesman(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[140px]"
              >
                <option value="ALL">Semua Sales ({allSalesmen.length})</option>
                {allSalesmen.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Tanggal */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Tanggal:</span>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Tanggal</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d)}>Tgl {String(d).padStart(2, '0')}</option>
                ))}
              </select>
            </div>

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
              </select>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>📅 Ringkasan EC Harian (Tanggal Vertikal)</span>
          </button>

          <button
            onClick={() => setActiveTab('pma')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pma'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏪 Bagian 1: Monitoring EC Per PMA</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sales'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👤 Bagian 2: Monitoring EC Per Sales</span>
          </button>
        </div>
      </div>

      {/* 6. Main Tables Viewport */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Table: Ringkasan Performa EC / Toko Transaksi Per Tanggal (Vertikal Tgl 01 s/d 31) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <DataTable<DailyEcSummaryRow>
              title="Ringkasan Performa EC / Toko Transaksi Per Tanggal (Vertikal Tgl 01 s/d 31)"
              columns={dailySummaryColumns}
              data={filteredDailySummary}
              searchPlaceholder="Cari tanggal..."
              pageSizeDefault={31}
              exportFileName={`Ringkasan_Performa_EC_Harian_Vertikal_${prevLabel}_vs_${currLabel}.xlsx`}
              emptyMessage="Tidak ada data tanggal yang sesuai filter."
            />
          </div>
        </div>
      )}

      {activeTab === 'pma' && (
        <div className="space-y-6">
          {/* Table A: Ringkasan EC Per PMA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <DataTable<SummaryEcPmaRow>
              title="Ringkasan Performa EC / Toko Transaksi Per PMA"
              columns={summaryPmaColumns}
              data={filteredSummaryPma}
              searchPlaceholder="Cari PMA..."
              exportFileName={`Ringkasan_EC_Per_PMA_${prevLabel}_vs_${currLabel}.xlsx`}
              emptyMessage="Tidak ada data PMA yang sesuai filter."
            />
          </div>

          {/* Table B: EC / Toko Transaksi Per Hari Per PMA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <DataTable<DailyEcPmaRow>
              title="EC / Toko Transaksi Per Hari Per PMA (Distinct Toko)"
              columns={dailyPmaColumns}
              data={filteredDailyPma}
              searchPlaceholder="Cari tanggal atau PMA..."
              exportFileName={`EC_Harian_Per_PMA_${prevLabel}_vs_${currLabel}.xlsx`}
              emptyMessage="Tidak ada data transaksi harian PMA yang sesuai filter."
            />
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Table A: Ringkasan EC Per Sales */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <DataTable<SummaryEcSalesRow>
              title="Ringkasan Performa EC / Toko Transaksi Per Salesman"
              columns={summarySalesColumns}
              data={filteredSummarySales}
              searchPlaceholder="Cari Salesman atau PMA..."
              exportFileName={`Ringkasan_EC_Per_Sales_${prevLabel}_vs_${currLabel}.xlsx`}
              emptyMessage="Tidak ada data Salesman yang sesuai filter."
            />
          </div>

          {/* Table B: EC / Toko Transaksi Per Hari Per Sales */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <DataTable<DailyEcSalesRow>
              title="EC / Toko Transaksi Per Hari Per Sales (Distinct Toko)"
              columns={dailySalesColumns}
              data={filteredDailySales}
              searchPlaceholder="Cari tanggal atau Salesman..."
              exportFileName={`EC_Harian_Per_Sales_${prevLabel}_vs_${currLabel}.xlsx`}
              emptyMessage="Tidak ada data transaksi harian Salesman yang sesuai filter."
            />
          </div>
        </div>
      )}

      {/* 7. Footer Audit & Calculation Note */}
      <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200">
            Validasi & Integritas Perhitungan EC (Effective Call):
          </div>
          <div>
            1. Perhitungan EC harian menggunakan <strong>DISTINCT COUNT (Toko Unik)</strong> berdasarkan Kode Toko/ID Toko. Jika satu toko melakukan lebih dari 1 transaksi pada tanggal yang sama, toko tersebut tetap dihitung <strong>1 EC</strong>.
          </div>
          <div>
            2. <strong>Rata-rata EC Harian</strong> dihitung dengan membagi total EC berjalan dengan <strong>{hariKerjaBerjalan} Hari Kerja Berjalan</strong> (bukan hari kalender).
          </div>
        </div>
      </div>
    </div>
  );
}
