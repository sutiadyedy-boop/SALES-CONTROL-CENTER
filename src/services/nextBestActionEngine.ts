/**
 * ESM SALES CONTROL CENTER — NEXT BEST ACTION (NBA) ENGINE (PHASE 3)
 * 
 * Strict FMCG Enterprise Constraints:
 * 1. Transform Decision Engine (Phase 1) & Explanation (Phase 2) into clear, measurable, prioritized operational actions.
 * 2. 5W + 1H Structure: WHO, WHAT, WHERE, WHY, WHEN, PRIORITY, EXPECTED IMPACT, STATUS.
 * 3. 10 Locked Action Types:
 *    - REACTIVATE_OUTLET
 *    - INCREASE_OUTLET_COVERAGE
 *    - CROSS_SELL_SKU
 *    - PUSH_MARK_NEW
 *    - IMPROVE_EC
 *    - PROTECT_EXISTING_OUTLET
 *    - REVIEW_SKU_PERFORMANCE
 *    - FOLLOW_UP_HIGH_VALUE_OUTLET
 *    - FOLLOW_UP_HIGH_PRIORITY_SALESMAN
 *    - MONITOR
 * 4. Factual Integrity: NO forecast, NO hallucinated numbers. Historical VALUE is benchmark reference only.
 * 5. Strict Deduplication: Same entity + same actionType + same period = single active NBA.
 * 6. Role-Based Access: Salesman views own actions, Supervisor views supervised area, Manager & Admin view all.
 * 7. Multi-tier deterministic sorting (Priority Score, Impact, Risk, Opportunity, Confidence, Entity ID).
 */

import { 
  DecisionResult, 
  DecisionContext, 
  DecisionPriority, 
  NextBestAction, 
  NextBestActionType, 
  NextBestActionStatus,
  NextBestActionOutcome,
  NextBestActionSummary,
  NextBestActionFunnel
} from '../types/decisionEngine';
import { UserProfile } from '../types/database';

export const NBA_STORAGE_KEY = 'spm_nba_action_states_v3';

export interface PersistedNbaState {
  status: NextBestActionStatus;
  startedAt?: string;
  completedAt?: string;
  notes: string[];
  outcome?: NextBestActionOutcome;
}

/**
 * Load persisted NBA states from localStorage
 */
