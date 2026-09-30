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
 * Format Date to readable YYYY-MM-DD
 */
export function formatDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // Check Excel serial number (e.g. 45890)
  const numericVal = Number(str);
  if (!isNaN(numericVal) && numericVal > 30000 && numericVal < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numericVal * 86400000);
    return date.toISOString().split('T')[0];
  }

  // Standard YYYY-MM-DD or DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
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

    const dateStr = formatDate(row[dateCol] || row['TGL'] || row['DATE']);
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
