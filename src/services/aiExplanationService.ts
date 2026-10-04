/**
 * ESM SALES CONTROL CENTER — CLIENT-SIDE AI EXPLANATION SERVICE
 * 
 * Provides:
 * 1. createEvidencePackage: Transforms DecisionResult & DecisionContext into a clean, read-only payload.
 * 2. fetchAiExplanation: Queries /api/ai/explain-decision with client caching & graceful fallback.
 * 3. fetchAiExecutiveInsight: Queries /api/ai/executive-insight for management overview.
 * 4. askAiAboutDecision: Queries /api/ai/chat-decision for grounded Q&A.
 */

import { 
  DecisionResult, 
  DecisionContext, 
  EvidencePackage, 
  AiExplanationResult, 
  AiExecutiveInsight, 
  DecisionChatMessage 
} from '../types/decisionEngine';

// Client-side in-memory cache to guarantee instantaneous UI transitions
const clientExplanationCache = new Map<string, AiExplanationResult>();
let clientExecutiveInsightCache: { insight: AiExecutiveInsight; key: string } | null = null;

/**
 * Builds a standardized, read-only EvidencePackage for Gemini
 */
export function createEvidencePackage(
  decision: DecisionResult,
  context?: DecisionContext | null
): EvidencePackage {
  // Extract specific entity metrics if available
  let metrics: EvidencePackage['metrics'] = {
    expectedRevenueLift: decision.expectedRevenueLift,
  };

  if (context) {
    if (decision.entityType === 'SALESMAN') {
      const sls = context.salesmanDecisions.find(s => s.salesmanId === decision.entityId);
      if (sls) {
        metrics = {
          target: sls.target,
          currentValue: sls.actualValue,
          previousValue: sls.previousValue,
          gap: sls.gap,
          growthRate: sls.growthRate,
          achievementRate: sls.achievementRate,
          ecCurrent: sls.ecCurrent,
          ecPrevious: sls.ecPrevious,
          ecGrowth: sls.ecGrowth,
          salesmanId: sls.salesmanId,
          salesmanName: sls.salesmanName,
          expectedRevenueLift: Math.abs(sls.gap),
        };
      }
    } else if (decision.entityType === 'OUTLET') {
      const drop = context.outletRecoveryList.find(d => d.outletId === decision.entityId);
      if (drop) {
        metrics = {
          currentValue: 0,
          previousValue: drop.historicalValue,
          outletStatus: 'DROP',
          salesmanId: drop.salesmanId,
          salesmanName: drop.salesmanName,
          expectedRevenueLift: drop.historicalValue,
        };
      }
    } else if (decision.entityType === 'EC') {
      metrics = {
        ecCurrent: context.ecSummary.ecCurrent,
        ecPrevious: context.ecSummary.ecPrevious,
        ecGrowth: context.ecSummary.ecGrowth,
      };
    } else if (decision.entityType === 'MARK_NEW') {
      metrics = {
        currentValue: context.markNewSummary.markNewValue,
        ecCurrent: context.markNewSummary.markNewEc,
        growthRate: context.markNewSummary.markNewGrowth,
      };
    }
  }

  return {
    decisionId: decision.id,
    category: decision.category,
    entityType: decision.entityType,
    entityId: decision.entityId,
    entityName: decision.entityName,
    priorityScore: decision.priorityScore,
    riskScore: decision.riskScore,
    opportunityScore: decision.opportunityScore,
    status: decision.status,
    riskStatus: decision.riskStatus,
    what: decision.what,
    why: decision.why,
    impact: decision.impact,
    recommendedAction: decision.recommendedAction,
    expectedImpact: decision.expectedImpact,
    evidence: decision.evidence || [],
    sourcePeriod: decision.sourcePeriod,
    confidence: decision.confidence,
    metrics,
  };
}

/**
 * Deterministic local fallback generator if network is offline
 */
function createLocalFallbackExplanation(pkg: EvidencePackage): AiExplanationResult {
  return {
    summary: `Intervensi preskriptif untuk ${pkg.entityName} berstatus prioritas ${pkg.status} (Skor ${pkg.priorityScore}/100).`,
    whatHappened: pkg.what,
    why: pkg.why,
    businessImpact: pkg.impact,
    recommendedAction: pkg.recommendedAction,
    expectedOutcome: pkg.expectedImpact,
    confidence: `Tinggi (${Math.round(pkg.confidence * 100)}% matematis terverifikasi)`,
    limitations: `Analisis didasarkan pada dataset transaksi aktual ${pkg.sourcePeriod}.`,
    distinction: {
      facts: pkg.evidence,
      inferences: [
        `Prioritas tindakan didasarkan pada besarnya dampak omset yang hilang atau defisit terhadap kuota cabang.`,
      ],
    },
    generatedAt: new Date().toISOString(),
    cached: true,
    modelUsed: 'Deterministic Fallback Engine (Offline Mode)',
  };
}

/**
 * Fetch AI Explanation for a single decision
 */
