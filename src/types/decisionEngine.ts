/**
 * ESM CONTROL TOWER — AI DECISION ENGINE CORE TYPES & CONTRACTS
 * 
 * Architectural Principles:
 * - Deterministic, auditable, and traceable to source data.
 * - Single source of truth: Calculation Engine (Sales Value = SUM(VALUE), EC = DISTINCT COUNT(outletId)).
 * - Five Operational Decision Focus areas (Phase 1 Actuals): Salesman, Outlet, SKU, Mark New/Eceran, EC.
 * - Anti-hallucination: No random scores, no LLM calls for computing math or KPIs.
 * - Forecast Closing is disabled in Phase 1 (Actual Performance Only).
 */

import { ControlTowerKPIs, SmartInsightItem, OpportunityItem, SalesmanPerformanceItem, DropOutletItem, NewOutletItem } from './analytics';

export type DecisionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MONITOR';

export type DecisionCategory = 
  | 'REVENUE_GAP'
  | 'DROP_OUTLET_RECOVERY'
  | 'RO_PENETRATION'
  | 'SALESMAN_PRODUCTIVITY'
  | 'DISTRIBUTION_COVERAGE'
  | 'TARGET_EXECUTION'
  | 'SKU_OPPORTUNITY'
  | 'MARK_NEW_OPPORTUNITY'
  | 'EC_RISK'
  | 'FORECAST_RISK'; // deprecated in Phase 1 patch

export type EntityType = 'SALESMAN' | 'OUTLET' | 'SKU' | 'MARK_NEW' | 'EC' | 'BRANCH' | 'FORECAST';

export type RiskStatus = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OutletClassificationType = 'NEW' | 'REPEAT' | 'DROP' | 'ACTIVE';

export type SkuClassificationType = 'WINNER' | 'DECLINING' | 'UNDER_PENETRATED' | 'CROSS_SELL_OPPORTUNITY';

export interface WorkingDaysConfig {
  workingDaysTotal: number;
  workingDaysElapsed: number;
  workingDaysRemaining: number;
}

export interface SalesSummaryAggregate {
  totalTarget: number;
  currentValue: number;
  previousValue: number;
  gap: number;
  achievementRate: number | null;
  growthRate: number | null;
}

export interface EcSummaryAggregate {
  ecCurrent: number;
  ecPrevious: number;
  ecGrowth: number | null;
  newEc: number;
  lostEc: number;
  repeatEc: number;
}

export interface OutletSummaryAggregate {
  totalActiveOutlets: number;
  transactedOutlets: number;
  untransactedOutlets: number;
  repeatOrderRate: number | null;
  dropOutletsCount: number;
  dropOutletsLostRevenue: number;
  newOutletsCount: number;
  newOutletsRevenue: number;
}

export interface SkuItemAggregate {
  skuCode: string;
  skuName: string;
  currentValue: number;
  previousValue: number;
  currentQty: number;
  previousQty: number;
  ecCount: number;
  growthRate: number | null;
  contributionPct: number;
  penetrationPct: number;
  classification: SkuClassificationType;
}

export interface SkuSummaryAggregate {
  totalSkus: number;
  activeSkus: number;
  winnerCount: number;
  decliningCount: number;
  underPenetratedCount: number;
  crossSellCount: number;
  items: SkuItemAggregate[];
}

export interface MarkNewItemAggregate {
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  skuCode: string;
  skuName: string;
  value: number;
  qty: number;
}

export interface MarkNewSummaryAggregate {
  markNewValue: number;
  markNewEc: number;
  markNewGrowth: number | null;
  markNewContributionPct: number;
  markNewSkuCount: number;
  crossSellOpportunitiesCount: number;
  items: MarkNewItemAggregate[];
}

export interface ForecastSummaryAggregate {
  workingDaysTotal: number;
  workingDaysElapsed: number;
  workingDaysRemaining: number;
  currentValue: number;
  targetValue: number;
  dailyRunRate: number;
  forecastEOM: number;
  forecastGap: number;
  forecastAchievement: number | null;
  requiredDailyRunRate: number;
  riskStatus: RiskStatus;
}

