import { 
  MasterOutletRecord, 
  ReconciliationStatus, 
  TargetRecord, 
  TransactionRecord 
} from '../types/database';

export interface UnmatchedOutletItem {
  outletId: string;
  outletName: string;
  source: 'in_transactions_only' | 'in_master_only';
  salesmanId?: string;
  salesmanName?: string;
  period?: string;
  salesValue?: number;
}

export interface UnmatchedSalesmanItem {
  salesmanId: string;
  salesmanName?: string;
  source: 'in_transactions_no_target' | 'in_target_no_transactions';
  actualSales?: number;
  targetValue?: number;
  area?: string;
}

export interface MatchedOutletItem {
  outletId: string;
  outletName: string;
  channel?: string;
  rayon?: string;
  salesmanId: string;
  salesmanName?: string;
  isActiveInMaster: boolean;
  salesAugust: number;
  salesSeptember: number;
  transactedAugust: boolean;
  transactedSeptember: boolean;
}

export interface MatchedSalesmanItem {
  salesmanId: string;
  salesmanName: string;
  area?: string;
  targetValue: number;
  actualSalesSeptember: number;
  actualSalesAugust: number;
  hasTarget: boolean;
  hasTransactions: boolean;
}

export interface DetailedReconciliationReport {
  status: ReconciliationStatus;
  matchedOutlets: MatchedOutletItem[];
  unmatchedOutlets: UnmatchedOutletItem[];
  matchedSalesmen: MatchedSalesmanItem[];
  unmatchedSalesmen: UnmatchedSalesmanItem[];
  duplicateDetails: {
    period: string;
    duplicateCount: number;
    dedupKeyRule: string;
    recordsProcessed: number;
  }[];
}

