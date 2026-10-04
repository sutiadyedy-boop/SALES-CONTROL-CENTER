import { 
  ActionItem, 
  ActionMonitoringSummary, 
  ActionStatus, 
  CalculationResult, 
  OpportunityItem, 
  SmartInsightItem,
  InsightClassification
} from '../types/analytics';
import { 
  NextBestAction, 
  NextBestActionStatus, 
  NextBestActionOutcome,
  DecisionPriority
} from '../types/decisionEngine';
export {
  synthesizeNextBestActions,
  filterActionsByUserRole,
  getTopActionsPerSalesman,
  computeNextBestActionSummary,
  computeNextBestActionFunnel,
  loadPersistedNbaStates,
  savePersistedNbaStates,
  NBA_STORAGE_KEY
} from './nextBestActionEngine';

const ACTION_STORAGE_KEY = 'spm_action_monitoring_v1';

export function loadPersistedActionState(): Record<string, { status: ActionStatus; notes: string[]; completedAt?: string }> {
  try {
    const raw = localStorage.getItem(ACTION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load action states', e);
  }
  return {};
}

export function savePersistedActionState(state: Record<string, { status: ActionStatus; notes: string[]; completedAt?: string }>): void {
  try {
    localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save action states', e);
  }
}

export function generateActionItems(
  insights: SmartInsightItem[],
  opportunities: OpportunityItem[],
  calc: CalculationResult,
  persistedState: Record<string, { status: ActionStatus; notes: string[]; completedAt?: string }> = {}
): ActionItem[] {
  const actions: ActionItem[] = [];

  // 1. Actions from Drop Outlets (Critical & High Impact)
  calc.dropOutlets.slice(0, 8).forEach((d) => {
    const id = `act-drop-${d.outletId}`;
    const saved = persistedState[id];
    const isPriority = d.salesPrevious >= 10000000;

    actions.push({
      id,
      title: `Reaktivasi Kunjungan Darurat Outlet: ${d.outletName}`,
      category: 'DROP_OUTLET',
      classification: isPriority ? 'PRIORITY' : 'ATTENTION',
      urgency: isPriority ? 'HIGH' : 'MEDIUM',
      targetEntity: d.outletName,
      identifier: d.outletId,
      assignedPic: d.salesmanName || 'Supervisor Area',
      area: d.area,
      impactValue: d.salesPrevious,
      status: saved?.status || 'OPEN',
      recommendedAction: `Hubungi pemilik toko ${d.outletName}, periksa status stok di toko, tanyakan kendala pasokan, dan tawarkan reorder paket stimulus.`,
      notes: saved?.notes || [],
      dueDate: 'Akhir Pekan Berjalan',
      createdAt: '2026-09-01T08:00:00Z',
      completedAt: saved?.completedAt,
    });
  });

  // 2. Actions from Salesman with High Gap Deficit
  calc.salesmanPerformances
    .filter(s => s.gap < 0 && s.target > 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 5)
    .forEach((s) => {
      const id = `act-gap-${s.salesmanId}`;
      const saved = persistedState[id];
      const shortage = Math.abs(s.gap);
      const isPriority = shortage >= 30000000;

      actions.push({
        id,
        title: `Pendampingan Lapangan & Tutup Gap Salesman: ${s.salesmanName}`,
        category: 'SALESMAN',
        classification: isPriority ? 'PRIORITY' : 'ATTENTION',
        urgency: isPriority ? 'HIGH' : 'MEDIUM',
        targetEntity: s.salesmanName,
        identifier: s.salesmanId,
        assignedPic: `Area Supervisor (${s.area || 'Regional'})`,
        area: s.area,
        impactValue: shortage,
        status: saved?.status || 'OPEN',
        recommendedAction: `Dampingi rute harian salesman ${s.salesmanName}. Fokuskan penawaran pada 10 outlet pareto dan dorong ${s.nonTransactingOutlets} outlet yang belum order.`,
        notes: saved?.notes || [],
        dueDate: 'H+3 Review Mingguan',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: saved?.completedAt,
      });
    });

  // 3. Actions from Untransacted Active Outlets (RO Penetration)
  if (calc.outletsNotTransacted.length > 0) {
    // Group untransacted by area / salesman for targeted actions
    const unboughtByArea = new Map<string, number>();
    calc.outletsNotTransacted.forEach(o => {
      const k = o.area || 'AREA-LAIN';
      unboughtByArea.set(k, (unboughtByArea.get(k) || 0) + 1);
    });

    unboughtByArea.forEach((count, areaName) => {
      const id = `act-roa-area-${areaName}`;
      const saved = persistedState[id];
      const avgBasket = calc.kpis.outletsTransactedCurrent > 0 
        ? Math.round(calc.kpis.totalActualCurrent / calc.kpis.outletsTransactedCurrent) 
        : 1500000;
      const estValue = count * avgBasket;
      const isPriority = count >= 10;

      actions.push({
        id,
        title: `Canvassing Serentak ${count} Toko Belum Transaksi di Area ${areaName}`,
        category: 'RO',
        classification: isPriority ? 'PRIORITY' : 'ATTENTION',
        urgency: isPriority ? 'HIGH' : 'MEDIUM',
        targetEntity: `Area ${areaName} (${count} Toko Pasif)`,
        identifier: `ROA-${areaName}`,
        assignedPic: `Koordinator Canvasser Area ${areaName}`,
        area: areaName,
        impactValue: estValue,
        status: saved?.status || 'OPEN',
        recommendedAction: `Sebarkan list toko aktif ROA yang belum order ke salesman area ${areaName}. Berikan target aktivasi minimal 70% sebelum penutupan buku.`,
        notes: saved?.notes || [],
        dueDate: 'H+5 Monitoring ROA',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: saved?.completedAt,
      });
    });
  }

  // 4. Actions from New Active Outlets (Retention & Expansion Opportunity)
  if (calc.newOutlets.length > 0) {
    calc.newOutlets.slice(0, 4).forEach((n) => {
      const id = `act-new-${n.outletId}`;
      const saved = persistedState[id];

      actions.push({
        id,
        title: `Program Retensi & Order Kedua Outlet Baru: ${n.outletName}`,
        category: 'NEW_OUTLET',
        classification: 'OPPORTUNITY',
        urgency: 'MEDIUM',
        targetEntity: n.outletName,
        identifier: n.outletId,
        assignedPic: n.salesmanName || 'Salesman Terkait',
        area: n.area,
        impactValue: n.salesCurrent,
        status: saved?.status || 'OPEN',
        recommendedAction: `Kunjungi outlet ${n.outletName} dalam waktu 7 hari setelah pengiriman pesanan pertama. Pastikan produk telah ter-display dan perkenalkan program insentif repeat order.`,
        notes: saved?.notes || [],
        dueDate: '7 Hari Pasca Pengiriman',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: saved?.completedAt,
      });
    });
  }

  // 5. Actions from Low RO Areas
  calc.areaBreakdown
    .filter(a => a.activeOutlets > 3 && a.roRate !== null && a.roRate < 60)
    .forEach((a) => {
      const id = `act-low-ro-${a.area}`;
      const saved = persistedState[id];
      const untransacted = a.activeOutlets - a.transactedOutlets;
      const avgBasket = calc.kpis.outletsTransactedCurrent > 0 
        ? Math.round(calc.kpis.totalActualCurrent / calc.kpis.outletsTransactedCurrent) 
        : 1500000;
      const isPriority = (a.roRate || 0) < 40;

      actions.push({
        id,
        title: `Penyelarasan Rute & Logistik Penetrasi RO Rendah Area ${a.area} (${a.roRate?.toFixed(1)}%)`,
        category: 'RO',
        classification: isPriority ? 'PRIORITY' : 'ATTENTION',
        urgency: isPriority ? 'HIGH' : 'MEDIUM',
        targetEntity: `Area ${a.area}`,
        identifier: a.area,
        assignedPic: `Kepala Depo & Supervisor ${a.area}`,
        area: a.area,
        impactValue: untransacted * avgBasket,
        status: saved?.status || 'OPEN',
        recommendedAction: `Evaluasi jadwal hari kunjungan (Call Plan) dan pastikan ketersediaan armada pengiriman ke ${a.area} beroperasi tepat waktu.`,
        notes: saved?.notes || [],
        dueDate: 'Akhir Bulan Berjalan',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: saved?.completedAt,
      });
    });

  // Sort: PRIORITY first, then by impactValue descending
  const order: Record<InsightClassification, number> = { PRIORITY: 1, ATTENTION: 2, OPPORTUNITY: 3 };
  return actions.sort((a, b) => {
    if (order[a.classification] !== order[b.classification]) {
      return order[a.classification] - order[b.classification];
    }
    return b.impactValue - a.impactValue;
  });
}

export function computeActionMonitoringSummary(actions: ActionItem[]): ActionMonitoringSummary {
  let priorityCount = 0;
  let attentionCount = 0;
  let opportunityCount = 0;
  let openCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let totalImpactValue = 0;
  let resolvedImpactValue = 0;

  actions.forEach(a => {
    if (a.classification === 'PRIORITY') priorityCount++;
    else if (a.classification === 'ATTENTION') attentionCount++;
    else if (a.classification === 'OPPORTUNITY') opportunityCount++;

    if (a.status === 'OPEN') openCount++;
    else if (a.status === 'IN_PROGRESS') inProgressCount++;
    else if (a.status === 'COMPLETED') {
      completedCount++;
      resolvedImpactValue += a.impactValue;
    }

    totalImpactValue += a.impactValue;
  });

  return {
    totalActions: actions.length,
    priorityCount,
    attentionCount,
    opportunityCount,
    openCount,
    inProgressCount,
    completedCount,
    totalImpactValue,
    resolvedImpactValue,
  };
}

/**
 * Bridges Phase 3 NextBestAction with Phase 1 ActionItem for unified monitoring
 */
export function convertNbaToActionItem(nba: NextBestAction): ActionItem {
  const mapClassification = (priority: DecisionPriority): InsightClassification => {
    if (priority === 'CRITICAL' || priority === 'HIGH') return 'PRIORITY';
    if (priority === 'MEDIUM') return 'ATTENTION';
    return 'OPPORTUNITY';
  };

  const mapStatus = (status: NextBestActionStatus): ActionStatus => {
    if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (status === 'COMPLETED') return 'COMPLETED';
    return 'OPEN';
  };

  return {
    id: nba.id,
    title: nba.actionTitle,
    category: nba.actionType.includes('OUTLET') ? 'DROP_OUTLET' : nba.actionType.includes('SKU') ? 'SALESMAN' : 'RO',
    classification: mapClassification(nba.priority),
    urgency: nba.priority === 'CRITICAL' || nba.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
    targetEntity: nba.entityName,
    identifier: nba.entityId,
    assignedPic: nba.salesmanName || 'Supervisor Area',
    area: nba.area,
    impactValue: nba.expectedRevenueReference || 0,
    status: mapStatus(nba.status),
    recommendedAction: nba.actionDescription,
    notes: nba.outcome?.notes ? [nba.outcome.notes] : [],
    dueDate: nba.when,
    createdAt: nba.createdAt,
    completedAt: nba.outcome?.completedAt,
  };
}