export interface SalesmanDecisionItem {
  salesmanId: string;
  salesmanName: string;
  area?: string;
  target: number;
  actualValue: number;
  previousValue: number;
  achievementRate: number | null;
  gap: number;
  growthRate: number | null;
  ecCurrent: number;
  ecPrevious: number;
  ecGrowth: number | null;
  dropOutletCount: number;
  newOutletCount: number;
  markNewValue: number;
  forecastEOM?: number; // optional / deprecated in Phase 1 patch
  forecastAchievement?: number | null; // optional / deprecated in Phase 1 patch
  riskScore: number;
  opportunityScore: number;
  priorityScore: number;
}

export interface OutletRecoveryItem {
  outletId: string;
  outletName: string;
  salesmanId: string;
  salesmanName: string;
  area?: string;
  rayon?: string;
  historicalValue: number;
  lastPeriodValue: number;
  currentValue: number;
  orderFrequency: number;
  currentStatus: OutletClassificationType;
  skuPotentialScore: number;
  markNewPotentialScore: number;
  urgencyScore: number;
  recoveryScore: number; // 0-100 normalized
  recommendedAction: string;
}

/**
 * Root Cause Analysis Contract (WHAT, WHY, IMPACT, ACTION, EXPECTED IMPACT)
 */
export interface DecisionRootCause {
  what: string;
  why: string;
  impact: string;
  action: string;
  expectedImpact: string;
}

/**
 * DecisionResult — Structured Diagnostic & Actionable Output Contract
 */
export interface DecisionResult {
  id: string;
  category: DecisionCategory;
  entityType: EntityType;
  entityId: string;
  entityName: string;

  priorityScore: number; // 0-100
  riskScore: number;     // 0-100
  opportunityScore: number; // 0-100

  status: DecisionPriority; // CRITICAL | HIGH | MEDIUM | LOW | MONITOR
  riskStatus: RiskStatus;

  // Root Cause 5-pillar structure
  what: string;
  why: string;
  impact: string;
  recommendedAction: string;
  expectedImpact: string;

  rootCauseStructure?: DecisionRootCause;

  // Evidence & Traceability
  evidence: string[];
  confidence: number; // 0.00 to 1.00
  sourcePeriod: string;

  // Action Center linkage
  linkedActionId?: string;
  actionStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';

  targetOutletId?: string;
  targetOutletName?: string;
  assignedSalesmanId?: string;
  assignedSalesmanName?: string;
  expectedRevenueLift?: number;

  generatedAt: string;
  engineVersion: string;
}

/**
 * Comprehensive Decision Context Aggregate
 */
export interface DecisionContext {
  period: string;
  previousPeriod: string;
  cabang?: string;
  depo?: string;
  area?: string;
  rayon?: string;
  salesmanId?: string;
  salesmanName?: string;
  channel?: string;

  // Configured Working Days (optional analytics metadata, not used for Forecast)
  workingDaysConfig?: WorkingDaysConfig;

  // Aggregated Modules
  salesSummary: SalesSummaryAggregate;
  ecSummary: EcSummaryAggregate;
  outletSummary: OutletSummaryAggregate;
  skuSummary: SkuSummaryAggregate;
  markNewSummary: MarkNewSummaryAggregate;
  forecastSummary?: ForecastSummaryAggregate; // optional / deprecated in Phase 1 patch

  // Detailed breakdowns
  salesmanDecisions: SalesmanDecisionItem[];
  outletRecoveryList: OutletRecoveryItem[];

  // Existing engine passthroughs
  existingInsights?: SmartInsightItem[];
  existingOpportunities?: OpportunityItem[];
  actionStatus?: {
    totalActions: number;
    openCount: number;
    inProgressCount: number;
    resolvedCount: number;
    criticalPendingCount: number;
  };

  snapshotTimestamp: string;
}

/**
 * Decision Engine Diagnostic / Audit Summary
 */
