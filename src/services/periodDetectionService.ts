/**
 * ESM SALES CONTROL TOWER — PERIOD DETECTION SERVICE
 * 
 * Automatically detects period labels (e.g., "SEPTEMBER 2026", "OKTOBER 2026")
 * and period codes (e.g., "2026-09", "2026-10") from:
 * 1. Transaction row date values (ground truth)
 * 2. Uploaded file names
 * 3. Sheet names
 * 
 * Provides fallback and human-readable short labels (e.g., "Sept", "Okt").
 */

import { DatabaseCategory } from '../types/database';

export interface DetectedPeriod {
  label: string;       // e.g. "SEPTEMBER 2026", "OKTOBER 2026"
  shortLabel: string;  // e.g. "Sept", "Okt"
  monthNumber: number; // 1 - 12
  year: number;        // e.g. 2026
  periodCode: string;  // e.g. "2026-09", "2026-10"
}

export const INDONESIAN_MONTHS = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
] as const;

export const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agus',
  'Sept',
  'Okt',
  'Nov',
  'Des',
] as const;

/**
 * Convert any month string or index to short month abbreviation
 */
export function getShortMonthLabel(fullLabel?: string): string {
  if (!fullLabel) return '';
  const upper = fullLabel.toUpperCase().trim();
  for (let i = 0; i < INDONESIAN_MONTHS.length; i++) {
    if (upper.includes(INDONESIAN_MONTHS[i])) {
      return SHORT_MONTH_NAMES[i];
    }
  }
  // Try English or common variants
  if (upper.includes('AUG')) return 'Agus';
  if (upper.includes('SEP')) return 'Sept';
  if (upper.includes('OCT')) return 'Okt';
  if (upper.includes('NOV')) return 'Nov';
  if (upper.includes('DEC')) return 'Des';

  // Fallback to first word or slice
  const parts = fullLabel.trim().split(/\s+/);
  return parts[0].slice(0, 4);
}

/**
 * Parse date string or number to { year, month (1-12) }
 */