export async function fetchAiExplanation(
  decision: DecisionResult,
  context?: DecisionContext | null
): Promise<AiExplanationResult> {
  const pkg = createEvidencePackage(decision, context);
  const cacheKey = `${pkg.decisionId}_${pkg.sourcePeriod}_${pkg.priorityScore}`;

  if (clientExplanationCache.has(cacheKey)) {
    return clientExplanationCache.get(cacheKey)!;
  }

  try {
    const res = await fetch('/api/ai/explain-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidencePackage: pkg }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.explanation) {
      clientExplanationCache.set(cacheKey, data.explanation);
      return data.explanation;
    }
    throw new Error('Invalid explanation payload');
  } catch (err) {
    console.warn('[AI EXPLANATION CLIENT FALLBACK]:', err);
    const fallback = createLocalFallbackExplanation(pkg);
    clientExplanationCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Fetch Executive Management Insight for loaded period
 */
export async function fetchAiExecutiveInsight(
  context: DecisionContext,
  decisions: DecisionResult[]
): Promise<AiExecutiveInsight> {
  const cacheKey = `${context.period}_${context.salesSummary.currentValue}_${decisions.length}`;

  if (clientExecutiveInsightCache && clientExecutiveInsightCache.key === cacheKey) {
    return clientExecutiveInsightCache.insight;
  }

  const criticalCount = decisions.filter(d => d.status === 'CRITICAL').length;
  const topDecision = decisions[0];
  const topDecisionSummary = topDecision ? `${topDecision.entityName}: ${topDecision.what}` : '';

  const summaryData = {
    period: context.period,
    cabang: context.cabang || 'BONE',
    totalTarget: context.salesSummary.totalTarget,
    totalActual: context.salesSummary.currentValue,
    achievementRate: context.salesSummary.achievementRate,
    growthRate: context.salesSummary.growthRate,
    ecCurrent: context.ecSummary.ecCurrent,
    ecPrevious: context.ecSummary.ecPrevious,
    dropCount: context.outletSummary.dropOutletsCount,
    dropLostRevenue: context.outletSummary.dropOutletsLostRevenue,
    newOutletCount: context.outletSummary.newOutletsCount,
    markNewValue: context.markNewSummary.markNewValue,
    criticalDecisionsCount: criticalCount,
    topDecisionSummary,
  };

  try {
    const res = await fetch('/api/ai/executive-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryData }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.success && data.insight) {
      clientExecutiveInsightCache = { insight: data.insight, key: cacheKey };
      return data.insight;
    }
    throw new Error('Invalid executive insight payload');
  } catch (err) {
    console.warn('[AI EXEC INSIGHT CLIENT FALLBACK]:', err);
    const fallbackInsight: AiExecutiveInsight = {
      period: context.period,
      cabang: context.cabang || 'BONE',
      performanceSummary: `Total realisasi penjualan ${context.period} tercatat Rp ${context.salesSummary.currentValue.toLocaleString('id-ID')} dengan pencapaian kuota ${context.salesSummary.achievementRate?.toFixed(1) || 0}%.`,
      attentionSummary: `Perhatian utama tertuju pada ${context.outletSummary.dropOutletsCount} outlet drop (kehilangan omset Rp ${context.outletSummary.dropOutletsLostRevenue.toLocaleString('id-ID')}) serta ${criticalCount} keputusan berstatus kritis.`,
      riskSummary: `Penurunan volume transaksi pada rute tertentu memerlukan koordinasi joint-visit salesman dan supervisor.`,
      opportunitySummary: `Program MARK NEW membukukan omset Rp ${context.markNewSummary.markNewValue.toLocaleString('id-ID')} dan masih menyisakan potensi cross-sell ke outlet reguler.`,
      topPrioritySummary: topDecisionSummary || 'Reaktivasi outlet drop bernilai historis tinggi.',
      topRecommendedActions: [
        'Kunjungi segera top drop outlet untuk memulihkan transaksi.',
        'Dampingi salesman yang memiliki achievement di bawah rata-rata cabang.',
        'Wajibkan penawaran program MARK NEW pada kunjungan rutin outlet aktif.',
      ],
      distinction: {
        facts: [
          `Realisasi: Rp ${context.salesSummary.currentValue.toLocaleString('id-ID')}`,
          `Target: Rp ${context.salesSummary.totalTarget.toLocaleString('id-ID')}`,
          `EC Berjalan: ${context.ecSummary.ecCurrent} toko`,
        ],
        inferences: [
          'Fokus reaktivasi toko drop merupakan tuas pemulihan omset tercepat.',
        ],
      },
      generatedAt: new Date().toISOString(),
      cached: true,
    };
    clientExecutiveInsightCache = { insight: fallbackInsight, key: cacheKey };
    return fallbackInsight;
  }
}

/**
 * Ask Questions About Specific Decision
 */
export async function askAiAboutDecision(
  decision: DecisionResult,
  question: string,
  history: DecisionChatMessage[] = [],
  context?: DecisionContext | null
): Promise<{ answer: string; confidence: string; citedFacts: string[] }> {
  const pkg = createEvidencePackage(decision, context);

  try {
    const res = await fetch('/api/ai/chat-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidencePackage: pkg,
        question,
        history,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.success && data.answer) {
      return {
        answer: data.answer,
        confidence: data.confidence || `${Math.round(pkg.confidence * 100)}%`,
        citedFacts: data.citedFacts || pkg.evidence,
      };
    }
    throw new Error('Invalid chat payload');
  } catch (err) {
    console.warn('[AI CHAT CLIENT FALLBACK]:', err);
    return {
      answer: `Berdasarkan data keputusan untuk ${pkg.entityName}: ${pkg.what} Akar masalah: ${pkg.why}. Rekomendasi aksi terarah: ${pkg.recommendedAction}. Bukti data: ${pkg.evidence.join('; ')}.`,
      confidence: `${Math.round(pkg.confidence * 100)}% (Deterministic Engine Fallback)`,
      citedFacts: pkg.evidence,
    };
  }
}