export interface DecisionEngineAuditReport {
  timestamp: string;
  engineVersion: string;
  inputRawRecords: {
    previousRows: number;
    currentRows: number;
    targetRows: number;
    masterRows: number;
  };
  aggregatedRecords: {
    totalSalesmen: number;
    totalMasterOutlets: number;
    activeCurrentEc: number;
    totalDropOutlets: number;
    totalNewOutlets: number;
    totalSkus: number;
    markNewRecords: number;
  };
  decisionCounts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    monitor: number;
  };
  opportunityCount: number;
  forecastStatus?: string; // optional / deprecated
  invalidRecordsCount: number;
  skippedRecordsCount: number;
  auditTraceabilityPassed: boolean;
}

/**
 * Extension Point Contract for Decision Engine
 */
export interface IDecisionEngineExtensionPoint {
  readonly version: string;
  readonly isAiEnabled: boolean; // strictly false in Phase 1 (deterministic)
  
  synthesizeDecisions(context: DecisionContext): DecisionResult[];
  getAuditReport(context: DecisionContext, decisions: DecisionResult[]): DecisionEngineAuditReport;
}

// ============================================================
// PHASE 2: EVIDENCE PACKAGE & AI EXPLANATION CONTRACTS
// ============================================================

/**
 * EvidencePackage — Standardized Read-Only Payload for Gemini
 * Contains only aggregated, deterministic facts from Decision Engine
 */
export interface EvidencePackage {
  decisionId: string;
  category: DecisionCategory;
  entityType: EntityType;
  entityId: string;
  entityName: string;

  priorityScore: number; // 0-100
  riskScore: number;     // 0-100
  opportunityScore: number; // 0-100

  status: DecisionPriority;
  riskStatus: RiskStatus;

  what: string;
  why: string;
  impact: string;
  recommendedAction: string;
  expectedImpact: string;

  evidence: string[];
  sourcePeriod: string;
  confidence: number;

  metrics?: {
    target?: number;
    currentValue?: number;
    previousValue?: number;
    gap?: number;
    growthRate?: number | null;
    achievementRate?: number | null;
    ecCurrent?: number;
    ecPrevious?: number;
    ecGrowth?: number | null;
    outletStatus?: string;
    salesmanId?: string;
    salesmanName?: string;
    expectedRevenueLift?: number;
  };
}

/**
 * AiExplanationResult — Structured 8-Pillar Narrative Schema
 * Must distinguish between Factual Evidence and Logical Inferences
 */
export interface AiExplanationResult {
  summary: string;
  whatHappened: string;
  why: string;
  businessImpact: string;
  recommendedAction: string;
  expectedOutcome: string;
  confidence: string;
  limitations: string;
  distinction: {
    facts: string[];
    inferences: string[];
  };
  generatedAt: string;
  cached?: boolean;
  modelUsed?: string;
}

/**
 * AiExecutiveInsight — High-Level Management Summary over Entire Active Dataset
 */
export interface AiExecutiveInsight {
  period: string;
  cabang: string;
  performanceSummary: string;
  attentionSummary: string;
  riskSummary: string;
  opportunitySummary: string;
  topPrioritySummary: string;
  topRecommendedActions: string[];
  distinction: {
    facts: string[];
    inferences: string[];
  };
  generatedAt: string;
  cached?: boolean;
}

/**
 * DecisionChatMessage — Q&A for "Ask About This Decision"
 */
export interface DecisionChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citedFacts?: string[];
}

// ============================================================
// PHASE 3: NEXT BEST ACTION (NBA) CONTRACTS
// ============================================================

export type NextBestActionType =
  | 'REACTIVATE_OUTLET'
  | 'INCREASE_OUTLET_COVERAGE'
  | 'CROSS_SELL_SKU'
  | 'PUSH_MARK_NEW'
  | 'IMPROVE_EC'
  | 'PROTECT_EXISTING_OUTLET'
  | 'REVIEW_SKU_PERFORMANCE'
  | 'FOLLOW_UP_HIGH_VALUE_OUTLET'
  | 'FOLLOW_UP_HIGH_PRIORITY_SALESMAN'
  | 'MONITOR';

export type NextBestActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';

export interface NextBestActionOutcome {
  actionId: string;
  status: NextBestActionStatus;
  completedAt: string;
  result?: string;
  notes?: string;
  actualValue?: number;
}