export function parseYearMonthFromDate(val: any): { year: number; month: number } | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const midday = new Date(val.getTime() + 12 * 3600 * 1000);
    return { year: midday.getUTCFullYear(), month: midday.getUTCMonth() + 1 };
  }

  const str = String(val).trim();
  if (!str) return null;

  // Check Excel serial number (e.g. 46296 -> October 2026, or "46296.5")
  const num = parseFloat(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const utcMs = Math.round((num - 25569) * 86400 * 1000);
    const date = new Date(utcMs);
    if (!isNaN(date.getTime())) {
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    if (y >= 2000 && y <= 2050 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (ddmmyyyy) {
    const m = parseInt(ddmmyyyy[2], 10);
    const y = parseInt(ddmmyyyy[3], 10);
    if (y >= 2000 && y <= 2050 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  // DD/MM/YY or DD-MM-YY (e.g. 04/10/26 -> 2026-10)
  const ddmmyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
  if (ddmmyy) {
    const m = parseInt(ddmmyy[2], 10);
    let y = parseInt(ddmmyy[3], 10);
    y = y < 50 ? 2000 + y : 1900 + y;
    if (y >= 2000 && y <= 2050 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  // Check Indonesian & English text format e.g. "04-OKT-2026", "15 Oktober 2026", "01-SEP-26"
  const upper = str.toUpperCase();
  for (let mi = 0; mi < INDONESIAN_MONTHS.length; mi++) {
    const mName = INDONESIAN_MONTHS[mi];
    const sName = SHORT_MONTH_NAMES[mi].toUpperCase();
    if (upper.includes(mName) || upper.includes(sName)) {
      const yearM = upper.match(/\b(202[0-9])\b/);
      const y = yearM ? parseInt(yearM[1], 10) : 2026;
      return { year: y, month: mi + 1 };
    }
  }
  if (upper.includes('OCT')) return { year: 2026, month: 10 };
  if (upper.includes('SEP')) return { year: 2026, month: 9 };
  if (upper.includes('AUG')) return { year: 2026, month: 8 };

  // MM/YYYY or MM-YYYY
  const mmyyyy = str.match(/^(\d{1,2})[-\/](\d{4})/);
  if (mmyyyy) {
    const m = parseInt(mmyyyy[1], 10);
    const y = parseInt(mmyyyy[2], 10);
    if (y >= 2000 && y <= 2050 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  return null;
}

/**
 * Detect month and year from text (filename or sheet name)
 */
export function detectPeriodFromText(text: string): { year: number; month: number } | null {
  if (!text) return null;
  const upper = text.toUpperCase();

  // Find year
  let detectedYear = 2026;
  const yearMatch = upper.match(/\b(202[0-9])\b/);
  if (yearMatch) {
    detectedYear = parseInt(yearMatch[1], 10);
  }

  // Check month names (exact priority)
  const monthPatterns: [RegExp, number][] = [
    [/\b(JANUARI|JANUARY|JAN)\b/, 1],
    [/\b(FEBRUARI|FEBRUARY|FEB)\b/, 2],
    [/\b(MARET|MARCH|MAR)\b/, 3],
    [/\b(APRIL|APR)\b/, 4],
    [/\b(MEI|MAY)\b/, 5],
    [/\b(JUNI|JUNE|JUN)\b/, 6],
    [/\b(JULI|JULY|JUL)\b/, 7],
    [/\b(AGUSTUS|AUGUST|AGU|AUG)\b/, 8],
    [/\b(SEPTEMBER|SEPT|SEP)\b/, 9],
    [/\b(OKTOBER|OCTOBER|OKT|OCT)\b/, 10],
    [/\b(NOVEMBER|NOV)\b/, 11],
    [/\b(DESEMBER|DECEMBER|DES|DEC)\b/, 12],
    // Numeric ISO in text e.g. "2026-10", "2026_10", "10-2026"
    [/202[0-9][-_](1[0-2]|0[1-9])/, -1], // handled below
  ];

  for (const [pattern, monthNum] of monthPatterns) {
    if (monthNum > 0 && pattern.test(upper)) {
      return { year: detectedYear, month: monthNum };
    }
  }

  // Check pattern like "2026-10" or "2026_09"
  const isoInText = upper.match(/202[0-9][-_](1[0-2]|0[1-9])/);
  if (isoInText) {
    const m = parseInt(isoInText[1], 10);
    return { year: detectedYear, month: m };
  }

  // Check pattern like "10_2026" or "10-2026"
  const revIso = upper.match(/(1[0-2]|0[1-9])[-_](202[0-9])/);
  if (revIso) {
    return { year: parseInt(revIso[2], 10), month: parseInt(revIso[1], 10) };
  }

  return null;
}

/**
 * Detect period from data rows by analyzing date columns
 */
export function detectPeriodFromRows(
  rows: Record<string, any>[],
  dateColName?: string
): { year: number; month: number } | null {
  if (!rows || rows.length === 0) return null;

  // Possible date column names
  const candidateCols = [
    dateColName,
    'TGL',
    'TANGGAL',
    'DATE',
    'TRANS_DATE',
    'TGL_TRX',
    'TGL_FAKTUR',
    'TANGGAL FAKTUR',
    'TGL TRANSAKSI',
    'TANGGAL TRANSAKSI',
    'INVOICE_DATE',
    'TGL INVOICE',
    'TGL_ORDER',
    'TGL ORDER',
    'TGL DO',
    'TGL_DO',
    'TGL KIRIM',
    'TANGGAL NOTA',
    'TGL NOTA',
    'ORDER DATE',
    'TX DATE',
  ].filter(Boolean) as string[];

  // Find actual key in rows
  const sample = rows[0] || {};
  const rowKeys = Object.keys(sample);
  let activeDateCol = '';

  for (const cand of candidateCols) {
    if (sample[cand] !== undefined) {
      activeDateCol = cand;
      break;
    }
    const found = rowKeys.find(k => k.toUpperCase().replace(/[_\s]+/g, ' ') === cand.toUpperCase().replace(/[_\s]+/g, ' '));
    if (found) {
      activeDateCol = found;
      break;
    }
  }

  if (!activeDateCol) {
    // Look for any column containing date-like keyword
    const dateLike = rowKeys.find(k => {
      const u = k.toUpperCase();
      return u.includes('TGL') || u.includes('DATE') || u.includes('TANGGAL');
    });
    if (dateLike) activeDateCol = dateLike;
  }

  if (!activeDateCol) return null;

  // Tally frequency of {year, month}
  const frequencyMap = new Map<string, { year: number; month: number; count: number }>();
  const maxToInspect = Math.min(rows.length, 250);

  for (let i = 0; i < maxToInspect; i++) {
    const rawVal = rows[i]?.[activeDateCol];
    const parsed = parseYearMonthFromDate(rawVal);
    if (parsed) {
      const key = `${parsed.year}-${parsed.month}`;
      const entry = frequencyMap.get(key) || { ...parsed, count: 0 };
      entry.count++;
      frequencyMap.set(key, entry);
    }
  }

  let bestMatch: { year: number; month: number; count: number } | null = null;
  frequencyMap.forEach(entry => {
    if (!bestMatch || entry.count > bestMatch.count) {
      bestMatch = entry;
    }
  });

  if (bestMatch && (bestMatch as any).count > 0) {
    return { year: (bestMatch as any).year, month: (bestMatch as any).month };
  }

  return null;
}

/**
 * Comprehensive period detection for an uploaded file
 */
export function detectPeriod(
  fileName: string,
  sheetNames: string[] = [],
  rows: Record<string, any>[] = [],
  category?: DatabaseCategory,
  dateColName?: string
): DetectedPeriod {
  // 1. Try detecting from actual rows (highest factual accuracy)
  const fromRows = detectPeriodFromRows(rows, dateColName);
  if (fromRows) {
    return createDetectedPeriod(fromRows.year, fromRows.month);
  }

  // 2. Try detecting from file name
  const fromFileName = detectPeriodFromText(fileName);
  if (fromFileName) {
    return createDetectedPeriod(fromFileName.year, fromFileName.month);
  }

  // 3. Try detecting from sheet names
  for (const sheet of sheetNames) {
    const fromSheet = detectPeriodFromText(sheet);
    if (fromSheet) {
      return createDetectedPeriod(fromSheet.year, fromSheet.month);
    }
  }

  // 4. Fallback based on category
  if (category === 'previous_month') {
    return createDetectedPeriod(2026, 9); // SEPTEMBER 2026
  }
  if (category === 'current_month' || category === 'target_salesman') {
    return createDetectedPeriod(2026, 10); // OKTOBER 2026
  }

  return createDetectedPeriod(2026, 10);
}

function createDetectedPeriod(year: number, month: number): DetectedPeriod {
  const safeMonth = Math.max(1, Math.min(12, month));
  const monthName = INDONESIAN_MONTHS[safeMonth - 1];
  const shortName = SHORT_MONTH_NAMES[safeMonth - 1];
  const padMonth = String(safeMonth).padStart(2, '0');

  return {
    label: `${monthName} ${year}`,
    shortLabel: shortName,
    monthNumber: safeMonth,
    year,
    periodCode: `${year}-${padMonth}`,
  };
}
