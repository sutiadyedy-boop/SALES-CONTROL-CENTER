import { ColumnMappingDefinition, DatabaseCategory } from '../types/database';

export const MAPPING_DICTIONARY: Record<string, { label: string; aliases: string[]; required: boolean }> = {
  // Common Keys
  outlet_id: {
    label: 'Kode Outlet (Primary Key)',
    aliases: [
      'KODE OUTLET', 'KD OUTLET', 'KD_OUTLET', 'OUTLET CODE', 'CUSTOMER CODE', 'ID OUTLET', 
      'KODE_OUTLET', 'OUTLET_ID', 'KODE CUST', 'CUST CODE', 'KODECUST', 'KODE TOKO', 'KODETOKO',
      'ID_OUTLET', 'KODE PELANGGAN', 'KODEPELANGGAN', 'NO PELANGGAN', 'NO OUTLET', 'KD CUST', 'KD_CUST', 'ACCOUNT'
    ],
    required: true,
  },
  outlet_name: {
    label: 'Nama Outlet',
    aliases: ['NAMA OUTLET', 'NM OUTLET', 'OUTLET NAME', 'CUSTOMER NAME', 'NAMA TOKO', 'NAMA_OUTLET', 'NAMA CUST', 'CUST NAME', 'TOKO', 'PELANGGAN'],
    required: false,
  },
  salesman_id: {
    label: 'Kode Salesman (Primary Key)',
    aliases: [
      'KODE SALESMAN', 'KD_SLS', 'KD SLS', 'KODESLS', 'KODE_SALESMAN', 'SALESMAN CODE', 'ID SALESMAN', 
      'NIK SALESMAN', 'NIK_SALESMAN', 'NIK', 'KODE SLS', 'SALES ID', 'SALES_ID', 'ID_SALES', 'KD SALES'
    ],
    required: true,
  },
  salesman_name: {
    label: 'Nama Salesman',
    aliases: ['NAMA SALESMAN', 'NM_SLS', 'NM SLS', 'SALESMAN NAME', 'NAMA_SLS', 'NAMA SALES', 'NAMA_SALESMAN', 'NAMA', 'SALES'],
    required: false,
  },
  transaction_date: {
    label: 'Tanggal Transaksi',
    aliases: ['TGL', 'TANGGAL', 'DATE', 'TRANSACTION DATE', 'TRANS DATE', 'TGL TRANS', 'TGL FAKTUR', 'INVOICE DATE', 'TANGGAL TRANSAKSI', 'TGL_FAKTUR', 'TGL_TRANS'],
    required: true,
  },
  sales_value: {
    label: 'Sales Value / Realisasi (VALEU / VALUE / GROSS)',
    aliases: [
      'VALEU', 'VALUE', 'GROSS', 'VALUE GROSS', 'VALEU GROSS', 'GROSS VALUE', 'TOTAL GROSS', 
      'GROSS SALES', 'VAL GROSS', 'VALEU_GROSS', 'VALUE_GROSS', 'NILAI GROSS', 'GROSS AMOUNT',
      'VALEU NETT', 'VALUE NETT', 'VALUE_NETT', 'VAL NETT', 'NETT SALES', 'SALES VALUE', 'NET VALUE', 
      'REALISASI', 'NETT EXCL PPN', 'TOTAL NETT', 'JUMLAH NETT', 'TOTAL', 
      'NETTO', 'AMOUNT', 'JUMLAH', 'JUMLAH RP', 'TOTAL SALES', 'TOTAL VALUE', 'DPP', 
      'SUBTOTAL', 'SUB TOTAL', 'NOMINAL', 'OMSET', 'OMZET', 'PENJUALAN', 'TOTAL RP'
    ],
    required: true,
  },
  invoice_id: {
    label: 'No Faktur (Transaction Key)',
    aliases: ['NO FAKTUR', 'NO_FAKTUR', 'NOFAKTUR', 'INVOICE NO', 'INVOICE ID', 'NO NOTA', 'FAKTUR', 'NOMOR FAKTUR', 'INV NO'],
    required: false,
  },
  qty: {
    label: 'Qty / Volume',
    aliases: ['QTY', 'QUANTITY', 'JUMLAH', 'VOL', 'VOLUME', 'QTY PCS', 'QTY CTN', 'TOTAL QTY'],
    required: false,
  },
  
  // Target fields
  target_value: {
    label: 'Target Sales Utama',
    aliases: ['TARGET', 'TARGET VALUE', 'TARGET SALES', 'NILAI TARGET', 'TARGET_SALES', 'TOT TARGET', 'TOTAL TARGET'],
    required: true,
  },
  salesman_status: {
    label: 'Status Salesman',
    aliases: ['STATUS SALESMAN', 'STATUS_SALESMAN', 'STATUS SLS', 'STATUS'],
    required: false,
  },
  
  // Master CB/ROA fields
  status_current_month: {
    label: 'Status Bulan Ini (Active Indicator)',
    aliases: ['STATUS BLN INI', 'STATUS_BLN_INI', 'STATUS BULAN INI', 'STATUS BLN', 'STATUS', 'STATUS OUTLET', 'AKTIF / TIDAK'],
    required: true,
  },
  channel: {
    label: 'Channel',
    aliases: ['CHANNEL', 'SALES CHANNEL', 'KATEGORI OUTLET', 'SEGMEN', 'TIPE CHANNEL'],
    required: false,
  },
  rayon: {
    label: 'Rayon / Sub Area',
    aliases: ['RAYON', 'SEKTOR', 'SUB AREA', 'RAYON CODE', 'KD RAYON'],
    required: false,
  },
  area: {
    label: 'Area / Wilayah',
    aliases: ['AREA', 'WILAYAH', 'KOTA', 'REGION', 'DEPO AREA', 'CB'],
    required: false,
  },
  fc: {
    label: 'FC (Frequency Call)',
    aliases: ['FC', 'FREQUENCY', 'FREKUENSI', 'CALL FREQUENCY', 'FC OUTLET'],
    required: false,
  },
  pma: {
    label: 'PMA',
    aliases: ['PMA', 'PMA STATUS', 'STATUS PMA'],
    required: false,
  },
  sc: {
    label: 'SC',
    aliases: ['SC', 'SALES CANVASSER', 'SALES CHANNEL'],
    required: false,
  },
  cabang: {
    label: 'Cabang / Depo',
    aliases: ['CABANG', 'DEPO', 'BRANCH', 'KODE CABANG'],
    required: false,
  },
  mark_new: {
    label: 'MARK NEW (By Eceran)',
    aliases: ['MARK NEW', 'MARK_NEW', 'MARKNEW', 'MARK', 'MARKING', 'BY ECERAN', 'ECERAN', 'KATEGORI ECERAN', 'TIPE ECERAN'],
    required: false,
  },
};

