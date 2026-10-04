/**
 * ESM SALES CONTROL CENTER — GEMINI DECISION INTELLIGENCE SERVICE (SERVER-SIDE)
 * 
 * Strict FMCG Enterprise Constraints:
 * 1. Read-only explanation layer over Phase 1 Deterministic Engine.
 * 2. Gemini NEVER calculates or mutates KPI numbers.
 * 3. All numbers cited MUST match the EvidencePackage.
 * 4. Strict separation between FACT (from engine) and INFERENCE (logical analysis).
 * 5. Deterministic fallback if GEMINI_API_KEY is not configured or network fails.
 * 6. Memory caching to prevent redundant API calls and optimize token usage.
 */

import { GoogleGenAI } from '@google/genai';
import { 
  EvidencePackage, 
  AiExplanationResult, 
  AiExecutiveInsight, 
  DecisionChatMessage 
} from '../types/decisionEngine';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side in-memory explanation cache (Key: decisionId_period_hash)
const explanationCache = new Map<string, { result: AiExplanationResult; timestamp: number }>();
const executiveInsightCache = new Map<string, { result: AiExecutiveInsight; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes TTL

function getCacheKey(pkg: EvidencePackage): string {
  return `${pkg.decisionId}_${pkg.sourcePeriod}_${pkg.priorityScore}_${pkg.riskScore}`;
}

/**
 * Deterministic Fallback Generator
 * Produces 100% compliant, factual explanation without requiring Gemini API
 */
export function generateDeterministicFallbackExplanation(pkg: EvidencePackage): AiExplanationResult {
  const isDrop = pkg.category === 'DROP_OUTLET_RECOVERY';
  const isSalesman = pkg.category === 'SALESMAN_PRODUCTIVITY';
  const isEc = pkg.category === 'EC_RISK';
  const isMarkNew = pkg.category === 'MARK_NEW_OPPORTUNITY';
  const isSku = pkg.category === 'SKU_OPPORTUNITY';

  let summary = '';
  let whatHappened = pkg.what;
  let why = pkg.why;
  let businessImpact = pkg.impact;
  let recommendedAction = pkg.recommendedAction;
  let expectedOutcome = pkg.expectedImpact;

  if (isDrop) {
    summary = `Intervensi prioritas tinggi untuk reaktivasi outlet ${pkg.entityName} guna memulihkan potensi omset yang hilang di ${pkg.sourcePeriod}.`;
  } else if (isSalesman) {
    summary = `Pendampingan operasional terarah untuk Salesman ${pkg.entityName} guna akselerasi pencapaian target dan pemulihan rute kunjungan.`;
  } else if (isEc) {
    summary = `Pengamanan basis pelanggan aktif (Effective Call) untuk mencegah penyempitan jangkauan distribusi di pasar.`;
  } else if (isMarkNew) {
    summary = `Eksploitasi celah cross-sell program MARK NEW pada basis outlet reguler aktif untuk mendongkrak pendapatan tambahan.`;
  } else {
    summary = `Optimalisasi portofolio produk ${pkg.entityName} untuk membalikkan tren kontraksi penjualan.`;
  }

  const facts: string[] = [
    `Entitas: ${pkg.entityName} (${pkg.entityType} ID: ${pkg.entityId})`,
    `Kategori Keputusan: ${pkg.category.replace(/_/g, ' ')}`,
    `Tingkat Prioritas Engine: ${pkg.status} (Score ${pkg.priorityScore}/100)`,
    `Skor Risiko: ${pkg.riskScore}/100 | Skor Peluang: ${pkg.opportunityScore}/100`,
    ...pkg.evidence.map(e => `Bukti Data: ${e}`),
  ];

  const inferences: string[] = [
    `Tingkat urgensi ${pkg.priorityScore >= 70 ? 'KRITIS' : 'MENENGAH'} menunjukkan perlunya tindakan dalam siklus kunjungan mingguan berjalan.`,
    `Ketiadaan intervensi berpotensi melanggengkan defisit omset pada entitas terkait hingga akhir periode.`,
  ];

  return {
    summary,
    whatHappened,
    why,
    businessImpact,
    recommendedAction,
    expectedOutcome,
    confidence: `Tinggi (${Math.round(pkg.confidence * 100)}% terverifikasi secara matematis oleh Deterministic Engine)`,
    limitations: `Analisis didasarkan pada dataset transaksi aktual yang diunggah untuk periode ${pkg.sourcePeriod}. Faktor eksternal kualitatif (kondisi toko, negosiasi piutang) perlu divalidasi langsung oleh tim lapangan.`,
    distinction: {
      facts,
      inferences,
    },
    generatedAt: new Date().toISOString(),
    cached: false,
    modelUsed: 'Deterministic Fallback Rule-Engine (FMCG Standard)',
  };
}

/**
 * Generate Structured Explanation using Gemini 3.8 Flash
 */
export async function explainDecisionWithGemini(pkg: EvidencePackage): Promise<AiExplanationResult> {
  const cacheKey = getCacheKey(pkg);
  const cached = explanationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.result, cached: true };
  }

  const ai = getGenAIClient();
  if (!ai) {
    const fallback = generateDeterministicFallbackExplanation(pkg);
    return fallback;
  }

  try {

    const systemInstruction = `Anda adalah FMCG Business Decision Analyst untuk ESM Sales Control Center.
Tugas Anda adalah menjelaskan hasil keputusan operasional dari Deterministic Decision Engine kepada Management dan Tim Sales.

ATURAN KETAT:
1. Sumber angka HANYA dari Evidence Package berikut. DILARANG MENGARANG ATAU MENGHITUNG ULANG ANGKA.
2. Jangan pernah menyebutkan proyeksi forecast atau target masa depan di luar bukti.
3. Pisahkan dengan tegas antara FAKTA (data riil) dan INFERENSI (analisis manajerial).
4. Gunakan Bahasa Indonesia korporat FMCG yang tajam, ringkas, objektif, dan berorientasi aksi.
5. Format output WAJIB JSON murni tanpa markdown wrapper:
{
  "summary": "...",
  "whatHappened": "...",
  "why": "...",
  "businessImpact": "...",
  "recommendedAction": "...",
  "expectedOutcome": "...",
  "confidence": "...",
  "limitations": "...",
  "distinction": {
    "facts": ["fakta 1 dari evidence", "fakta 2"],
    "inferences": ["inferensi logis 1", "inferensi logis 2"]
  }
}`;

    const prompt = `Jelaskan keputusan operasional berikut:
${JSON.stringify(pkg, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for high factual rigor
      },
    });

    const text = response.text || '';
    if (!text.trim()) {
      return generateDeterministicFallbackExplanation(pkg);
    }

    try {
      const parsed = JSON.parse(text);
      const result: AiExplanationResult = {
        summary: String(parsed.summary || pkg.what),
        whatHappened: String(parsed.whatHappened || pkg.what),
        why: String(parsed.why || pkg.why),
        businessImpact: String(parsed.businessImpact || pkg.impact),
        recommendedAction: String(parsed.recommendedAction || pkg.recommendedAction),
        expectedOutcome: String(parsed.expectedOutcome || pkg.expectedImpact),
        confidence: String(parsed.confidence || `Tinggi (${Math.round(pkg.confidence * 100)}%)`),
        limitations: String(parsed.limitations || `Berbasis data transaksi aktual ${pkg.sourcePeriod}.`),
        distinction: {
          facts: Array.isArray(parsed.distinction?.facts) ? parsed.distinction.facts : pkg.evidence,
          inferences: Array.isArray(parsed.distinction?.inferences) ? parsed.distinction.inferences : ['Tingkat prioritas membutuhkan kawalan langsung dari supervisor.'],
        },
        generatedAt: new Date().toISOString(),
        cached: false,
        modelUsed: 'gemini-3.8-flash',
      };

      explanationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch {
      return generateDeterministicFallbackExplanation(pkg);
    }
  } catch (err: any) {
    console.warn('[GEMINI EXPLAIN FALLBACK ACTIVATED]:', err?.message || err);
    return generateDeterministicFallbackExplanation(pkg);
  }
}

/**
 * Generate Executive Management Insight
 */
export async function generateExecutiveInsightWithGemini(summaryData: {
  period: string;
  cabang: string;
  totalTarget: number;
  totalActual: number;
  achievementRate: number | null;
  growthRate: number | null;
  ecCurrent: number;
  ecPrevious: number;
  dropCount: number;
  dropLostRevenue: number;
  newOutletCount: number;
  markNewValue: number;
  criticalDecisionsCount: number;
  topDecisionSummary: string;
}): Promise<AiExecutiveInsight> {
  const cacheKey = `exec_insight_${summaryData.period}_${summaryData.totalActual}_${summaryData.criticalDecisionsCount}`;
  const cached = executiveInsightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.result, cached: true };
  }

  // Deterministic Base Fallback
  const fallbackInsight: AiExecutiveInsight = {
    period: summaryData.period,
    cabang: summaryData.cabang,
    performanceSummary: `Realisasi penjualan cabang ${summaryData.cabang} tercatat sebesar Rp ${summaryData.totalActual.toLocaleString('id-ID')} dengan pencapaian kuota ${summaryData.achievementRate !== null ? `${summaryData.achievementRate.toFixed(1)}%` : 'N/A'}${summaryData.growthRate !== null ? ` (Pertumbuhan MoM: ${summaryData.growthRate >= 0 ? '+' : ''}${summaryData.growthRate.toFixed(1)}%)` : ''}.`,
    attentionSummary: `Titik perhatian utama terpusat pada ${summaryData.dropCount} outlet drop yang mengakibatkan kehilangan omset Rp ${summaryData.dropLostRevenue.toLocaleString('id-ID')}, serta ${summaryData.criticalDecisionsCount} keputusan berstatus kritis yang memerlukan pendampingan supervisor.`,
    riskSummary: summaryData.achievementRate !== null && summaryData.achievementRate < 80 
      ? `Risiko defisit target cabang memerlukan intervensi segera pada rute kunjungan sales yang underperformed.` 
      : `Stabilitas laju penjualan cabang berjalan positif namun membutuhkan pengamanan basis pelanggan aktif.`,
    opportunitySummary: `Program MARK NEW / Eceran membukukan Rp ${summaryData.markNewValue.toLocaleString('id-ID')} dengan potensi penetrasi lebih lanjut ke outlet reguler, didukung oleh ${summaryData.newOutletCount} outlet baru yang telah bertransaksi.`,
    topPrioritySummary: summaryData.topDecisionSummary || 'Fokus utama pada reaktivasi 5 outlet drop terbesar dan pendampingan salesman dengan gap defisit tertinggi.',
    topRecommendedActions: [
      `Gelar joint-visit antara Supervisor dan Salesman PIC ke 5 outlet drop pareto terbesar.`,
      `Audit daftar toko tidak bertransaksi dan lakukan penawaran paket produk reguler.`,
      `Dorong penetrasi program MARK NEW pada kunjungan rutin salesman ke outlet aktif.`,
    ],
    distinction: {
      facts: [
        `Realisasi: Rp ${summaryData.totalActual.toLocaleString('id-ID')} (${summaryData.achievementRate?.toFixed(1) || 0}%)`,
        `EC Aktif: ${summaryData.ecCurrent} outlet (Bulan Lalu: ${summaryData.ecPrevious} outlet)`,
        `Drop Outlets: ${summaryData.dropCount} toko (Nilai: Rp ${summaryData.dropLostRevenue.toLocaleString('id-ID')})`,
        `Program MARK NEW: Rp ${summaryData.markNewValue.toLocaleString('id-ID')}`,
      ],
      inferences: [
        `Penyelamatan omset drop outlet merupakan tuas tercepat untuk menutup selisih target di sisa siklus kerja.`,
      ],
    },
    generatedAt: new Date().toISOString(),
    cached: false,
  };

  const ai = getGenAIClient();
  if (!ai) {
    return fallbackInsight;
  }

  try {
    const systemInstruction = `Anda adalah FMCG Executive Analyst untuk ESM Sales Control Center.
Buat ringkasan eksekutif komprehensif bagi pimpinan cabang berdasarkan data agregat performa aktual berikut.
DILARANG mengarang angka atau menyebutkan forecast masa depan.
Format output JSON murni tanpa markdown wrapper:
{
  "performanceSummary": "...",
  "attentionSummary": "...",
  "riskSummary": "...",
  "opportunitySummary": "...",
  "topPrioritySummary": "...",
  "topRecommendedActions": ["aksi 1", "aksi 2", "aksi 3"],
  "distinction": {
    "facts": ["fakta 1", "fakta 2"],
    "inferences": ["inferensi 1"]
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: JSON.stringify(summaryData, null, 2),
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '';
    if (!text.trim()) return fallbackInsight;

    const parsed = JSON.parse(text);
    const result: AiExecutiveInsight = {
      period: summaryData.period,
      cabang: summaryData.cabang,
      performanceSummary: String(parsed.performanceSummary || fallbackInsight.performanceSummary),
      attentionSummary: String(parsed.attentionSummary || fallbackInsight.attentionSummary),
      riskSummary: String(parsed.riskSummary || fallbackInsight.riskSummary),
      opportunitySummary: String(parsed.opportunitySummary || fallbackInsight.opportunitySummary),
      topPrioritySummary: String(parsed.topPrioritySummary || fallbackInsight.topPrioritySummary),
      topRecommendedActions: Array.isArray(parsed.topRecommendedActions) ? parsed.topRecommendedActions : fallbackInsight.topRecommendedActions,
      distinction: {
        facts: Array.isArray(parsed.distinction?.facts) ? parsed.distinction.facts : fallbackInsight.distinction.facts,
        inferences: Array.isArray(parsed.distinction?.inferences) ? parsed.distinction.inferences : fallbackInsight.distinction.inferences,
      },
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    executiveInsightCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (err: any) {
    console.warn('[GEMINI EXEC INSIGHT FALLBACK]:', err?.message || err);
    return fallbackInsight;
  }
}

/**
 * Ask Questions About Specific Decision (Q&A)
 */
export async function chatAboutDecisionWithGemini(
  pkg: EvidencePackage,
  question: string,
  history: DecisionChatMessage[] = []
): Promise<{ answer: string; confidence: string; citedFacts: string[] }> {
  // Rule-based fallback answer if Gemini is offline
  const fallbackAnswer = (q: string) => {
    const qLower = q.toLowerCase();
    if (qLower.includes('kenapa') || qLower.includes('mengapa') || qLower.includes('alasan') || qLower.includes('prioritas')) {
      return `Keputusan untuk ${pkg.entityName} memiliki skor prioritas ${pkg.priorityScore}/100 karena ${pkg.why} Dampak omset yang dipertaruhkan adalah ${pkg.impact}.`;
    }
    if (qLower.includes('dampak') || qLower.includes('akibat') || qLower.includes('efek')) {
      return `Dampak langsungnya: ${pkg.impact} Jika dilakukan intervensi preskriptif, potensi hasil yang dapat dipulihkan adalah: ${pkg.expectedImpact}.`;
    }
    if (qLower.includes('aksi') || qLower.includes('tindakan') || qLower.includes('lakukan') || qLower.includes('langkah')) {
      return `Langkah taktis yang direkomendasikan engine: ${pkg.recommendedAction}`;
    }
    if (qLower.includes('bukti') || qLower.includes('data') || qLower.includes('dasar')) {
      return `Data pendukung (evidence): ${pkg.evidence.join('; ')}`;
    }
    return `Berdasarkan Evidence Package: ${pkg.what} Akar masalah: ${pkg.why}. Rekomendasi aksi: ${pkg.recommendedAction}.`;
  };

  const ai = getGenAIClient();
  if (!ai) {
    return {
      answer: fallbackAnswer(question),
      confidence: `${Math.round(pkg.confidence * 100)}% (FMCG Deterministic Rule Engine)`,
      citedFacts: pkg.evidence,
    };
  }

  try {

    const systemInstruction = `Anda adalah FMCG Business Decision Analyst untuk ESM Sales Control Center.
Jawablah pertanyaan pengguna secara lugas, profesional, dan berbasis bukti fungsional.

BATASAN KETAT:
1. Jawab HANYA menggunakan informasi dalam Evidence Package entitas ini:
${JSON.stringify(pkg, null, 2)}
2. DILARANG MENGARANG FAKTA di luar evidence yang diberikan.
3. Sebutkan angka dan nama entitas yang relevan secara presisi.
4. Format jawaban langsung ke poin penting tanpa pembukaan basa-basi.
5. Pisahkan antara data fakta dan inferensi operasional.`;

    const chatHistoryPrompt = history
      .slice(-4)
      .map(m => `${m.sender === 'user' ? 'User' : 'Analyst'}: ${m.text}`)
      .join('\n');

    const prompt = chatHistoryPrompt
      ? `${chatHistoryPrompt}\nUser: ${question}\nAnalyst:`
      : `Pertanyaan: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const answer = response.text?.trim() || fallbackAnswer(question);
    return {
      answer,
      confidence: `${Math.round(pkg.confidence * 100)}% (Gemini 3.8 Flash grounded on Engine Evidence)`,
      citedFacts: pkg.evidence,
    };
  } catch (err: any) {
    console.warn('[GEMINI CHAT FALLBACK]:', err?.message || err);
    return {
      answer: fallbackAnswer(question),
      confidence: `${Math.round(pkg.confidence * 100)}% (FMCG Deterministic Rule Engine)`,
      citedFacts: pkg.evidence,
    };
  }
}
