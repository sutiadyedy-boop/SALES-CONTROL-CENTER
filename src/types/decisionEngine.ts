/**
 * ESM CONTROL TOWER — DECISION ENGINE EXTENSION POINT (PHASE 1 ARCHITECTURE PREPARATION)
 * 
 * IMPORTANT ARCHITECTURAL PRINCIPLE:
 * This file defines the contract and data structures for the future AI Decision Engine (Phase 2+).
 * In Phase 1, NO AI models (Gemini API), forecasting, or automated decision logic are executed.
 * Existing engines (Calculation Engine, Smart Insights, Opportunity Radar, Action Monitoring)
 * remain the strict SOURCE OF TRUTH.
 */

import { ControlTowerKPIs, SmartInsightItem, OpportunityItem } from './analytics';

export type DecisionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DecisionCategory = 
  | 'REVENUE_GAP'
  | 'DROP_OUTLET_RECOVERY'
  | 'RO_PENETRATION'
  | 'SALESMAN_PRODUCTIVITY'
  | 'DISTRIBUTION_COVERAGE'
  | 'TARGET_EXECUTION';

/**
 * DecisionContext — Aggregated Operational Snapshot
 * Receives consolidated data from:
 * 1. Calculation Engine (Source of Truth)
 * 2. Smart Insight Engine (7 Diagnostic Domains)
 * 3. Opportunity Radar (Whitespace & Upsell Targets)
 * 4. Action Monitoring (Execution Tracking & Status)
 */
export interface DecisionContext {
  // Dimension filters & context
  period: string;
  cabang?: string;
  depo?: string;
  area?: string;
  rayon?: string;
  salesmanId?: string;
  salesmanName?: string;
  channel?: string;

  // Source of Truth Financial & Operational Metrics (from Calculation Engine)
  target: number;
  actual: number;
  achievement: number | null; // percentage e.g. 85 (%)
  gap: number; // actual - target e.g. -150000000
  growth: number | null; // percentage vs previous month e.g. +12.5 (%)
  
  // Outlet Velocity & Dynamics
  activeOutlets: number;
  dropOutlets: number;
  newActiveOutlets: number;
  repeatOrderRate: number | null; // (%)

  // Aggregated Diagnostic Insights & Radar (Inputs from existing engines)
  smartInsights?: SmartInsightItem[];
  opportunities?: OpportunityItem[];
  
  // Action status summary (from Action Monitoring Service)
  actionStatus?: {
    totalActions: number;
    openCount: number;
    inProgressCount: number;
    resolvedCount: number;
    criticalPendingCount: number;
  };

  // Timestamp of snapshot generation
  snapshotTimestamp: string;
}

/**
 * DecisionResult — Structured Diagnostic & Actionable Recommendation
 * Output structure designed for future Decision Intelligence Layer
 */
export interface DecisionResult {
  id: string;
  category: DecisionCategory;
  priority: DecisionPriority;
  
  // Diagnostic analysis
  rootCause: string;
  explanation: string;
  
  // Prescription / Actionable recommendation
  recommendedAction: string;
  targetOutlet?: string;
  targetOutletId?: string;
  assignedSalesmanId?: string;
  
  // Impact & Validation
  expectedImpact: string;
  expectedRevenueLift?: number;
  evidence: string[];
  confidence: number; // 0.00 to 1.00
  
  // Metadata & Action Linkage
  linkedActionId?: string;
  generatedAt: string;
  engineVersion: string;
}

/**
 * Extension Point Contract for Decision Engine
 * In Phase 1, any implementation returns a passthrough or empty array.
 * Phase 2 will implement the intelligent synthesis pipeline.
 */
export interface IDecisionEngineExtensionPoint {
  readonly version: string;
  readonly isAiEnabled: boolean; // strictly false in Phase 1
  
  /**
   * Synthesize context into prioritized strategic recommendations
   */
  synthesizeDecisions(context: DecisionContext): Promise<DecisionResult[]> | DecisionResult[];
}

/**
 * Phase 1 Safe Extension Point Stub (No AI, No Gemini API)
 */
export const Phase1DecisionEngineStub: IDecisionEngineExtensionPoint = {
  version: '1.0.0-phase1-architecture-prep',
  isAiEnabled: false,
  synthesizeDecisions: (_context: DecisionContext): DecisionResult[] => {
    // Pure architecture extension point — returns empty in Phase 1
    return [];
  },
};
