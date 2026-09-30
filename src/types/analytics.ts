export interface GlobalFilterState {
  period?: string;
  cabang?: string | string[];
  depo?: string | string[];
  area?: string | string[];
  rayon?: string | string[];
  salesmanId?: string | string[];
  channel?: string | string[];
  fc?: string | string[];
  pma?: string | string[];
  searchQuery?: string;
}

export interface ControlTowerKPIs {
  totalTarget: number;
  totalActualCurrent: number;
  totalActualPrevious: number;
  achievementRate: number | null; // percentage e.g. 94.5% or null if target 0/missing
  gapValue: number; // Actual - Target
  growthRate: number | null; // percentage e.g. +12.4% or null if prev 0
  growthStatus: 'POSITIVE' | 'NEGATIVE' | 'NEW_SALES' | 'NO_DATA';
  
  // RO KPIs
  totalActiveOutlets: number;
  outletsTransactedCurrent: number;
  outletsNotTransactedCurrent: number;
  repeatOrderRate: number | null; // percentage (Transacted / Active * 100) or null if active 0
  
  // Drop & New
  dropOutletCount: number;
  dropOutletLostRevenue: number;
  newActiveOutletCount: number;
  newActiveOutletRevenue: number;
}

export interface SalesmanPerformanceItem {
  rank: number;
  salesmanId: string;
  salesmanName: string;
  area?: string;
  rayon?: string;
  target: number;
  actualCurrent: number;
  actualPrevious: number;
  achievementRate: number | null; // null if target == 0 or target not found
  gap: number;
  growthRate: number | null;
  growthStatus: 'POSITIVE' | 'NEGATIVE' | 'NEW_SALES' | 'NO_DATA';
  targetStatus: 'ACHIEVED' | 'UNDER' | 'TARGET_NOT_FOUND';
  
  // RO metrics per salesman
  totalMasterOutlets: number;
  activeOutlets: number;
  transactingOutlets: number;
  nonTransactingOutlets: number;
  roRate: number | null;
  dropOutletsCount: number;
  newOutletsCount: number;
}

export interface DropOutletItem {
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  area?: string;
  rayon?: string;
  channel?: string;
  salesPrevious: number;
  salesCurrent: number; // 0
  lastTransactionDate?: string;
  status: 'DROP_OUTLET';
}

export interface NewOutletItem {
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  area?: string;
  rayon?: string;
  channel?: string;
  salesPrevious: number; // 0
  salesCurrent: number;
  status: 'NEW_ACTIVE';
}

export interface NonTransactingOutletItem {
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  area?: string;
  rayon?: string;
  channel?: string;
  fc?: string;
  pma?: string;
  cabang?: string;
  depo?: string;
  salesPrevious: number;
  salesCurrent: number; // 0
  status: 'BELUM_TRANSAKSI';
}

export type InsightClassification = 'PRIORITY' | 'ATTENTION' | 'OPPORTUNITY';

export type InsightCategory = 
  | 'ACHIEVEMENT' 
  | 'GROWTH' 
  | 'GAP_TARGET' 
  | 'RO' 
  | 'DROP_OUTLET' 
  | 'NEW_OUTLET' 
  | 'SALESMAN';

export interface OpportunityItem {
  id: string;
  category: 'OUTLET_BELUM_TRANSAKSI' | 'DROP_OUTLET' | 'HIGH_TARGET_GAP' | 'LOW_ACHIEVEMENT' | 'LOW_RO_AREA' | 'NEW_OUTLET_EXPANSION';
  classification: InsightClassification;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  entityName: string;
  identifier: string;
  impactValue: number; // Strictly computed from actual data numbers
  detailText: string;
  actionRecommendation: string;
  assignedSalesman?: string;
  area?: string;
  thresholdContext?: string;
}

export interface SmartInsightItem {
  id: string;
  category: InsightCategory;
  classification: InsightClassification;
  type?: 'achievement' | 'growth' | 'ro' | 'drop' | 'new_outlet' | 'anomaly'; // backward compatibility
  level?: 'critical' | 'warning' | 'positive' | 'info';
  headline: string;
  narrative: string;
  dataPoints: { label: string; value: string | number }[];
  recommendation?: string;
  thresholdContext?: string;
}

export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ActionItem {
  id: string;
  title: string;
  category: InsightCategory;
  classification: InsightClassification;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  targetEntity: string;
  identifier: string;
  assignedPic: string;
  area?: string;
  impactValue: number;
  status: ActionStatus;
  recommendedAction: string;
  notes?: string[];
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ActionMonitoringSummary {
  totalActions: number;
  priorityCount: number;
  attentionCount: number;
  opportunityCount: number;
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  totalImpactValue: number;
  resolvedImpactValue: number;
}

export interface FilterOptions {
  cabangs: string[];
  depos: string[];
  areas: string[];
  rayons: string[];
  salesmen: { id: string; name: string }[];
  channels: string[];
  fcs: string[];
  pmas: string[];
}

export interface CalculationResult {
  kpis: ControlTowerKPIs;
  salesmanPerformances: SalesmanPerformanceItem[];
  dropOutlets: DropOutletItem[];
  newOutlets: NewOutletItem[];
  outletsNotTransacted: NonTransactingOutletItem[];
  outletRoSummary: {
    totalMasterOutlets: number;
    activeOutlets: number;
    inactiveOutlets: number;
    transactingActiveOutlets: number;
    nonTransactingActiveOutlets: number;
    repeatOrderRate: number | null;
  };
  channelBreakdown: { channel: string; activeOutlets: number; transactedOutlets: number; sales: number; roRate: number | null }[];
  rayonBreakdown: { rayon: string; activeOutlets: number; transactedOutlets: number; sales: number; roRate: number | null }[];
  areaBreakdown: { area: string; activeOutlets: number; transactedOutlets: number; sales: number; roRate: number | null }[];
  pmaBreakdown: { pma: string; activeOutlets: number; transactedOutlets: number; sales: number; roRate: number | null }[];
}

