import * as XLSX from 'xlsx';
import { DatabaseCategory, RawUploadedFile } from '../types/database';
import { detectPeriod } from './periodDetectionService';

export interface ParsedSheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

/**
 * Heuristic to detect the header row in a raw sheet matrix:
 * Finds the row index that has the highest count of text cells matching typical business field keywords.
 */
function findHeaderRowIndex(matrix: any[][]): number {
  if (!matrix || matrix.length === 0) return 0;

  const KEYWORDS = [
    'KODE', 'OUTLET', 'SALESMAN', 'SLS', 'KD', 'NAMA', 'TGL', 'DATE', 'VALUE', 'NETT',
    'FAKTUR', 'TARGET', 'STATUS', 'CHANNEL', 'RAYON', 'AREA', 'QTY', 'CB', 'PMA'
  ];

  let bestIndex = 0;
  let bestScore = -1;

  // Search first 15 rows
  const maxSearchRows = Math.min(matrix.length, 15);
  for (let r = 0; r < maxSearchRows; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    let nonBlankCells = 0;

    for (const cell of row) {
      if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
        nonBlankCells++;
        const cellStr = String(cell).toUpperCase();
        for (const kw of KEYWORDS) {
          if (cellStr.includes(kw)) {
            score += 2;
          }
        }
      }
    }

    // Weight by score and proportion of non-blank strings
    const finalScore = score + (nonBlankCells > 3 ? 2 : 0);
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestIndex = r;
    }
  }

  return bestIndex;
}

/**
 * Parse an Excel file (ArrayBuffer) into sheet names and extract default sheet rows
 */
export async function parseExcelFile(
  file: File,
  category: DatabaseCategory
): Promise<RawUploadedFile> {
  // Security Guard: File size limit protection against excessive memory exhaustion (max 50 MB)
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal keamanan 50 MB.`);
  }

  // Security Guard: Filename sanitization against path traversal / dangerous symbols
  const safeFileName = file.name.replace(/[/\\?%*:|"<>]/g, '_').trim();

  let workbook: XLSX.WorkBook;
  try {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  } catch {
    throw new Error(`File "${safeFileName}" rusak, korup, atau bukan format spreadsheet Excel yang valid.`);
  }

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  // Determine best default sheet: prefer sheet with keywords or sheet with most data
  let selectedSheet = sheetNames[0];
  const preferredSheet = sheetNames.find(s => {
    const upper = s.toUpperCase();
    if (category === 'target_salesman') return upper.includes('TARGET') || upper.includes('SC');
    if (category === 'master_cb') return upper.includes('MASTER') || upper.includes('CB') || upper.includes('ROA');
    if (category === 'previous_month' || category === 'current_month') return upper.includes('DBASE') || upper.includes('DATA') || upper.includes('TRANS');
    return false;
  });
  if (preferredSheet) {
    selectedSheet = preferredSheet;
  }

  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Sheet "${selectedSheet}" tidak ditemukan dalam file.`);
  }
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (matrix.length === 0) {
    throw new Error(`Sheet "${selectedSheet}" dalam file ${safeFileName} kosong.`);
  }

  const headerRowIdx = findHeaderRowIndex(matrix);
  const rawHeaders = (matrix[headerRowIdx] || []).map((h: any, idx: number) => {
    const str = String(h ?? '').trim();
    return str || `KOLOM_${idx + 1}`;
  });

  // Extract data rows below header
  const dataRows: Record<string, any>[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
      continue; // Skip empty rows
    }
    const record: Record<string, any> = {};
    rawHeaders.forEach((header: string, colIdx: number) => {
      record[header] = row[colIdx] ?? '';
    });
    dataRows.push(record);
  }

  // Detect period from row dates, filename, or sheet name accurately
  const detected = detectPeriod(file.name, sheetNames, dataRows, category);
  const periodGuess = detected.label;

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: file.name,
    fileName: file.name,
    sheet: selectedSheet,
    rows: dataRows.length,
    columns: rawHeaders.length,
    period: periodGuess,
    status: 'needs_mapping',
    size: file.size,
    uploadTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    category,
    sheetNames,
    selectedSheet,
    rowCount: dataRows.length,
    headers: rawHeaders,
    sampleRows: dataRows.slice(0, 100), // Preview sample
    allRows: dataRows, // Complete dataset for calculation
    mappingConfirmed: false,
    validation: {
      isValid: true,
      missingRequiredKeys: [],
      unmappedCanonicalKeys: [],
      warnings: [],
      errors: [],
    },
  };
}


/**
 * Re-parse a specific sheet from an existing workbook file
 */
export async function parseSpecificSheet(
  file: File,
  sheetName: string
): Promise<ParsedSheetData> {
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Ukuran file melebihi batas maksimal keamanan (50 MB).`);
  }

  const safeFileName = file.name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  let workbook: XLSX.WorkBook;
  try {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  } catch {
    throw new Error(`Gagal membaca lembar kerja Excel pada file "${safeFileName}".`);
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" tidak ditemukan`);
  }

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const headerRowIdx = findHeaderRowIndex(matrix);
  const rawHeaders = (matrix[headerRowIdx] || []).map((h: any, idx: number) => {
    const str = String(h ?? '').trim();
    return str || `KOLOM_${idx + 1}`;
  });

  const dataRows: Record<string, any>[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
      continue;
    }
    const record: Record<string, any> = {};
    rawHeaders.forEach((header: string, colIdx: number) => {
      record[header] = row[colIdx] ?? '';
    });
    dataRows.push(record);
  }

  return {
    sheetName,
    headers: rawHeaders,
    rows: dataRows,
    totalRows: dataRows.length,
  };
}
