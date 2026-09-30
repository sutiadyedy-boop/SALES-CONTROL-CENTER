import { 
  CalculationResult,
  ControlTowerKPIs, 
  DropOutletItem, 
  GlobalFilterState, 
  NewOutletItem,
  NonTransactingOutletItem,
  SalesmanPerformanceItem 
} from '../types/analytics';
import { 
  MasterOutletRecord, 
  TargetRecord, 
  TransactionRecord, 
  UserProfile 
} from '../types/database';

/**
 * FORMULA 1 & 2: Achievement %
 * Achievement = Actual / Target × 100
 * Jika denominator 0: N/A (returns null, never Infinity)
 */
export function calculateAchievement(actual: number, target: number): number | null {
  if (!target || target <= 0 || !isFinite(target)) {
    return null;
  }
  const result = (actual / target) * 100;
  return isFinite(result) ? result : null;
}

/**
 * FORMULA 3: Gap
 * Gap = Actual - Target
 */
export function calculateGap(actual: number, target: number): number {
  return actual - target;
}

/**
 * FORMULA 4: Growth Agustus vs September
 * Growth = (September - August) / August × 100
 * Jika denominator 0: N/A (returns null, never Infinity)
 */
export function calculateGrowth(september: number, august: number): number | null {
  if (!august || august <= 0 || !isFinite(august)) {
    return null;
  }
  const result = ((september - august) / august) * 100;
  return isFinite(result) ? result : null;
}

/**
 * FORMULA 5: Repeat Order (RO) Aktif
 * RO = Outlet Transaksi / Outlet Aktif × 100
 * Jika denominator 0: N/A (returns null, never Infinity)
 */
export function calculateRO(outletTransaksi: number, outletAktif: number): number | null {
  if (!outletAktif || outletAktif <= 0 || !isFinite(outletAktif)) {
    return null;
  }
  const result = (outletTransaksi / outletAktif) * 100;
  return isFinite(result) ? result : null;
}

/**
 * FORMULA 6 & 7: Outlets Transaksi & Belum Transaksi
 */
export function calculateOutletStatus(totalAktif: number, outletTransaksi: number): {
  outletTransaksi: number;
  outletBelumTransaksi: number;
} {
  return {
    outletTransaksi,
    outletBelumTransaksi: Math.max(0, totalAktif - outletTransaksi),
  };
}

/**
 * FORMULA 8: Drop Outlet
 * August transaction > 0 AND September transaction = 0
 */
export function isDropOutlet(augustTxValue: number, septemberTxValue: number): boolean {
  return augustTxValue > 0 && septemberTxValue === 0;
}

/**
 * FORMULA 9: New Active Outlet
 * August transaction = 0 AND September transaction > 0
 */
export function isNewActiveOutlet(augustTxValue: number, septemberTxValue: number): boolean {
  return augustTxValue === 0 && septemberTxValue > 0;
}

/**
 * Filter dataset by user role (RBAC) and global filters
 */
export function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return [val].filter(Boolean);
}

export function matchesMulti(itemVal: string | undefined, filterVal: string | string[] | undefined): boolean {
  if (!filterVal) return true;
  const list = Array.isArray(filterVal) ? filterVal.filter(Boolean) : [filterVal].filter(Boolean);
  if (list.length === 0) return true;
  return itemVal ? list.includes(itemVal) : false;
}