const REQUIRED_FIELDS_BY_CATEGORY: Record<DatabaseCategory, string[]> = {
  previous_month: ['outlet_id', 'salesman_id', 'transaction_date', 'sales_value', 'invoice_id'],
  current_month: ['outlet_id', 'salesman_id', 'transaction_date', 'sales_value', 'invoice_id'],
  target_salesman: ['salesman_id', 'target_value'],
  master_cb: ['outlet_id', 'status_current_month'],
};

const OPTIONAL_FIELDS_BY_CATEGORY: Record<DatabaseCategory, string[]> = {
  previous_month: ['outlet_name', 'salesman_name', 'qty', 'mark_new'],
  current_month: ['outlet_name', 'salesman_name', 'qty', 'mark_new'],
  target_salesman: ['salesman_name', 'area', 'salesman_status'],
  master_cb: ['outlet_name', 'salesman_id', 'salesman_name', 'channel', 'rayon', 'area', 'fc', 'pma', 'sc', 'cabang'],
};

// String similarity metric
function cleanHeader(str: string): string {
  return str.toUpperCase().replace(/[_\-\.\s]+/g, ' ').trim();
}

export function autoDetectMappings(
  category: DatabaseCategory,
  headers: string[],
  userSavedMappings: Record<string, string> = {}
): Record<string, ColumnMappingDefinition> {
  const result: Record<string, ColumnMappingDefinition> = {};
  const cleanedHeaders = headers.map(h => ({ original: h, cleaned: cleanHeader(h) }));
  
  const relevantFields = [
    ...REQUIRED_FIELDS_BY_CATEGORY[category],
    ...OPTIONAL_FIELDS_BY_CATEGORY[category],
  ];

  for (const canonical of relevantFields) {
    const dict = MAPPING_DICTIONARY[canonical];
    if (!dict) continue;

    // 1. Check user-saved mapping first
    // Special rule for sales_value: if old saved mapping was 'VALUE NETT' but file contains VALEU or GROSS or VALUE, prioritize VALEU/GROSS
    const hasGrossOrValeuHeader = canonical === 'sales_value' && cleanedHeaders.find(h => 
      ['VALEU', 'VALUE', 'GROSS', 'VALUE GROSS', 'VALEU GROSS', 'GROSS VALUE', 'TOTAL GROSS', 'GROSS SALES'].includes(h.cleaned)
    );

    if (userSavedMappings[canonical] && headers.includes(userSavedMappings[canonical])) {
      if (canonical === 'sales_value' && userSavedMappings[canonical] === 'VALUE NETT' && hasGrossOrValeuHeader) {
        // Automatically switch to the VALEU / GROSS column as requested by business rules
        result[canonical] = {
          canonicalField: canonical,
          label: dict.label,
          required: dict.required,
          priorityAliases: dict.aliases,
          selectedHeader: hasGrossOrValeuHeader.original,
          confidence: 100,
          needsConfirmation: false,
        };
        continue;
      }

      result[canonical] = {
        canonicalField: canonical,
        label: dict.label,
        required: dict.required,
        priorityAliases: dict.aliases,
        selectedHeader: userSavedMappings[canonical],
        confidence: 100,
        needsConfirmation: false,
      };
      continue;
    }

    // 2. Exact match against aliases
    let matchedHeader: string | null = null;
    let confidence = 0;

    for (const alias of dict.aliases) {
      const cleanedAlias = cleanHeader(alias);
      const exactMatch = cleanedHeaders.find(h => h.cleaned === cleanedAlias);
      if (exactMatch) {
        matchedHeader = exactMatch.original;
        confidence = 100;
        break;
      }
    }

    // 3. Fallback: Contains match
    if (!matchedHeader) {
      for (const alias of dict.aliases) {
        const cleanedAlias = cleanHeader(alias);
        const partialMatch = cleanedHeaders.find(h => {
          // Avoid matching target SKU columns like "CSD-E02K TARGET" as main target
          if (canonical === 'target_value') {
            return h.cleaned === 'TARGET' || h.cleaned === 'TARGET VALUE' || h.cleaned === 'TARGET SALES' || h.cleaned === 'NILAI TARGET';
          }
          return h.cleaned.includes(cleanedAlias) || cleanedAlias.includes(h.cleaned);
        });

        if (partialMatch) {
          matchedHeader = partialMatch.original;
          confidence = 85;
          break;
        }
      }
    }

    // 4. Fallback for Target: if column is strictly 'TARGET'
    if (canonical === 'target_value' && !matchedHeader) {
      const exactTarget = headers.find(h => h.trim().toUpperCase() === 'TARGET');
      if (exactTarget) {
        matchedHeader = exactTarget;
        confidence = 100;
      }
    }

    result[canonical] = {
      canonicalField: canonical,
      label: dict.label,
      required: dict.required,
      priorityAliases: dict.aliases,
      selectedHeader: matchedHeader,
      confidence,
      needsConfirmation: dict.required && (!matchedHeader || confidence < 80),
    };
  }

  return result;
}
