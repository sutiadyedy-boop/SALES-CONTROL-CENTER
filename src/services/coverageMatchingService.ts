import { 
  BPS_SULAWESI_SELATAN_DATA, 
  BpsKabupatenData, 
  BpsKecamatanData,
  TOTAL_SULSEL_RO_BPS,
  TOTAL_SULSEL_KECAMATAN 
} from '../data/bpsSulselData';
import { MasterOutletRecord } from '../types/database';

export type CoverageStatus = 'OPTIMAL' | 'MODERATE' | 'LOW' | 'BLANK_SPOT';

export interface KecamatanCoverageSummary {
  kodeBps: string;
  namaKecamatan: string;
  kodeKabupaten: string;
  namaKabupaten: string;
  namaSingkatKabupaten: string;
  kategoriWilayah: string;
  deskripsiSentra: string;
  roIndustriBps: number;
  masterCbTotal: number;
  masterCbActive: number;
  masterCbInactive: number;
  coverageRatio: number; // percentage (0 - 100+)
  activeCoverageRatio: number;
  gapOutlets: number; // unserved potential
  coverageStatus: CoverageStatus;
  outletList: MasterOutletRecord[];
}

export interface KabupatenCoverageSummary {
  kodeBps: string;
  namaKabupaten: string;
  namaSingkat: string;
  tipe: 'KABUPATEN' | 'KOTA';
  ibukota: string;
  roIndustriBps: number;
  jumlahKecamatan: number;
  masterCbTotal: number;
  masterCbActive: number;
  masterCbInactive: number;
  coverageRatio: number; // percentage
  activeCoverageRatio: number;
  gapOutlets: number;
  coverageStatus: CoverageStatus;
  kecamatanCoveredCount: number;
  kecamatanTotalCount: number;
  kecamatanCoverageRate: number; // percentage of kecamatans with at least 1 outlet
  kecamatanSummaries: KecamatanCoverageSummary[];
  outletList: MasterOutletRecord[];
}

export interface SulselCoverageDashboardData {
  totalMasterCb: number;
  totalMasterCbActive: number;
  totalMasterCbInactive: number;
  totalBpsUniverse: number;
  overallCoverageRatio: number;
  totalGapOutlets: number;
  totalKabupatenCovered: number;
  totalKabupatenUniverse: number;
  totalKecamatanCovered: number;
  totalKecamatanUniverse: number;
  kabupatenSummaries: KabupatenCoverageSummary[];
  allKecamatanSummaries: KecamatanCoverageSummary[];
  unmatchedOutletsCount: number;
  unmatchedOutlets: MasterOutletRecord[];
}

/**
 * Normalizes text for matching by removing special characters, leading kab/kota, extra spaces.
 */
function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/^(KABUPATEN|KAB\.|KAB|KOTA|KODYA)\s+/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Assigns an outlet to the most accurate Kabupaten and Kecamatan in South Sulawesi.
 */
