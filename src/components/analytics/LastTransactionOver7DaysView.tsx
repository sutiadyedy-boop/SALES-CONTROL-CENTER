import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Clock,
  Store,
  Calendar,
  DollarSign,
  AlertTriangle,
  Users,
  Building2,
  Filter,
  RotateCcw,
  CheckCircle2,
  CalendarClock,
  ArrowUpRight,
  Search,
  Sparkles,
  FileSpreadsheet,
  ChevronDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import { CalculationResult, GlobalFilterState } from '../../types/analytics';
import { AppSettings, MasterOutletRecord, TargetRecord, TransactionRecord, UserProfile } from '../../types/database';
import { applyRoleAndGlobalFilter } from '../../services/calculationEngine';
import { formatDate } from '../../services/normalizationEngine';
import { parseYearMonthFromDate, INDONESIAN_MONTHS } from '../../services/periodDetectionService';
import { formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface LastTxOver7DaysViewProps {
  calculation: CalculationResult | null;
  settings: AppSettings;
  prevTransactions: TransactionRecord[];
  currTransactions: TransactionRecord[];
  masterOutlets: MasterOutletRecord[];
  targets?: TargetRecord[];
  filters?: GlobalFilterState;
  userProfile?: UserProfile;
  onFilterChange?: (newFilters: GlobalFilterState) => void;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export interface OutletLastTxItem {
  id: string;
  depo: string;
  pma?: string;
  salesmanId: string;
  salesmanName: string;
  outletId: string;
  outletName: string;
  lastTxDate: string; // YYYY-MM-DD
  lastTxFormatted: string; // e.g. 12 Okt 2026
  lastTxMonthSource: 'BULAN INI' | 'BULAN LALU';
  lastTxMonthLabel: string;
  lastTxValue: number;
  daysSinceLastTx: number;
  dailyUpdateDate: string; // YYYY-MM-DD
  area?: string;
  rayon?: string;
  channel?: string;
  cabang?: string;
  totalInvoicesOnLastDate: number;
}

const SHORT_ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function parseStrictUtcDate(dateVal: string | undefined, fallbackYearMonth?: { year: number; month: number }): Date | null {
  if (!dateVal) return null;
  const cleaned = formatDate(dateVal);
  if (!cleaned) return null;

  // Match YYYY-MM-DD
  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  // Fallback if only day number was provided (e.g. "15") and we have period year/month
  const dayOnly = String(dateVal).trim().match(/^(\d{1,2})$/);
  if (dayOnly && fallbackYearMonth) {
    const d = parseInt(dayOnly[1], 10);
    if (d >= 1 && d <= 31) {
      return new Date(Date.UTC(fallbackYearMonth.year, fallbackYearMonth.month - 1, d));
    }
  }

  return null;
}

function toIsoDateString(utcDate: Date): string {
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHumanDateId(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const y = match[1];
  const mIdx = parseInt(match[2], 10) - 1;
  const d = parseInt(match[3], 10);
  const mName = SHORT_ID_MONTHS[mIdx] || match[2];
  return `${String(d).padStart(2, '0')} ${mName} ${y}`;
}

function detectYearMonthFromLabel(label: string, defaultYear = 2026, defaultMonth = 10): { year: number; month: number } {
  if (!label) return { year: defaultYear, month: defaultMonth };
  const upper = label.toUpperCase();
  const yMatch = upper.match(/\b(20\d{2})\b/);
  const year = yMatch ? parseInt(yMatch[1], 10) : defaultYear;
  for (let i = 0; i < INDONESIAN_MONTHS.length; i++) {
    if (upper.includes(INDONESIAN_MONTHS[i])) {
      return { year, month: i + 1 };
    }
  }
  return { year, month: defaultMonth };
}

export function LastTransactionOver7DaysView({
  calculation,
  settings,
  prevTransactions,
  currTransactions,
  masterOutlets,
  targets = [],
  filters = {},
  userProfile,
  onNavigateToUpload,
  onLoadSampleData,
}: LastTxOver7DaysViewProps) {
  const [minDaysThreshold, setMinDaysThreshold] = useState<number>(7);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState<boolean>(false);
  const channelDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSourceMonth, setSelectedSourceMonth] = useState<'ALL' | 'BULAN_INI' | 'BULAN_LALU'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | '8_14' | '15_21' | 'OVER_21'>('ALL');
  const [manualCutOffDate, setManualCutOffDate] = useState<string>(''); // Empty = Auto

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target as Node)) {
        setIsChannelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasTransactions = prevTransactions.length > 0 || currTransactions.length > 0;

  const prevLabel = settings.previousMonthLabel || 'SEPTEMBER 2026';
  const currLabel = settings.currentMonthLabel || 'OKTOBER 2026';

  const prevYM = useMemo(() => detectYearMonthFromLabel(prevLabel, 2026, 9), [prevLabel]);
  const currYM = useMemo(() => detectYearMonthFromLabel(currLabel, 2026, 10), [currLabel]);

  // 1. Auto-detect Tanggal Update Harian (Maximum transaction date in Current Month, fallback to Previous Month)
  const autoDetectedUpdateDate = useMemo(() => {
    let maxUtc: Date | null = null;

    for (const t of currTransactions) {
      if (t.salesValue <= 0) continue;
      const d = parseStrictUtcDate(t.transactionDate, currYM);
      if (d && (!maxUtc || d.getTime() > maxUtc.getTime())) {
        maxUtc = d;
      }
    }

    if (!maxUtc) {
      for (const t of prevTransactions) {
        if (t.salesValue <= 0) continue;
        const d = parseStrictUtcDate(t.transactionDate, prevYM);
        if (d && (!maxUtc || d.getTime() > maxUtc.getTime())) {
          maxUtc = d;
        }
      }
    }

    if (!maxUtc) {
      const now = new Date();
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    return maxUtc;
  }, [currTransactions, prevTransactions, currYM, prevYM]);

  const effectiveUpdateDateUtc = useMemo(() => {
    if (manualCutOffDate) {
      const parsed = parseStrictUtcDate(manualCutOffDate);
      if (parsed) return parsed;
    }
    return autoDetectedUpdateDate;
  }, [manualCutOffDate, autoDetectedUpdateDate]);

  const effectiveUpdateDateIso = useMemo(
    () => toIsoDateString(effectiveUpdateDateUtc),
    [effectiveUpdateDateUtc]
  );

  // 2. Build Master Outlet & Salesman Metadata Maps for Depo, PMA, Area, Cabang enrichment
  const { allOutletsLastTx } = useMemo(() => {
    const filterPredicate = applyRoleAndGlobalFilter(filters, userProfile);

    const masterById = new Map<string, MasterOutletRecord>();
    const masterByName = new Map<string, MasterOutletRecord>();
    const salesmanDepos = new Map<string, string>();
    const salesmanPmas = new Map<string, string>();
    const salesmanCabangs = new Map<string, string>();
    const salesmanAreas = new Map<string, string>();
    const salesmanNames = new Map<string, string>();
    const salesmanByName = new Map<string, { id: string; depo?: string; pma?: string; cabang?: string; area?: string }>();

    const isGenericTierPma = (val?: string) => {
      if (!val) return true;
      const u = val.trim().toUpperCase();
      return ['GOLD', 'SILVER', 'BRONZE', 'PLATINUM', 'REGULER', 'REGULAR', 'OK', 'AKTIF', 'ACTIVE', '-'].includes(u);
    };

    const isGenericDefaultDepo = (val?: string) => {
      if (!val) return true;
      const u = val.trim().toUpperCase();
      return u === 'DEPO BONE PUSAT' || u === 'DEPO UTAMA' || u === '-';
    };

    for (const m of masterOutlets) {
      if (m.outletId) {
        masterById.set(m.outletId.trim(), m);
        masterById.set(m.outletId.trim().toLowerCase(), m);
      }
      if (m.outletName) {
        masterByName.set(m.outletName.trim().toLowerCase(), m);
      }
      if (m.salesmanId) {
        const sId = m.salesmanId.trim();
        if (m.depo && !isGenericDefaultDepo(m.depo) && !salesmanDepos.has(sId)) salesmanDepos.set(sId, m.depo.trim());
        if (m.pma && !isGenericTierPma(m.pma) && !salesmanPmas.has(sId)) salesmanPmas.set(sId, m.pma.trim());
        if (m.cabang && !salesmanCabangs.has(sId)) salesmanCabangs.set(sId, m.cabang.trim());
        if (m.area && !salesmanAreas.has(sId)) salesmanAreas.set(sId, m.area.trim());
        if (m.salesmanName && !salesmanNames.has(sId)) salesmanNames.set(sId, m.salesmanName.trim());

        if (m.salesmanName) {
          const sNameKey = m.salesmanName.trim().toLowerCase();
          if (!salesmanByName.has(sNameKey)) {
            salesmanByName.set(sNameKey, {
              id: sId,
              depo: !isGenericDefaultDepo(m.depo) ? m.depo : undefined,
              pma: !isGenericTierPma(m.pma) ? m.pma : undefined,
              cabang: m.cabang,
              area: m.area,
            });
          }
        }
      }
    }

    // Enrich Salesman Area / PMA / Cabang from Target Database (Database 3) as well
    for (const trg of targets) {
      if (trg.salesmanId) {
        const sId = trg.salesmanId.trim();
        if (trg.area && !salesmanAreas.has(sId)) salesmanAreas.set(sId, trg.area.trim());
        if (trg.pma && !isGenericTierPma(trg.pma) && !salesmanPmas.has(sId)) salesmanPmas.set(sId, trg.pma.trim());
        if (trg.cb && !salesmanCabangs.has(sId)) salesmanCabangs.set(sId, trg.cb.trim());
        if (trg.salesmanName && !salesmanNames.has(sId)) salesmanNames.set(sId, trg.salesmanName.trim());

        if (trg.salesmanName) {
          const sNameKey = trg.salesmanName.trim().toLowerCase();
          const existing = salesmanByName.get(sNameKey);
          salesmanByName.set(sNameKey, {
            id: existing?.id || sId,
            depo: existing?.depo,
            pma: existing?.pma || (!isGenericTierPma(trg.pma) ? trg.pma : undefined),
            cabang: existing?.cabang || trg.cb,
            area: existing?.area || trg.area,
          });
        }
      }
    }

    // Also scan transactions to build cross-reference for salesman area/pma/depo
    for (const tx of [...currTransactions, ...prevTransactions]) {
      const sId = (tx.salesmanId || '').trim();
      if (!sId) continue;
      if (tx.depo && !isGenericDefaultDepo(tx.depo) && !salesmanDepos.has(sId)) salesmanDepos.set(sId, tx.depo.trim());
      if (tx.pma && !isGenericTierPma(tx.pma) && !salesmanPmas.has(sId)) salesmanPmas.set(sId, tx.pma.trim());
      if (tx.area && !salesmanAreas.has(sId)) salesmanAreas.set(sId, tx.area.trim());
      if (tx.cabang && !salesmanCabangs.has(sId)) salesmanCabangs.set(sId, tx.cabang.trim());
    }

    // Track per-outlet per-date aggregated transactions across both databases
    interface DailyOutletTx {
      isoDate: string;
      utcTime: number;
      totalValue: number;
      sourceMonth: 'BULAN INI' | 'BULAN LALU';
      sourceLabel: string;
      salesmanId: string;
      salesmanName: string;
      outletName: string;
      depo: string;
      pma: string;
      area: string;
      rayon: string;
      channel: string;
      cabang: string;
      invoices: Set<string>;
    }

    const outletDailyMap = new Map<string, Map<string, DailyOutletTx>>();

    const processTransaction = (
      t: TransactionRecord,
      sourceMonth: 'BULAN INI' | 'BULAN LALU',
      sourceLabel: string,
      fallbackYM: { year: number; month: number }
    ) => {
      if (!t.outletId || t.salesValue <= 0) return;

      const cleanId = t.outletId.trim();
      const m =
        masterById.get(cleanId) ||
        masterById.get(cleanId.toLowerCase()) ||
        (t.outletName ? masterByName.get(t.outletName.trim().toLowerCase()) : undefined);

      const rawSlsName = (t.salesmanName || m?.salesmanName || '').trim();
      const slsByNameMatch = rawSlsName ? salesmanByName.get(rawSlsName.toLowerCase()) : undefined;

      const slsId = (t.salesmanId || m?.salesmanId || slsByNameMatch?.id || '').trim();
      const slsName = rawSlsName || salesmanNames.get(slsId) || slsId || '-';

      const area = (
        t.area ||
        m?.area ||
        salesmanAreas.get(slsId) ||
        slsByNameMatch?.area ||
        ''
      ).trim();

      const rawPma = (
        (!isGenericTierPma(t.pma) ? t.pma : '') ||
        (!isGenericTierPma(m?.pma) ? m?.pma : '') ||
        salesmanPmas.get(slsId) ||
        slsByNameMatch?.pma ||
        ''
      ).trim();

      const cabang = (
        t.cabang ||
        m?.cabang ||
        salesmanCabangs.get(slsId) ||
        slsByNameMatch?.cabang ||
        ''
      ).trim();

      const explicitDepo = (
        (!isGenericDefaultDepo(t.depo) ? t.depo : '') ||
        (!isGenericDefaultDepo(m?.depo) ? m?.depo : '') ||
        salesmanDepos.get(slsId) ||
        slsByNameMatch?.depo ||
        ''
      ).trim();

      const rayon = (t.rayon || m?.rayon || '').trim();
      const channel = (t.channel || m?.channel || '').trim();
      const outletName = (t.outletName || m?.outletName || t.outletId).trim();

      // Resolve primary Depo/PMA display according to Area per Salesman or per Toko:
      // Prioritize specific Depo / PMA / Area per Toko or Salesman over generic company-wide defaults
      let resolvedDepoPma = '';
      if (explicitDepo && area && !explicitDepo.toUpperCase().includes(area.toUpperCase()) && !area.toUpperCase().includes(explicitDepo.toUpperCase())) {
        resolvedDepoPma = `${explicitDepo} - ${area}`;
      } else if (rawPma && area && !rawPma.toUpperCase().includes(area.toUpperCase()) && !area.toUpperCase().includes(rawPma.toUpperCase())) {
        resolvedDepoPma = `${rawPma} - ${area}`;
      } else if (explicitDepo) {
        resolvedDepoPma = explicitDepo;
      } else if (rawPma) {
        resolvedDepoPma = rawPma;
      } else if (area && cabang && !area.toUpperCase().includes(cabang.toUpperCase()) && !cabang.toUpperCase().includes(area.toUpperCase())) {
        resolvedDepoPma = `${cabang} - ${area}`;
      } else if (area) {
        resolvedDepoPma = area;
      } else if (cabang) {
        resolvedDepoPma = cabang;
      } else if (rayon) {
        resolvedDepoPma = rayon;
      } else {
        resolvedDepoPma = t.depo || m?.depo || t.pma || m?.pma || '-';
      }

      const depo = resolvedDepoPma;
      const pma = rawPma || t.pma || m?.pma || area || cabang || '';

      // Check global & RBAC filter
      if (
        !filterPredicate({
          salesmanId: slsId,
          area: area || depo,
          rayon,
          channel,
          fc: t.fc || m?.fc,
          pma: pma || depo,
          cabang: cabang || depo,
          depo,
          outletName,
          outletId: t.outletId,
        })
      ) {
        return;
      }

      const utcDate = parseStrictUtcDate(t.transactionDate, fallbackYM);
      if (!utcDate) return;

      // Ignore future dates beyond cut-off if manual cut-off is set earlier
      if (manualCutOffDate && utcDate.getTime() > effectiveUpdateDateUtc.getTime()) {
        return;
      }

      const isoDate = toIsoDateString(utcDate);

      let dateMap = outletDailyMap.get(t.outletId);
      if (!dateMap) {
        dateMap = new Map<string, DailyOutletTx>();
        outletDailyMap.set(t.outletId, dateMap);
      }

      const existing = dateMap.get(isoDate);
      if (!existing) {
        const invSet = new Set<string>();
        if (t.invoiceId) invSet.add(t.invoiceId);
        dateMap.set(isoDate, {
          isoDate,
          utcTime: utcDate.getTime(),
          totalValue: t.salesValue,
          sourceMonth,
          sourceLabel,
          salesmanId: slsId,
          salesmanName: slsName,
          outletName,
          depo,
          pma,
          area,
          rayon,
          channel,
          cabang,
          invoices: invSet,
        });
      } else {
        existing.totalValue += t.salesValue;
        if (t.invoiceId) existing.invoices.add(t.invoiceId);
        // Prefer BULAN INI metadata if same date appears or update latest salesman/depo
        if (sourceMonth === 'BULAN INI') {
          existing.sourceMonth = 'BULAN INI';
          existing.sourceLabel = sourceLabel;
          if (slsId) existing.salesmanId = slsId;
          if (slsName && slsName !== '-') existing.salesmanName = slsName;
          if (depo && depo !== '-') existing.depo = depo;
          if (pma) existing.pma = pma;
          if (area) existing.area = area;
        }
      }
    };

    // Process Previous Month first, then Current Month
    for (const t of prevTransactions) {
      processTransaction(t, 'BULAN LALU', prevLabel, prevYM);
    }
    for (const t of currTransactions) {
      processTransaction(t, 'BULAN INI', currLabel, currYM);
    }

    // For each outlet, pick the latest transaction date
    const results: OutletLastTxItem[] = [];
    const updateMs = effectiveUpdateDateUtc.getTime();

    for (const [outletId, dateMap] of outletDailyMap.entries()) {
      let latestEntry: DailyOutletTx | null = null;
      for (const entry of dateMap.values()) {
        if (!latestEntry || entry.utcTime > latestEntry.utcTime) {
          latestEntry = entry;
        } else if (entry.utcTime === latestEntry.utcTime && entry.sourceMonth === 'BULAN INI') {
          latestEntry = entry;
        }
      }

      if (!latestEntry) continue;

      const diffDays = Math.max(0, Math.round((updateMs - latestEntry.utcTime) / (1000 * 60 * 60 * 24)));

      results.push({
        id: `${outletId}-${latestEntry.isoDate}`,
        depo: latestEntry.depo,
        pma: latestEntry.pma,
        salesmanId: latestEntry.salesmanId,
        salesmanName: latestEntry.salesmanName,
        outletId,
        outletName: latestEntry.outletName,
        lastTxDate: latestEntry.isoDate,
        lastTxFormatted: formatHumanDateId(latestEntry.isoDate),
        lastTxMonthSource: latestEntry.sourceMonth,
        lastTxMonthLabel: latestEntry.sourceLabel,
        lastTxValue: latestEntry.totalValue,
        daysSinceLastTx: diffDays,
        dailyUpdateDate: effectiveUpdateDateIso,
        area: latestEntry.area,
        rayon: latestEntry.rayon,
        channel: latestEntry.channel,
        cabang: latestEntry.cabang,
        totalInvoicesOnLastDate: latestEntry.invoices.size || 1,
      });
    }

    // Sort by longest rentang hari descending, then highest lastTxValue descending
    results.sort((a, b) => {
      if (b.daysSinceLastTx !== a.daysSinceLastTx) {
        return b.daysSinceLastTx - a.daysSinceLastTx;
      }
      return b.lastTxValue - a.lastTxValue;
    });

    return { allOutletsLastTx: results };
  }, [
    prevTransactions,
    currTransactions,
    masterOutlets,
    targets,
    filters,
    userProfile,
    prevLabel,
    currLabel,
    prevYM,
    currYM,
    manualCutOffDate,
    effectiveUpdateDateUtc,
    effectiveUpdateDateIso,
  ]);

  // Filter outlets strictly > minDaysThreshold (default > 7 hari, i.e., 8 days or more)
  const baseOver7DaysOutlets = useMemo(() => {
    return allOutletsLastTx.filter(item => item.daysSinceLastTx > minDaysThreshold);
  }, [allOutletsLastTx, minDaysThreshold]);

  // Unique Channels from allOutletsLastTx & baseOver7DaysOutlets for quick local filters
  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    allOutletsLastTx.forEach(item => {
      const ch = (item.channel || 'GENERAL TRADE').trim();
      if (ch) set.add(ch);
    });
    baseOver7DaysOutlets.forEach(item => {
      const ch = (item.channel || 'GENERAL TRADE').trim();
      if (ch) set.add(ch);
    });
    return Array.from(set).sort();
  }, [allOutletsLastTx, baseOver7DaysOutlets]);

  const channelCountsMap = useMemo(() => {
    const counts = new Map<string, number>();
    baseOver7DaysOutlets.forEach(item => {
      const ch = (item.channel || 'GENERAL TRADE').trim();
      counts.set(ch, (counts.get(ch) || 0) + 1);
    });
    return counts;
  }, [baseOver7DaysOutlets]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => {
      const next = prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch];
      return next;
    });
  };

  // Apply local dropdown filters
  const filteredOutlets = useMemo(() => {
    return baseOver7DaysOutlets.filter(item => {
      const itemChannel = (item.channel || 'GENERAL TRADE').trim();
      if (selectedChannels.length > 0 && !selectedChannels.includes(itemChannel)) return false;
      if (selectedSourceMonth === 'BULAN_INI' && item.lastTxMonthSource !== 'BULAN INI') return false;
      if (selectedSourceMonth === 'BULAN_LALU' && item.lastTxMonthSource !== 'BULAN LALU') return false;
      if (selectedSeverity === '8_14' && (item.daysSinceLastTx < 8 || item.daysSinceLastTx > 14)) return false;
      if (selectedSeverity === '15_21' && (item.daysSinceLastTx < 15 || item.daysSinceLastTx > 21)) return false;
      if (selectedSeverity === 'OVER_21' && item.daysSinceLastTx <= 21) return false;
      return true;
    });
  }, [baseOver7DaysOutlets, selectedChannels, selectedSourceMonth, selectedSeverity]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalOutlets = filteredOutlets.length;
    const totalLastTxValue = filteredOutlets.reduce((acc, o) => acc + o.lastTxValue, 0);
    const fromCurrMonth = filteredOutlets.filter(o => o.lastTxMonthSource === 'BULAN INI').length;
    const fromPrevMonth = filteredOutlets.filter(o => o.lastTxMonthSource === 'BULAN LALU').length;
    const avgDays =
      totalOutlets > 0
        ? Math.round(filteredOutlets.reduce((acc, o) => acc + o.daysSinceLastTx, 0) / totalOutlets)
        : 0;
    const maxDays = totalOutlets > 0 ? Math.max(...filteredOutlets.map(o => o.daysSinceLastTx)) : 0;

    return {
      totalOutlets,
      totalLastTxValue,
      fromCurrMonth,
      fromPrevMonth,
      avgDays,
      maxDays,
    };
  }, [filteredOutlets]);

  // Summary breakdown per Salesman
  const salesmanSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        depo: string;
        salesmanId: string;
        salesmanName: string;
        totalToko: number;
        fromCurrMonth: number;
        fromPrevMonth: number;
        totalLastTxValue: number;
        avgDays: number;
        maxDays: number;
        sumDays: number;
      }
    >();

    for (const o of filteredOutlets) {
      const key = `${o.depo}__${o.salesmanId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          depo: o.depo,
          salesmanId: o.salesmanId,
          salesmanName: o.salesmanName,
          totalToko: 1,
          fromCurrMonth: o.lastTxMonthSource === 'BULAN INI' ? 1 : 0,
          fromPrevMonth: o.lastTxMonthSource === 'BULAN LALU' ? 1 : 0,
          totalLastTxValue: o.lastTxValue,
          avgDays: o.daysSinceLastTx,
          maxDays: o.daysSinceLastTx,
          sumDays: o.daysSinceLastTx,
        });
      } else {
        existing.totalToko++;
        if (o.lastTxMonthSource === 'BULAN INI') existing.fromCurrMonth++;
        else existing.fromPrevMonth++;
        existing.totalLastTxValue += o.lastTxValue;
        existing.sumDays += o.daysSinceLastTx;
        existing.avgDays = Math.round(existing.sumDays / existing.totalToko);
        if (o.daysSinceLastTx > existing.maxDays) existing.maxDays = o.daysSinceLastTx;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalToko - a.totalToko || b.totalLastTxValue - a.totalLastTxValue);
  }, [filteredOutlets]);

  if (!hasTransactions) {
    return (
      <EmptyState
        title="DATA TRANSAKSI BELUM TERSEDIA"
        description="Upload Database Bulan Lalu dan/atau Bulan Ini untuk menampilkan List Toko dengan Rentang Transaksi Terakhir di atas 7 Hari."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  // Table Columns exactly matching user's 7 points:
  // 1. Depo / PMA (Sesuai Area Per Salesman atau Per Toko)
  // 2. Nama Sales
  // 3. Kode Toko
  // 4. Nama Toko
  // 5. Tgl Transaksi Terakhir (Ambil Tgl Transaksi dari Data Base bulan lalu dan Bulan ini, tergantung Transaksi Terakhirnya di bulan berapa itu yang di munculkan)
  // 6. Nilai Transaksi Terakhir
  // 7. Rentang Hari dari Tgl Transaksi Terakhir ke Tgl Update harian (Auto)
  const columns: ColumnDef<OutletLastTxItem>[] = [
    {
      key: 'depo',
      header: '1. Depo / PMA (Area)',
      width: '175px',
      accessor: row => row.depo,
      render: row => {
        const subInfoParts: string[] = [];
        if (row.area && !row.depo.toUpperCase().includes(row.area.toUpperCase())) {
          subInfoParts.push(`Area: ${row.area}`);
        }
        if (row.pma && !row.depo.toUpperCase().includes(row.pma.toUpperCase()) && row.pma !== row.area) {
          subInfoParts.push(`PMA: ${row.pma}`);
        }
        if (row.cabang && !row.depo.toUpperCase().includes(row.cabang.toUpperCase()) && row.cabang !== row.area) {
          subInfoParts.push(`CB: ${row.cabang}`);
        }
        const subText = subInfoParts.join(' · ');

        return (
          <div className="flex items-start gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-semibold text-slate-100 text-xs leading-tight break-words">
                {row.depo}
              </div>
              {subText ? (
                <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5 truncate" title={subText}>
                  {subText}
                </div>
              ) : row.rayon ? (
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate" title={row.rayon}>
                  {row.rayon}
                </div>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'salesmanName',
      header: '2. Nama Sales',
      width: '180px',
      accessor: row => row.salesmanName,
      render: row => (
        <div>
          <div className="font-semibold text-slate-100 text-xs">{row.salesmanName}</div>
          <div className="text-[10px] text-cyan-400/80 font-mono">{row.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'outletId',
      header: '3. Kode Toko',
      width: '130px',
      accessor: row => row.outletId,
      render: row => (
        <span className="font-mono font-bold text-cyan-400 text-xs bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
          {row.outletId}
        </span>
      ),
    },
    {
      key: 'outletName',
      header: '4. Nama Toko',
      accessor: row => row.outletName,
      render: row => (
        <div>
          <div className="font-semibold text-slate-100 text-xs">{row.outletName}</div>
          <div className="text-[10px] text-slate-400 font-mono">
            {row.channel || 'GENERAL TRADE'} {row.rayon ? `· ${row.rayon}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'lastTxDate',
      header: '5. Tgl Transaksi Terakhir',
      align: 'center',
      width: '195px',
      accessor: row => row.lastTxDate,
      render: row => {
        const isCurrentMonth = row.lastTxMonthSource === 'BULAN INI';
        return (
          <div className="flex flex-col items-center">
            <div className="font-mono font-bold text-slate-100 text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{row.lastTxFormatted}</span>
            </div>
            <span
              className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                isCurrentMonth
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {row.lastTxMonthSource} ({row.lastTxMonthLabel})
            </span>
          </div>
        );
      },
    },
    {
      key: 'lastTxValue',
      header: '6. Nilai Transaksi Terakhir',
      align: 'right',
      width: '175px',
      accessor: row => row.lastTxValue,
      render: row => (
        <div className="text-right">
          <div className="font-mono font-bold text-emerald-300 text-xs">
            {formatRupiah(row.lastTxValue)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {row.totalInvoicesOnLastDate} Faktur pada tgl tsb
          </div>
        </div>
      ),
    },
    {
      key: 'daysSinceLastTx',
      header: '7. Rentang Hari (Ke Tgl Update Harian)',
      align: 'center',
      width: '215px',
      accessor: row => row.daysSinceLastTx,
      render: row => {
        const d = row.daysSinceLastTx;
        const badgeStyle =
          d > 21
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
            : d >= 15
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

        const severityLabel = d > 21 ? 'KRITIS (>21 Hr)' : d >= 15 ? 'WASPADA (15-21 Hr)' : 'FOLLOW UP (8-14 Hr)';

        return (
          <div className="flex flex-col items-center">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold border ${badgeStyle}`}>
              {d} Hari
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-1">
              {severityLabel} · s/d {formatHumanDateId(row.dailyUpdateDate)}
            </span>
          </div>
        );
      },
    },
  ];

  const handleResetLocalFilters = () => {
    setMinDaysThreshold(7);
    setSelectedChannels([]);
    setIsChannelDropdownOpen(false);
    setSelectedSourceMonth('ALL');
    setSelectedSeverity('ALL');
    setManualCutOffDate('');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                RETENTION & VISIT RADAR
              </span>
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Auto Cut-Off Update Harian: <strong>{formatHumanDateId(effectiveUpdateDateIso)}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 mt-1.5 flex items-center gap-2.5">
              <CalendarClock className="w-6 h-6 text-amber-400 shrink-0" />
              <span>List Toko dengan Rentang Transaksi Terakhir di Atas {minDaysThreshold} Hari</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Mendeteksi toko yang belum melakukan repeat order lebih dari{' '}
              <span className="text-amber-300 font-semibold font-mono">{minDaysThreshold} hari</span> dihitung otomatis dari{' '}
              <span className="text-slate-200 font-semibold">Tanggal Transaksi Terakhir</span> (gabungan Database Bulan Lalu{' '}
              <span className="font-mono text-amber-300">{prevLabel}</span> &amp; Bulan Ini{' '}
              <span className="font-mono text-cyan-300">{currLabel}</span>) menuju{' '}
              <span className="text-emerald-300 font-semibold">Tanggal Update Harian ({formatHumanDateId(effectiveUpdateDateIso)})</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <CaptureJpgButton
              targetId="main-capture-area"
              fileName={`List_Toko_Rentang_Transaksi_Diatas_${minDaysThreshold}_Hari_${effectiveUpdateDateIso}.jpg`}
              label="Capture JPG"
            />
          </div>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>TOTAL TOKO &gt; {minDaysThreshold} HARI</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1.5">
            {summaryStats.totalOutlets.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Toko</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Dari total {allOutletsLastTx.length.toLocaleString('id-ID')} toko pernah transaksi
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-cyan-500 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>TRX TERAKHIR BULAN INI</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-1.5">
            {summaryStats.fromCurrMonth.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Toko</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Sudah order di {currLabel}, jeda &gt; {minDaysThreshold} hr
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-rose-500 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>TRX TERAKHIR BULAN LALU</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 mt-1.5">
            {summaryStats.fromPrevMonth.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">Toko</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Terakhir order di {prevLabel} (Belum RO BI)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>TOTAL NILAI TRX TERAKHIR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-300 mt-1.5 truncate" title={formatRupiah(summaryStats.totalLastTxValue)}>
            {formatRupiah(summaryStats.totalLastTxValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Akumulasi nilai order terakhir toko
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>TGL UPDATE HARIAN (AUTO)</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-extrabold font-mono text-indigo-300 mt-1.5">
            {formatHumanDateId(effectiveUpdateDateIso)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Rata-rata jeda: <strong className="text-slate-300">{summaryStats.avgDays} hr</strong> (Maks {summaryStats.maxDays} hr)
          </div>
        </div>
      </div>

      {/* Control & Filter Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3" data-capture-ignore="true">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Filter &amp; Parameter Rentang Hari Transaksi Terakhir</span>
          </div>
          <button
            onClick={handleResetLocalFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* 1. Filter Chanel (Multi-select Checkbox Dropdown) */}
          <div className="relative" ref={channelDropdownRef}>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">1. Filter Chanel</label>
            <button
              type="button"
              onClick={() => setIsChannelDropdownOpen(prev => !prev)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-500/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center justify-between gap-2 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <span className="truncate text-left">
                {selectedChannels.length === 0
                  ? `Semua Chanel (${uniqueChannels.length})`
                  : selectedChannels.length === 1
                  ? selectedChannels[0]
                  : `${selectedChannels.length} Chanel Dipilih`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                  isChannelDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {isChannelDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      if (selectedChannels.length === uniqueChannels.length) {
                        setSelectedChannels([]);
                      } else {
                        setSelectedChannels([...uniqueChannels]);
                      }
                    }}
                    className="text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {selectedChannels.length === uniqueChannels.length && uniqueChannels.length > 0
                      ? 'Hapus Semua'
                      : 'Pilih Semua'}
                  </button>
                  {selectedChannels.length > 0 && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedChannels([]);
                      }}
                      className="text-[10px] font-mono text-amber-400 hover:text-amber-300"
                    >
                      Reset ({selectedChannels.length})
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                  {uniqueChannels.map(ch => {
                    const isChecked = selectedChannels.includes(ch);
                    const count = channelCountsMap.get(ch) || 0;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleChannel(ch);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs text-left select-none transition-colors ${
                          isChecked
                            ? 'bg-cyan-500/15 text-cyan-200 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate">{ch}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">({count})</span>
                      </button>
                    );
                  })}
                  {uniqueChannels.length === 0 && (
                    <div className="px-2 py-3 text-center text-[11px] text-slate-500 font-mono">
                      Tidak ada chanel tersedia
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Filter Bulan Transaksi Terakhir */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">2. Sumber Bulan Trx Terakhir</label>
            <select
              value={selectedSourceMonth}
              onChange={e => setSelectedSourceMonth(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Bulan Lalu &amp; Bulan Ini (Semua)</option>
              <option value="BULAN_INI">Hanya Bulan Ini ({currLabel})</option>
              <option value="BULAN_LALU">Hanya Bulan Lalu ({prevLabel})</option>
            </select>
          </div>

          {/* 3. Filter Kelompok Rentang Hari */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">3. Kategori Rentang Hari</label>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Di Atas {minDaysThreshold} Hari</option>
              <option value="8_14">8 – 14 Hari (Follow Up)</option>
              <option value="15_21">15 – 21 Hari (Waspada)</option>
              <option value="OVER_21">&gt; 21 Hari (Kritis)</option>
            </select>
          </div>

          {/* 4. Batas Minimum Hari (Default > 7 Hari) */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              4. Batas Rentang (&gt; X Hari)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={60}
                value={minDaysThreshold}
                onChange={e => setMinDaysThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-400 font-mono shrink-0">Hari</span>
            </div>
          </div>

          {/* 5. Tanggal Update Harian (Auto / Custom Override) */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              5. Tgl Update Harian (Auto)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={manualCutOffDate || effectiveUpdateDateIso}
                onChange={e => setManualCutOffDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                title="Otomatis mengikuti tanggal transaksi terbaru di database. Klik untuk simulasi tanggal lain."
              />
              {manualCutOffDate && (
                <button
                  onClick={() => setManualCutOffDate('')}
                  className="px-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 rounded border border-slate-700 shrink-0"
                  title="Kembalikan ke Auto Tanggal Update Harian"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main DataTable: 7 Columns Required by User */}
      <DataTable
        title={`Daftar Toko dengan Rentang Transaksi Terakhir > ${minDaysThreshold} Hari (s/d Update ${formatHumanDateId(
          effectiveUpdateDateIso
        )})`}
        columns={columns}
        data={filteredOutlets}
        pageSizeDefault={25}
        searchPlaceholder="Cari depo/PMA, area, nama sales, kode toko, atau nama toko..."
        exportFileName={`List_Toko_Rentang_Transaksi_Diatas_${minDaysThreshold}_Hari_${effectiveUpdateDateIso}.xlsx`}
        emptyMessage={`Tidak ada toko dengan rentang transaksi terakhir di atas ${minDaysThreshold} hari pada filter ini.`}
      />

      {/* Rekapitulasi Per Salesman & Depo/PMA */}
      {salesmanSummary.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Rekapitulasi Jumlah Toko Rentang &gt; {minDaysThreshold} Hari per Salesman &amp; Depo / PMA (Area)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {salesmanSummary.length} Salesman Terkait
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[10px] uppercase font-mono">
                  <th className="py-2.5 px-4">Depo / PMA (Area)</th>
                  <th className="py-2.5 px-4">Nama Sales</th>
                  <th className="py-2.5 px-4 text-center">Total Toko &gt; {minDaysThreshold} Hr</th>
                  <th className="py-2.5 px-4 text-center">Trx Terakhir Bulan Ini</th>
                  <th className="py-2.5 px-4 text-center">Trx Terakhir Bulan Lalu</th>
                  <th className="py-2.5 px-4 text-right">Total Nilai Trx Terakhir</th>
                  <th className="py-2.5 px-4 text-center">Rata-rata Rentang</th>
                  <th className="py-2.5 px-4 text-center">Rentang Terlama</th>
                  <th className="py-2.5 px-4 text-center" data-capture-ignore="true">Aksi Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {salesmanSummary.map(s => {
                  const isSelected = selectedSalesmen.includes(s.salesmanId);
                  return (
                    <tr
                      key={`${s.depo}-${s.salesmanId}`}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-cyan-950/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-300">{s.depo}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-100">{s.salesmanName}</div>
                        <div className="text-[10px] font-mono text-cyan-400/80">{s.salesmanId}</div>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-300">
                        {s.totalToko} Toko
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-cyan-300">
                        {s.fromCurrMonth} Toko
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-rose-300">
                        {s.fromPrevMonth} Toko
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-300">
                        {formatRupiah(s.totalLastTxValue)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                        {s.avgDays} Hari
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-400">
                        {s.maxDays} Hari
                      </td>
                      <td className="py-2.5 px-4 text-center" data-capture-ignore="true">
                        <button
                          onClick={() => toggleSalesman(s.salesmanId)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          {isSelected ? 'Hapus Filter' : 'Pilih Sales'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
