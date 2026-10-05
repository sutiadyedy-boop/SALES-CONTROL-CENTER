import { 
  AppSettings, 
  DatabaseCategory, 
  MasterOutletRecord, 
  TargetRecord, 
  TransactionRecord 
} from '../types/database';

/**
 * Clean string: trim, remove non-printable characters, unify whitespace
 */
export function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

/**
 * Parse numeric values safely from Indonesian/US Excel formats:
 * e.g. "1.500.000,00" or "1,500,000.00" or 1500000 or "-12000"
 */
export function parseNumeric(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  let str = String(val).trim();
  if (!str) return 0;

  // Handle accounting parentheses: "(1000)" -> "-1000"
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.substring(1, str.length - 1);
  }

  // Remove currency signs or symbols and whitespace
  str = str.replace(/Rp\s*|IDR\s*|\$/gi, '').replace(/[\s\u00A0]/g, '').trim();

  // Check if formatted like European/Indonesian (1.234.567,89) or US (1,234,567.89)
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // European/Indonesian: dot is thousand separator, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US standard: comma is thousand separator, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // If has comma only, e.g. "1500,50" -> "1500.50" or thousand "1,500"
    const commaParts = str.split(',');
    if (commaParts.length === 2 && commaParts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      // Multiple dots like "2.750.000" -> all are thousand separators
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2 && dotParts[1].length === 3) {
      // Exactly 3 digits like "2.750" in Indonesian currency
      str = str.replace(/\./g, '');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Format Date to readable YYYY-MM-DD without any timezone offset corruption
 */
export function formatDate(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  // 1. If it's a JavaScript Date object (e.g. from SheetJS cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    // SheetJS timezone bug correction:
    // In UTC+7 (WIB) / UTC+8 (WITA), SheetJS subtracts the timezone offset of 1899,
    // which puts midnight dates at 15:59 or 16:00 on the preceding day in UTC.
    // Adding 12 hours (midday) safely shifts it into the exact calendar day in UTC.
    const midday = new Date(val.getTime() + 12 * 3600 * 1000);
    const y = midday.getUTCFullYear();
    const m = String(midday.getUTCMonth() + 1).padStart(2, '0');
    const d = String(midday.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. If it's an Excel serial number e.g. 46299 or "46299"
  const str = String(val).trim();
  const numericVal = parseFloat(str);
  if (!isNaN(numericVal) && numericVal > 30000 && numericVal < 60000) {
    // 25569 = days between 1900-01-01 and 1970-01-01 (Excel 1900 leap-year system)
    const utcMs = Math.round((numericVal - 25569) * 86400 * 1000);
    const date = new Date(utcMs);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // 3. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  // 5. DD/MM/YY or DD-MM-YY (2-digit year)
  const ddmmyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
  if (ddmmyy) {
    const d = ddmmyy[1].padStart(2, '0');
    const m = ddmmyy[2].padStart(2, '0');
    let y = parseInt(ddmmyy[3], 10);
    y = y < 50 ? 2000 + y : 1900 + y;
    return `${y}-${m}-${d}`;
  }

  // 6. Text date format e.g. "04-OKT-2026", "4 Oktober 2026", "04-SEP-26"
  const upper = str.toUpperCase();
  const ID_MONTHS = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const ENG_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const dayMatch = upper.match(/^(\d{1,2})[\s\-_]/);
  if (dayMatch) {
    const dayNum = parseInt(dayMatch[1], 10);
    for (let mi = 0; mi < 12; mi++) {
      if (upper.includes(ID_MONTHS[mi]) || upper.includes(SHORT_MONTHS[mi]) || upper.includes(ENG_SHORT[mi])) {
        const year4M = upper.match(/\b(20\d{2}|19\d{2})\b/);
        let yearNum = 2026;
        if (year4M) {
          yearNum = parseInt(year4M[1], 10);
        } else {
          const parts = upper.split(/[\s\-_]+/);
          const lastPart = parts[parts.length - 1];
          if (/^\d{2}$/.test(lastPart)) {
            const rawY = parseInt(lastPart, 10);
            yearNum = rawY < 50 ? 2000 + rawY : 1900 + rawY;
          }
        }
        return `${yearNum}-${String(mi + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }
  }

  return str.split('T')[0];
}

/**
 * Normalize an array of raw rows into TransactionRecord[]
 */
export function normalizeTransactionRecords(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  sourceFileName: string,
  periodCode: string,
  periodLabel: string,
  settings: AppSettings
): { records: TransactionRecord[]; duplicateCount: number } {
  const records: TransactionRecord[] = [];
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  // Determine Sales Value column
  // Prioritize VALEU or GROSS or VALUE as requested by business rules when unmapped
  let salesValueCol = mapping['sales_value'] || '';
  
  // If not mapped or mapped column does not exist in row data, check if row headers contain VALEU, GROSS, VALUE, etc.
  const sampleRow = rows.find(r => r && Object.keys(r).length > 0) || {};
  const rowKeys = Object.keys(sampleRow);
  
  if (!salesValueCol || sampleRow[salesValueCol] === undefined) {
    const grossKey = rowKeys.find(k => {
      const cleaned = k.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim();
      return ['VALEU', 'VALUE', 'GROSS', 'VALUE GROSS', 'VALEU GROSS', 'GROSS VALUE', 'TOTAL GROSS', 'GROSS SALES', 'VAL GROSS', 'NILAI GROSS'].includes(cleaned);
    });
    if (grossKey) {
      salesValueCol = grossKey;
    } else if (!salesValueCol) {
      salesValueCol = 'VALUE NETT';
    }
  }
  const outletIdCol = mapping['outlet_id'] || 'KODE OUTLET';
  const outletNameCol = mapping['outlet_name'] || 'NAMA OUTLET';
  const salesmanIdCol = mapping['salesman_id'] || 'KODE SALESMAN';
  const salesmanNameCol = mapping['salesman_name'] || 'NAMA SALESMAN';
  const dateCol = mapping['transaction_date'] || 'TGL';
  const invoiceCol = mapping['invoice_id'] || 'NO FAKTUR';
  const qtyCol = mapping['qty'] || 'QTY';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    // SALES VALUE: Read designated column, with fallback to common sales value aliases (VALEU / GROSS prioritized)
    let rawSales = row[salesValueCol];
    if (rawSales === undefined || rawSales === null || rawSales === '') {
      // Check case-insensitive match for salesValueCol
      const cleanTarget = salesValueCol.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim();
      for (const k of Object.keys(row)) {
        if (k.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim() === cleanTarget && row[k] !== undefined && row[k] !== null && row[k] !== '') {
          rawSales = row[k];
          break;
        }
      }
    }

    if (rawSales === undefined || rawSales === null || rawSales === '') {
      for (const alias of [
        'VALEU', 'VALUE', 'GROSS', 'VALUE GROSS', 'VALEU GROSS', 'GROSS VALUE', 'TOTAL GROSS',
        'GROSS SALES', 'VAL GROSS', 'VALEU_GROSS', 'VALUE_GROSS', 'NILAI GROSS', 'GROSS AMOUNT',
        'VALEU NETT', 'VALUE NETT', 'VALUE_NETT', 'VAL NETT', 'TOTAL NETT', 'JUMLAH NETT',
        'NETT', 'NETTO', 'TOTAL', 'TOTAL SALES', 'AMOUNT', 'JUMLAH',
        'DPP', 'SUBTOTAL', 'SUB TOTAL', 'NOMINAL', 'OMSET', 'OMZET', 'PENJUALAN', 'TOTAL RP'
      ]) {
        if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
          rawSales = row[alias];
          break;
        }
        // Also check case-insensitive match for alias
        const cleanAlias = alias.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim();
        for (const k of Object.keys(row)) {
          if (k.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim() === cleanAlias && row[k] !== undefined && row[k] !== null && row[k] !== '') {
            rawSales = row[k];
            break;
          }
        }
        if (rawSales !== undefined && rawSales !== null && rawSales !== '') break;
      }
    }
    const salesVal = parseNumeric(rawSales || 0);

    // Primary key priorities for Outlet ID
    let rawOutletId = cleanString(row[outletIdCol]);
    if (!rawOutletId) {
      for (const alias of [
        'KODE OUTLET', 'KD OUTLET', 'KD_OUTLET', 'KODE TOKO', 'KODETOKO',
        'ID OUTLET', 'KODE_OUTLET', 'OUTLET CODE', 'CUSTOMER CODE', 'KODE CUST',
        'CUST CODE', 'KODECUST', 'ID_OUTLET', 'KODE PELANGGAN', 'NO PELANGGAN', 'ACCOUNT'
      ]) {
        if (row[alias]) {
          rawOutletId = cleanString(row[alias]);
          break;
        }
      }
    }

    // If outlet ID is completely missing and row has 0 sales, skip. Otherwise keep so sales value is counted.
    const outletId = rawOutletId || (salesVal > 0 ? `OUTLET-LINE-${i + 1}` : '');
    if (!outletId && salesVal === 0) continue;

    const outletName = cleanString(row[outletNameCol] || row['NAMA OUTLET'] || row['NM OUTLET'] || row['NAMA TOKO'] || outletId);
    
    // Salesman key priority: KODE SALESMAN -> NIK SALESMAN -> NAMA SALESMAN
    let rawSalesmanId = cleanString(row[salesmanIdCol]);
    if (!rawSalesmanId) {
      for (const alias of [
        'KD_SLS', 'KD SLS', 'KODE SALESMAN', 'KODESLS', 'KODE_SALESMAN', 
        'SALESMAN CODE', 'ID SALESMAN', 'NIK SALESMAN', 'NIK', 'KODE SLS', 'SALES ID'
      ]) {
        if (row[alias]) {
          rawSalesmanId = cleanString(row[alias]);
          break;
        }
      }
    }
    const rawSalesmanName = cleanString(row[salesmanNameCol] || row['NM_SLS'] || row['NAMA SALESMAN'] || '');
    const salesmanId = rawSalesmanId || rawSalesmanName || 'SALESMAN-UNASSIGNED';
    const salesmanName = rawSalesmanName || salesmanId;
    const salesmanNik = cleanString(row['NIK SALESMAN'] || row['NIK'] || '');

    // Date value lookup: read mapped dateCol, then search date aliases
    let rawDateVal = row[dateCol];
    if (rawDateVal === undefined || rawDateVal === null || rawDateVal === '') {
      const DATE_ALIASES = [
        'TGL', 'TANGGAL', 'DATE', 'TRANSACTION DATE', 'TRANS DATE', 
        'TGL TRANS', 'TGL FAKTUR', 'INVOICE DATE', 'TANGGAL TRANSAKSI', 
        'TGL_FAKTUR', 'TGL_TRANS', 'TGL_TRX', 'TRANS_DATE', 'TGL TRN', 
        'TGL TRX', 'INVOICE_DATE'
      ];
      for (const alias of DATE_ALIASES) {
        if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
          rawDateVal = row[alias];
          break;
        }
      }
      if (rawDateVal === undefined || rawDateVal === null || rawDateVal === '') {
        const rowKeys = Object.keys(row);
        for (const k of rowKeys) {
          const cleanK = k.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim();
          if (DATE_ALIASES.includes(cleanK) && row[k] !== undefined && row[k] !== null && row[k] !== '') {
            rawDateVal = row[k];
            break;
          }
        }
      }
    }
    const dateStr = formatDate(rawDateVal);
    const invoiceId = cleanString(row[invoiceCol] || row['NO FAKTUR'] || row['NO_FAKTUR'] || `INV-${i + 1}`);
    const qty = parseNumeric(row[qtyCol] || row['QTY'] || 0);
    const grossVal = parseNumeric(row['VALEU'] || row['GROSS'] || row['VALUE'] || row['VALUE GROSS'] || row['VALEU GROSS'] || row['TOTAL GROSS'] || salesVal);
    const productCode = cleanString(row['KODE BARANG'] || row['KD_BRG'] || row['ITEM CODE'] || '');
    const productName = cleanString(row['NAMA BARANG'] || row['NM_BRG'] || row['ITEM NAME'] || '');
    const area = cleanString(row[mapping['area'] || ''] || row['AREA'] || row['WILAYAH'] || row['KOTA'] || row['REGION'] || row['PMA / AREA'] || row['AREA / PMA'] || '');
    const pma = cleanString(row[mapping['pma'] || ''] || row['PMA'] || row['STATUS PMA'] || row['PMA STATUS'] || '');
    const rayon = cleanString(row[mapping['rayon'] || ''] || row['RAYON'] || row['SEKTOR'] || '');
    const channel = cleanString(row[mapping['channel'] || ''] || row['CHANNEL'] || '');
    let rawMarkNew = cleanString(
      row['MARK NEW'] || 
      row['MARK_NEW'] || 
      row['MARKNEW'] || 
      row['MARK'] || 
      row['MARKING'] || 
      row['BY ECERAN'] || 
      row['TIPE ECERAN'] || 
      row['KATEGORI ECERAN'] || 
      row[mapping['mark_new'] || ''] || 
      ''
    );
    if (!rawMarkNew) {
      for (const k of Object.keys(row)) {
        const cleanK = k.toUpperCase().trim().replace(/[\s_]+/g, ' ');
        if (cleanK === 'MARK NEW' || cleanK === 'MARKNEW' || cleanK === 'MARK' || cleanK === 'MARKING' || cleanK === 'BY ECERAN' || cleanK === 'KATEGORI ECERAN') {
          rawMarkNew = cleanString(row[k]);
          if (rawMarkNew) break;
        }
      }
    }
    const markNew = rawMarkNew;
    const fc = cleanString(row[mapping['fc'] || ''] || row['FC'] || '');
    const cabang = cleanString(row[mapping['cabang'] || ''] || row['CABANG'] || row['CB'] || '');
    const depo = cleanString(row[mapping['depo'] || ''] || row['DEPO'] || '');

    // Duplicate check key based on settings:
    // IMPORTANT: Multiple line items belonging to the same invoice MUST NOT be dropped as duplicates!
    let dedupKey = '';
    if (settings.keyPriority.transactionKey === 'INVOICE_ONLY') {
      // Deduplicate identical line items within the same invoice
      dedupKey = `${periodCode}_${invoiceId}_${outletId}_${productCode || productName || qty}_${salesVal}`;
    } else if (settings.keyPriority.transactionKey === 'INVOICE_OUTLET_ITEM') {
      dedupKey = `${periodCode}_${invoiceId}_${outletId}_${productCode || productName || qty || salesVal}`;
    } else {
      dedupKey = `${periodCode}_${dateStr}_${outletId}_${productCode || productName}_${salesVal}_${invoiceId}`;
    }

    if (seenKeys.has(dedupKey)) {
      duplicateCount++;
      continue; // Skip true duplicate transaction
    }
    seenKeys.add(dedupKey);

    records.push({
      id: `${periodCode}-${i}-${outletId}-${Math.random().toString(36).substring(2, 5)}`,
      outletId,
      outletName,
      salesmanId,
      salesmanName,
      salesmanNik,
      transactionDate: dateStr,
      qty,
      salesValue: salesVal,
      grossValue: grossVal,
      invoiceId,
      productCode,
      productName,
      sourceFile: sourceFileName,
      period: periodCode,
      periodLabel,
      area: area || undefined,
      pma: pma || undefined,
      rayon: rayon || undefined,
      channel: channel || undefined,
      markNew: markNew || undefined,
      fc: fc || undefined,
      cabang: cabang || undefined,
      depo: depo || undefined,
    });
  }

  return { records, duplicateCount };
}

/**
 * Normalize Target rows into TargetRecord[]
 * Rule 10: TARGET SALES = column TARGET. Do not sum SKU columns.
 */
export function normalizeTargetRecords(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  sourceFileName: string,
  periodCode: string,
  periodLabel: string
): TargetRecord[] {
  const records: TargetRecord[] = [];
  const seenSalesmen = new Set<string>();

  const salesmanIdCol = mapping['salesman_id'] || 'KD_SLS';
  const salesmanNameCol = mapping['salesman_name'] || 'NM_SLS';
  const targetCol = mapping['target_value'] || 'TARGET';
  const areaCol = mapping['area'] || 'AREA';
  const statusCol = mapping['salesman_status'] || 'STATUS SALESMAN';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const salesmanId = cleanString(row[salesmanIdCol] || row['KD_SLS'] || row['KODE SALESMAN'] || '');
    if (!salesmanId) continue;

    if (seenSalesmen.has(salesmanId)) {
      // If duplicate target in same file, keep latest or aggregate
      continue;
    }
    seenSalesmen.add(salesmanId);

    const salesmanName = cleanString(row[salesmanNameCol] || row['NM_SLS'] || salesmanId);
    const targetVal = parseNumeric(row[targetCol] || row['TARGET'] || 0);
    const area = cleanString(row[areaCol] || row['AREA'] || row['CB'] || '');
    const pmaCol = mapping['pma'] || 'PMA';
    const pma = cleanString(row[pmaCol] || row['PMA'] || row['STATUS PMA'] || '');
    const cb = cleanString(row['CB'] || '');
    const salesmanStatus = cleanString(row[statusCol] || row['STATUS SALESMAN'] || 'ACTIVE');

    // Extract any SKU targets for breakdown if present
    const skuTargets: Record<string, number> = {};
    for (const [key, val] of Object.entries(row)) {
      const upperKey = key.toUpperCase();
      if (upperKey.includes('TARGET') && upperKey !== 'TARGET' && upperKey !== 'TOTAL TARGET' && upperKey !== 'TARGET SALES') {
        skuTargets[key] = parseNumeric(val);
      }
    }

    records.push({
      id: `TRG-${periodCode}-${salesmanId}`,
      salesmanId,
      salesmanName,
      area,
      pma: pma || undefined,
      cb,
      salesmanStatus,
      targetValue: targetVal,
      skuTargets,
      period: periodCode,
      periodLabel,
      sourceFile: sourceFileName,
    });
  }

  return records;
}

/**
 * Normalize Master CB / ROA rows into MasterOutletRecord[]
 * Rule 5: STATUS BLN INI = "OK" -> OUTLET_ACTIVE = TRUE. Configurable via settings.
 */
export function normalizeMasterOutletRecords(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  sourceFileName: string,
  settings: AppSettings
): MasterOutletRecord[] {
  const recordsMap = new Map<string, MasterOutletRecord>();

  const outletIdCol = mapping['outlet_id'] || 'KODE OUTLET';
  const outletNameCol = mapping['outlet_name'] || 'NAMA OUTLET';
  const statusCol = mapping['status_current_month'] || 'STATUS BLN INI';
  const channelCol = mapping['channel'] || 'CHANNEL';
  const rayonCol = mapping['rayon'] || 'RAYON';
  const areaCol = mapping['area'] || 'AREA';
  const fcCol = mapping['fc'] || 'FC';
  const pmaCol = mapping['pma'] || 'PMA';
  const scCol = mapping['sc'] || 'SC';
  const salesmanIdCol = mapping['salesman_id'] || 'KD_SLS';
  const salesmanNameCol = mapping['salesman_name'] || 'NAMA_SLS';
  const cabangCol = mapping['cabang'] || 'CABANG';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Priority: KODE OUTLET, fallback KD OUTLET
    const outletId = cleanString(
      row[outletIdCol] || 
      row['KODE OUTLET'] || 
      row['KD OUTLET'] || 
      row['KD_OUTLET'] || 
      ''
    );
    if (!outletId) continue;

    const outletName = cleanString(row[outletNameCol] || row['NAMA OUTLET'] || row['NM OUTLET'] || outletId);
    const rawStatus = cleanString(row[statusCol] || row['STATUS BLN INI'] || row['STATUS'] || '');

    // Active rule evaluation
    let isActive = false;
    const rule = settings.outletActiveRule;
    const testVal = rule.caseInsensitive ? rawStatus.toUpperCase() : rawStatus;
    const expected = rule.caseInsensitive ? rule.expectedValue.toUpperCase() : rule.expectedValue;

    if (rule.operator === 'equals') {
      isActive = testVal === expected;
    } else if (rule.operator === 'contains') {
      isActive = testVal.includes(expected);
    } else if (rule.operator === 'not_empty') {
      isActive = rawStatus !== '';
    }

    const channel = cleanString(row[channelCol] || row['CHANNEL'] || '');
    const rayon = cleanString(row[rayonCol] || row['RAYON'] || '');
    const area = cleanString(row[areaCol] || row['AREA'] || '');
    const fc = cleanString(row[fcCol] || row['FC'] || '');
    const pma = cleanString(row[pmaCol] || row['PMA'] || '');
    const sc = cleanString(row[scCol] || row['SC'] || '');
    const salesmanId = cleanString(row[salesmanIdCol] || row['KD_SLS'] || row['KODE SALESMAN'] || '');
    const salesmanName = cleanString(row[salesmanNameCol] || row['NAMA_SLS'] || row['NAMA SALESMAN'] || '');
    const cabang = cleanString(row[cabangCol] || row['CABANG'] || '');

    // Deduplicate master by OUTLET_ID, updating if newer or keeping first
    if (!recordsMap.has(outletId)) {
      recordsMap.set(outletId, {
        outletId,
        outletName,
        channel,
        fc,
        rayon,
        salesmanId,
        salesmanName,
        statusCurrentMonth: rawStatus,
        isActive,
        sc,
        pma,
        area,
        cabang,
        sourceFile: sourceFileName,
      });
    }
  }

  return Array.from(recordsMap.values());
}

const MONTH_NAMES_ID = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

/**
 * Auto-detect period label (e.g. "SEPTEMBER 2026", "OKTOBER 2026") from transaction dates.
 */
export function detectPeriodFromTransactions(
  transactions: { transactionDate?: string }[],
  fallback: string = 'AGUSTUS 2026'
): string {
  if (!transactions || transactions.length === 0) return fallback;
  const countMap = new Map<string, number>();

  for (const t of transactions) {
    if (!t.transactionDate) continue;
    const str = String(t.transactionDate).trim();
    let year = '';
    let month = -1;

    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts[0].length === 4) {
        year = parts[0];
        month = parseInt(parts[1], 10) - 1;
      } else if (parts[2] && parts[2].length === 4) {
        year = parts[2];
        month = parseInt(parts[1], 10) - 1;
      }
    } else if (str.includes('/')) {
      const parts = str.split('/');
      if (parts[2] && parts[2].length === 4) {
        year = parts[2];
        month = parseInt(parts[1], 10) - 1;
      } else if (parts[0].length === 4) {
        year = parts[0];
        month = parseInt(parts[1], 10) - 1;
      }
    }

    if (year && month >= 0 && month < 12) {
      const key = `${MONTH_NAMES_ID[month]} ${year}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }
  }

  if (countMap.size === 0) return fallback;

  let best = fallback;
  let max = -1;
  countMap.forEach((count, key) => {
    if (count > max) {
      max = count;
      best = key;
    }
  });

  return best;
}

/**
 * Returns the number of days in a given period string (e.g. "SEPTEMBER 2026" -> 30).
 */
export function getDaysInPeriod(periodStr: string): number {
  if (!periodStr) return 31;
  const upper = periodStr.toUpperCase();
  if (upper.includes('APR') || upper.includes('JUN') || upper.includes('SEP') || upper.includes('NOV')) {
    return 30;
  }
  if (upper.includes('FEB')) {
    const yearMatch = upper.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeap ? 29 : 28;
  }
  return 31;
}