export function applyRoleAndGlobalFilter(
  filters: GlobalFilterState = {},
  userProfile?: UserProfile
): (record: {
  salesmanId?: string;
  area?: string;
  rayon?: string;
  channel?: string;
  fc?: string;
  pma?: string;
  cabang?: string;
  depo?: string;
  outletName?: string;
  outletId?: string;
}) => boolean {
  return (item) => {
    // RBAC constraints
    if (userProfile) {
      if (userProfile.role === 'SALESMAN' && userProfile.salesmanId) {
        if (item.salesmanId !== userProfile.salesmanId) return false;
      } else if (userProfile.role === 'SUPERVISOR' && userProfile.area) {
        if (item.area && item.area !== userProfile.area) return false;
      } else if (userProfile.role === 'MANAGER' && userProfile.cabang) {
        if (item.cabang && item.cabang !== userProfile.cabang) return false;
      }
    }

    // Global filters (supports both single string and multi-select string[])
    if (!matchesMulti(item.salesmanId, filters.salesmanId)) {
      return false;
    }
    if (!matchesMulti(item.area, filters.area)) {
      return false;
    }
    if (!matchesMulti(item.rayon, filters.rayon)) {
      return false;
    }
    if (!matchesMulti(item.channel, filters.channel)) {
      return false;
    }
    if (!matchesMulti(item.fc, filters.fc)) {
      return false;
    }
    if (!matchesMulti(item.pma, filters.pma)) {
      return false;
    }
    if (!matchesMulti(item.cabang, filters.cabang)) {
      return false;
    }
    if (!matchesMulti(item.depo, filters.depo)) {
      return false;
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match = 
        (item.outletName && item.outletName.toLowerCase().includes(q)) ||
        (item.outletId && item.outletId.toLowerCase().includes(q)) ||
        (item.salesmanId && item.salesmanId.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  };
}

export function computeAnalytics(
  prevTransactions: TransactionRecord[],
  currTransactions: TransactionRecord[],
  targets: TargetRecord[],
  masterOutlets: MasterOutletRecord[],
  filters: GlobalFilterState = {},
  userProfile?: UserProfile
): CalculationResult {
  const filterPredicate = applyRoleAndGlobalFilter(filters, userProfile);

  // 1. Full Master Outlet Map (unfiltered for full cross-database enrichment)
  const fullMasterMap = new Map<string, MasterOutletRecord>();
  for (const m of masterOutlets) {
    fullMasterMap.set(m.outletId, m);
  }

  // 2. Salesman Metadata Maps (for cross-file synchronization: targets & transactions -> master)
  const salesmanAreas = new Map<string, Set<string>>();
  const salesmanPmas = new Map<string, Set<string>>();
  const salesmanRayons = new Map<string, Set<string>>();
  const salesmanChannels = new Map<string, Set<string>>();
  const salesmanCabangs = new Map<string, Set<string>>();
  const salesmanDepos = new Map<string, Set<string>>();

  for (const m of masterOutlets) {
    if (m.salesmanId) {
      if (m.area) {
        if (!salesmanAreas.has(m.salesmanId)) salesmanAreas.set(m.salesmanId, new Set());
        salesmanAreas.get(m.salesmanId)!.add(m.area);
      }
      if (m.pma) {
        if (!salesmanPmas.has(m.salesmanId)) salesmanPmas.set(m.salesmanId, new Set());
        salesmanPmas.get(m.salesmanId)!.add(m.pma);
      }
      if (m.rayon) {
        if (!salesmanRayons.has(m.salesmanId)) salesmanRayons.set(m.salesmanId, new Set());
        salesmanRayons.get(m.salesmanId)!.add(m.rayon);
      }
      if (m.channel) {
        if (!salesmanChannels.has(m.salesmanId)) salesmanChannels.set(m.salesmanId, new Set());
        salesmanChannels.get(m.salesmanId)!.add(m.channel);
      }
      if (m.cabang) {
        if (!salesmanCabangs.has(m.salesmanId)) salesmanCabangs.set(m.salesmanId, new Set());
        salesmanCabangs.get(m.salesmanId)!.add(m.cabang);
      }
      if (m.depo) {
        if (!salesmanDepos.has(m.salesmanId)) salesmanDepos.set(m.salesmanId, new Set());
        salesmanDepos.get(m.salesmanId)!.add(m.depo);
      }
    }
  }

  for (const t of targets) {
    if (t.salesmanId) {
      if (t.area) {
        if (!salesmanAreas.has(t.salesmanId)) salesmanAreas.set(t.salesmanId, new Set());
        salesmanAreas.get(t.salesmanId)!.add(t.area);
      }
      if (t.pma) {
        if (!salesmanPmas.has(t.salesmanId)) salesmanPmas.set(t.salesmanId, new Set());
        salesmanPmas.get(t.salesmanId)!.add(t.pma);
      }
      if (t.cb) {
        if (!salesmanCabangs.has(t.salesmanId)) salesmanCabangs.set(t.salesmanId, new Set());
        salesmanCabangs.get(t.salesmanId)!.add(t.cb);
      }
    }
  }

  // 3. Filter Master Outlets
  const masterOutletMap = new Map<string, MasterOutletRecord>();
  for (const m of masterOutlets) {
    if (filterPredicate(m)) {
      masterOutletMap.set(m.outletId, m);
    }
  }

  // 4. Enrich & Filter Transactions with full master info & metadata fallback
  const enrichTx = (t: TransactionRecord) => {
    const m = fullMasterMap.get(t.outletId);
    const slsAreas = t.salesmanId ? salesmanAreas.get(t.salesmanId) : undefined;
    const slsPmas = t.salesmanId ? salesmanPmas.get(t.salesmanId) : undefined;
    const slsRayons = t.salesmanId ? salesmanRayons.get(t.salesmanId) : undefined;
    const slsChannels = t.salesmanId ? salesmanChannels.get(t.salesmanId) : undefined;
    const slsCabangs = t.salesmanId ? salesmanCabangs.get(t.salesmanId) : undefined;
    const slsDepos = t.salesmanId ? salesmanDepos.get(t.salesmanId) : undefined;

    return {
      ...t,
      area: t.area || m?.area || (slsAreas ? Array.from(slsAreas)[0] : '') || '',
      pma: t.pma || m?.pma || (slsPmas ? Array.from(slsPmas)[0] : '') || '',
      rayon: t.rayon || m?.rayon || (slsRayons ? Array.from(slsRayons)[0] : '') || '',
      channel: t.channel || m?.channel || (slsChannels ? Array.from(slsChannels)[0] : '') || '',
      fc: t.fc || m?.fc || '',
      cabang: t.cabang || m?.cabang || (slsCabangs ? Array.from(slsCabangs)[0] : '') || '',
      depo: t.depo || m?.depo || (slsDepos ? Array.from(slsDepos)[0] : '') || '',
    };
  };

  const filteredPrev = prevTransactions.map(enrichTx).filter(filterPredicate);
  const filteredCurr = currTransactions.map(enrichTx).filter(filterPredicate);

  // 3. Outlet Transaction Aggregations
  // Outlet -> previous sales, current sales, last date, salesman
  const outletSalesPrev = new Map<string, { sales: number; name: string; salesmanId: string; salesmanName: string; lastDate?: string }>();
  const outletSalesCurr = new Map<string, { sales: number; name: string; salesmanId: string; salesmanName: string; lastDate?: string }>();

  for (const t of filteredPrev) {
    if (t.salesValue > 0) {
      const existing = outletSalesPrev.get(t.outletId);
      if (!existing) {
        outletSalesPrev.set(t.outletId, {
          sales: t.salesValue,
          name: t.outletName,
          salesmanId: t.salesmanId,
          salesmanName: t.salesmanName,
          lastDate: t.transactionDate,
        });
      } else {
        existing.sales += t.salesValue;
        if (t.transactionDate && (!existing.lastDate || t.transactionDate > existing.lastDate)) {
          existing.lastDate = t.transactionDate;
        }
      }
    }
  }

  for (const t of filteredCurr) {
    if (t.salesValue > 0) {
      const existing = outletSalesCurr.get(t.outletId);
      if (!existing) {
        outletSalesCurr.set(t.outletId, {
          sales: t.salesValue,
          name: t.outletName,
          salesmanId: t.salesmanId,
          salesmanName: t.salesmanName,
          lastDate: t.transactionDate,
        });
      } else {
        existing.sales += t.salesValue;
        if (t.transactionDate && (!existing.lastDate || t.transactionDate > existing.lastDate)) {
          existing.lastDate = t.transactionDate;
        }
      }
    }
  }

  // 4. Compute RO metrics from Master Outlets
  let totalActiveOutlets = 0;
  let inactiveMasterOutlets = 0;
  let transactingActiveOutlets = 0;

  for (const [, master] of masterOutletMap.entries()) {
    if (master.isActive) {
      totalActiveOutlets++;
      if (outletSalesCurr.has(master.outletId)) {
        transactingActiveOutlets++;
      }
    } else {
      inactiveMasterOutlets++;
    }
  }

  const { outletTransaksi, outletBelumTransaksi: outletsNotTransactedCurrent } = calculateOutletStatus(totalActiveOutlets, transactingActiveOutlets);
  const roRate = calculateRO(transactingActiveOutlets, totalActiveOutlets);

  // 5. Compute DROP OUTLETS
  // Rule 8: Bulan lalu transaksi, bulan ini tidak transaksi
  const dropOutlets: DropOutletItem[] = [];
  let dropOutletLostRevenue = 0;

  for (const [outletId, prevData] of outletSalesPrev.entries()) {
    const currData = outletSalesCurr.get(outletId);
    const currSales = currData ? currData.sales : 0;
    if (isDropOutlet(prevData.sales, currSales)) {
      const master = masterOutletMap.get(outletId);
      dropOutlets.push({
        outletId,
        outletName: prevData.name,
        salesmanId: prevData.salesmanId,
        salesmanName: prevData.salesmanName,
        area: master?.area,
        rayon: master?.rayon,
        channel: master?.channel,
        salesPrevious: prevData.sales,
        salesCurrent: 0,
        lastTransactionDate: prevData.lastDate,
        status: 'DROP_OUTLET',
      });
      dropOutletLostRevenue += prevData.sales;
    }
  }
  // Sort drop outlets by highest lost revenue first
  dropOutlets.sort((a, b) => b.salesPrevious - a.salesPrevious);

  // 6. Compute NEW ACTIVE OUTLETS
  // Rule 9: Bulan lalu tidak transaksi, bulan ini transaksi
  const newOutlets: NewOutletItem[] = [];
  let newActiveOutletRevenue = 0;

  for (const [outletId, currData] of outletSalesCurr.entries()) {
    const prevData = outletSalesPrev.get(outletId);
    const prevSales = prevData ? prevData.sales : 0;
    if (isNewActiveOutlet(prevSales, currData.sales)) {
      const master = masterOutletMap.get(outletId);
      newOutlets.push({
        outletId,
        outletName: currData.name,
        salesmanId: currData.salesmanId,
        salesmanName: currData.salesmanName,
        area: master?.area,
        rayon: master?.rayon,
        channel: master?.channel,
        salesPrevious: 0,
        salesCurrent: currData.sales,
        status: 'NEW_ACTIVE',
      });
      newActiveOutletRevenue += currData.sales;
    }
  }
  newOutlets.sort((a, b) => b.salesCurrent - a.salesCurrent);

  // 7. Compute OUTLETS BELUM TRANSAKSI
  // Active master outlets with 0 September transactions
  const outletsNotTransacted: NonTransactingOutletItem[] = [];
  for (const [, master] of masterOutletMap.entries()) {
    if (master.isActive && !outletSalesCurr.has(master.outletId)) {
      const prevData = outletSalesPrev.get(master.outletId);
      outletsNotTransacted.push({
        outletId: master.outletId,
        outletName: master.outletName,
        salesmanId: master.salesmanId,
        salesmanName: master.salesmanName || master.salesmanId,
        area: master.area,
        rayon: master.rayon,
        channel: master.channel,
        fc: master.fc,
        pma: master.pma,
        cabang: master.cabang,
        depo: master.depo,
        salesPrevious: prevData ? prevData.sales : 0,
        salesCurrent: 0,
        status: 'BELUM_TRANSAKSI',
      });
    }
  }
  outletsNotTransacted.sort((a, b) => (b.salesPrevious - a.salesPrevious) || a.outletName.localeCompare(b.outletName));

  // 8. Compute Salesman Performance
  // Filter targets by salesman / area / cabang / pma
  const filteredTargets = targets.filter(t => {
    const slsAreas = salesmanAreas.get(t.salesmanId);
    const slsPmas = salesmanPmas.get(t.salesmanId);
    const slsCabangs = salesmanCabangs.get(t.salesmanId);
    const targetArea = t.area || (slsAreas ? Array.from(slsAreas)[0] : '');
    const targetPma = t.pma || (slsPmas ? Array.from(slsPmas)[0] : '');
    const targetCabang = t.cb || (slsCabangs ? Array.from(slsCabangs)[0] : '');

    return filterPredicate({
      salesmanId: t.salesmanId,
      area: targetArea,
      pma: targetPma,
      cabang: targetCabang,
    });
  });

  const allSalesmenIds = new Set<string>();
  filteredTargets.forEach(t => allSalesmenIds.add(t.salesmanId));
  filteredCurr.forEach(t => allSalesmenIds.add(t.salesmanId));
  filteredPrev.forEach(t => allSalesmenIds.add(t.salesmanId));
  for (const [, m] of masterOutletMap.entries()) {
    if (m.salesmanId) allSalesmenIds.add(m.salesmanId);
  }

  // If specific channel/rayon/fc/pma/area/cabang/depo filter is active, refine salesmen to those active in that segment
  const hasActiveSegmentFilter = 
    toArray(filters?.channel).length > 0 ||
    toArray(filters?.rayon).length > 0 ||
    toArray(filters?.fc).length > 0 ||
    toArray(filters?.pma).length > 0 ||
    toArray(filters?.area).length > 0 ||
    toArray(filters?.cabang).length > 0 ||
    toArray(filters?.depo).length > 0;

  if (hasActiveSegmentFilter) {
    const activeSlsInFilter = new Set<string>();
    filteredCurr.forEach(t => activeSlsInFilter.add(t.salesmanId));
    filteredPrev.forEach(t => activeSlsInFilter.add(t.salesmanId));
    for (const [, m] of masterOutletMap.entries()) {
      if (m.salesmanId) activeSlsInFilter.add(m.salesmanId);
    }
    for (const id of Array.from(allSalesmenIds)) {
      if (!activeSlsInFilter.has(id)) {
        allSalesmenIds.delete(id);
      }
    }
  }

  // Build target lookup
  const targetMap = new Map<string, TargetRecord>();
  for (const trg of filteredTargets) {
    targetMap.set(trg.salesmanId, trg);
  }

  // Aggregate sales by salesman
  const slsCurrSales = new Map<string, { total: number; name: string }>();
  for (const t of filteredCurr) {
    const existing = slsCurrSales.get(t.salesmanId);
    if (!existing) {
      slsCurrSales.set(t.salesmanId, { total: t.salesValue, name: t.salesmanName });
    } else {
      existing.total += t.salesValue;
      if (t.salesmanName && !existing.name) existing.name = t.salesmanName;
    }
  }

  const slsPrevSales = new Map<string, number>();
  for (const t of filteredPrev) {
    slsPrevSales.set(t.salesmanId, (slsPrevSales.get(t.salesmanId) || 0) + t.salesValue);
  }

  // RO per salesman
  const slsMasterOutlets = new Map<string, { total: number; active: number; transacted: number }>();
  for (const [, m] of masterOutletMap.entries()) {
    const slsId = m.salesmanId;
    if (!slsId) continue;
    let s = slsMasterOutlets.get(slsId);
    if (!s) {
      s = { total: 0, active: 0, transacted: 0 };
      slsMasterOutlets.set(slsId, s);
    }
    s.total++;
    if (m.isActive) {
      s.active++;
      if (outletSalesCurr.has(m.outletId)) {
        s.transacted++;
      }
    }
  }

  const dropCountPerSls = new Map<string, number>();
  for (const d of dropOutlets) {
    dropCountPerSls.set(d.salesmanId, (dropCountPerSls.get(d.salesmanId) || 0) + 1);
  }

  const newCountPerSls = new Map<string, number>();
  for (const n of newOutlets) {
    newCountPerSls.set(n.salesmanId, (newCountPerSls.get(n.salesmanId) || 0) + 1);
  }

  const salesmanPerformances: SalesmanPerformanceItem[] = [];

  for (const slsId of allSalesmenIds) {
    const trg = targetMap.get(slsId);
    const currData = slsCurrSales.get(slsId);
    const actualCurrent = currData ? currData.total : 0;
    const actualPrevious = slsPrevSales.get(slsId) || 0;
    const salesmanName = trg?.salesmanName || currData?.name || slsId;

    const slsArea = trg?.area || (salesmanAreas.get(slsId) ? Array.from(salesmanAreas.get(slsId)!)[0] : undefined);
    const slsPma = trg?.pma || (salesmanPmas.get(slsId) ? Array.from(salesmanPmas.get(slsId)!)[0] : undefined);
    const slsCabang = trg?.cb || (salesmanCabangs.get(slsId) ? Array.from(salesmanCabangs.get(slsId)!)[0] : undefined);

    // Apply role/filter to salesman
    if (!filterPredicate({
      salesmanId: slsId,
      area: slsArea,
      pma: slsPma,
      cabang: slsCabang,
    })) {
      continue;
    }

    const targetVal = trg?.targetValue || 0;
    const achievementRate = calculateAchievement(actualCurrent, targetVal);
    let targetStatus: SalesmanPerformanceItem['targetStatus'] = 'TARGET_NOT_FOUND';

    if (trg && trg.targetValue > 0) {
      targetStatus = actualCurrent >= targetVal ? 'ACHIEVED' : 'UNDER';
    } else {
      targetStatus = 'TARGET_NOT_FOUND';
    }

    const gap = calculateGap(actualCurrent, targetVal);

    // Growth calculation (no Infinity)
    const growthRate = calculateGrowth(actualCurrent, actualPrevious);
    let growthStatus: SalesmanPerformanceItem['growthStatus'] = 'NO_DATA';

    if (actualPrevious > 0 && growthRate !== null) {
      growthStatus = growthRate >= 0 ? 'POSITIVE' : 'NEGATIVE';
    } else if (actualPrevious === 0 && actualCurrent > 0) {
      growthStatus = 'NEW_SALES';
    }

    const roInfo = slsMasterOutlets.get(slsId) || { total: 0, active: 0, transacted: 0 };
    const slsRoRate = calculateRO(roInfo.transacted, roInfo.active);

    salesmanPerformances.push({
      rank: 0,
      salesmanId: slsId,
      salesmanName,
      area: slsArea,
      target: targetVal,
      actualCurrent,
      actualPrevious,
      achievementRate,
      gap,
      growthRate,
      growthStatus,
      targetStatus,
      totalMasterOutlets: roInfo.total,
      activeOutlets: roInfo.active,
      transactingOutlets: roInfo.transacted,
      nonTransactingOutlets: Math.max(0, roInfo.active - roInfo.transacted),
      roRate: slsRoRate,
      dropOutletsCount: dropCountPerSls.get(slsId) || 0,
      newOutletsCount: newCountPerSls.get(slsId) || 0,
    });
  }

  // Sort by Achievement rate descending (putting nulls/Target not found at the end)
  salesmanPerformances.sort((a, b) => {
    if (a.achievementRate === null && b.achievementRate === null) return b.actualCurrent - a.actualCurrent;
    if (a.achievementRate === null) return 1;
    if (b.achievementRate === null) return -1;
    return b.achievementRate - a.achievementRate;
  });

  // Assign ranks
  salesmanPerformances.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  // 8. Overall KPIs
  const totalTarget = salesmanPerformances.reduce((acc, s) => acc + s.target, 0);
  const totalActualCurrent = filteredCurr.reduce((acc, t) => acc + t.salesValue, 0);
  const totalActualPrevious = filteredPrev.reduce((acc, t) => acc + t.salesValue, 0);

  const overallAchievementRate = calculateAchievement(totalActualCurrent, totalTarget);
  const gapValue = calculateGap(totalActualCurrent, totalTarget);

  const overallGrowthRate = calculateGrowth(totalActualCurrent, totalActualPrevious);
  let overallGrowthStatus: ControlTowerKPIs['growthStatus'] = 'NO_DATA';
  if (totalActualPrevious > 0 && overallGrowthRate !== null) {
    overallGrowthStatus = overallGrowthRate >= 0 ? 'POSITIVE' : 'NEGATIVE';
  } else if (totalActualPrevious === 0 && totalActualCurrent > 0) {
    overallGrowthStatus = 'NEW_SALES';
  }

  // 9. Breakdown by Channel, Rayon, Area, and PMA
  const channelMap = new Map<string, { active: number; transacted: number; sales: number }>();
  const rayonMap = new Map<string, { active: number; transacted: number; sales: number }>();
  const areaMap = new Map<string, { active: number; transacted: number; sales: number }>();
  const pmaMap = new Map<string, { active: number; transacted: number; sales: number }>();

  for (const [, m] of masterOutletMap.entries()) {
    const ch = m.channel || 'Unspecified';
    const ry = m.rayon || 'Unspecified';
    const ar = m.area || 'Unspecified';
    const pm = m.pma || 'Unspecified';

    if (!channelMap.has(ch)) channelMap.set(ch, { active: 0, transacted: 0, sales: 0 });
    if (!rayonMap.has(ry)) rayonMap.set(ry, { active: 0, transacted: 0, sales: 0 });
    if (!areaMap.has(ar)) areaMap.set(ar, { active: 0, transacted: 0, sales: 0 });
    if (!pmaMap.has(pm)) pmaMap.set(pm, { active: 0, transacted: 0, sales: 0 });

    if (m.isActive) {
      channelMap.get(ch)!.active++;
      rayonMap.get(ry)!.active++;
      areaMap.get(ar)!.active++;
      pmaMap.get(pm)!.active++;

      if (outletSalesCurr.has(m.outletId)) {
        channelMap.get(ch)!.transacted++;
        rayonMap.get(ry)!.transacted++;
        areaMap.get(ar)!.transacted++;
        pmaMap.get(pm)!.transacted++;
      }
    }
  }

  for (const t of filteredCurr) {
    const m = fullMasterMap.get(t.outletId);
    const ch = t.channel || m?.channel || 'Unspecified';
    const ry = t.rayon || m?.rayon || 'Unspecified';
    const ar = t.area || m?.area || 'Unspecified';
    const pm = t.pma || m?.pma || 'Unspecified';

    if (channelMap.has(ch)) channelMap.get(ch)!.sales += t.salesValue;
    if (rayonMap.has(ry)) rayonMap.get(ry)!.sales += t.salesValue;
    if (areaMap.has(ar)) areaMap.get(ar)!.sales += t.salesValue;
    if (pmaMap.has(pm)) pmaMap.get(pm)!.sales += t.salesValue;
  }

  const channelBreakdown = Array.from(channelMap.entries()).map(([channel, data]) => ({
    channel,
    activeOutlets: data.active,
    transactedOutlets: data.transacted,
    sales: data.sales,
    roRate: calculateRO(data.transacted, data.active),
  })).sort((a, b) => b.sales - a.sales);

  const rayonBreakdown = Array.from(rayonMap.entries()).map(([rayon, data]) => ({
    rayon,
    activeOutlets: data.active,
    transactedOutlets: data.transacted,
    sales: data.sales,
    roRate: calculateRO(data.transacted, data.active),
  })).sort((a, b) => b.sales - a.sales);

  const areaBreakdown = Array.from(areaMap.entries()).map(([area, data]) => ({
    area,
    activeOutlets: data.active,
    transactedOutlets: data.transacted,
    sales: data.sales,
    roRate: calculateRO(data.transacted, data.active),
  })).sort((a, b) => b.sales - a.sales);

  const pmaBreakdown = Array.from(pmaMap.entries()).map(([pma, data]) => ({
    pma,
    activeOutlets: data.active,
    transactedOutlets: data.transacted,
    sales: data.sales,
    roRate: calculateRO(data.transacted, data.active),
  })).sort((a, b) => b.sales - a.sales);

  return {
    kpis: {
      totalTarget,
      totalActualCurrent,
      totalActualPrevious,
      achievementRate: overallAchievementRate,
      gapValue,
      growthRate: overallGrowthRate,
      growthStatus: overallGrowthStatus,
      totalActiveOutlets,
      outletsTransactedCurrent: transactingActiveOutlets,
      outletsNotTransactedCurrent,
      repeatOrderRate: roRate,
      dropOutletCount: dropOutlets.length,
      dropOutletLostRevenue,
      newActiveOutletCount: newOutlets.length,
      newActiveOutletRevenue,
    },
    salesmanPerformances,
    dropOutlets,
    newOutlets,
    outletsNotTransacted,
    outletRoSummary: {
      totalMasterOutlets: masterOutletMap.size,
      activeOutlets: totalActiveOutlets,
      inactiveOutlets: inactiveMasterOutlets,
      transactingActiveOutlets,
      nonTransactingActiveOutlets: outletsNotTransactedCurrent,
      repeatOrderRate: roRate,
    },
    channelBreakdown,
    rayonBreakdown,
    areaBreakdown,
    pmaBreakdown,
  };
}