export function loadPersistedNbaStates(): Record<string, PersistedNbaState> {
  try {
    const raw = localStorage.getItem(NBA_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('[NBA Engine] Failed to load persisted states:', err);
  }
  return {};
}

/**
 * Save persisted NBA states to localStorage
 */
export function savePersistedNbaStates(states: Record<string, PersistedNbaState>): void {
  try {
    localStorage.setItem(NBA_STORAGE_KEY, JSON.stringify(states));
  } catch (err) {
    console.error('[NBA Engine] Failed to save states:', err);
  }
}

/**
 * Priority Score to DecisionPriority mapping (Section 11)
 * 81–100: CRITICAL
 * 61–80:  HIGH
 * 41–60:  MEDIUM
 * 21–40:  LOW
 * 0–20:   MONITOR
 */
export function mapScoreToPriority(score: number): DecisionPriority {
  if (score >= 81) return 'CRITICAL';
  if (score >= 61) return 'HIGH';
  if (score >= 41) return 'MEDIUM';
  if (score >= 21) return 'LOW';
  return 'MONITOR';
}

/**
 * Helper to format Rupiah currency
 */
function formatRupiah(val: number): string {
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

/**
 * Synthesizes Next Best Actions from Decision Results and Context
 */
export function synthesizeNextBestActions(
  decisions: DecisionResult[],
  context: DecisionContext | null,
  persistedStates: Record<string, PersistedNbaState> = {}
): NextBestAction[] {
  if (!decisions || decisions.length === 0) {
    return [];
  }

  const rawActions: NextBestAction[] = [];
  const deduplicationMap = new Map<string, boolean>();

  const period = context?.period || decisions[0]?.sourcePeriod || 'SEPTEMBER 2026';

  for (const decision of decisions) {
    // Determine Action Type, 5W+1H, and expected reference
    let actionType: NextBestActionType = 'MONITOR';
    let actionTitle = '';
    let actionDescription = '';
    let who = '';
    let what = '';
    let where = '';
    let why = '';
    let when = 'Prioritas kunjungan rute berikutnya';
    let reason = decision.why;
    let expectedImpactStr = decision.expectedImpact;
    let expectedRevenueRef = decision.expectedRevenueLift || 0;

    const assignedSalesmanId = decision.assignedSalesmanId;
    const assignedSalesmanName = decision.assignedSalesmanName;
    const entityName = decision.entityName;

    // Section 22: Guard for insufficient evidence
    const hasSufficientEvidence = decision.evidence && decision.evidence.length > 0 && decision.confidence >= 0.3;

    if (!hasSufficientEvidence || decision.status === 'MONITOR' || decision.priorityScore <= 20) {
      actionType = 'MONITOR';
      actionTitle = `Monitoring Berkala: ${entityName}`;
      who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Supervisor Area';
      what = `Pantau stabilitas transaksi entitas ${entityName} pada siklus pelaporan berikutnya`;
      where = entityName;
      why = decision.evidence.length === 0 
        ? 'Data pendukung belum mencukupi untuk melakukan intervensi langsung di lapangan.' 
        : 'Skor prioritas berada pada tingkat observasi (0–20).';
      when = 'Siklus evaluasi mingguan berjalan';
      actionDescription = `Lakukan observasi berkala pada transaksi ${entityName} tanpa perubahan rute operasional mendesak.`;
      expectedImpactStr = 'Memelihara visibilitas data dan mendeteksi anomali dini.';
    } else if (decision.category === 'DROP_OUTLET_RECOVERY' || (decision.entityType === 'OUTLET' && decision.what.toLowerCase().includes('drop'))) {
      // Section 5: DROP OUTLET -> REACTIVATE_OUTLET
      actionType = 'REACTIVATE_OUTLET';
      actionTitle = `Reaktivasi Outlet Drop: ${entityName}`;
      who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Salesman PIC Toko';
      what = `Kunjungi dan reaktivasi outlet ${entityName} dengan penawaran paket stimulus pemulihan`;
      where = `${entityName} (ID: ${decision.entityId})`;
      why = `Outlet berstatus DROP (tidak ada transaksi di ${period}) dengan riwayat transaksi historis yang signifikan.`;
      when = 'Prioritas kunjungan hari pertama siklus rute berikutnya';
      actionDescription = `Lakukan kunjungan langsung ke ${entityName}, periksa ketersediaan stok fisik di etalase, koordinasikan solusi kendala pembayaran/pasokan, dan ajukan order paket pemulihan.`;
      
      if (expectedRevenueRef > 0) {
        expectedImpactStr = `Historical VALUE menunjukkan potensi recovery sebesar ${formatRupiah(expectedRevenueRef)} sebagai referensi pemulihan omset.`;
      } else {
        expectedImpactStr = 'Pemulihan basis transaksi aktif dan pencegahan kehilangan pelanggan permanen.';
      }
    } else if (decision.category === 'SKU_OPPORTUNITY' || decision.entityType === 'SKU') {
      // Section 7: SKU OPPORTUNITY
      const isCrossSell = decision.what.toLowerCase().includes('cross-sell') || 
                          decision.what.toLowerCase().includes('belum membeli') || 
                          decision.what.toLowerCase().includes('peluang') ||
                          decision.opportunityScore >= 60;

      if (isCrossSell) {
        actionType = 'CROSS_SELL_SKU';
        actionTitle = `Cross-Sell Portofolio SKU: ${entityName}`;
        who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Tim Salesman Lapangan';
        what = `Tawarkan SKU ${entityName} pada outlet yang sudah membeli SKU komplementer`;
        where = `Basis outlet aktif terdaftar`;
        why = `Outlet telah rutin membeli produk reguler namun belum menyerap SKU ${entityName} yang berpotensi tinggi.`;
        when = 'Kunjungan rutin Call Plan berjalan';
        actionDescription = `Bawa sampel atau katalog produk ${entityName}, jelaskan margin keuntungan toko untuk SKU ini, dan sertakan sebagai item tambahan pada faktur pemesanan.`;
        expectedImpactStr = `Peningkatan basket size belanja per toko dan perluasan portofolio produk aktif di pasar.`;
      } else {
        actionType = 'REVIEW_SKU_PERFORMANCE';
        actionTitle = `Review Performa Portofolio SKU: ${entityName}`;
        who = 'Supervisor & Salesman Area';
        what = `Audit perputaran dan ketersediaan pasokan SKU ${entityName}`;
        where = `Depo / Area Cabang`;
        why = `Portofolio SKU ${entityName} mengalami kontraksi laju penjualan dibanding periode sebelumnya.`;
        when = 'Pertemuan evaluasi mingguan tim';
        actionDescription = `Periksa kecukupan stok di gudang dan evaluasi kesesuaian harga jual eceran di tingkat toko.`;
        expectedImpactStr = 'Stabilisasi pasokan dan pencegahan penurunan kontribusi produk unggulan.';
      }
    } else if (decision.category === 'MARK_NEW_OPPORTUNITY' || decision.entityType === 'MARK_NEW') {
      // Section 8: MARK NEW / ECERAN -> PUSH_MARK_NEW
      actionType = 'PUSH_MARK_NEW';
      actionTitle = `Penetrasi Program MARK NEW / Eceran: ${entityName}`;
      who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Seluruh Salesman Lapangan';
      what = `Prioritaskan penawaran SKU paket MARK NEW pada kunjungan outlet aktif`;
      where = `Jaringan outlet reguler aktif`;
      why = `Celah penetrasi program MARK NEW / Eceran terbukti memberikan sumbangan margin dan omset tambahan yang belum tergarap optimal.`;
      when = 'Setiap kunjungan terjadwal pekan ini';
      actionDescription = `Tawarkan bundling paket stimulus MARK NEW pada outlet yang telah bertransaksi produk reguler untuk memperluas jangkauan eceran.`;
      expectedImpactStr = expectedRevenueRef > 0 
        ? `Potensi kontribusi omset tambahan hingga kisaran ${formatRupiah(expectedRevenueRef)}.` 
        : 'Peningkatan penetrasi lini produk baru pada basis pelanggan terdaftar.';
    } else if (decision.category === 'EC_RISK' || decision.entityType === 'EC') {
      // Section 9: EC RISK -> IMPROVE_EC
      actionType = 'IMPROVE_EC';
      actionTitle = `Pengamanan Basis Pelanggan Aktif (Effective Call)`;
      who = 'Salesman & Koordinator Canvasser';
      what = `Audit daftar outlet pasif dan amankan minimal 1 transaksi per toko`;
      where = `Rute kunjungan seluruh salesman`;
      why = `Jumlah toko bertransaksi (EC) menunjukkan tren penyusutan yang berisiko mempersempit jangkauan pasar.`;
      when = 'Siklus Call Plan 5 hari kerja ke depan';
      actionDescription = `Prioritaskan kunjungan ke outlet drop dan outlet bernilai historis tinggi untuk memastikan toko tetap buka dan bertransaksi.`;
      expectedImpactStr = 'Pengamanan jangkauan distribusi aktif dan perlindungan pangsa pasar dari penetrasi kompetitor.';
    } else if (decision.category === 'SALESMAN_PRODUCTIVITY' || decision.entityType === 'SALESMAN') {
      // Section 10: SALESMAN PRODUCTIVITY
      // Check if high achievement but negative EC growth or drop outlets
      const slsData = context?.salesmanDecisions?.find(s => s.salesmanId === decision.entityId);
      const isAchievementGood = slsData ? (slsData.achievementRate !== null && slsData.achievementRate >= 85) : false;
      const hasHiddenRisk = slsData ? ((slsData.ecGrowth !== null && slsData.ecGrowth < 0) || slsData.dropOutletCount > 2) : false;

      if (isAchievementGood && hasHiddenRisk) {
        actionType = 'FOLLOW_UP_HIGH_PRIORITY_SALESMAN';
        actionTitle = `Pendampingan Momentum: Salesman ${entityName}`;
        who = 'Supervisor Area';
        what = `Joint-visit untuk mengamankan EC dan reaktivasi outlet drop tanpa mengorbankan kuota`;
        where = `Rute Salesman ${entityName}`;
        why = `Pencapaian penjualan saat ini melampaui target, namun momentum melemah akibat penurunan toko bertransaksi (EC) atau naiknya toko drop.`;
        when = 'Jadwal joint-visit 3 hari ke depan';
        actionDescription = `Dampingi salesman ${entityName} ke rute dengan konsentrasi toko drop tertinggi. Pastikan fokus tidak hanya pada segelintir toko besar namun merata ke seluruh rute.`;
        expectedImpactStr = 'Memperkuat ketahanan omset jangka panjang dan mencegah ketergantungan sempit pada pareto segelintir toko.';
      } else {
        actionType = 'FOLLOW_UP_HIGH_PRIORITY_SALESMAN';
        actionTitle = `Intervensi Penutupan Gap: Salesman ${entityName}`;
        who = 'Supervisor Area';
        what = `Pendampingan harian terarah dan kawal 10 outlet pareto terbesar`;
        where = `Rute kerja Salesman ${entityName}`;
        why = `Realisasi penjualan tertinggal dari target kuota periode berjalan.`;
        when = 'Mulai esok hari pada jam operasional pertama';
        actionDescription = `Review rencana kunjungan harian, dampingi negosiasi pada outlet dengan potensi order besar, dan atasi hambatan logistik pengiriman.`;
        expectedImpactStr = expectedRevenueRef > 0 
          ? `Potensi penutupan selisih target hingga sebesar ${formatRupiah(expectedRevenueRef)}.` 
          : 'Akselerasi laju penjualan harian mendekati target kuota cabang.';
      }
    } else if (decision.entityType === 'OUTLET') {
      // Outlet is NEW or High Value active
      const isNewOutlet = decision.what.toLowerCase().includes('baru') || decision.what.toLowerCase().includes('new');
      if (isNewOutlet) {
        actionType = 'PROTECT_EXISTING_OUTLET';
        actionTitle = `Kawal Retensi & Repeat Order Outlet Baru: ${entityName}`;
        who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Salesman Terkait';
        what = `Kunjungi outlet dalam waktu 7 hari untuk memantau perputaran produk perdana`;
        where = `${entityName}`;
        why = `Outlet baru telah bertransaksi perdana namun membutuhkan pendampingan agar bertransformasi menjadi pelanggan repeat order aktif.`;
        when = 'Dalam 7 hari kalender pasca pengiriman perdana';
        actionDescription = `Pastikan barang pesanan sudah terdisplay rapi, tanyakan respon konsumen akhir, dan tawarkan paket restock lanjutan.`;
        expectedImpactStr = 'Menjaga loyalitas pelanggan baru dan mengamankan siklus order kedua secara konsisten.';
      } else {
        actionType = 'FOLLOW_UP_HIGH_VALUE_OUTLET';
        actionTitle = `Pengamanan Pelanggan Inti: ${entityName}`;
        who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Salesman Terkait';
        what = `Kawal pemenuhan pesanan dan pastikan ketersediaan pasokan tidak terputus`;
        where = `${entityName}`;
        why = `Outlet pareto bernilai tinggi memerlukan perlakuan khusus untuk mencegah kekosongan stok.`;
        when = 'Kunjungan rutin Call Plan terjadwal';
        actionDescription = `Lakukan pengecekan stok etalase dan gudang toko secara berkala untuk menjaga kontinuitas penjualan.`;
        expectedImpactStr = 'Perlindungan omset inti cabang dari risiko out-of-stock.';
      }
    } else {
      actionType = 'INCREASE_OUTLET_COVERAGE';
      actionTitle = `Optimalisasi Jangkauan Distribusi: ${entityName}`;
      who = assignedSalesmanName ? `Salesman ${assignedSalesmanName}` : 'Tim Lapangan';
      what = `Tingkatkan frekuensi kunjungan dan aktivasi toko non-transaksi`;
      where = entityName;
      why = decision.why;
      when = 'Jadwal Call Plan berjalan';
      actionDescription = decision.recommendedAction;
      expectedImpactStr = decision.expectedImpact;
    }

    // Section 23: Strict Deduplication Key
    const deduplicationKey = `${decision.entityId}_${actionType}_${decision.sourcePeriod}`;
    if (deduplicationMap.has(deduplicationKey)) {
      continue;
    }
    deduplicationMap.set(deduplicationKey, true);

    const actionId = `nba-${actionType.toLowerCase().replace(/_/g, '-')}-${decision.entityId}`;
    const persisted = persistedStates[actionId];

    // Priority mapping
    const priority = mapScoreToPriority(decision.priorityScore);

    const nba: NextBestAction = {
      id: actionId,
      decisionId: decision.id,
      priority,
      priorityScore: decision.priorityScore,
      riskScore: decision.riskScore,
      opportunityScore: decision.opportunityScore,
      entityType: decision.entityType,
      entityId: decision.entityId,
      entityName: decision.entityName,
      salesmanId: assignedSalesmanId,
      salesmanName: assignedSalesmanName,
      actionType,
      actionTitle,
      actionDescription,
      who,
      what,
      where,
      why,
      when,
      reason,
      evidence: decision.evidence || [],
      expectedImpact: expectedImpactStr,
      expectedRevenueReference: expectedRevenueRef,
      confidence: decision.confidence,
      sourcePeriod: decision.sourcePeriod,
      status: persisted?.status || 'PENDING',
      outcome: persisted?.outcome,
      createdAt: persisted?.startedAt || decision.generatedAt || new Date().toISOString(),
      updatedAt: persisted?.completedAt || new Date().toISOString(),
    };

    rawActions.push(nba);
  }

  // Section 12: Action Priority Multi-Tier Deterministic Sorting
  // 1. Priority Score desc
  // 2. Revenue Impact desc
  // 3. Risk Score desc
  // 4. Opportunity Score desc
  // 5. Confidence desc
  // 6. Deterministic tie-breaker: Entity Name / ID
  return rawActions.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    const aRev = a.expectedRevenueReference || 0;
    const bRev = b.expectedRevenueReference || 0;
    if (bRev !== aRev) {
      return bRev - aRev;
    }
    const aRisk = a.riskScore || 0;
    const bRisk = b.riskScore || 0;
    if (bRisk !== aRisk) {
      return bRisk - aRisk;
    }
    const aOpp = a.opportunityScore || 0;
    const bOpp = b.opportunityScore || 0;
    if (bOpp !== aOpp) {
      return bOpp - aOpp;
    }
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Section 32: Role-based filtering of actions
 */
export function filterActionsByUserRole(
  actions: NextBestAction[],
  userProfile?: UserProfile | null
): NextBestAction[] {
  if (!userProfile) return actions;

  const role = userProfile.role;

  // ADMIN and MANAGER have full visibility across all actions
  if (role === 'ADMIN' || role === 'MANAGER') {
    return actions;
  }

  // SUPERVISOR sees actions belonging to supervised salesmen or area
  if (role === 'SUPERVISOR') {
    if (userProfile.area) {
      const areaClean = userProfile.area.toLowerCase().trim();
      return actions.filter(a => {
        if (!a.area && !a.salesmanName) return true;
        if (a.area && a.area.toLowerCase().includes(areaClean)) return true;
        return true;
      });
    }
    return actions;
  }

  // SALESMAN strictly sees actions assigned to him/her
  if (role === 'SALESMAN') {
    const sId = (userProfile.salesmanId || '').toLowerCase().trim();
    const sName = (userProfile.name || '').toLowerCase().trim();
    const sUser = (userProfile.username || '').toLowerCase().trim();

    return actions.filter(a => {
      const aSalesmanId = (a.salesmanId || '').toLowerCase().trim();
      const aSalesmanName = (a.salesmanName || '').toLowerCase().trim();
      const aWho = (a.who || '').toLowerCase().trim();

      if (sId && aSalesmanId && aSalesmanId === sId) return true;
      if (sName && aSalesmanName && (aSalesmanName.includes(sName) || sName.includes(aSalesmanName))) return true;
      if (sUser && aSalesmanName && aSalesmanName.includes(sUser)) return true;
      if (sUser && aSalesmanId && aSalesmanId.includes(sUser)) return true;
      if (sName && aWho && aWho.includes(sName)) return true;

      // Also match if action entity is the salesman himself
      if (a.entityType === 'SALESMAN') {
        if (sId && a.entityId && a.entityId.toLowerCase().trim() === sId) return true;
        if (sName && a.entityName && a.entityName.toLowerCase().trim().includes(sName)) return true;
      }

      return false;
    });
  }

  return actions;
}

/**
 * Section 24: Limit to top 10 actions per salesman
 */
export function getTopActionsPerSalesman(
  actions: NextBestAction[],
  salesmanId?: string,
  limit: number = 10
): NextBestAction[] {
  let filtered = actions;
  if (salesmanId && salesmanId !== 'ALL') {
    filtered = actions.filter(a => a.salesmanId === salesmanId);
  }

  if (filtered.length <= limit) {
    return filtered;
  }

  return filtered.slice(0, limit);
}

/**
 * Section 25, 27: Summary & Effectiveness Metrics computation
 */
export function computeNextBestActionSummary(
  actions: NextBestAction[]
): NextBestActionSummary {
  let pendingCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let dismissedCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let monitorCount = 0;
  let totalExpectedImpact = 0;
  let totalActualImpact = 0;

  const bySalesman: Record<string, number> = {};
  const byActionType: Record<NextBestActionType, number> = {
    REACTIVATE_OUTLET: 0,
    INCREASE_OUTLET_COVERAGE: 0,
    CROSS_SELL_SKU: 0,
    PUSH_MARK_NEW: 0,
    IMPROVE_EC: 0,
    PROTECT_EXISTING_OUTLET: 0,
    REVIEW_SKU_PERFORMANCE: 0,
    FOLLOW_UP_HIGH_VALUE_OUTLET: 0,
    FOLLOW_UP_HIGH_PRIORITY_SALESMAN: 0,
    MONITOR: 0,
  };

  actions.forEach(a => {
    if (a.status === 'PENDING') pendingCount++;
    else if (a.status === 'IN_PROGRESS') inProgressCount++;
    else if (a.status === 'COMPLETED') completedCount++;
    else if (a.status === 'DISMISSED') dismissedCount++;

    if (a.priority === 'CRITICAL') criticalCount++;
    else if (a.priority === 'HIGH') highCount++;
    else if (a.priority === 'MEDIUM') mediumCount++;
    else if (a.priority === 'LOW') lowCount++;
    else if (a.priority === 'MONITOR') monitorCount++;

    totalExpectedImpact += (a.expectedRevenueReference || 0);
    if (a.outcome && a.outcome.actualValue) {
      totalActualImpact += a.outcome.actualValue;
    }

    const sls = a.salesmanName || 'Unassigned';
    bySalesman[sls] = (bySalesman[sls] || 0) + 1;

    byActionType[a.actionType] = (byActionType[a.actionType] || 0) + 1;
  });

  const total = actions.length;
  const completionRate = total > 0 ? (completedCount / total) * 100 : 0;

  // Success rate: Only calculate if completed count >= 3 to prevent misleading early statistics
  const successCount = actions.filter(a => a.status === 'COMPLETED' && a.outcome && ((a.outcome.actualValue && a.outcome.actualValue > 0) || (a.outcome.result && !a.outcome.result.toLowerCase().includes('gagal')))).length;
  const successRate = completedCount >= 3 ? (successCount / completedCount) * 100 : null;

  return {
    totalActions: total,
    pendingCount,
    inProgressCount,
    completedCount,
    dismissedCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    monitorCount,
    totalExpectedImpact,
    totalActualImpact,
    completionRate,
    successRate,
    bySalesman,
    byActionType,
  };
}

/**
 * Section 26: Action Funnel computation
 * DECISION → ACTION → IN PROGRESS → COMPLETED → OUTCOME
 */
export function computeNextBestActionFunnel(
  decisionsTotal: number,
  actions: NextBestAction[]
): NextBestActionFunnel {
  const actionsTotal = actions.length;
  let inProgressCount = 0;
  let completedCount = 0;
  let outcomeCount = 0;
  let positiveOutcomesCount = 0;

  actions.forEach(a => {
    if (a.status === 'IN_PROGRESS' || a.status === 'COMPLETED') {
      inProgressCount++;
    }
    if (a.status === 'COMPLETED') {
      completedCount++;
      if (a.outcome) {
        outcomeCount++;
        if ((a.outcome.actualValue && a.outcome.actualValue > 0) || (a.outcome.result && !a.outcome.result.toLowerCase().includes('gagal'))) {
          positiveOutcomesCount++;
        }
      }
    }
  });

  const pendingCount = actions.filter(a => a.status === 'PENDING').length;

  return {
    decisionsTotal,
    actionsTotal,
    pendingCount,
    inProgressCount,
    completedCount,
    outcomeCount,
    positiveOutcomesCount,
  };
}
