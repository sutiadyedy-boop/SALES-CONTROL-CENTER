import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  DollarSign, 
  BarChart3,
  Store,
  ShoppingBag,
  Filter,
  CalendarRange,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Boxes,
  Users,
  Building2,
  Tag,
  ArrowRight,
  Info,
  X,
  Layers
} from 'lucide-react';
import { CalculationResult, SalesmanPerformanceItem, GlobalFilterState } from '../../types/analytics';
import { AppSettings, MasterOutletRecord, TransactionRecord } from '../../types/database';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { parseYearMonthFromDate, INDONESIAN_MONTHS } from '../../services/periodDetectionService';

interface MonthComparisonViewProps {
  calculation: CalculationResult | null;
  settings: AppSettings;
  prevTransactions?: TransactionRecord[];
  currTransactions?: TransactionRecord[];
  masterOutlets?: MasterOutletRecord[];
  filters?: GlobalFilterState;
  onFilterChange?: (filters: GlobalFilterState) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
  onUpdatePeriodLabel?: (category: 'previous_month' | 'current_month', label: string) => void;
}

// Helpers
function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(num));
}

function getTxDay(dateVal?: any): number | null {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;

  // 1. If it's a JavaScript Date object (e.g. from SheetJS cellDates: true)
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    // Add 12 hours (midday) to prevent UTC-offset corruption in positive timezones (WIB/WITA)
    const midday = new Date(dateVal.getTime() + 12 * 3600 * 1000);
    const d = midday.getUTCDate();
    return d >= 1 && d <= 31 ? d : null;
  }

  // 2. Direct day number or Excel serial number
  const num = typeof dateVal === 'number' ? dateVal : parseFloat(String(dateVal).trim());
  if (!isNaN(num)) {
    const strVal = String(dateVal).trim();
    // Direct day of month e.g. 1..31 or "1".."31"
    if (num >= 1 && num <= 31 && strVal.length <= 2) {
      return Math.round(num);
    }
    // Excel serial number e.g. 46299
    if (num > 30000 && num < 60000) {
      const utcMs = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(utcMs).getUTCDate();
      return d >= 1 && d <= 31 ? d : null;
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // 3. YYYY-MM-DD or YYYY/MM/DD (with optional timestamp)
  const isoMatch = str.match(/^\d{4}[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const d = parseInt(isoMatch[2], 10);
    return d >= 1 && d <= 31 ? d : null;
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY or DD-MM-YY
  const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10);
    return d >= 1 && d <= 31 ? d : null;
  }

  // 5. Text date e.g. "04-OKT-2026", "4 Oktober 2026", "04 OKT 26"
  const textDayMatch = str.match(/^(\d{1,2})[\s\-_]/);
  if (textDayMatch) {
    const d = parseInt(textDayMatch[1], 10);
    return d >= 1 && d <= 31 ? d : null;
  }

  return null;
}

const DEFAULT_ECERAN_KEYWORDS = ['ECERAN', 'KIOS', 'MINIMARKET', 'GENERAL TRADE', 'WARUNG', 'TOKO', 'RETAIL', 'TRADISIONAL'];
const NON_ECERAN_KEYWORDS = ['GROSIR BESAR', 'SEMI GROSIR', 'DISTRIBUTOR', 'SUPERMARKET', 'HYPERMARKET', 'MODERN TRADE'];

function isLikelyEceran(channel?: string): boolean {
  if (!channel) return true;
  const upper = channel.toUpperCase();
  for (const non of NON_ECERAN_KEYWORDS) {
    if (upper.includes(non)) return false;
  }
  for (const ec of DEFAULT_ECERAN_KEYWORDS) {
    if (upper.includes(ec)) return true;
  }
  return false;
}

function matchesFilter(val: string | undefined, filterVal: string | string[] | undefined): boolean {
  if (!filterVal || filterVal === 'ALL') return true;
  if (Array.isArray(filterVal)) {
    if (filterVal.length === 0 || filterVal.includes('ALL')) return true;
    return val ? filterVal.includes(val) : false;
  }
  return val === filterVal;
}

export function MonthComparisonView({
  calculation,
  settings,
  prevTransactions = [],
  currTransactions = [],
  masterOutlets = [],
  filters = {},
  onFilterChange,
  onNavigateToUpload,
  onLoadSampleData,
  onUpdatePeriodLabel,
}: MonthComparisonViewProps) {
  // If no data
  const hasData = calculation && (
    calculation.kpis.totalActualPrevious > 0 || 
    calculation.kpis.totalActualCurrent > 0 || 
    prevTransactions.length > 0 || 
    currTransactions.length > 0
  );

  // Period adjustment modal
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [modalPrevText, setModalPrevText] = useState('');
  const [modalCurrText, setModalCurrText] = useState('');

  if (!hasData) {
    return (
      <EmptyState
        title="DATA PERBANDINGAN BULAN BELUM TERSEDIA"
        description="Upload Database Bulan Lalu (Database 1) dan Database Bulan Ini (Database 2) untuk mengaktifkan komparasi Month-over-Month."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  // Dynamically resolve comparison month labels from:
  // 1. Transaction records in prevTransactions / currTransactions (ground truth)
  // 2. Settings (sanitized from legacy 'AGUSTUS')
  // 3. Fallback defaults: SEPTEMBER 2026 vs OKTOBER 2026
  const prevLabel = useMemo(() => {
    if (prevTransactions && prevTransactions.length > 0) {
      const pLabel = prevTransactions[0]?.periodLabel;
      if (pLabel && !pLabel.toUpperCase().includes('AGUSTUS')) {
        return pLabel;
      }
      for (let i = 0; i < Math.min(prevTransactions.length, 50); i++) {
        const ym = parseYearMonthFromDate(prevTransactions[i]?.transactionDate);
        if (ym) {
          return `${INDONESIAN_MONTHS[ym.month - 1]} ${ym.year}`;
        }
      }
    }
    if (settings.previousMonthLabel && !settings.previousMonthLabel.toUpperCase().includes('AGUSTUS')) {
      return settings.previousMonthLabel;
    }
    return 'SEPTEMBER 2026';
  }, [prevTransactions, settings.previousMonthLabel]);

  const currLabel = useMemo(() => {
    if (currTransactions && currTransactions.length > 0) {
      const cLabel = currTransactions[0]?.periodLabel;
      if (cLabel && !cLabel.toUpperCase().includes('AGUSTUS')) {
        return cLabel;
      }
      for (let i = 0; i < Math.min(currTransactions.length, 50); i++) {
        const ym = parseYearMonthFromDate(currTransactions[i]?.transactionDate);
        if (ym) {
          return `${INDONESIAN_MONTHS[ym.month - 1]} ${ym.year}`;
        }
      }
    }
    if (settings.currentMonthLabel && !settings.currentMonthLabel.toUpperCase().includes('AGUSTUS') && settings.currentMonthLabel !== prevLabel) {
      return settings.currentMonthLabel;
    }
    return 'OKTOBER 2026';
  }, [currTransactions, settings.currentMonthLabel, prevLabel]);

  // Master outlet map for enrichment (channel, rayon, area, etc.)
  const masterMap = useMemo(() => {
    const map = new Map<string, MasterOutletRecord>();
    masterOutlets.forEach(m => {
      if (m.outletId) map.set(m.outletId, m);
    });
    return map;
  }, [masterOutlets]);

  // Detected max day of current month transactions (for Cut-off preset)
  const maxCurrDay = useMemo(() => {
    let max = 1;
    currTransactions.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d && d > max) max = d;
    });
    return max > 1 ? max : 24;
  }, [currTransactions]);

  // Detected max day of previous month transactions
  const maxPrevDay = useMemo(() => {
    let max = 1;
    prevTransactions.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d && d > max) max = d;
    });
    return max > 1 ? max : 31;
  }, [prevTransactions]);

  // 1. STATE: Pilihan Tanggal Perbandingan Harian Terpisah per Bulan (Bisa Pilih Lebih dari 1 Tanggal)
  const [prevSelectedDays, setPrevSelectedDays] = useState<number[]>(() => {
    const set = new Set<number>();
    prevTransactions.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) set.add(d);
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a - b);
    return Array.from({ length: 31 }, (_, i) => i + 1);
  });

  const [currSelectedDays, setCurrSelectedDays] = useState<number[]>(() => {
    const set = new Set<number>();
    currTransactions.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) set.add(d);
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a - b);
    return Array.from({ length: maxCurrDay }, (_, i) => i + 1);
  });

  // Range inputs for Bulan Lalu
  const [prevRangeStart, setPrevRangeStart] = useState<number>(1);
  const [prevRangeEnd, setPrevRangeEnd] = useState<number>(() => maxPrevDay);

  // Range inputs for Bulan Ini
  const [currRangeStart, setCurrRangeStart] = useState<number>(1);
  const [currRangeEnd, setCurrRangeEnd] = useState<number>(() => maxCurrDay);

  // Helper toggle day for previous month
  const togglePrevDay = (day: number) => {
    setPrevSelectedDays(prev => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  // Helper toggle day for current month
  const toggleCurrDay = (day: number) => {
    setCurrSelectedDays(prev => {
      if (prev.includes(day)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  // Active Tab - Default: 'eceran' (Performa By Eceran - Kolom MARK NEW)
  const [activeTab, setActiveTab] = useState<'eceran' | 'outlet' | 'daily_trend' | 'salesman'>('eceran');

  // ========================================================
  // 1. STATE SINKRONISASI FILTER TERPADU (BERLAKU UNTUK 4 TAB)
  // ========================================================
  const [selectedSalesman, setSelectedSalesman] = useState<string>(() => {
    if (filters?.salesmanId) {
      return Array.isArray(filters.salesmanId) ? filters.salesmanId[0] : filters.salesmanId;
    }
    return 'ALL';
  });

  const [selectedOutletType, setSelectedOutletType] = useState<'ALL' | 'ECERAN' | 'NON_ECERAN'>('ALL');

  const [selectedChannel, setSelectedChannel] = useState<string>(() => {
    if (filters?.channel) {
      return Array.isArray(filters.channel) ? filters.channel[0] : filters.channel;
    }
    return 'ALL';
  });

  const [selectedMarkNew, setSelectedMarkNew] = useState<string>('ALL');

  const [selectedArea, setSelectedArea] = useState<string>(() => {
    if (filters?.area) {
      return Array.isArray(filters.area) ? filters.area[0] : filters.area;
    }
    return 'ALL';
  });

  const [selectedRayon, setSelectedRayon] = useState<string>(() => {
    if (filters?.rayon) {
      return Array.isArray(filters.rayon) ? filters.rayon[0] : filters.rayon;
    }
    return 'ALL';
  });

  const [searchFilter, setSearchFilter] = useState<string>(() => filters?.searchQuery || '');

  // Tab 2 (Outlet) Specific Status Filter
  const [outletStatusFilter, setOutletStatusFilter] = useState<'ALL' | 'GROWTH_UP' | 'GROWTH_DOWN' | 'DROP' | 'NEW_ACTIVE' | 'NOT_BUYING'>('ALL');

  // Sinkronkan jika filters prop dari parent berubah
  useEffect(() => {
    if (filters?.salesmanId !== undefined) {
      const val = Array.isArray(filters.salesmanId) ? filters.salesmanId[0] : filters.salesmanId;
      setSelectedSalesman(val || 'ALL');
    }
    if (filters?.channel !== undefined) {
      const val = Array.isArray(filters.channel) ? filters.channel[0] : filters.channel;
      setSelectedChannel(val || 'ALL');
    }
    if (filters?.area !== undefined) {
      const val = Array.isArray(filters.area) ? filters.area[0] : filters.area;
      setSelectedArea(val || 'ALL');
    }
    if (filters?.rayon !== undefined) {
      const val = Array.isArray(filters.rayon) ? filters.rayon[0] : filters.rayon;
      setSelectedRayon(val || 'ALL');
    }
    if (filters?.searchQuery !== undefined) {
      setSearchFilter(filters.searchQuery);
    }
  }, [filters]);

  const handleSalesmanChange = (slsId: string) => {
    setSelectedSalesman(slsId);
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        salesmanId: slsId === 'ALL' ? undefined : slsId,
      });
    }
  };

  const handleChannelChange = (chn: string) => {
    setSelectedChannel(chn);
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        channel: chn === 'ALL' ? undefined : chn,
      });
    }
  };

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        area: area === 'ALL' ? undefined : area,
      });
    }
  };

  const handleRayonChange = (rayon: string) => {
    setSelectedRayon(rayon);
    if (onFilterChange) {
      onFilterChange({
        ...filters,
        rayon: rayon === 'ALL' ? undefined : rayon,
      });
    }
  };

  const handleResetAllFilters = () => {
    setSelectedSalesman('ALL');
    setSelectedOutletType('ALL');
    setSelectedChannel('ALL');
    setSelectedMarkNew('ALL');
    setSelectedArea('ALL');
    setSelectedRayon('ALL');
    setSearchFilter('');
    setOutletStatusFilter('ALL');
    setPrevSelectedDays(Array.from({ length: 31 }, (_, i) => i + 1));
    setCurrSelectedDays(Array.from({ length: maxCurrDay }, (_, i) => i + 1));
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  // Salesmen list
  const salesmenList = useMemo(() => {
    const map = new Map<string, string>();
    calculation?.salesmanPerformances.forEach(s => map.set(s.salesmanId, s.salesmanName));
    prevTransactions.forEach(t => { if (t.salesmanId) map.set(t.salesmanId, t.salesmanName || t.salesmanId); });
    currTransactions.forEach(t => { if (t.salesmanId) map.set(t.salesmanId, t.salesmanName || t.salesmanId); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [calculation, prevTransactions, currTransactions]);

  // All Channels
  const allChannels = useMemo(() => {
    const set = new Set<string>();
    masterOutlets.forEach(m => { if (m.channel) set.add(m.channel); });
    prevTransactions.forEach(t => { if (t.channel) set.add(t.channel); });
    currTransactions.forEach(t => { if (t.channel) set.add(t.channel); });
    if (set.size === 0) {
      return ['GENERAL TRADE', 'KIOS', 'MINIMARKET', 'SEMI GROSIR', 'GROSIR BESAR'];
    }
    return Array.from(set).sort();
  }, [masterOutlets, prevTransactions, currTransactions]);

  // Enriched Transactions with master outlet channel/rayon/area/markNew
  const enrichedPrevTxs = useMemo(() => {
    return prevTransactions.map(t => {
      const m = masterMap.get(t.outletId);
      const rawMark = t.markNew && t.markNew.trim() ? t.markNew.trim().toUpperCase() : '';
      const resolvedChannel = t.channel || m?.channel || 'GENERAL TRADE';
      const resolvedMark = rawMark || `ECERAN ${resolvedChannel.toUpperCase()}`;
      return {
        ...t,
        outletName: t.outletName || m?.outletName || t.outletId,
        salesmanId: t.salesmanId || m?.salesmanId || '',
        salesmanName: t.salesmanName || m?.salesmanName || t.salesmanId || '',
        channel: resolvedChannel,
        markNew: resolvedMark,
        rayon: t.rayon || m?.rayon || '',
        area: t.area || m?.area || '',
        cabang: t.cabang || m?.cabang || '',
        depo: t.depo || m?.depo || '',
        fc: t.fc || m?.fc || '',
        pma: t.pma || m?.pma || '',
      };
    });
  }, [prevTransactions, masterMap]);

  const enrichedCurrTxs = useMemo(() => {
    return currTransactions.map(t => {
      const m = masterMap.get(t.outletId);
      const rawMark = t.markNew && t.markNew.trim() ? t.markNew.trim().toUpperCase() : '';
      const resolvedChannel = t.channel || m?.channel || 'GENERAL TRADE';
      const resolvedMark = rawMark || `ECERAN ${resolvedChannel.toUpperCase()}`;
      return {
        ...t,
        outletName: t.outletName || m?.outletName || t.outletId,
        salesmanId: t.salesmanId || m?.salesmanId || '',
        salesmanName: t.salesmanName || m?.salesmanName || t.salesmanId || '',
        channel: resolvedChannel,
        markNew: resolvedMark,
        rayon: t.rayon || m?.rayon || '',
        area: t.area || m?.area || '',
        cabang: t.cabang || m?.cabang || '',
        depo: t.depo || m?.depo || '',
        fc: t.fc || m?.fc || '',
        pma: t.pma || m?.pma || '',
      };
    });
  }, [currTransactions, masterMap]);

  // All MARK NEW categories from database
  const allMarkNewCategories = useMemo(() => {
    const set = new Set<string>();
    enrichedPrevTxs.forEach(t => { if (t.markNew) set.add(t.markNew); });
    enrichedCurrTxs.forEach(t => { if (t.markNew) set.add(t.markNew); });
    if (set.size === 0) {
      return ['ECERAN KIOS', 'ECERAN MINIMARKET', 'ECERAN WARUNG', 'ECERAN TOKO KEL'];
    }
    return Array.from(set).sort();
  }, [enrichedPrevTxs, enrichedCurrTxs]);

  // All Areas & Rayons
  const allAreas = useMemo(() => {
    const set = new Set<string>();
    masterOutlets.forEach(m => { if (m.area) set.add(m.area); });
    prevTransactions.forEach(t => { if (t.area) set.add(t.area); });
    currTransactions.forEach(t => { if (t.area) set.add(t.area); });
    return Array.from(set).sort();
  }, [masterOutlets, prevTransactions, currTransactions]);

  const allRayons = useMemo(() => {
    const set = new Set<string>();
    masterOutlets.forEach(m => { if (m.rayon) set.add(m.rayon); });
    prevTransactions.forEach(t => { if (t.rayon) set.add(t.rayon); });
    currTransactions.forEach(t => { if (t.rayon) set.add(t.rayon); });
    return Array.from(set).sort();
  }, [masterOutlets, prevTransactions, currTransactions]);

  // Core unified filter matcher (Berlaku untuk semua 4 tab)
  const matchesNonDateFilters = (t: {
    outletId?: string;
    outletName?: string;
    salesmanId?: string;
    salesmanName?: string;
    channel?: string;
    markNew?: string;
    area?: string;
    rayon?: string;
    cabang?: string;
    depo?: string;
    fc?: string;
    pma?: string;
  }): boolean => {
    // 1. Salesman filter
    if (selectedSalesman !== 'ALL') {
      if (t.salesmanId !== selectedSalesman && t.salesmanName !== selectedSalesman) return false;
    } else if (filters?.salesmanId) {
      if (!matchesFilter(t.salesmanId, filters.salesmanId)) return false;
    }

    // 2. Outlet Type filter (ECERAN vs NON_ECERAN)
    const isEceran = isLikelyEceran(t.channel) || Boolean(t.markNew && t.markNew.trim());
    if (selectedOutletType === 'ECERAN' && !isEceran) return false;
    if (selectedOutletType === 'NON_ECERAN' && isEceran) return false;

    // 3. Channel filter
    if (selectedChannel !== 'ALL') {
      if (t.channel !== selectedChannel) return false;
    } else if (filters?.channel) {
      if (!matchesFilter(t.channel, filters.channel)) return false;
    }

    // 4. MARK NEW Category filter
    if (selectedMarkNew !== 'ALL') {
      const mark = t.markNew ? t.markNew.trim().toUpperCase() : '';
      if (mark !== selectedMarkNew.trim().toUpperCase()) return false;
    }

    // 5. Area filter
    if (selectedArea !== 'ALL') {
      if (t.area !== selectedArea) return false;
    } else if (filters?.area) {
      if (!matchesFilter(t.area, filters.area)) return false;
    }

    // 6. Rayon filter
    if (selectedRayon !== 'ALL') {
      if (t.rayon !== selectedRayon) return false;
    } else if (filters?.rayon) {
      if (!matchesFilter(t.rayon, filters.rayon)) return false;
    }

    // 7. Global extra filters
    if (filters?.cabang && !matchesFilter(t.cabang, filters.cabang)) return false;
    if (filters?.depo && !matchesFilter(t.depo, filters.depo)) return false;
    if (filters?.fc && !matchesFilter(t.fc, filters.fc)) return false;
    if (filters?.pma && !matchesFilter(t.pma, filters.pma)) return false;

    // 8. Search query filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match =
        (t.outletName && t.outletName.toLowerCase().includes(q)) ||
        (t.outletId && t.outletId.toLowerCase().includes(q)) ||
        (t.salesmanName && t.salesmanName.toLowerCase().includes(q)) ||
        (t.salesmanId && t.salesmanId.toLowerCase().includes(q)) ||
        (t.markNew && t.markNew.toLowerCase().includes(q)) ||
        (t.channel && t.channel.toLowerCase().includes(q)) ||
        (t.area && t.area.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  };

  // Days with recorded transactions (unfiltered for calendar highlight)
  const prevTransactedDays = useMemo(() => {
    const set = new Set<number>();
    enrichedPrevTxs.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) set.add(d);
    });
    return set;
  }, [enrichedPrevTxs]);

  const currTransactedDays = useMemo(() => {
    const set = new Set<number>();
    enrichedCurrTxs.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) set.add(d);
    });
    return set;
  }, [enrichedCurrTxs]);

  const prevSalesByDay = useMemo(() => {
    const map = new Map<number, number>();
    enrichedPrevTxs.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) map.set(d, (map.get(d) || 0) + (t.salesValue || 0));
    });
    return map;
  }, [enrichedPrevTxs]);

  const currSalesByDay = useMemo(() => {
    const map = new Map<number, number>();
    enrichedCurrTxs.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d) map.set(d, (map.get(d) || 0) + (t.salesValue || 0));
    });
    return map;
  }, [enrichedCurrTxs]);

  // Auto-synchronize selected days when new transactions are loaded or uploaded to the database
  const prevTransCount = enrichedPrevTxs.length;
  const currTransCount = enrichedCurrTxs.length;
  const lastCountsRef = useRef<{ prev: number; curr: number }>({ prev: 0, curr: 0 });

  useEffect(() => {
    if (prevTransCount > 0 && prevTransCount !== lastCountsRef.current.prev) {
      lastCountsRef.current.prev = prevTransCount;
      if (prevTransactedDays.size > 0) {
        const sortedDays = Array.from(prevTransactedDays).sort((a, b) => a - b);
        setPrevSelectedDays(sortedDays);
        setPrevRangeStart(sortedDays[0]);
        setPrevRangeEnd(sortedDays[sortedDays.length - 1]);
      }
    }
  }, [prevTransCount, prevTransactedDays]);

  useEffect(() => {
    if (currTransCount > 0 && currTransCount !== lastCountsRef.current.curr) {
      lastCountsRef.current.curr = currTransCount;
      if (currTransactedDays.size > 0) {
        const sortedDays = Array.from(currTransactedDays).sort((a, b) => a - b);
        setCurrSelectedDays(sortedDays);
        setCurrRangeStart(sortedDays[0]);
        setCurrRangeEnd(sortedDays[sortedDays.length - 1]);
      }
    }
  }, [currTransCount, currTransactedDays]);

  // Date-Filtered & Dimension-Filtered Transactions - Terpisah Independen untuk Masing-Masing Bulan
  const activePrevTxs = useMemo(() => {
    return enrichedPrevTxs.filter(t => {
      if (!matchesNonDateFilters(t)) return false;
      if (prevSelectedDays.length === 0 || prevSelectedDays.length === 31) return true;
      const d = getTxDay(t.transactionDate);
      if (d === null) return true;
      return prevSelectedDays.includes(d);
    });
  }, [enrichedPrevTxs, prevSelectedDays, selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, filters]);

  const activeCurrTxs = useMemo(() => {
    return enrichedCurrTxs.filter(t => {
      if (!matchesNonDateFilters(t)) return false;
      if (currSelectedDays.length === 0 || currSelectedDays.length === 31) return true;
      const d = getTxDay(t.transactionDate);
      if (d === null) return true;
      return currSelectedDays.includes(d);
    });
  }, [enrichedCurrTxs, currSelectedDays, selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, filters]);

  // General KPIs (recomputed for the selected date range & filters)
  const totalSalesPrev = useMemo(() => activePrevTxs.reduce((sum, t) => sum + (t.salesValue || 0), 0), [activePrevTxs]);
  const totalSalesCurr = useMemo(() => activeCurrTxs.reduce((sum, t) => sum + (t.salesValue || 0), 0), [activeCurrTxs]);
  const diffSales = totalSalesCurr - totalSalesPrev;
  const growthSalesRate = totalSalesPrev > 0 ? ((totalSalesCurr - totalSalesPrev) / totalSalesPrev) * 100 : (totalSalesCurr > 0 ? null : 0);

  const totalQtyPrev = useMemo(() => activePrevTxs.reduce((sum, t) => sum + (t.qty || 0), 0), [activePrevTxs]);
  const totalQtyCurr = useMemo(() => activeCurrTxs.reduce((sum, t) => sum + (t.qty || 0), 0), [activeCurrTxs]);
  const diffQty = totalQtyCurr - totalQtyPrev;
  const growthQtyRate = totalQtyPrev > 0 ? ((totalQtyCurr - totalQtyPrev) / totalQtyPrev) * 100 : (totalQtyCurr > 0 ? null : 0);

  const totalECPrev = useMemo(() => new Set(activePrevTxs.filter(t => t.salesValue > 0).map(t => t.outletId)).size, [activePrevTxs]);
  const totalECCurr = useMemo(() => new Set(activeCurrTxs.filter(t => t.salesValue > 0).map(t => t.outletId)).size, [activeCurrTxs]);
  const diffEC = totalECCurr - totalECPrev;
  const growthECRate = totalECPrev > 0 ? ((totalECCurr - totalECPrev) / totalECPrev) * 100 : (totalECCurr > 0 ? null : 0);

  // Active filters count for badges
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSalesman !== 'ALL') count++;
    if (selectedOutletType !== 'ALL') count++;
    if (selectedChannel !== 'ALL') count++;
    if (selectedMarkNew !== 'ALL') count++;
    if (selectedArea !== 'ALL') count++;
    if (selectedRayon !== 'ALL') count++;
    if (searchFilter.trim()) count++;
    if (prevSelectedDays.length < 31 || currSelectedDays.length < maxCurrDay) count++;
    return count;
  }, [selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, prevSelectedDays, currSelectedDays, maxCurrDay]);

  // ==========================================
  // 1. HARIAN (DAY-BY-DAY) COMPARISON DATASET
  // Tersinkronisasi dengan filter (Salesman, Channel, MARK NEW, Area, Rayon)
  // ==========================================
  const dailyPrevTxs = useMemo(() => {
    return enrichedPrevTxs.filter(matchesNonDateFilters);
  }, [enrichedPrevTxs, selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, filters]);

  const dailyCurrTxs = useMemo(() => {
    return enrichedCurrTxs.filter(matchesNonDateFilters);
  }, [enrichedCurrTxs, selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, filters]);

  const dailyComparisonData = useMemo(() => {
    const daysMap = new Map<number, {
      day: number;
      prevSales: number;
      currSales: number;
      prevQty: number;
      currQty: number;
      prevOutlets: Set<string>;
      currOutlets: Set<string>;
    }>();

    for (let d = 1; d <= 31; d++) {
      daysMap.set(d, {
        day: d,
        prevSales: 0,
        currSales: 0,
        prevQty: 0,
        currQty: 0,
        prevOutlets: new Set(),
        currOutlets: new Set(),
      });
    }

    dailyPrevTxs.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d && daysMap.has(d)) {
        const item = daysMap.get(d)!;
        item.prevSales += (t.salesValue || 0);
        item.prevQty += (t.qty || 0);
        if (t.salesValue > 0) item.prevOutlets.add(t.outletId);
      }
    });

    dailyCurrTxs.forEach(t => {
      const d = getTxDay(t.transactionDate);
      if (d && daysMap.has(d)) {
        const item = daysMap.get(d)!;
        item.currSales += (t.salesValue || 0);
        item.currQty += (t.qty || 0);
        if (t.salesValue > 0) item.currOutlets.add(t.outletId);
      }
    });

    return Array.from(daysMap.values()).map(item => {
      const prevEC = item.prevOutlets.size;
      const currEC = item.currOutlets.size;
      const diffSales = item.currSales - item.prevSales;
      const growthSales = item.prevSales > 0 ? ((item.currSales - item.prevSales) / item.prevSales) * 100 : (item.currSales > 0 ? null : 0);
      const diffQty = item.currQty - item.prevQty;
      const growthQty = item.prevQty > 0 ? ((item.currQty - item.prevQty) / item.prevQty) * 100 : (item.currQty > 0 ? null : 0);
      const diffEC = currEC - prevEC;
      const growthEC = prevEC > 0 ? ((currEC - prevEC) / prevEC) * 100 : (currEC > 0 ? null : 0);

      return {
        day: item.day,
        prevSales: item.prevSales,
        currSales: item.currSales,
        diffSales,
        growthSales,
        prevQty: item.prevQty,
        currQty: item.currQty,
        diffQty,
        growthQty,
        prevEC,
        currEC,
        diffEC,
        growthEC,
      };
    });
  }, [dailyPrevTxs, dailyCurrTxs]);

  // ==========================================
  // 2. MONITORING BY ECERAN (BERDASARKAN KOLOM MARK NEW)
  // Tersinkronisasi dengan semua filter (Salesman, Tanggal, Area, Rayon, Tipe)
  // ==========================================
  const eceranPrevTxs = useMemo(() => {
    return activePrevTxs.filter(t => {
      if (t.markNew && t.markNew.trim()) return true;
      return isLikelyEceran(t.channel);
    });
  }, [activePrevTxs]);

  const eceranCurrTxs = useMemo(() => {
    return activeCurrTxs.filter(t => {
      if (t.markNew && t.markNew.trim()) return true;
      return isLikelyEceran(t.channel);
    });
  }, [activeCurrTxs]);

  // Eceran Omset
  const eceranOmsetPrev = useMemo(() => eceranPrevTxs.reduce((sum, t) => sum + (t.salesValue || 0), 0), [eceranPrevTxs]);
  const eceranOmsetCurr = useMemo(() => eceranCurrTxs.reduce((sum, t) => sum + (t.salesValue || 0), 0), [eceranCurrTxs]);
  const eceranOmsetDiff = eceranOmsetCurr - eceranOmsetPrev;
  const eceranOmsetGrowth = eceranOmsetPrev > 0 ? ((eceranOmsetCurr - eceranOmsetPrev) / eceranOmsetPrev) * 100 : (eceranOmsetCurr > 0 ? null : 0);

  // Eceran Qty
  const eceranQtyPrev = useMemo(() => eceranPrevTxs.reduce((sum, t) => sum + (t.qty || 0), 0), [eceranPrevTxs]);
  const eceranQtyCurr = useMemo(() => eceranCurrTxs.reduce((sum, t) => sum + (t.qty || 0), 0), [eceranCurrTxs]);
  const eceranQtyDiff = eceranQtyCurr - eceranQtyPrev;
  const eceranQtyGrowth = eceranQtyPrev > 0 ? ((eceranQtyCurr - eceranQtyPrev) / eceranQtyPrev) * 100 : (eceranQtyCurr > 0 ? null : 0);

  // Eceran EC (Effective Call: Unique active purchasing retail outlets)
  const eceranECPrev = useMemo(() => new Set(eceranPrevTxs.filter(t => t.salesValue > 0).map(t => t.outletId)).size, [eceranPrevTxs]);
  const eceranECCurr = useMemo(() => new Set(eceranCurrTxs.filter(t => t.salesValue > 0).map(t => t.outletId)).size, [eceranCurrTxs]);
  const eceranECDiff = eceranECCurr - eceranECPrev;
  const eceranECGrowth = eceranECPrev > 0 ? ((eceranECCurr - eceranECPrev) / eceranECPrev) * 100 : (eceranECCurr > 0 ? null : 0);

  // Drop Size / Avg Sales per EC
  const eceranDropSizePrev = eceranECPrev > 0 ? eceranOmsetPrev / eceranECPrev : 0;
  const eceranDropSizeCurr = eceranECCurr > 0 ? eceranOmsetCurr / eceranECCurr : 0;
  const eceranDropSizeGrowth = eceranDropSizePrev > 0 ? ((eceranDropSizeCurr - eceranDropSizePrev) / eceranDropSizePrev) * 100 : null;

  // Breakdown Monitoring By Eceran (Berdasarkan Kolom MARK NEW)
  const eceranMarkNewData = useMemo(() => {
    const markMap = new Map<string, {
      markNew: string;
      omsetPrev: number;
      omsetCurr: number;
      qtyPrev: number;
      qtyCurr: number;
      ecPrevSet: Set<string>;
      ecCurrSet: Set<string>;
      outletSet: Set<string>;
    }>();

    eceranPrevTxs.forEach(t => {
      const cat = t.markNew || 'ECERAN REGULER';
      if (!markMap.has(cat)) {
        markMap.set(cat, {
          markNew: cat,
          omsetPrev: 0,
          omsetCurr: 0,
          qtyPrev: 0,
          qtyCurr: 0,
          ecPrevSet: new Set(),
          ecCurrSet: new Set(),
          outletSet: new Set(),
        });
      }
      const item = markMap.get(cat)!;
      item.omsetPrev += (t.salesValue || 0);
      item.qtyPrev += (t.qty || 0);
      if (t.salesValue > 0) item.ecPrevSet.add(t.outletId);
      item.outletSet.add(t.outletId);
    });

    eceranCurrTxs.forEach(t => {
      const cat = t.markNew || 'ECERAN REGULER';
      if (!markMap.has(cat)) {
        markMap.set(cat, {
          markNew: cat,
          omsetPrev: 0,
          omsetCurr: 0,
          qtyPrev: 0,
          qtyCurr: 0,
          ecPrevSet: new Set(),
          ecCurrSet: new Set(),
          outletSet: new Set(),
        });
      }
      const item = markMap.get(cat)!;
      item.omsetCurr += (t.salesValue || 0);
      item.qtyCurr += (t.qty || 0);
      if (t.salesValue > 0) item.ecCurrSet.add(t.outletId);
      item.outletSet.add(t.outletId);
    });

    return Array.from(markMap.values())
      .map(item => {
        const ecPrev = item.ecPrevSet.size;
        const ecCurr = item.ecCurrSet.size;
        const diffOmset = item.omsetCurr - item.omsetPrev;
        const growthOmset = item.omsetPrev > 0 ? ((item.omsetCurr - item.omsetPrev) / item.omsetPrev) * 100 : (item.omsetCurr > 0 ? null : 0);
        const diffQty = item.qtyCurr - item.qtyPrev;
        const growthQty = item.qtyPrev > 0 ? ((item.qtyCurr - item.qtyPrev) / item.qtyPrev) * 100 : (item.qtyCurr > 0 ? null : 0);
        const diffEC = ecCurr - ecPrev;
        const growthEC = ecPrev > 0 ? ((ecCurr - ecPrev) / ecPrev) * 100 : (ecCurr > 0 ? null : 0);
        const contribOmset = eceranOmsetCurr > 0 ? (item.omsetCurr / eceranOmsetCurr) * 100 : 0;
        const dropSize = ecCurr > 0 ? item.omsetCurr / ecCurr : 0;

        return {
          markNew: item.markNew,
          omsetPrev: item.omsetPrev,
          omsetCurr: item.omsetCurr,
          diffOmset,
          growthOmset,
          qtyPrev: item.qtyPrev,
          qtyCurr: item.qtyCurr,
          diffQty,
          growthQty,
          ecPrev,
          ecCurr,
          diffEC,
          growthEC,
          contribOmset,
          dropSize,
          totalOutlets: item.outletSet.size,
        };
      })
      .sort((a, b) => b.omsetCurr - a.omsetCurr);
  }, [eceranPrevTxs, eceranCurrTxs, eceranOmsetCurr]);

  // Filtered Eceran data if specific MARK NEW is selected
  const displayedEceranData = useMemo(() => {
    if (selectedMarkNew !== 'ALL') {
      return eceranMarkNewData.filter(d => d.markNew.toUpperCase() === selectedMarkNew.toUpperCase());
    }
    return eceranMarkNewData;
  }, [eceranMarkNewData, selectedMarkNew]);

  // ==========================================
  // 3. MONITORING BY OUTLET
  // Tersinkronisasi dengan semua filter (Salesman, Channel, Tipe, Area, Rayon, Tanggal)
  // ==========================================
  const outletComparisonData = useMemo(() => {
    const outletMap = new Map<string, {
      outletId: string;
      outletName: string;
      salesmanId: string;
      salesmanName: string;
      area: string;
      rayon: string;
      channel: string;
      isEceran: boolean;
      omsetPrev: number;
      omsetCurr: number;
      qtyPrev: number;
      qtyCurr: number;
      txCountPrev: number;
      txCountCurr: number;
    }>();

    // Seed with master outlets matching non-date filters
    masterOutlets.forEach(m => {
      const isEceran = isLikelyEceran(m.channel);
      const rawMark = m.channel ? `ECERAN ${m.channel.toUpperCase()}` : 'ECERAN REGULER';
      const mItem = {
        outletId: m.outletId,
        outletName: m.outletName,
        salesmanId: m.salesmanId,
        salesmanName: m.salesmanName || m.salesmanId,
        area: m.area || '',
        rayon: m.rayon || '',
        channel: m.channel || 'GENERAL TRADE',
        markNew: rawMark,
        cabang: m.cabang || '',
        depo: m.depo || '',
        fc: m.fc || '',
        pma: m.pma || '',
      };
      if (matchesNonDateFilters(mItem)) {
        outletMap.set(m.outletId, {
          outletId: m.outletId,
          outletName: m.outletName,
          salesmanId: m.salesmanId,
          salesmanName: m.salesmanName || m.salesmanId,
          area: m.area || '',
          rayon: m.rayon || '',
          channel: m.channel || 'GENERAL TRADE',
          isEceran,
          omsetPrev: 0,
          omsetCurr: 0,
          qtyPrev: 0,
          qtyCurr: 0,
          txCountPrev: 0,
          txCountCurr: 0,
        });
      }
    });

    // Aggregate filtered previous transactions
    activePrevTxs.forEach(t => {
      let item = outletMap.get(t.outletId);
      if (!item) {
        item = {
          outletId: t.outletId,
          outletName: t.outletName || t.outletId,
          salesmanId: t.salesmanId || '',
          salesmanName: t.salesmanName || '',
          area: t.area || '',
          rayon: t.rayon || '',
          channel: t.channel || 'GENERAL TRADE',
          isEceran: isLikelyEceran(t.channel),
          omsetPrev: 0,
          omsetCurr: 0,
          qtyPrev: 0,
          qtyCurr: 0,
          txCountPrev: 0,
          txCountCurr: 0,
        };
        outletMap.set(t.outletId, item);
      }
      item.omsetPrev += (t.salesValue || 0);
      item.qtyPrev += (t.qty || 0);
      item.txCountPrev += 1;
      if (t.channel && !item.channel) {
        item.channel = t.channel;
        item.isEceran = isLikelyEceran(t.channel);
      }
      if (t.salesmanName && (!item.salesmanName || item.salesmanName === item.salesmanId)) {
        item.salesmanName = t.salesmanName;
      }
    });

    // Aggregate filtered current transactions
    activeCurrTxs.forEach(t => {
      let item = outletMap.get(t.outletId);
      if (!item) {
        item = {
          outletId: t.outletId,
          outletName: t.outletName || t.outletId,
          salesmanId: t.salesmanId || '',
          salesmanName: t.salesmanName || '',
          area: t.area || '',
          rayon: t.rayon || '',
          channel: t.channel || 'GENERAL TRADE',
          isEceran: isLikelyEceran(t.channel),
          omsetPrev: 0,
          omsetCurr: 0,
          qtyPrev: 0,
          qtyCurr: 0,
          txCountPrev: 0,
          txCountCurr: 0,
        };
        outletMap.set(t.outletId, item);
      }
      item.omsetCurr += (t.salesValue || 0);
      item.qtyCurr += (t.qty || 0);
      item.txCountCurr += 1;
      if (t.channel && !item.channel) {
        item.channel = t.channel;
        item.isEceran = isLikelyEceran(t.channel);
      }
      if (t.salesmanName && (!item.salesmanName || item.salesmanName === item.salesmanId)) {
        item.salesmanName = t.salesmanName;
      }
    });

    return Array.from(outletMap.values()).map(o => {
      const diffOmset = o.omsetCurr - o.omsetPrev;
      const growthOmset = o.omsetPrev > 0 ? ((o.omsetCurr - o.omsetPrev) / o.omsetPrev) * 100 : (o.omsetCurr > 0 ? null : null);
      const diffQty = o.qtyCurr - o.qtyPrev;
      const growthQty = o.qtyPrev > 0 ? ((o.qtyCurr - o.qtyPrev) / o.qtyPrev) * 100 : (o.qtyCurr > 0 ? null : null);

      let status: 'GROWTH_UP' | 'GROWTH_DOWN' | 'DROP' | 'NEW_ACTIVE' | 'NOT_BUYING';
      if (o.omsetPrev > 0 && o.omsetCurr > 0) {
        status = o.omsetCurr >= o.omsetPrev ? 'GROWTH_UP' : 'GROWTH_DOWN';
      } else if (o.omsetPrev > 0 && o.omsetCurr === 0) {
        status = 'DROP';
      } else if (o.omsetPrev === 0 && o.omsetCurr > 0) {
        status = 'NEW_ACTIVE';
      } else {
        status = 'NOT_BUYING';
      }

      return {
        ...o,
        diffOmset,
        growthOmset,
        diffQty,
        growthQty,
        status,
        ecPrev: o.omsetPrev > 0,
        ecCurr: o.omsetCurr > 0,
      };
    });
  }, [masterOutlets, activePrevTxs, activeCurrTxs, selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, filters]);

  // Filtered Outlets for DataTable (termasuk status button)
  const filteredOutlets = useMemo(() => {
    return outletComparisonData.filter(o => {
      if (outletStatusFilter !== 'ALL' && o.status !== outletStatusFilter) return false;
      return true;
    });
  }, [outletComparisonData, outletStatusFilter]);

  // Outlet KPIs
  const outletKpis = useMemo(() => {
    const totalOutlets = outletComparisonData.length;
    const transPrevCount = outletComparisonData.filter(o => o.ecPrev).length;
    const transCurrCount = outletComparisonData.filter(o => o.ecCurr).length;
    const growthUpCount = outletComparisonData.filter(o => o.status === 'GROWTH_UP').length;
    const growthDownCount = outletComparisonData.filter(o => o.status === 'GROWTH_DOWN').length;
    const dropCount = outletComparisonData.filter(o => o.status === 'DROP').length;
    const dropLostRevenue = outletComparisonData.filter(o => o.status === 'DROP').reduce((s, o) => s + o.omsetPrev, 0);
    const newActiveCount = outletComparisonData.filter(o => o.status === 'NEW_ACTIVE').length;
    const newActiveRevenue = outletComparisonData.filter(o => o.status === 'NEW_ACTIVE').reduce((s, o) => s + o.omsetCurr, 0);

    return {
      totalOutlets,
      transPrevCount,
      transCurrCount,
      growthUpCount,
      growthDownCount,
      dropCount,
      dropLostRevenue,
      newActiveCount,
      newActiveRevenue,
    };
  }, [outletComparisonData]);

  // ==========================================
  // 4. SALESMAN COMPARISON DATA (DATE-AWARE & FILTER-AWARE)
  // Tersinkronisasi dengan filter (Tipe, MARK NEW, Channel, Area, Tanggal)
  // ==========================================
  const dateAwareSalesmanPerformances = useMemo(() => {
    // Group active transactions by salesman
    const map = new Map<string, {
      salesmanId: string;
      salesmanName: string;
      area: string;
      actualPrevious: number;
      actualCurrent: number;
      target: number;
    }>();

    // Seed from calculation.salesmanPerformances to keep targets
    calculation?.salesmanPerformances.forEach(s => {
      const match = matchesNonDateFilters({
        salesmanId: s.salesmanId,
        salesmanName: s.salesmanName,
        area: s.area || '',
        rayon: s.rayon || '',
      });
      if (match) {
        map.set(s.salesmanId, {
          salesmanId: s.salesmanId,
          salesmanName: s.salesmanName,
          area: s.area || '',
          actualPrevious: 0,
          actualCurrent: 0,
          target: s.target || 0,
        });
      }
    });

    activePrevTxs.forEach(t => {
      const slsId = t.salesmanId || 'UNASSIGNED';
      if (!map.has(slsId)) {
        map.set(slsId, {
          salesmanId: slsId,
          salesmanName: t.salesmanName || slsId,
          area: t.area || '',
          actualPrevious: 0,
          actualCurrent: 0,
          target: 0,
        });
      }
      const item = map.get(slsId)!;
      item.actualPrevious += (t.salesValue || 0);
      if (t.area && !item.area) item.area = t.area;
    });

    activeCurrTxs.forEach(t => {
      const slsId = t.salesmanId || 'UNASSIGNED';
      if (!map.has(slsId)) {
        map.set(slsId, {
          salesmanId: slsId,
          salesmanName: t.salesmanName || slsId,
          area: t.area || '',
          actualPrevious: 0,
          actualCurrent: 0,
          target: 0,
        });
      }
      const item = map.get(slsId)!;
      item.actualCurrent += (t.salesValue || 0);
      if (t.area && !item.area) item.area = t.area;
    });

    return Array.from(map.values()).map(s => {
      const growthRate = s.actualPrevious > 0 
        ? ((s.actualCurrent - s.actualPrevious) / s.actualPrevious) * 100 
        : (s.actualCurrent > 0 ? null : 0);
      
      const achievementRate = s.target > 0 
        ? (s.actualCurrent / s.target) * 100 
        : null;

      let growthStatus: 'POSITIVE' | 'NEGATIVE' | 'NEW_SALES' | 'NO_DATA' = 'NO_DATA';
      if (s.actualPrevious === 0 && s.actualCurrent > 0) {
        growthStatus = 'NEW_SALES';
      } else if (growthRate !== null) {
        growthStatus = growthRate >= 0 ? 'POSITIVE' : 'NEGATIVE';
      }

      return {
        ...s,
        growthRate,
        growthStatus,
        achievementRate,
      };
    }).sort((a, b) => b.actualCurrent - a.actualCurrent);
  }, [calculation, activePrevTxs, activeCurrTxs, selectedSalesman, selectedOutletType, selectedChannel, selectedMarkNew, selectedArea, selectedRayon, searchFilter, filters]);

  const filteredSalesmanPerformances = useMemo(() => {
    if (selectedSalesman !== 'ALL') {
      return dateAwareSalesmanPerformances.filter(s => s.salesmanId === selectedSalesman);
    }
    return dateAwareSalesmanPerformances;
  }, [dateAwareSalesmanPerformances, selectedSalesman]);

  // ==========================================
  // TABLE COLUMNS
  // ==========================================

  // A. Salesman Table Columns
  const salesmanColumns: ColumnDef<any>[] = [
    {
      key: 'salesmanId',
      header: 'KD SLS',
      render: (row) => <span className="font-mono text-cyan-400 text-xs">{row.salesmanId}</span>,
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
      key: 'actualPrevious',
      header: `Sales ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.actualPrevious,
      render: (row) => (
        <span className="font-mono text-slate-300">
          {formatRupiah(row.actualPrevious)}
        </span>
      ),
    },
    {
      key: 'actualCurrent',
      header: `Sales ${currLabel}`,
      align: 'right',
      accessor: (row) => row.actualCurrent,
      render: (row) => (
        <span className="font-mono font-bold text-cyan-300">
          {formatRupiah(row.actualCurrent)}
        </span>
      ),
    },
    {
      key: 'growthRate',
      header: 'Growth % (MoM)',
      align: 'right',
      accessor: (row) => row.growthRate ?? -999,
      render: (row) => {
        if (row.growthStatus === 'NEW_SALES') {
          return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-900/40 text-cyan-300 font-bold border border-cyan-700/50">NEW SALES</span>;
        }
        if (row.growthRate === null) {
          return <span className="text-slate-500 font-mono text-xs">N/A</span>;
        }
        const isPos = row.growthRate >= 0;
        return (
          <span className={`font-mono font-bold flex items-center justify-end gap-1 ${
            isPos ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatPercent(row.growthRate)}
          </span>
        );
      },
    },
    {
      key: 'target',
      header: `Target ${currLabel}`,
      align: 'right',
      accessor: (row) => row.target,
      render: (row) => (
        <span className="font-mono text-slate-400">
          {row.target > 0 ? formatRupiah(row.target) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'achievementRate',
      header: 'Achievement %',
      align: 'right',
      accessor: (row) => row.achievementRate ?? -1,
      render: (row) => (
        <span className={`font-mono font-bold ${
          row.achievementRate !== null && row.achievementRate >= 100 ? 'text-emerald-400' : 'text-slate-200'
        }`}>
          {row.achievementRate !== null ? `${row.achievementRate.toFixed(1)}%` : 'N/A'}
        </span>
      ),
    },
  ];

  // B. Eceran Columns - Grouped By Eceran (MARK NEW)
  const eceranColumns: ColumnDef<any>[] = [
    {
      key: 'markNew',
      header: 'By Eceran',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Store className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="font-bold text-slate-100 font-mono text-xs">{row.markNew}</div>
            <div className="text-[10px] text-slate-500">
              Kategori MARK NEW &bull; {row.totalOutlets ? `${row.totalOutlets} Outlet` : 'Eceran'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'omsetPrevious',
      header: `Omset ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.omsetPrev,
      render: (row) => <span className="font-mono text-slate-300">{formatRupiah(row.omsetPrev)}</span>,
    },
    {
      key: 'omsetCurrent',
      header: `Omset ${currLabel}`,
      align: 'right',
      accessor: (row) => row.omsetCurr,
      render: (row) => <span className="font-mono font-bold text-cyan-300">{formatRupiah(row.omsetCurr)}</span>,
    },
    {
      key: 'growthOmset',
      header: 'Growth Omset',
      align: 'right',
      accessor: (row) => row.growthOmset ?? -999,
      render: (row) => {
        if (row.growthOmset === null) return <span className="text-cyan-400 font-mono text-xs">NEW SALES</span>;
        const isPos = row.growthOmset >= 0;
        return (
          <span className={`font-mono font-bold flex items-center justify-end gap-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatPercent(row.growthOmset)}
          </span>
        );
      },
    },
    {
      key: 'qtyPrevious',
      header: `Qty ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.qtyPrev,
      render: (row) => <span className="font-mono text-slate-400">{formatNumber(row.qtyPrev)}</span>,
    },
    {
      key: 'qtyCurrent',
      header: `Qty ${currLabel}`,
      align: 'right',
      accessor: (row) => row.qtyCurr,
      render: (row) => <span className="font-mono font-semibold text-slate-200">{formatNumber(row.qtyCurr)}</span>,
    },
    {
      key: 'growthQty',
      header: 'Growth Qty',
      align: 'right',
      accessor: (row) => row.growthQty ?? -999,
      render: (row) => {
        if (row.growthQty === null) return <span className="text-cyan-400 font-mono text-xs">NEW</span>;
        const isPos = row.growthQty >= 0;
        return (
          <span className={`font-mono text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPercent(row.growthQty)}
          </span>
        );
      },
    },
    {
      key: 'ecPrevious',
      header: `EC ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.ecPrev,
      render: (row) => <span className="font-mono text-slate-400">{row.ecPrev} Toko</span>,
    },
    {
      key: 'ecCurrent',
      header: `EC ${currLabel}`,
      align: 'right',
      accessor: (row) => row.ecCurr,
      render: (row) => <span className="font-mono font-bold text-amber-300">{row.ecCurr} Toko</span>,
    },
    {
      key: 'growthEC',
      header: 'Growth EC',
      align: 'right',
      accessor: (row) => row.growthEC ?? -999,
      render: (row) => {
        if (row.growthEC === null) return <span className="text-cyan-400 font-mono text-xs">NEW</span>;
        const isPos = row.growthEC >= 0;
        return (
          <span className={`font-mono text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPercent(row.growthEC)}
          </span>
        );
      },
    },
    {
      key: 'dropSize',
      header: 'Drop Size / EC',
      align: 'right',
      accessor: (row) => row.dropSize,
      render: (row) => <span className="font-mono text-slate-300 text-xs">{formatRupiah(row.dropSize)}</span>,
    },
    {
      key: 'contribOmset',
      header: 'Kontribusi %',
      align: 'right',
      accessor: (row) => row.contribOmset,
      render: (row) => <span className="font-mono text-cyan-300 text-xs font-bold">{row.contribOmset ? `${row.contribOmset.toFixed(1)}%` : '0%'}</span>,
    },
  ];

  // C. Outlet Table Columns
  const outletColumns: ColumnDef<any>[] = [
    {
      key: 'outletId',
      header: 'KD OUTLET',
      render: (row) => <span className="font-mono text-cyan-400 text-xs font-semibold">{row.outletId}</span>,
    },
    {
      key: 'outletName',
      header: 'Nama Outlet',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200">{row.outletName}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
              {row.channel || 'GENERAL'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{row.rayon || row.area || ''}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanName',
      header: 'Salesman',
      render: (row) => (
        <div>
          <div className="text-xs text-slate-300 font-medium">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'omsetPrev',
      header: `Omset ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.omsetPrev,
      render: (row) => (
        <span className="font-mono text-slate-300 text-xs">
          {row.omsetPrev > 0 ? formatRupiah(row.omsetPrev) : '-'}
        </span>
      ),
    },
    {
      key: 'omsetCurr',
      header: `Omset ${currLabel}`,
      align: 'right',
      accessor: (row) => row.omsetCurr,
      render: (row) => (
        <span className="font-mono font-bold text-cyan-300 text-xs">
          {row.omsetCurr > 0 ? formatRupiah(row.omsetCurr) : '-'}
        </span>
      ),
    },
    {
      key: 'growthOmset',
      header: 'Growth Omset',
      align: 'right',
      accessor: (row) => row.growthOmset ?? -999,
      render: (row) => {
        if (row.status === 'NEW_ACTIVE') {
          return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-900/40 text-cyan-300 font-bold border border-cyan-700/50">NEW ACTIVE</span>;
        }
        if (row.status === 'DROP') {
          return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 text-rose-300 font-bold border border-rose-800/60">DROP OUTLET</span>;
        }
        if (row.status === 'NOT_BUYING') {
          return <span className="text-slate-600 font-mono text-xs">-</span>;
        }
        const isPos = (row.growthOmset || 0) >= 0;
        return (
          <span className={`font-mono font-bold text-xs flex items-center justify-end gap-1 ${
            isPos ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatPercent(row.growthOmset)}
          </span>
        );
      },
    },
    {
      key: 'qtyPrev',
      header: `Qty ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.qtyPrev,
      render: (row) => <span className="font-mono text-slate-400 text-xs">{row.qtyPrev > 0 ? formatNumber(row.qtyPrev) : '-'}</span>,
    },
    {
      key: 'qtyCurr',
      header: `Qty ${currLabel}`,
      align: 'right',
      accessor: (row) => row.qtyCurr,
      render: (row) => <span className="font-mono font-semibold text-slate-200 text-xs">{row.qtyCurr > 0 ? formatNumber(row.qtyCurr) : '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status Komparasi',
      align: 'center',
      render: (row) => {
        if (row.status === 'GROWTH_UP') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              RO Tumbuh
            </span>
          );
        }
        if (row.status === 'GROWTH_DOWN') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              RO Turun
            </span>
          );
        }
        if (row.status === 'DROP') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Drop Outlet
            </span>
          );
        }
        if (row.status === 'NEW_ACTIVE') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              New Active
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-500">
            Belum Beli
          </span>
        );
      },
    },
  ];

  // D. Daily Comparison Columns
  const dailyColumns: ColumnDef<any>[] = [
    {
      key: 'day',
      header: 'Tanggal (Hari)',
      align: 'center',
      render: (row) => (
        <span className="font-mono font-bold text-cyan-400 text-sm">
          Hari ke-{row.day}
        </span>
      ),
    },
    {
      key: 'prevSales',
      header: `Sales ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.prevSales,
      render: (row) => <span className="font-mono text-slate-300">{formatRupiah(row.prevSales)}</span>,
    },
    {
      key: 'currSales',
      header: `Sales ${currLabel}`,
      align: 'right',
      accessor: (row) => row.currSales,
      render: (row) => <span className="font-mono font-bold text-cyan-300">{formatRupiah(row.currSales)}</span>,
    },
    {
      key: 'growthSales',
      header: 'Growth Sales',
      align: 'right',
      accessor: (row) => row.growthSales ?? -999,
      render: (row) => {
        if (row.growthSales === null) return <span className="text-cyan-400 font-mono text-xs">NEW</span>;
        const isPos = row.growthSales >= 0;
        return (
          <span className={`font-mono font-bold flex items-center justify-end gap-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {formatPercent(row.growthSales)}
          </span>
        );
      },
    },
    {
      key: 'prevQty',
      header: `Qty ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.prevQty,
      render: (row) => <span className="font-mono text-slate-400">{formatNumber(row.prevQty)}</span>,
    },
    {
      key: 'currQty',
      header: `Qty ${currLabel}`,
      align: 'right',
      accessor: (row) => row.currQty,
      render: (row) => <span className="font-mono font-semibold text-slate-200">{formatNumber(row.currQty)}</span>,
    },
    {
      key: 'prevEC',
      header: `EC ${prevLabel}`,
      align: 'right',
      accessor: (row) => row.prevEC,
      render: (row) => <span className="font-mono text-slate-400">{row.prevEC} Toko</span>,
    },
    {
      key: 'currEC',
      header: `EC ${currLabel}`,
      align: 'right',
      accessor: (row) => row.currEC,
      render: (row) => <span className="font-mono font-bold text-amber-300">{row.currEC} Toko</span>,
    },
    {
      key: 'diffEC',
      header: 'Selisih EC',
      align: 'right',
      accessor: (row) => row.diffEC,
      render: (row) => {
        const isPos = row.diffEC >= 0;
        return (
          <span className={`font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPos ? `+${row.diffEC}` : row.diffEC} Toko
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/50 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Komparasi Bulan: <span className="text-indigo-300 font-mono">{prevLabel}</span> vs <span className="text-cyan-300 font-mono">{currLabel}</span></span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  Sesuai Data Database Terupload
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring komparasi multi-dimensi: Salesman, Eceran (Omset, Qty, EC), Outlet, dan Analisa Harian ({prevLabel} vs {currLabel}).
              </p>
            </div>
          </div>
        </div>

        {/* Global Date Filter Badge & Capture Button */}
        <div className="flex flex-wrap items-center gap-3">
          {onUpdatePeriodLabel && (
            <button
              type="button"
              onClick={() => {
                setModalPrevText(prevLabel);
                setModalCurrText(currLabel);
                setShowPeriodModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Sesuaikan atau ganti label periode komparasi bulan"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ubah Periode</span>
            </button>
          )}

          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Komparasi_${prevLabel.replace(/\s+/g, '_')}_vs_${currLabel.replace(/\s+/g, '_')}.jpg`}
            label="Capture JPG"
          />

          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <CalendarRange className="w-4 h-4 text-cyan-400" />
            <div className="flex items-center gap-2 font-mono flex-wrap">
              <span className="text-slate-400">{prevLabel}:</span>
              <span className="font-bold text-indigo-300 bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-700/50">
                {prevSelectedDays.length === 31 ? 'Semua (31 Hari)' : `${prevSelectedDays.length} Hari Terpilih`}
              </span>
              <span className="text-slate-600">vs</span>
              <span className="text-slate-400">{currLabel}:</span>
              <span className="font-bold text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-700/50">
                {currSelectedDays.length === 31 ? 'Semua (31 Hari)' : `${currSelectedDays.length} Hari Terpilih`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Period Adjustment Modal */}
      {showPeriodModal && onUpdatePeriodLabel && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-slate-100 text-sm">Sesuaikan Periode Komparasi</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPeriodModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pilih preset periode sesuai data yang diupload ke database, atau ketik label periode manual:
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Preset Cepat:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { prev: 'SEPTEMBER 2026', curr: 'OKTOBER 2026', desc: 'Bulan Lalu: September 2026 vs Bulan Ini: Oktober 2026 (Aktif)' },
                  { prev: 'OKTOBER 2026', curr: 'NOVEMBER 2026', desc: 'Bulan Lalu: Oktober 2026 vs Bulan Ini: November 2026' },
                  { prev: 'AGUSTUS 2026', curr: 'SEPTEMBER 2026', desc: 'Bulan Lalu: Agustus 2026 vs Bulan Ini: September 2026' },
                ].map(item => (
                  <button
                    key={`${item.prev}-${item.curr}`}
                    type="button"
                    onClick={() => {
                      onUpdatePeriodLabel('previous_month', item.prev);
                      onUpdatePeriodLabel('current_month', item.curr);
                      setShowPeriodModal(false);
                    }}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      prevLabel === item.prev && currLabel === item.curr
                        ? 'bg-cyan-950/50 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="font-bold font-mono text-xs flex items-center justify-between">
                      <span>{item.prev} vs {item.curr}</span>
                      {prevLabel === item.prev && currLabel === item.curr && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] font-mono text-indigo-300 block mb-1">
                  Label Bulan Lalu (Database 1):
                </label>
                <input
                  type="text"
                  value={modalPrevText}
                  onChange={(e) => setModalPrevText(e.target.value.toUpperCase())}
                  placeholder="SEPTEMBER 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-cyan-300 block mb-1">
                  Label Bulan Ini (Database 2):
                </label>
                <input
                  type="text"
                  value={modalCurrText}
                  onChange={(e) => setModalCurrText(e.target.value.toUpperCase())}
                  placeholder="OKTOBER 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPeriodModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modalPrevText.trim()) onUpdatePeriodLabel('previous_month', modalPrevText.trim());
                  if (modalCurrText.trim()) onUpdatePeriodLabel('current_month', modalCurrText.trim());
                  setShowPeriodModal(false);
                }}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Pilihan Tanggal Perbandingan Harian Terpisah untuk Masing-Masing Bulan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-sm font-bold text-slate-100">
                Pilihan Tanggal Perbandingan Harian (Terpisah untuk Masing-Masing Bulan)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pilih satu atau lebih dari 1 tanggal secara independen untuk {prevLabel} dan {currLabel}.
              </p>
            </div>
          </div>

          {/* Quick sync options */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => {
                setPrevSelectedDays(Array.from({ length: 31 }, (_, i) => i + 1));
                setCurrSelectedDays(Array.from({ length: 31 }, (_, i) => i + 1));
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
            >
              Pilih Semua Kedua Bulan
            </button>
            <button
              onClick={() => setPrevSelectedDays([...currSelectedDays])}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/40 font-medium transition-all"
              title="Salin tanggal terpilih dari Bulan Ini ke Bulan Lalu"
            >
              Samakan ({currLabel} &rarr; {prevLabel})
            </button>
            <button
              onClick={() => setCurrSelectedDays([...prevSelectedDays])}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/40 font-medium transition-all"
              title="Salin tanggal terpilih dari Bulan Lalu ke Bulan Ini"
            >
              Samakan ({prevLabel} &rarr; {currLabel})
            </button>
          </div>
        </div>

        {/* DUA PANEL TERPISAH: BULAN LALU & BULAN INI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ========================================= */}
          {/* PANEL KIRI: BULAN LALU ({prevLabel})     */}
          {/* ========================================= */}
          <div className="bg-slate-950/80 border border-indigo-900/40 rounded-xl p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="font-bold text-xs text-indigo-200">
                  Tanggal {prevLabel} (Bulan Lalu)
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-semibold">
                {prevSelectedDays.length === 31 ? 'Semua (31 Hari)' : `${prevSelectedDays.length} Hari Aktif`}
              </span>
            </div>

            {/* Database Detection Summary */}
            {prevTransactedDays.size > 0 && (
              <div className="text-[11px] text-indigo-200/90 bg-indigo-950/70 border border-indigo-800/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                  <span>Database {prevLabel}: <strong className="text-white">{prevTransactedDays.size} tanggal</strong> ada transaksi (Tgl {Array.from(prevTransactedDays).sort((a, b) => a - b).join(', ')})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPrevSelectedDays(Array.from(prevTransactedDays).sort((a, b) => a - b))}
                  className="text-[10px] text-indigo-300 hover:text-white underline font-semibold ml-2 cursor-pointer"
                >
                  Pilih Tgl Transaksi
                </button>
              </div>
            )}

            {/* Presets Bulan Lalu */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <button
                onClick={() => setPrevSelectedDays(Array.from(prevTransactedDays).sort((a, b) => a - b))}
                className="px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/60 font-semibold transition-all flex items-center gap-1 shadow-sm"
                title={`Pilih hanya ${prevTransactedDays.size} tanggal yang ada transaksi`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                <span>Hanya Tgl Ada Transaksi ({prevTransactedDays.size})</span>
              </button>
              <button
                onClick={() => setPrevSelectedDays(Array.from({ length: 31 }, (_, i) => i + 1))}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  prevSelectedDays.length === 31
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                Semua (1-31)
              </button>
              <button
                onClick={() => setPrevSelectedDays(Array.from({ length: maxCurrDay }, (_, i) => i + 1))}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium transition-all"
                title={`Pilih Tgl 1 s/d ${maxCurrDay}`}
              >
                Cut-Off (1-{maxCurrDay})
              </button>
              <button
                onClick={() => setPrevSelectedDays([1, 2, 3, 4, 5, 6, 7])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M1
              </button>
              <button
                onClick={() => setPrevSelectedDays([8, 9, 10, 11, 12, 13, 14])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M2
              </button>
              <button
                onClick={() => setPrevSelectedDays([15, 16, 17, 18, 19, 20, 21])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M3
              </button>
              <button
                onClick={() => setPrevSelectedDays([22, 23, 24, 25, 26, 27, 28])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M4
              </button>
              <button
                onClick={() => setPrevSelectedDays([])}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 font-medium transition-all ml-auto"
              >
                Bersihkan
              </button>
            </div>

            {/* Custom Range input for Bulan Lalu */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span>Rentang:</span>
              <input
                type="number"
                min={1}
                max={prevRangeEnd}
                value={prevRangeStart}
                onChange={(e) => setPrevRangeStart(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-center text-indigo-300 font-mono"
              />
              <span>s/d</span>
              <input
                type="number"
                min={prevRangeStart}
                max={31}
                value={prevRangeEnd}
                onChange={(e) => setPrevRangeEnd(Math.max(prevRangeStart, Math.min(31, parseInt(e.target.value) || 31)))}
                className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-center text-indigo-300 font-mono"
              />
              <button
                onClick={() => {
                  const days: number[] = [];
                  for (let i = prevRangeStart; i <= prevRangeEnd; i++) days.push(i);
                  setPrevSelectedDays(days);
                }}
                className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 hover:bg-indigo-900 border border-indigo-800/50 font-medium"
              >
                Terapkan
              </button>
            </div>

            {/* 31-Day Selector Grid for Bulan Lalu */}
            <div className="pt-1 space-y-1.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Pilih tanggal (bisa lebih dari 1):</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-indigo-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                    Terang: Ada Transaksi ({prevTransactedDays.size} hari)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
                    Gelap: Tidak Ada
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-11 md:grid-cols-16 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const isSelected = prevSelectedDays.includes(day);
                  const hasTx = prevTransactedDays.has(day);
                  const salesVal = prevSalesByDay.get(day) || 0;

                  let btnClass = '';
                  if (hasTx) {
                    if (isSelected) {
                      btnClass = 'bg-indigo-600 text-white font-black shadow-[0_0_14px_rgba(99,102,241,0.75)] border-2 border-indigo-200 ring-2 ring-indigo-400/80 scale-[1.05] z-10 cursor-pointer';
                    } else {
                      btnClass = 'bg-indigo-950/80 text-indigo-200 font-bold border-2 border-indigo-500/80 hover:border-indigo-400 hover:bg-indigo-900/60 shadow-[0_0_8px_rgba(99,102,241,0.3)] cursor-pointer';
                    }
                  } else {
                    if (isSelected) {
                      btnClass = 'bg-slate-900 text-slate-500 border border-dashed border-slate-700 opacity-50 hover:opacity-80 cursor-pointer';
                    } else {
                      btnClass = 'bg-slate-950/40 text-slate-700 border border-slate-900/70 opacity-30 hover:opacity-60 cursor-pointer';
                    }
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => togglePrevDay(day)}
                      className={`h-7 rounded text-[10px] font-mono transition-all relative ${btnClass}`}
                      title={
                        hasTx
                          ? `Tgl ${day} ${prevLabel}: ${formatRupiah(salesVal)} (Ada Transaksi)\nKlik untuk ${isSelected ? 'batalkan pilihan' : 'pilih'}`
                          : `Tgl ${day} ${prevLabel}: Tidak ada transaksi`
                      }
                    >
                      {day}
                      {hasTx && (
                        <span className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300 shadow-[0_0_6px_#fde047]' : 'bg-indigo-400 shadow-[0_0_6px_#818cf8]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* PANEL KANAN: BULAN INI ({currLabel})     */}
          {/* ========================================= */}
          <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span className="font-bold text-xs text-cyan-200">
                  Tanggal {currLabel} (Bulan Ini)
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-semibold">
                {currSelectedDays.length === 31 ? 'Semua (31 Hari)' : `${currSelectedDays.length} Hari Aktif`}
              </span>
            </div>

            {/* Database Detection Summary */}
            {currTransactedDays.size > 0 && (
              <div className="text-[11px] text-cyan-200/90 bg-cyan-950/70 border border-cyan-800/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  <span>Database {currLabel}: <strong className="text-white">{currTransactedDays.size} tanggal</strong> ada transaksi (Tgl {Array.from(currTransactedDays).sort((a, b) => a - b).join(', ')})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCurrSelectedDays(Array.from(currTransactedDays).sort((a, b) => a - b))}
                  className="text-[10px] text-cyan-300 hover:text-white underline font-semibold ml-2 cursor-pointer"
                >
                  Pilih Tgl Transaksi
                </button>
              </div>
            )}

            {/* Presets Bulan Ini */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <button
                onClick={() => setCurrSelectedDays(Array.from(currTransactedDays).sort((a, b) => a - b))}
                className="px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800/80 text-cyan-200 border border-cyan-700/60 font-semibold transition-all flex items-center gap-1 shadow-sm"
                title={`Pilih hanya ${currTransactedDays.size} tanggal yang ada transaksi`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                <span>Hanya Tgl Ada Transaksi ({currTransactedDays.size})</span>
              </button>
              <button
                onClick={() => setCurrSelectedDays(Array.from({ length: 31 }, (_, i) => i + 1))}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  currSelectedDays.length === 31
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                Semua (1-31)
              </button>
              <button
                onClick={() => setCurrSelectedDays(Array.from({ length: maxCurrDay }, (_, i) => i + 1))}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  currSelectedDays.length === maxCurrDay && currSelectedDays[0] === 1
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title={`Pilih Tgl 1 s/d ${maxCurrDay} (Bulan ini berjalan)`}
              >
                Cut-Off (1-{maxCurrDay})
              </button>
              <button
                onClick={() => setCurrSelectedDays([1, 2, 3, 4, 5, 6, 7])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M1
              </button>
              <button
                onClick={() => setCurrSelectedDays([8, 9, 10, 11, 12, 13, 14])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M2
              </button>
              <button
                onClick={() => setCurrSelectedDays([15, 16, 17, 18, 19, 20, 21])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M3
              </button>
              <button
                onClick={() => setCurrSelectedDays([22, 23, 24, 25, 26, 27, 28])}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-mono"
              >
                M4
              </button>
              <button
                onClick={() => setCurrSelectedDays([])}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 font-medium transition-all ml-auto"
              >
                Bersihkan
              </button>
            </div>

            {/* Custom Range input for Bulan Ini */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span>Rentang:</span>
              <input
                type="number"
                min={1}
                max={currRangeEnd}
                value={currRangeStart}
                onChange={(e) => setCurrRangeStart(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-center text-cyan-300 font-mono"
              />
              <span>s/d</span>
              <input
                type="number"
                min={currRangeStart}
                max={31}
                value={currRangeEnd}
                onChange={(e) => setCurrRangeEnd(Math.max(currRangeStart, Math.min(31, parseInt(e.target.value) || 31)))}
                className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-center text-cyan-300 font-mono"
              />
              <button
                onClick={() => {
                  const days: number[] = [];
                  for (let i = currRangeStart; i <= currRangeEnd; i++) days.push(i);
                  setCurrSelectedDays(days);
                }}
                className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800/50 font-medium"
              >
                Terapkan
              </button>
            </div>

            {/* 31-Day Selector Grid for Bulan Ini */}
            <div className="pt-1 space-y-1.5">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Pilih tanggal (bisa lebih dari 1):</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-cyan-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                    Terang/Menyala: Ada Transaksi ({currTransactedDays.size} hari)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
                    Gelap: Tidak Ada
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-11 md:grid-cols-16 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const isSelected = currSelectedDays.includes(day);
                  const hasTx = currTransactedDays.has(day);
                  const salesVal = currSalesByDay.get(day) || 0;
                  const isCutoff = day === maxCurrDay;

                  let btnClass = '';
                  if (hasTx) {
                    if (isSelected) {
                      btnClass = 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_16px_rgba(34,211,238,0.85)] border-2 border-cyan-100 ring-2 ring-cyan-300/80 scale-[1.05] z-10 cursor-pointer';
                    } else {
                      btnClass = 'bg-cyan-950/80 text-cyan-200 font-bold border-2 border-cyan-500/80 hover:border-cyan-400 hover:bg-cyan-900/60 shadow-[0_0_8px_rgba(34,211,238,0.3)] cursor-pointer';
                    }
                  } else {
                    if (isSelected) {
                      btnClass = 'bg-slate-900 text-slate-500 border border-dashed border-slate-700 opacity-50 hover:opacity-80 cursor-pointer';
                    } else {
                      btnClass = 'bg-slate-950/40 text-slate-700 border border-slate-900/70 opacity-30 hover:opacity-60 cursor-pointer';
                    }
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => toggleCurrDay(day)}
                      className={`h-7 rounded text-[10px] font-mono transition-all relative ${btnClass} ${
                        isCutoff ? 'ring-2 ring-amber-400/90' : ''
                      }`}
                      title={
                        hasTx
                          ? `Tgl ${day} ${currLabel}: ${formatRupiah(salesVal)} (Ada Transaksi)${isCutoff ? ' [Cut-Off]' : ''}\nKlik untuk ${isSelected ? 'batalkan pilihan' : 'pilih'}`
                          : `Tgl ${day} ${currLabel}: Tidak ada transaksi`
                      }
                    >
                      {day}
                      {hasTx && (
                        <span className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950 shadow-[0_0_4px_#000]' : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FILTER SINKRON MULTI-DIMENSI (BERLAKU UNTUK 4 TAB)     */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Sinkronisasi Filter Multi-Dimensi (Tersinkron di 4 Tab)
                </h3>
                {activeFilterCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/50">
                    {activeFilterCount} Filter Aktif
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800">
                    Default (Semua Data)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Filter di bawah ini menyinkronkan data secara otomatis ke <strong>Performa By Eceran</strong>, <strong>Monitoring By Outlet</strong>, <strong>Analisa Tren Harian</strong>, dan <strong>Performa Salesman</strong>.
              </p>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-all self-start sm:self-auto shadow-sm"
              title="Kembalikan semua filter ke kondisi awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Filter Salesman */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Filter Salesman:</span>
              {selectedSalesman !== 'ALL' && (
                <button
                  onClick={() => handleSalesmanChange('ALL')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedSalesman}
              onChange={(e) => handleSalesmanChange(e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium ${
                selectedSalesman !== 'ALL' ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200' : 'border-slate-800'
              }`}
            >
              <option value="ALL">Semua Salesman ({salesmenList.length})</option>
              {salesmenList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Tipe Outlet */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Tipe Outlet:</span>
              {selectedOutletType !== 'ALL' && (
                <button
                  onClick={() => setSelectedOutletType('ALL')}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedOutletType}
              onChange={(e) => setSelectedOutletType(e.target.value as any)}
              className={`w-full bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium ${
                selectedOutletType !== 'ALL' ? 'border-amber-500 bg-amber-950/20 text-amber-300 font-semibold' : 'border-slate-800'
              }`}
            >
              <option value="ALL">Semua Tipe (Eceran & Grosir)</option>
              <option value="ECERAN">Khusus Eceran (MARK NEW)</option>
              <option value="NON_ECERAN">Grosir & Non-Eceran</option>
            </select>
          </div>

          {/* 3. Filter Kategori By Eceran (MARK NEW) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>By Eceran (MARK NEW):</span>
              {selectedMarkNew !== 'ALL' && (
                <button
                  onClick={() => setSelectedMarkNew('ALL')}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedMarkNew}
              onChange={(e) => setSelectedMarkNew(e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium ${
                selectedMarkNew !== 'ALL' ? 'border-amber-500 bg-amber-950/20 text-amber-300 font-semibold' : 'border-slate-800'
              }`}
            >
              <option value="ALL">Semua Kategori MARK NEW ({allMarkNewCategories.length})</option>
              {allMarkNewCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter Channel */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Channel:</span>
              {selectedChannel !== 'ALL' && (
                <button
                  onClick={() => handleChannelChange('ALL')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => handleChannelChange(e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium ${
                selectedChannel !== 'ALL' ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200' : 'border-slate-800'
              }`}
            >
              <option value="ALL">Semua Channel ({allChannels.length})</option>
              {allChannels.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Area, Rayon, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Area */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Area:</span>
              {selectedArea !== 'ALL' && (
                <button
                  onClick={() => handleAreaChange('ALL')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium ${
                selectedArea !== 'ALL' ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200' : 'border-slate-800'
              }`}
            >
              <option value="ALL">Semua Area ({allAreas.length})</option>
              {allAreas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Rayon */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Rayon:</span>
              {selectedRayon !== 'ALL' && (
                <button
                  onClick={() => handleRayonChange('ALL')}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <select
              value={selectedRayon}
              onChange={(e) => handleRayonChange(e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium ${
                selectedRayon !== 'ALL' ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200' : 'border-slate-800'
              }`}
            >
              <option value="ALL">Semua Rayon ({allRayons.length})</option>
              {allRayons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Pencarian Cepat:</span>
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium"
                >
                  Clear
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari outlet, salesman, atau eceran..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>Aktif:</span>
          </span>

          {selectedSalesman !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono text-[11px]">
              <span>Sales: {salesmenList.find(s => s.id === selectedSalesman)?.name || selectedSalesman}</span>
              <button onClick={() => handleSalesmanChange('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedOutletType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800/60 text-[11px] font-medium">
              <span>Tipe: {selectedOutletType === 'ECERAN' ? 'Khusus Eceran' : 'Non-Eceran'}</span>
              <button onClick={() => setSelectedOutletType('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedMarkNew !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800/60 font-mono text-[11px]">
              <span>MARK NEW: {selectedMarkNew}</span>
              <button onClick={() => setSelectedMarkNew('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedChannel !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/60 text-[11px]">
              <span>Channel: {selectedChannel}</span>
              <button onClick={() => handleChannelChange('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedArea !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
              <span>Area: {selectedArea}</span>
              <button onClick={() => handleAreaChange('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {selectedRayon !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
              <span>Rayon: {selectedRayon}</span>
              <button onClick={() => handleRayonChange('ALL')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          {searchFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 text-[11px]">
              <span>Cari: &ldquo;{searchFilter}&rdquo;</span>
              <button onClick={() => setSearchFilter('')} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}

          <div className="ml-auto text-[11px] font-mono text-slate-400 flex items-center gap-3">
            <span>Transaksi: <strong className="text-indigo-300">{formatNumber(activePrevTxs.length)}</strong> ({prevLabel}) vs <strong className="text-cyan-300">{formatNumber(activeCurrTxs.length)}</strong> ({currLabel})</span>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('eceran')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'eceran'
              ? 'border-amber-400 text-amber-300 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Store className="w-4 h-4 text-amber-400" />
          <span>Performa By Eceran</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800/40 font-mono">
            {displayedEceranData.length} MARK NEW
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outlet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'outlet'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Monitoring By Outlet</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-mono">
            {filteredOutlets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('daily_trend')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'daily_trend'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <CalendarRange className="w-4 h-4 text-purple-400" />
          <span>Analisa Tren Harian (Day-by-Day)</span>
        </button>

        <button
          onClick={() => setActiveTab('salesman')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'salesman'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/90'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Performa Salesman</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-mono">
            {filteredSalesmanPerformances.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: RINGKASAN & SALESMAN                             */}
      {/* ======================================================== */}
      {activeTab === 'salesman' && (
        <div className="space-y-6">
          {/* Synchronized Notice Banner */}
          {activeFilterCount > 0 && (
            <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-cyan-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>
                  Performa Salesman tersinkronisasi: Menampilkan {filteredSalesmanPerformances.length} salesman sesuai filter aktif ({activeFilterCount} kriteria filter diterapkan).
                </span>
              </div>
              <button
                onClick={handleResetAllFilters}
                className="text-[11px] underline hover:text-white"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Sales {prevLabel}</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl font-bold font-mono text-slate-200 mt-2">
                {formatRupiah(totalSalesPrev)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Total Realisasi Periode Sebelumnya (Terfilter)</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-cyan-500">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Sales {currLabel}</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-2">
                {formatRupiah(totalSalesCurr)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Total Realisasi Periode Berjalan (Terfilter)</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Growth MoM</span>
                {growthSalesRate !== null && growthSalesRate >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className={`text-xl font-bold font-mono mt-2 flex items-center gap-1.5 ${
                growthSalesRate !== null && growthSalesRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <span>{formatPercent(growthSalesRate)}</span>
                <span className="text-xs font-normal">
                  ({diffSales >= 0 ? '+' : ''}{formatRupiah(diffSales)})
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Pertumbuhan Nilai Penjualan Terfilter</div>
            </div>
          </div>

          {/* Visual Bar Comparison per Salesman */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Visualisasi Perbandingan Omset per Salesman ({prevLabel} vs {currLabel})</span>
            </h3>

            <div className="space-y-4">
              {filteredSalesmanPerformances.map(s => {
                const maxVal = Math.max(s.actualPrevious, s.actualCurrent, s.target || 0, 1);
                const prevWidth = (s.actualPrevious / maxVal) * 100;
                const currWidth = (s.actualCurrent / maxVal) * 100;

                return (
                  <div key={s.salesmanId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        {s.salesmanName} <span className="text-slate-500 font-mono text-[11px]">({s.salesmanId})</span>
                      </span>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-slate-400">{formatRupiah(s.actualPrevious)}</span>
                        <span className="text-slate-600">&rarr;</span>
                        <span className="font-bold text-cyan-300">{formatRupiah(s.actualCurrent)}</span>
                        <span className={`text-[11px] font-bold ${s.growthRate && s.growthRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({formatPercent(s.growthRate)})
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Previous month bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex items-center">
                        <div
                          className="bg-slate-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${prevWidth}%` }}
                          title={`${prevLabel}: ${formatRupiah(s.actualPrevious)}`}
                        />
                      </div>
                      {/* Current month bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex items-center">
                        <div
                          className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${currWidth}%` }}
                          title={`${currLabel}: ${formatRupiah(s.actualCurrent)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 justify-end">
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded bg-slate-600 inline-block" />
                <span>{prevLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded bg-cyan-500 inline-block" />
                <span>{currLabel}</span>
              </div>
            </div>
          </div>

          {/* Salesman Comparison DataTable */}
          <DataTable
            title={`Matriks Perbandingan Pertumbuhan Salesman (${prevLabel} vs ${currLabel})`}
            columns={salesmanColumns}
            data={filteredSalesmanPerformances}
            searchPlaceholder="Cari salesman..."
            exportFileName={`Perbandingan_Salesman_${prevLabel}_vs_${currLabel}.xlsx`}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MONITORING BY ECERAN                             */}
      {/* ======================================================== */}
      {activeTab === 'eceran' && (
        <div className="space-y-6">
          {/* Synchronized Notice Banner */}
          {activeFilterCount > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>
                  Performa By Eceran tersinkronisasi: Menampilkan {displayedEceranData.length} kategori MARK NEW sesuai filter aktif ({activeFilterCount} kriteria filter diterapkan).
                </span>
              </div>
              <button
                onClick={handleResetAllFilters}
                className="text-[11px] underline hover:text-white"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Eceran Description & Quick Filter Chips */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>Kategori By Eceran (MARK NEW) & Filter Channel</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Klik kategori MARK NEW di bawah untuk memfilter data eceran secara instan dan sinkron ke seluruh tab.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedMarkNew('ALL');
                    setSelectedOutletType('ALL');
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Semua MARK NEW
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setSelectedOutletType('ECERAN')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                >
                  Default Eceran Saja
                </button>
              </div>
            </div>

            {/* Quick MARK NEW Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedMarkNew('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedMarkNew === 'ALL'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selectedMarkNew === 'ALL' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                <span>SEMUA KATEGORI MARK NEW</span>
              </button>

              {allMarkNewCategories.map(cat => {
                const isSelected = selectedMarkNew === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMarkNew('ALL');
                      } else {
                        setSelectedMarkNew(cat);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-amber-400'}`} />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 CORE KPI CARDS FOR ECERAN (USER REQUIREMENT) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. OMSET ECERAN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">OMSET ECERAN (MoM)</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{prevLabel}</div>
                  <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
                    {formatRupiah(eceranOmsetPrev)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">{currLabel}</div>
                  <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                    {formatRupiah(eceranOmsetCurr)}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Growth:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  eceranOmsetGrowth !== null && eceranOmsetGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {eceranOmsetGrowth !== null && eceranOmsetGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatPercent(eceranOmsetGrowth)} ({eceranOmsetDiff >= 0 ? '+' : ''}{formatRupiah(eceranOmsetDiff)})
                </span>
              </div>
            </div>

            {/* 2. QTY ECERAN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm border-l-4 border-l-cyan-500">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">QTY ECERAN (MoM)</span>
                <Boxes className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{prevLabel}</div>
                  <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
                    {formatNumber(eceranQtyPrev)} Pcs
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">{currLabel}</div>
                  <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                    {formatNumber(eceranQtyCurr)} Pcs
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Growth:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  eceranQtyGrowth !== null && eceranQtyGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {eceranQtyGrowth !== null && eceranQtyGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatPercent(eceranQtyGrowth)} ({eceranQtyDiff >= 0 ? '+' : ''}{formatNumber(eceranQtyDiff)} Pcs)
                </span>
              </div>
            </div>

            {/* 3. JUMLAH EC ECERAN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">JUMLAH EC ECERAN (EFFECTIVE CALL)</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{prevLabel}</div>
                  <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">
                    {eceranECPrev} Toko
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">{currLabel}</div>
                  <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                    {eceranECCurr} Toko
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Growth EC:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  eceranECGrowth !== null && eceranECGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {eceranECGrowth !== null && eceranECGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatPercent(eceranECGrowth)} ({eceranECDiff >= 0 ? '+' : ''}{eceranECDiff} Toko)
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Metric: Drop Size per Toko Eceran */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <div className="font-semibold text-slate-200">Rata-rata Order / Drop Size Eceran per Outlet</div>
                <div className="text-slate-400 text-[11px]">Omset per Toko Bertransaksi (Basket Size)</div>
              </div>
            </div>
            <div className="flex items-center gap-6 font-mono">
              <div>
                <span className="text-slate-500 mr-2">{prevLabel}:</span>
                <span className="text-slate-300 font-bold">{formatRupiah(eceranDropSizePrev)}</span>
              </div>
              <div className="text-slate-600">&rarr;</div>
              <div>
                <span className="text-slate-500 mr-2">{currLabel}:</span>
                <span className="text-amber-300 font-bold">{formatRupiah(eceranDropSizeCurr)}</span>
                <span className={`ml-2 text-[11px] font-bold ${
                  eceranDropSizeGrowth !== null && eceranDropSizeGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ({formatPercent(eceranDropSizeGrowth)})
                </span>
              </div>
            </div>
          </div>

          {/* Visual Bar Comparison By Eceran (MARK NEW) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>Visualisasi Perbandingan Omset By Eceran - Kolom MARK NEW ({prevLabel} vs {currLabel})</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {eceranMarkNewData.length} Kategori
              </span>
            </h3>

            {eceranMarkNewData.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">
                Tidak ada data eceran untuk rentang tanggal yang dipilih.
              </div>
            ) : (
              <div className="space-y-4">
                {eceranMarkNewData.map(item => {
                  const maxVal = Math.max(
                    ...eceranMarkNewData.map(d => Math.max(d.omsetPrev, d.omsetCurr)),
                    1
                  );
                  const prevWidth = (item.omsetPrev / maxVal) * 100;
                  const currWidth = (item.omsetCurr / maxVal) * 100;

                  return (
                    <div key={item.markNew} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.markNew}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-normal">
                            ({item.totalOutlets} Outlet &bull; {item.ecCurr} EC)
                          </span>
                        </span>
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="text-slate-400">{formatRupiah(item.omsetPrev)}</span>
                          <span className="text-slate-600">&rarr;</span>
                          <span className="font-bold text-amber-300">{formatRupiah(item.omsetCurr)}</span>
                          <span className={`text-[11px] font-bold ${item.growthOmset !== null && item.growthOmset >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({formatPercent(item.growthOmset)})
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {/* Previous month bar */}
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex items-center">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${prevWidth}%` }}
                            title={`${prevLabel}: ${formatRupiah(item.omsetPrev)}`}
                          />
                        </div>
                        {/* Current month bar */}
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex items-center">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${currWidth}%` }}
                            title={`${currLabel}: ${formatRupiah(item.omsetCurr)}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 justify-end">
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded bg-indigo-600 inline-block" />
                <span>{prevLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-2 rounded bg-amber-400 inline-block" />
                <span>{currLabel}</span>
              </div>
            </div>
          </div>

          {/* Table of Performa By Eceran (MARK NEW) - Kolom KD SLS & Nama Sales Dihapus */}
          <DataTable
            title={`Performa By Eceran (${prevLabel} vs ${currLabel})`}
            columns={eceranColumns}
            data={displayedEceranData}
            searchPlaceholder="Cari By Eceran (MARK NEW)..."
            exportFileName={`Performa_By_Eceran_MARK_NEW_${prevLabel}_vs_${currLabel}.xlsx`}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MONITORING BY OUTLET                             */}
      {/* ======================================================== */}
      {activeTab === 'outlet' && (
        <div className="space-y-6">
          {/* Synchronized Notice Banner */}
          {activeFilterCount > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Monitoring Outlet tersinkronisasi: Menampilkan {filteredOutlets.length} outlet sesuai filter aktif ({activeFilterCount} kriteria filter diterapkan).
                </span>
              </div>
              <button
                onClick={handleResetAllFilters}
                className="text-[11px] underline hover:text-white"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Summary KPI Cards for Outlets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Total Outlet Dipantau</span>
                <Building2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-200 mt-2">
                {outletKpis.totalOutlets}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Master Outlet Terdaftar (Terfilter)</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-emerald-500">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>EC (Outlet Beli)</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-2 flex items-center gap-2">
                <span>{outletKpis.transCurrCount} Toko</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Lalu: {outletKpis.transPrevCount})
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Toko Transaksi Aktif Periode Ini</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-cyan-500">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Outlet Tumbuh (+)</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-2 flex items-center gap-2">
                <span>{outletKpis.growthUpCount} Toko</span>
                <span className="text-xs text-rose-400 font-normal">
                  (Turun: {outletKpis.growthDownCount})
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Repeat Order dengan Kenaikan Omset</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-l-2 border-l-rose-500">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Drop vs New Active</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-300 mt-2 flex items-center gap-2">
                <span>Drop: {outletKpis.dropCount}</span>
                <span className="text-xs text-cyan-400 font-normal">
                  (New: +{outletKpis.newActiveCount})
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Pergerakan Toko Keluar / Masuk</div>
            </div>
          </div>

          {/* Filter Bar for Outlets (Tersinkron dengan Filter Global & Multi-Tab) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status filter tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Semua Outlet' },
                  { id: 'GROWTH_UP', label: 'RO Tumbuh (+)' },
                  { id: 'GROWTH_DOWN', label: 'RO Turun (-)' },
                  { id: 'DROP', label: 'Drop Outlet' },
                  { id: 'NEW_ACTIVE', label: 'New Active' },
                  { id: 'NOT_BUYING', label: 'Belum Beli' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOutletStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      outletStatusFilter === tab.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Type filter (Eceran / Grosir) - Sinkron dengan Tab Lain */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setSelectedOutletType('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedOutletType === 'ALL' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-slate-400'
                  }`}
                >
                  Semua Tipe
                </button>
                <button
                  onClick={() => setSelectedOutletType('ECERAN')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedOutletType === 'ECERAN' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400'
                  }`}
                >
                  Eceran Saja
                </button>
                <button
                  onClick={() => setSelectedOutletType('NON_ECERAN')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedOutletType === 'NON_ECERAN' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-slate-400'
                  }`}
                >
                  Grosir/Lainnya
                </button>
              </div>
            </div>

            {/* Dropdowns for Salesman, Channel, dan MARK NEW (Tersinkron) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Salesman:</span>
                <select
                  value={selectedSalesman}
                  onChange={(e) => handleSalesmanChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Semua Salesman</option>
                  {salesmenList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">Channel:</span>
                <select
                  value={selectedChannel}
                  onChange={(e) => handleChannelChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Semua Channel</option>
                  {allChannels.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">MARK NEW:</span>
                <select
                  value={selectedMarkNew}
                  onChange={(e) => setSelectedMarkNew(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Semua MARK NEW</option>
                  {allMarkNewCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end text-xs text-slate-400">
                <span>Ditemukan: <strong className="text-cyan-300 font-mono">{filteredOutlets.length}</strong> outlet</span>
              </div>
            </div>
          </div>

          {/* Outlet Comparison DataTable */}
          <DataTable
            title={`Komparasi Lengkap per Outlet (${prevLabel} vs ${currLabel})`}
            columns={outletColumns}
            data={filteredOutlets}
            searchPlaceholder="Cari kode atau nama outlet..."
            pageSizeDefault={15}
            exportFileName={`Monitoring_Outlet_Komparasi_${prevLabel}_vs_${currLabel}.xlsx`}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: ANALISA TREN HARIAN (DAY-BY-DAY)                  */}
      {/* ======================================================== */}
      {activeTab === 'daily_trend' && (
        <div className="space-y-6">
          {/* Synchronized Notice Banner */}
          {activeFilterCount > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Analisa Tren Harian tersinkronisasi: Data transaksi harian terfilter berdasarkan Salesman ({selectedSalesman === 'ALL' ? 'Semua' : selectedSalesman}), Tipe Outlet ({selectedOutletType}), Channel ({selectedChannel}), dan MARK NEW ({selectedMarkNew}).
                </span>
              </div>
              <button
                onClick={handleResetAllFilters}
                className="text-[11px] underline hover:text-white"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Day-by-Day Visual Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Grafik Perbandingan Penjualan Harian (Hari ke-1 s/d Hari ke-31)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi perbandingan omset per tanggal antara {prevLabel} (abu-abu) dan {currLabel} (cyan).
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-600 inline-block" />
                  <span className="text-slate-400">{prevLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
                  <span className="text-cyan-300">{currLabel}</span>
                </div>
              </div>
            </div>

            {/* Daily Bars Visualizer */}
            <div className="grid grid-cols-11 sm:grid-cols-16 md:grid-cols-31 gap-1.5 pt-6 pb-2 items-end h-48 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {dailyComparisonData.map(d => {
                const maxVal = Math.max(...dailyComparisonData.map(x => Math.max(x.prevSales, x.currSales)), 1);
                const prevH = Math.max(4, Math.round((d.prevSales / maxVal) * 100));
                const currH = Math.max(4, Math.round((d.currSales / maxVal) * 100));
                const isPrevFiltered = prevSelectedDays.includes(d.day);
                const isCurrFiltered = currSelectedDays.includes(d.day);
                const isAnyFiltered = isPrevFiltered || isCurrFiltered;

                return (
                  <div
                    key={d.day}
                    onClick={() => {
                      togglePrevDay(d.day);
                      toggleCurrDay(d.day);
                    }}
                    className={`flex flex-col items-center justify-end h-full cursor-pointer group transition-all ${
                      isAnyFiltered ? 'opacity-100' : 'opacity-30 hover:opacity-70'
                    }`}
                    title={`Hari ke-${d.day}\n${prevLabel} (${isPrevFiltered ? 'Dipilih' : 'Tidak dipilih'}): ${formatRupiah(d.prevSales)}\n${currLabel} (${isCurrFiltered ? 'Dipilih' : 'Tidak dipilih'}): ${formatRupiah(d.currSales)}\n(Klik untuk toggle tanggal ini pada kedua bulan)`}
                  >
                    <div className="flex items-end gap-0.5 w-full justify-center h-full">
                      {/* Previous month bar */}
                      <div
                        className="w-1.5 rounded-t bg-slate-600 group-hover:bg-slate-500 transition-all"
                        style={{ height: `${prevH}%` }}
                      />
                      {/* Current month bar */}
                      <div
                        className="w-1.5 rounded-t bg-cyan-500 group-hover:bg-cyan-400 transition-all"
                        style={{ height: `${currH}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1.5 group-hover:text-cyan-300">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Comparison Table */}
          <DataTable
            title={`Tabel Komparasi Harian (${prevLabel} vs ${currLabel})`}
            columns={dailyColumns}
            data={dailyComparisonData}
            searchPlaceholder="Cari tanggal..."
            pageSizeDefault={15}
            exportFileName={`Komparasi_Harian_${prevLabel}_vs_${currLabel}.xlsx`}
          />
        </div>
      )}
    </div>
  );
}