export function matchOutletToRegion(
  outlet: MasterOutletRecord,
  kabupatenList: BpsKabupatenData[] = BPS_SULAWESI_SELATAN_DATA
): {
  matchedKabupaten: BpsKabupatenData | null;
  matchedKecamatan: BpsKecamatanData | null;
  confidence: 'HIGH' | 'MEDIUM' | 'FALLBACK' | 'UNMATCHED';
} {
  const rawKab = cleanText(outlet.kabupaten || outlet.kota);
  const rawKec = cleanText(outlet.kecamatan);
  const rawArea = cleanText(outlet.area);
  const rawCabang = cleanText(outlet.cabang);
  const rawDepo = cleanText(outlet.depo);
  const rawRayon = cleanText(outlet.rayon);
  const rawAddr = cleanText(outlet.address);
  const rawName = cleanText(outlet.outletName);

  const combinedSearchText = `${rawKab} ${rawKec} ${rawArea} ${rawCabang} ${rawDepo} ${rawRayon} ${rawAddr} ${rawName}`;

  // 1. Direct Kabupaten match by explicit field or aliases
  let matchedKab: BpsKabupatenData | null = null;
  let kabConfidence: 'HIGH' | 'MEDIUM' | 'FALLBACK' = 'FALLBACK';

  if (rawKab) {
    matchedKab = kabupatenList.find(k => {
      const cleanKab = cleanText(k.namaSingkat);
      return cleanKab === rawKab || k.aliases.some(a => cleanText(a) === rawKab);
    }) || null;
    if (matchedKab) kabConfidence = 'HIGH';
  }

  // 2. If not matched yet, search across area / cabang / depo / rayon / address
  if (!matchedKab) {
    for (const kab of kabupatenList) {
      const cleanName = cleanText(kab.namaSingkat);
      const isMatch = kab.aliases.some(alias => {
        const ca = cleanText(alias);
        return (
          rawArea.includes(ca) ||
          rawCabang.includes(ca) ||
          rawDepo.includes(ca) ||
          rawRayon.includes(ca) ||
          rawAddr.includes(ca)
        );
      }) || rawArea.includes(cleanName) || rawCabang.includes(cleanName) || rawDepo.includes(cleanName) || rawRayon.includes(cleanName);

      if (isMatch) {
        matchedKab = kab;
        kabConfidence = 'MEDIUM';
        break;
      }
    }
  }

  // 3. If still not matched, check outlet name or combined text for specific city names
  if (!matchedKab) {
    for (const kab of kabupatenList) {
      const cleanName = cleanText(kab.namaSingkat);
      if (cleanName.length >= 4 && combinedSearchText.includes(cleanName)) {
        matchedKab = kab;
        kabConfidence = 'FALLBACK';
        break;
      }
    }
  }

  // Fallback to primary distributor base if everything fails (Distributor BONE)
  if (!matchedKab) {
    // If the database has Bone references or default South Sulawesi distributor
    const boneKab = kabupatenList.find(k => k.kodeBps === '7308');
    if (boneKab) {
      matchedKab = boneKab;
      kabConfidence = 'FALLBACK';
    }
  }

  if (!matchedKab) {
    return { matchedKabupaten: null, matchedKecamatan: null, confidence: 'UNMATCHED' };
  }

  // Match Kecamatan inside the matched Kabupaten
  let matchedKec: BpsKecamatanData | null = null;

  // Check explicit kecamatan field first
  if (rawKec) {
    matchedKec = matchedKab.kecamatanList.find(kc => {
      const cleanKc = cleanText(kc.namaKecamatan);
      return cleanKc === rawKec || rawKec.includes(cleanKc) || cleanKc.includes(rawKec);
    }) || null;
  }

  // Search in rayon, address, area, outletName
  if (!matchedKec) {
    for (const kc of matchedKab.kecamatanList) {
      const cleanKc = cleanText(kc.namaKecamatan);
      if (cleanKc.length < 3) continue;

      if (
        rawRayon.includes(cleanKc) ||
        rawAddr.includes(cleanKc) ||
        rawArea.includes(cleanKc) ||
        rawName.includes(cleanKc)
      ) {
        matchedKec = kc;
        break;
      }
    }
  }

  // If still not matched, distribute or map to the first/ibukota kecamatan
  if (!matchedKec && matchedKab.kecamatanList.length > 0) {
    matchedKec = matchedKab.kecamatanList[0]; // Ibukota kecamatan
  }

  return {
    matchedKabupaten: matchedKab,
    matchedKecamatan: matchedKec,
    confidence: kabConfidence,
  };
}

/**
 * Categorizes coverage percentage into FMCG standard tiers
 */
export function getCoverageStatus(ratio: number): CoverageStatus {
  if (ratio >= 70) return 'OPTIMAL';
  if (ratio >= 40) return 'MODERATE';
  if (ratio > 0) return 'LOW';
  return 'BLANK_SPOT';
}

/**
 * Builds the complete Sulawesi Selatan Coverage Dashboard Data
 */
