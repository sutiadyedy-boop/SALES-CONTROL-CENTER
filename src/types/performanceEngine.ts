/**
 * ESM SALES CONTROL CENTER — PHASE 5: PERFORMANCE & LEARNING ENGINE TYPES
 * 
 * Strict FMCG Enterprise Constraints:
 * 1. Measures actual execution, outcomes, and value realization.
 * 2. Never mutates Phase 1 Decision Score, Risk Score, Priority Score, or Phase 4 Opportunity Score.
 * 3. Actual value comes strictly from actual transactions or user-confirmed outcomes.
 * 4. Minimum sample size >= 5 required before asserting effectiveness or high confidence.
 * 5. Learning signals serve as evidence, never self-modifying rules.
 */

import { OpportunityType } from './decisionEngine';
import { NextBestActionType } from './decisionEngine';

export type PerformanceStatus = 
  | 'PENDING' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'WON' 
  | 'LOST' 
  | 'DISMISSED';

export type PerformanceOutcome = 
  | 'WON' 
  | 'LOST' 
  | 'IN_PROGRESS' 
  | 'PENDING' 
  | 'DISMISSED';

export type EntityType = 'OUTLET' | 'SKU' | 'SALESMAN' | 'EC' | 'BRANCH' | 'FORECAST';

export interface PerformanceResult {
  actionId: string;
  decisionId?: string;
  opportunityId?: string;
  salesmanId?: string;
  salesmanName?: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  actionType: string;
  opportunityType?: OpportunityType;
  estimatedValue: number | null;
  actualValue: number | null;
  varianceValue: number | null;        // actualValue - estimatedValue (or null if either is null)
  achievementPercent: number | null;   // (actualValue / estimatedValue) * 100 (null if est <= 0 or either is null)
  status: PerformanceStatus;
  outcome?: PerformanceOutcome;
  completedAt?: string;
  sourcePeriod: string;
  attributionEvidence?: string[];
  notes?: string;
}

export type LearningSignalType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface LearningSignal {
  id: string;
  actionType: string;
  opportunityType?: OpportunityType;
  salesmanId?: string;
  salesmanName?: string;
  entityType: EntityType;
  signalType: LearningSignalType;
  positiveCount: number;
  negativeCount: number;
  totalCompleted: number;
  actualValue: number;
  winRate: number | null;              // percentage 0-100 or null if completed == 0
  realizationRate: number | null;      // percentage or null if estimated == 0
  confidence: number | null;           // 0-100 or null if sample < 5
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_SAMPLE' | 'N/A';
  period: string;
  evidence: string[];
  recommendationNotes?: string;
}

export interface PerformanceFunnel {
  decisionCount: number;
  opportunityCount: number;
  actionCount: number;
  inProgressCount: number;
  completedCount: number;
  wonCount: number;
  lostCount: number;
  actualValue: number;
}

export interface ActionTypePerformance {
  actionType: string;
  label: string;
  totalActions: number;
  completed: number;
  won: number;
  lost: number;
  actualValue: number;
  estimatedValue: number;
  completionRate: number | null;       // percentage 0-100 or null
  winRate: number | null;              // percentage 0-100 or null
  realizationRate: number | null;      // percentage or null
  sampleSufficiency: 'SUFFICIENT' | 'INSUFFICIENT';
}

export interface OpportunityTypePerformance {
  opportunityType: OpportunityType;
  label: string;
  totalOpportunities: number;
  actionsGenerated: number;
  completed: number;
  won: number;
  lost: number;
  actualValue: number;
  estimatedValue: number;
  winRate: number | null;
  realizationRate: number | null;
  sampleSufficiency: 'SUFFICIENT' | 'INSUFFICIENT';
}

export interface SalesmanExecutionPerformance {
  salesmanId: string;
  salesmanName: string;
  actionsAssigned: number;
  actionsCompleted: number;
  completionRate: number | null;
  won: number;
  lost: number;
  actualValue: number;
  estimatedOpportunity: number;
  realizationRate: number | null;
  opportunityWinRate: number | null;
  executionQualityLabel: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'INSUFFICIENT_DATA';
  sampleSufficiency: 'SUFFICIENT' | 'INSUFFICIENT';
}

export interface PerformanceExecutiveSummary {
  totalDecisions: number;
  totalOpportunities: number;
  totalActions: number;
  completedActions: number;
  wonOpportunities: number;
  lostOpportunities: number;
  actualOutcomeValue: number;
  estimatedOpportunityValue: number;
  opportunityAchievementPercent: number | null;
  actionCompletionRate: number | null;
  actionSuccessRate: number | null;
  opportunityWinRate: number | null;
  valueRealizationRate: number | null;
  learningConfidence: number | null;
  isDataSufficient: boolean;
  funnel: PerformanceFunnel;
  topEffectiveAction?: string | null;
  topOpportunityType?: string | null;
  topSalesman?: string | null;
  biggestNegativeSignal?: string | null;
  biggestRealizedValueItem?: { name: string; value: number } | null;
}

export interface ConfirmedOutcomeRecord {
  actionId: string;
  status: PerformanceStatus;
  outcome?: PerformanceOutcome;
  actualValue?: number;
  notes?: string;
  completedAt?: string;
  verifiedBy?: string;
}