export function performReconciliation(
  prevTransactions: TransactionRecord[],
  currTransactions: TransactionRecord[],
  targets: TargetRecord[],
  masterOutlets: MasterOutletRecord[],
  dupPrev: number,
  dupCurr: number
): DetailedReconciliationReport {
  // 1. Index Master Outlets
  const masterOutletMap = new Map<string, MasterOutletRecord>();
  let activeMasterCount = 0;
  let inactiveMasterCount = 0;

  for (const m of masterOutlets) {
    masterOutletMap.set(m.outletId, m);
    if (m.isActive) {
      activeMasterCount++;
    } else {
      inactiveMasterCount++;
    }
  }

  // 2. Index Transactions per Outlet
  const augOutletSales = new Map<string, { sales: number; name: string; salesmanId: string; salesmanName: string }>();
  for (const t of prevTransactions) {
    if (t.salesValue > 0) {
      const ex = augOutletSales.get(t.outletId);
      if (!ex) {
        augOutletSales.set(t.outletId, { sales: t.salesValue, name: t.outletName, salesmanId: t.salesmanId, salesmanName: t.salesmanName });
      } else {
        ex.sales += t.salesValue;
      }
    }
  }

  const sepOutletSales = new Map<string, { sales: number; name: string; salesmanId: string; salesmanName: string }>();
  for (const t of currTransactions) {
    if (t.salesValue > 0) {
      const ex = sepOutletSales.get(t.outletId);
      if (!ex) {
        sepOutletSales.set(t.outletId, { sales: t.salesValue, name: t.outletName, salesmanId: t.salesmanId, salesmanName: t.salesmanName });
      } else {
        ex.sales += t.salesValue;
      }
    }
  }

  // 3. Index Targets per Salesman
  const targetMap = new Map<string, TargetRecord>();
  for (const trg of targets) {
    targetMap.set(trg.salesmanId, trg);
  }

  // 4. Index Transactions per Salesman
  const slsAugSales = new Map<string, { sales: number; name: string }>();
  for (const t of prevTransactions) {
    const ex = slsAugSales.get(t.salesmanId);
    if (!ex) slsAugSales.set(t.salesmanId, { sales: t.salesValue, name: t.salesmanName });
    else ex.sales += t.salesValue;
  }

  const slsSepSales = new Map<string, { sales: number; name: string }>();
  for (const t of currTransactions) {
    const ex = slsSepSales.get(t.salesmanId);
    if (!ex) slsSepSales.set(t.salesmanId, { sales: t.salesValue, name: t.salesmanName });
    else ex.sales += t.salesValue;
  }

  // 5. Match Outlets
  const matchedOutlets: MatchedOutletItem[] = [];
  const unmatchedOutlets: UnmatchedOutletItem[] = [];
  const allEncounteredOutletIds = new Set<string>();

  masterOutletMap.forEach((_, id) => allEncounteredOutletIds.add(id));
  augOutletSales.forEach((_, id) => allEncounteredOutletIds.add(id));
  sepOutletSales.forEach((_, id) => allEncounteredOutletIds.add(id));

  let matchedMasterCount = 0;
  const unmatchedMasterIds: string[] = [];
  let transactionsWithoutMasterCount = 0;

  allEncounteredOutletIds.forEach(outletId => {
    const master = masterOutletMap.get(outletId);
    const aug = augOutletSales.get(outletId);
    const sep = sepOutletSales.get(outletId);

    const hasAug = Boolean(aug && aug.sales > 0);
    const hasSep = Boolean(sep && sep.sales > 0);
    const hasTransacted = hasAug || hasSep;

    if (master && hasTransacted) {
      matchedMasterCount++;
      matchedOutlets.push({
        outletId,
        outletName: master.outletName,
        channel: master.channel,
        rayon: master.rayon,
        salesmanId: master.salesmanId,
        salesmanName: master.salesmanName,
        isActiveInMaster: master.isActive,
        salesAugust: aug?.sales || 0,
        salesSeptember: sep?.sales || 0,
        transactedAugust: hasAug,
        transactedSeptember: hasSep,
      });
    } else if (master && !hasTransacted) {
      unmatchedMasterIds.push(outletId);
      unmatchedOutlets.push({
        outletId,
        outletName: master.outletName,
        source: 'in_master_only',
        salesmanId: master.salesmanId,
        salesmanName: master.salesmanName,
        period: 'Tidak Ada Transaksi',
        salesValue: 0,
      });
    } else if (!master && hasTransacted) {
      transactionsWithoutMasterCount++;
      unmatchedOutlets.push({
        outletId,
        outletName: sep?.name || aug?.name || outletId,
        source: 'in_transactions_only',
        salesmanId: sep?.salesmanId || aug?.salesmanId,
        salesmanName: sep?.salesmanName || aug?.salesmanName,
        period: hasSep ? 'September 2026' : 'Agustus 2026',
        salesValue: (sep?.sales || 0) + (aug?.sales || 0),
      });
    }
  });

  // 6. Match Salesmen
  const allSalesmanIds = new Set<string>();
  targetMap.forEach((_, id) => allSalesmanIds.add(id));
  slsAugSales.forEach((_, id) => allSalesmanIds.add(id));
  slsSepSales.forEach((_, id) => allSalesmanIds.add(id));

  const matchedSalesmen: MatchedSalesmanItem[] = [];
  const unmatchedSalesmen: UnmatchedSalesmanItem[] = [];
  const unmatchedSalesmenWithoutTarget: string[] = [];
  const targetSalesmenWithoutTransactions: string[] = [];
  let matchedSalesmenWithTarget = 0;

  allSalesmanIds.forEach(salesmanId => {
    const trg = targetMap.get(salesmanId);
    const aug = slsAugSales.get(salesmanId);
    const sep = slsSepSales.get(salesmanId);

    const hasTrg = Boolean(trg);
    const hasTx = Boolean((aug && aug.sales > 0) || (sep && sep.sales > 0));
    const slsName = trg?.salesmanName || sep?.name || aug?.name || salesmanId;

    if (hasTrg && hasTx) {
      matchedSalesmenWithTarget++;
      matchedSalesmen.push({
        salesmanId,
        salesmanName: slsName,
        area: trg?.area,
        targetValue: trg?.targetValue || 0,
        actualSalesSeptember: sep?.sales || 0,
        actualSalesAugust: aug?.sales || 0,
        hasTarget: true,
        hasTransactions: true,
      });
    } else if (hasTx && !hasTrg) {
      unmatchedSalesmenWithoutTarget.push(salesmanId);
      unmatchedSalesmen.push({
        salesmanId,
        salesmanName: slsName,
        source: 'in_transactions_no_target',
        actualSales: (sep?.sales || 0) + (aug?.sales || 0),
      });
    } else if (hasTrg && !hasTx) {
      targetSalesmenWithoutTransactions.push(salesmanId);
      unmatchedSalesmen.push({
        salesmanId,
        salesmanName: slsName,
        source: 'in_target_no_transactions',
        targetValue: trg?.targetValue || 0,
        area: trg?.area,
      });
    }
  });

  // 7. Missing Data Warnings
  const missingDataWarnings: string[] = [];
  if (transactionsWithoutMasterCount > 0) {
    missingDataWarnings.push(`Terdapat ${transactionsWithoutMasterCount} outlet transaksi yang tidak terdaftar di Master CB/ROA.`);
  }
  if (unmatchedSalesmenWithoutTarget.length > 0) {
    missingDataWarnings.push(`Terdapat ${unmatchedSalesmenWithoutTarget.length} salesman bertransaksi tetapi kodenya (KD_SLS) tidak ada di database Target.`);
  }
  if (dupPrev > 0 || dupCurr > 0) {
    missingDataWarnings.push(`Sistem berhasil memfilter ${dupPrev + dupCurr} data transaksi duplikat untuk mencegah double counting.`);
  }

  return {
    status: {
      totalMasterOutlets: masterOutletMap.size,
      activeMasterOutlets: activeMasterCount,
      inactiveMasterOutlets: inactiveMasterCount,
      matchedMasterOutletsWithTransactions: matchedMasterCount,
      unmatchedMasterOutlets: unmatchedMasterIds,
      transactionsWithoutMasterOutlet: transactionsWithoutMasterCount,
      totalSalesmenInTransactions: slsSepSales.size,
      matchedSalesmenWithTarget,
      unmatchedSalesmenWithoutTarget,
      targetSalesmenWithoutTransactions,
      duplicateTransactionsPrev: dupPrev,
      duplicateTransactionsCurr: dupCurr,
      missingDataWarnings,
    },
    matchedOutlets,
    unmatchedOutlets,
    matchedSalesmen,
    unmatchedSalesmen,
    duplicateDetails: [
      {
        period: 'Agustus 2026 (Bulan Lalu)',
        duplicateCount: dupPrev,
        dedupKeyRule: 'NO FAKTUR (Primary) / TGL+OUTLET+ITEM+VALUE (Fallback)',
        recordsProcessed: prevTransactions.length,
      },
      {
        period: 'September 2026 (Bulan Ini)',
        duplicateCount: dupCurr,
        dedupKeyRule: 'NO FAKTUR (Primary) / TGL+OUTLET+ITEM+VALUE (Fallback)',
        recordsProcessed: currTransactions.length,
      },
    ],
  };
}

export type ReconciliationDetail = DetailedReconciliationReport;