export function calculateSulselCoverage(
  masterOutlets: MasterOutletRecord[],
  kabupatenList: BpsKabupatenData[] = BPS_SULAWESI_SELATAN_DATA
): SulselCoverageDashboardData {
  // Mapping structures
  const kabOutletMap = new Map<string, MasterOutletRecord[]>();
  const kecOutletMap = new Map<string, MasterOutletRecord[]>();

  // Initialize maps
  for (const kab of kabupatenList) {
    kabOutletMap.set(kab.kodeBps, []);
    for (const kec of kab.kecamatanList) {
      kecOutletMap.set(kec.kodeBps, []);
    }
  }

  const unmatchedOutlets: MasterOutletRecord[] = [];

  // Distribute all master outlets
  for (const outlet of masterOutlets) {
    const { matchedKabupaten, matchedKecamatan, confidence } = matchOutletToRegion(outlet, kabupatenList);

    if (matchedKabupaten) {
      const list = kabOutletMap.get(matchedKabupaten.kodeBps) || [];
      list.push(outlet);
      kabOutletMap.set(matchedKabupaten.kodeBps, list);

      if (matchedKecamatan) {
        const kList = kecOutletMap.get(matchedKecamatan.kodeBps) || [];
        kList.push(outlet);
        kecOutletMap.set(matchedKecamatan.kodeBps, kList);
      }
    } else {
      unmatchedOutlets.push(outlet);
    }
  }

  const allKecamatanSummaries: KecamatanCoverageSummary[] = [];

  // Build Kabupaten Summaries
  const kabupatenSummaries: KabupatenCoverageSummary[] = kabupatenList.map(kab => {
    const outlets = kabOutletMap.get(kab.kodeBps) || [];
    const masterCbTotal = outlets.length;
    const masterCbActive = outlets.filter(o => o.isActive).length;
    const masterCbInactive = masterCbTotal - masterCbActive;
    const roIndustriBps = kab.roIndustriBps;
    const coverageRatio = roIndustriBps > 0 ? (masterCbTotal / roIndustriBps) * 100 : 0;
    const activeCoverageRatio = roIndustriBps > 0 ? (masterCbActive / roIndustriBps) * 100 : 0;
    const gapOutlets = Math.max(0, roIndustriBps - masterCbTotal);
    const coverageStatus = getCoverageStatus(coverageRatio);

    // Build constituent kecamatan summaries
    let kecamatanCoveredCount = 0;
    const kecamatanSummaries: KecamatanCoverageSummary[] = kab.kecamatanList.map(kec => {
      const kOutlets = kecOutletMap.get(kec.kodeBps) || [];
      const kTotal = kOutlets.length;
      if (kTotal > 0) kecamatanCoveredCount++;

      const kActive = kOutlets.filter(o => o.isActive).length;
      const kInactive = kTotal - kActive;
      const kRoBps = kec.roIndustriBps;
      const kRatio = kRoBps > 0 ? (kTotal / kRoBps) * 100 : 0;
      const kActiveRatio = kRoBps > 0 ? (kActive / kRoBps) * 100 : 0;
      const kGap = Math.max(0, kRoBps - kTotal);
      const kStatus = getCoverageStatus(kRatio);

      const kecSummary: KecamatanCoverageSummary = {
        kodeBps: kec.kodeBps,
        namaKecamatan: kec.namaKecamatan,
        kodeKabupaten: kab.kodeBps,
        namaKabupaten: kab.namaKabupaten,
        namaSingkatKabupaten: kab.namaSingkat,
        kategoriWilayah: kec.kategoriWilayah || 'Transisi',
        deskripsiSentra: kec.deskripsiSentra || '',
        roIndustriBps: kRoBps,
        masterCbTotal: kTotal,
        masterCbActive: kActive,
        masterCbInactive: kInactive,
        coverageRatio: kRatio,
        activeCoverageRatio: kActiveRatio,
        gapOutlets: kGap,
        coverageStatus: kStatus,
        outletList: kOutlets,
      };

      allKecamatanSummaries.push(kecSummary);
      return kecSummary;
    });

    const kecamatanCoverageRate = kab.jumlahKecamatan > 0 
      ? (kecamatanCoveredCount / kab.jumlahKecamatan) * 100 
      : 0;

    return {
      kodeBps: kab.kodeBps,
      namaKabupaten: kab.namaKabupaten,
      namaSingkat: kab.namaSingkat,
      tipe: kab.tipe,
      ibukota: kab.ibukota,
      roIndustriBps,
      jumlahKecamatan: kab.jumlahKecamatan,
      masterCbTotal,
      masterCbActive,
      masterCbInactive,
      coverageRatio,
      activeCoverageRatio,
      gapOutlets,
      coverageStatus,
      kecamatanCoveredCount,
      kecamatanTotalCount: kab.jumlahKecamatan,
      kecamatanCoverageRate,
      kecamatanSummaries,
      outletList: outlets,
    };
  });

  const totalMasterCb = masterOutlets.length;
  const totalMasterCbActive = masterOutlets.filter(o => o.isActive).length;
  const totalMasterCbInactive = totalMasterCb - totalMasterCbActive;
  const totalBpsUniverse = TOTAL_SULSEL_RO_BPS;
  const overallCoverageRatio = totalBpsUniverse > 0 ? (totalMasterCb / totalBpsUniverse) * 100 : 0;
  const totalGapOutlets = Math.max(0, totalBpsUniverse - totalMasterCb);

  const totalKabupatenCovered = kabupatenSummaries.filter(k => k.masterCbTotal > 0).length;
  const totalKecamatanCovered = allKecamatanSummaries.filter(k => k.masterCbTotal > 0).length;

  return {
    totalMasterCb,
    totalMasterCbActive,
    totalMasterCbInactive,
    totalBpsUniverse,
    overallCoverageRatio,
    totalGapOutlets,
    totalKabupatenCovered,
    totalKabupatenUniverse: kabupatenList.length,
    totalKecamatanCovered,
    totalKecamatanUniverse: TOTAL_SULSEL_KECAMATAN,
    kabupatenSummaries,
    allKecamatanSummaries,
    unmatchedOutletsCount: unmatchedOutlets.length,
    unmatchedOutlets,
  };
}