export interface NextBestAction {
  id: string;
  decisionId: string;
  priority: DecisionPriority; // CRITICAL | HIGH | MEDIUM | LOW | MONITOR
  priorityScore: number;      // 0 - 100
  riskScore?: number;
  opportunityScore?: number;

  entityType: EntityType;
  entityId: string;
  entityName: string;

  salesmanId?: string;
  salesmanName?: string;
  area?: string;

  actionType: NextBestActionType;
  actionTitle: string;
  actionDescription: string;

  // 5W + 1H Structure:
  who: string;          // Salesman / PIC PIC
  what: string;         // Operational action required
  where: string;        // Outlet / Area / Location
  why: string;          // Root cause justifying action
  when: string;         // Timing / Route priority

  reason: string;
  evidence: string[];
  expectedImpact: string;
  expectedRevenueReference?: number; // Historical/benchmark value
  confidence: number;

  sourcePeriod: string;
  status: NextBestActionStatus;

  outcome?: NextBestActionOutcome;

  createdAt: string;
  updatedAt: string;
}

export interface NextBestActionFunnel {
  decisionsTotal: number;
  actionsTotal: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  outcomeCount: number;
  positiveOutcomesCount: number;
}

export interface NextBestActionSummary {
  totalActions: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  dismissedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  monitorCount: number;
  totalExpectedImpact: number;
  totalActualImpact: number;
  completionRate: number;      // percentage 0-100
  successRate: number | null;  // null if completed < 3
  bySalesman: Record<string, number>;
  byActionType: Record<NextBestActionType, number>;
}

// ============================================================
// PHASE 4: OPPORTUNITY INTELLIGENCE CONTRACTS
// ============================================================

export type OpportunityType =
  | 'OUTLET_RECOVERY'
  | 'SKU_CROSS_SELL'
  | 'MARK_NEW_CROSS_SELL'
  | 'EC_EXPANSION'
  | 'OUTLET_DEVELOPMENT'
  | 'SKU_PENETRATION'
  | 'SALESMAN_OPPORTUNITY'
  | 'REPEAT_OUTLET_GROWTH';

export type OpportunityStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'ACTIONED'
  | 'IN_PROGRESS'
  | 'WON'
  | 'LOST'
  | 'EXPIRED'
  | 'MONITOR';

export interface OpportunityOutcome {
  actualValue?: number;
  wonAt?: string;
  notes?: string;
  result?: string;
}

export interface OpportunityResult {
  id: string;
  opportunityType: OpportunityType;
  entityType: EntityType;
  entityId: string;
  entityName: string;

  salesmanId?: string;
  salesmanName?: string;
  area?: string;

  currentValue: number;
  previousValue: number;
  opportunityValue: number | null; // Estimated Opportunity Value based on transaction evidence
  opportunityScore: number;        // 0–100
  priorityScore: number;           // 0–100
  confidence: number;              // 0–100

  reason: string;
  evidence: string[];
  recommendedAction: string;
  sourcePeriod: string;
  status: OpportunityStatus;

  // Auditability & Traceability (Phase 4.1 Requirement)
  valueSource: string;
  valueEvidence: string;
  valueCalculation: string;

  // Cross-sell & Penetration metadata
  complementarySku?: string;
  targetSku?: string;
  currentPenetrationRate?: number;

  // Linkage to Phase 1 & Phase 3
  linkedDecisionId?: string;
  linkedNbaId?: string;

  outcome?: OpportunityOutcome;

  createdAt: string;
  updatedAt: string;
}

export interface OpportunitySummary {
  totalOpportunities: number;
  totalOpportunityValue: number; // Sum of estimated opportunity values
  averageConfidence: number;
  highPriorityCount: number;
  outletRecoveryCount: number;
  skuCrossSellCount: number;
  markNewCount: number;
  ecExpansionCount: number;
  outletDevelopmentCount: number;
  skuPenetrationCount: number;
  salesmanOpportunityCount: number;
  repeatGrowthCount: number;
  qualifiedCount: number;
  actionedCount: number;
  wonCount: number;
  lostCount: number;
  totalWonValue: number;
  isSalesmanTargetLinked: boolean;
  bySalesman: Record<string, { count: number; value: number }>;
  byOpportunityType: Record<OpportunityType, { count: number; value: number }>;
}

