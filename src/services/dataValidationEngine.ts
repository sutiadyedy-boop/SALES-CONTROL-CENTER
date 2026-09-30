import { DatabaseCategory, FileValidationResult } from '../types/database';

export const REQUIRED_CANONICAL_KEYS: Record<DatabaseCategory, string[]> = {
  previous_month: ['outlet_id', 'salesman_id', 'transaction_date', 'sales_value'],
  current_month: ['outlet_id', 'salesman_id', 'transaction_date', 'sales_value'],
  target_salesman: ['salesman_id', 'target_value'],
  master_cb: ['outlet_id', 'status_current_month'],
};

export const CANONICAL_LABELS: Record<string, string> = {
  outlet_id: 'Kode Outlet (Primary Key)',
  salesman_id: 'Kode Salesman (Primary Key)',
  transaction_date: 'Tanggal Transaksi',
  sales_value: 'Sales Value (VALUE NETT)',
  invoice_id: 'No Faktur',
  target_value: 'Target Sales Utama',
  status_current_month: 'Status Bulan Ini (STATUS BLN INI)',
};

export function validateUploadedFile(
  category: DatabaseCategory,
  headers: string[],
  mapping: Record<string, string>,
  sampleRows: Record<string, any>[]
): FileValidationResult {
  const required = REQUIRED_CANONICAL_KEYS[category] || [];
  const missingRequiredKeys: string[] = [];
  const unmappedCanonicalKeys: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Check required canonical mappings
  for (const reqKey of required) {
    const mappedHeader = mapping[reqKey];
    if (!mappedHeader || !headers.includes(mappedHeader)) {
      missingRequiredKeys.push(reqKey);
      errors.push(`Kolom wajib "${CANONICAL_LABELS[reqKey] || reqKey}" belum dipetakan.`);
    }
  }

  // 2. Data rows check
  if (!sampleRows || sampleRows.length === 0) {
    errors.push('File tidak memiliki baris data atau sheet kosong.');
  }

  // 3. Category-specific validations
  if (category === 'target_salesman') {
    const targetCol = mapping['target_value'];
    if (targetCol) {
      const upperCol = targetCol.toUpperCase();
      if (upperCol.includes('CSD') || upperCol.includes('NXC') || upperCol.includes('PST')) {
        warnings.push(`Perhatian: Kolom "${targetCol}" terindikasi target SKU spesifik, bukan TARGET sales utama.`);
      }
    }
  }

  if (category === 'previous_month' || category === 'current_month') {
    const valCol = mapping['sales_value'];
    if (valCol) {
      // Check if sample rows have valid numeric values
      let nonNumericCount = 0;
      sampleRows.slice(0, 10).forEach(row => {
        const rawVal = row[valCol];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const num = Number(String(rawVal).replace(/[^0-9\.\,\-]/g, '').replace(',', '.'));
          if (isNaN(num)) nonNumericCount++;
        }
      });
      if (nonNumericCount > 5) {
        warnings.push(`Kolom "${valCol}" memiliki beberapa baris bernilai non-numerik.`);
      }
    }

    if (!mapping['invoice_id']) {
      warnings.push('Kolom "No Faktur" belum dipetakan. Deduplikasi akan menggunakan fallback kombinasi (Tgl + Outlet + Sales).');
    }
  }

  if (category === 'master_cb') {
    const statusCol = mapping['status_current_month'];
    if (statusCol) {
      // Check if "OK" exists in sample rows
      const hasOk = sampleRows.some(row => {
        const val = String(row[statusCol] ?? '').trim().toUpperCase();
        return val === 'OK';
      });
      if (!hasOk && sampleRows.length > 0) {
        warnings.push(`Nilai "OK" tidak terdeteksi pada 10 baris pertama kolom "${statusCol}". Pastikan aturan Status Aktif sesuai di Pengaturan.`);
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    missingRequiredKeys,
    unmappedCanonicalKeys,
    warnings,
    errors,
  };
}
