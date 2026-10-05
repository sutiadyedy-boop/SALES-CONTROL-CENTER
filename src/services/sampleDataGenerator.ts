import * as XLSX from 'xlsx';
import { 
  MasterOutletRecord, 
  TargetRecord, 
  TransactionRecord 
} from '../types/database';

export function createAuthenticOfficeData() {
  const salesmen = [
    { id: 'SLS-001', name: 'AHMAD HIDAYAT', nik: 'NIK-10291', area: 'BONE KOTA', cb: 'BONE', target: 275000000 },
    { id: 'SLS-002', name: 'BUDI SANTOSO', nik: 'NIK-10292', area: 'BONE UTARA', cb: 'BONE', target: 240000000 },
    { id: 'SLS-003', name: 'CITRA DEWI', nik: 'NIK-10293', area: 'BONE SELATAN', cb: 'BONE', target: 210000000 },
    { id: 'SLS-004', name: 'DANI PRASETYO', nik: 'NIK-10294', area: 'BONE BARAT', cb: 'BONE', target: 260000000 },
    { id: 'SLS-005', name: 'EKO WAHYUDI', nik: 'NIK-10295', area: 'BONE TIMUR', cb: 'BONE', target: 195000000 },
    { id: 'SLS-006', name: 'FAJAR NUGRAHA', nik: 'NIK-10296', area: 'WATAMPONE', cb: 'BONE', target: 290000000 },
    { id: 'SLS-007', name: 'GITA PRATIWI', nik: 'NIK-10297', area: 'TANETE', cb: 'BONE', target: 180000000 },
    { id: 'SLS-008', name: 'HENDRA KURNIA', nik: 'NIK-10298', area: 'SOPPENG PERB', cb: 'BONE', target: 220000000 },
  ];

  const channels = ['GENERAL TRADE', 'SEMI GROSIR', 'GROSIR BESAR', 'MINIMARKET', 'KIOS'];
  const rayons = ['RAYON 1 - PUSAT', 'RAYON 2 - UTARA', 'RAYON 3 - SELATAN', 'RAYON 4 - PESISIR', 'RAYON 5 - PEDALAMAN'];

  // Master Outlets
  const masterOutlets: MasterOutletRecord[] = [];
  const totalOutlets = 120;

  for (let i = 1; i <= totalOutlets; i++) {
    const sls = salesmen[(i - 1) % salesmen.length];
    const outletCode = `BNE-${String(i).padStart(4, '0')}`;
    const channel = channels[i % channels.length];
    const rayon = rayons[i % rayons.length];
    
    // Status bln ini: 85% OK (active), 15% NON AKTIF / TUTUP
    const isOk = i % 7 !== 0;
    const statusBlnIni = isOk ? 'OK' : (i % 2 === 0 ? 'TUTUP SEMENTARA' : 'NON AKTIF');

    masterOutlets.push({
      outletId: outletCode,
      outletName: `TOKO ${['BERKAH', 'MAKMUR', 'REJEKI', 'SUMBER JAYA', 'SEJAHTERA', 'SENTOSA', 'ABADI', 'HARAPAN'][i % 8]} ${i}`,
      channel,
      fc: i % 2 === 0 ? 'W1' : 'W2',
      rayon,
      salesmanId: sls.id,
      salesmanName: sls.name,
      salesmanNik: sls.nik,
      statusCurrentMonth: statusBlnIni,
      isActive: isOk,
      sc: 'SC-1',
      pma: i % 3 === 0 ? 'GOLD' : i % 3 === 1 ? 'SILVER' : 'BRONZE',
      area: sls.area,
      cabang: 'BONE',
      depo: 'DEPO BONE PUSAT',
      sourceFile: '_Master_CB BLK.xlsx',
    });
  }

  // September Transactions (Previous Month)
  // ~80 outlets transacted in September
  const prevTransactions: TransactionRecord[] = [];
  let invoicePrevCounter = 1001;

  for (let i = 1; i <= totalOutlets; i++) {
    // 70% of outlets ordered in September
    if (i % 10 <= 6) {
      const m = masterOutlets[i - 1];
      const orderCount = (i % 3) + 1;
      for (let o = 1; o <= orderCount; o++) {
        const qty = (i * 7 + o * 12) % 40 + 5;
        const netValue = qty * 45000 * ((i % 5) + 2);
        const grossValue = Math.round(netValue * 1.11);
        const day = (o * 7 + (i % 10)) % 28 + 1;

        const markNew = m.channel === 'KIOS' ? 'ECERAN KIOS' : m.channel === 'MINIMARKET' ? 'ECERAN MINIMARKET' : m.channel === 'GENERAL TRADE' ? 'ECERAN WARUNG' : ((i % 2 === 0) ? 'ECERAN TOKO KELONTONG' : 'ECERAN TOKO KECIL');

        prevTransactions.push({
          id: `PREV-${invoicePrevCounter}`,
          outletId: m.outletId,
          outletName: m.outletName,
          salesmanId: m.salesmanId,
          salesmanName: m.salesmanName || '',
          salesmanNik: m.salesmanNik,
          transactionDate: `2026-09-${String(day).padStart(2, '0')}`,
          qty,
          salesValue: netValue,
          grossValue,
          invoiceId: `FAK-SEP-${invoicePrevCounter++}`,
          productCode: `BRG-00${(o % 4) + 1}`,
          productName: `PRODUK REGULER ${(o % 4) + 1}`,
          channel: m.channel,
          markNew,
          sourceFile: 'Dbase BONE - SEPTEMBER.xlsx',
          period: '2026-09',
          periodLabel: 'SEPTEMBER 2026',
        });
      }
    }
  }

  // October Transactions (Current Month)
  // Includes drop outlets (ordered in September, not in October)
  // and new active outlets (not ordered in September, ordered in October)
  const currTransactions: TransactionRecord[] = [];
  let invoiceCurrCounter = 5001;

  for (let i = 1; i <= totalOutlets; i++) {
    const isPrevTransacted = i % 10 <= 6;
    let shouldTransactCurr = false;

    if (isPrevTransacted) {
      // 20% of previous transacting outlets DROP in October (DROP OUTLET!)
      shouldTransactCurr = (i % 5 !== 0);
    } else {
      // 30% of previous non-transacting outlets START in October (NEW ACTIVE!)
      shouldTransactCurr = (i % 3 === 0);
    }

    if (shouldTransactCurr) {
      const m = masterOutlets[i - 1];
      const orderCount = (i % 3) + 1;
      for (let o = 1; o <= orderCount; o++) {
        const qty = (i * 9 + o * 14) % 45 + 6;
        const netValue = qty * 48000 * ((i % 5) + 2);
        const grossValue = Math.round(netValue * 1.11);
        const day = (o * 8 + (i % 9)) % 24 + 1;

        const markNew = m.channel === 'KIOS' ? 'ECERAN KIOS' : m.channel === 'MINIMARKET' ? 'ECERAN MINIMARKET' : m.channel === 'GENERAL TRADE' ? 'ECERAN WARUNG' : ((i % 2 === 0) ? 'ECERAN TOKO KELONTONG' : 'ECERAN TOKO KECIL');

        currTransactions.push({
          id: `CURR-${invoiceCurrCounter}`,
          outletId: m.outletId,
          outletName: m.outletName,
          salesmanId: m.salesmanId,
          salesmanName: m.salesmanName || '',
          salesmanNik: m.salesmanNik,
          transactionDate: `2026-10-${String(day).padStart(2, '0')}`,
          qty,
          salesValue: netValue,
          grossValue,
          invoiceId: `FAK-OKT-${invoiceCurrCounter++}`,
          productCode: `BRG-00${(o % 4) + 1}`,
          productName: `PRODUK REGULER ${(o % 4) + 1}`,
          channel: m.channel,
          markNew,
          sourceFile: '_dBase KSNI BNE.xlsx',
          period: '2026-10',
          periodLabel: 'OKTOBER 2026',
        });
      }
    }
  }

  // Targets
  const targets: TargetRecord[] = salesmen.map(s => ({
    id: `TRG-2026-10-${s.id}`,
    salesmanId: s.id,
    salesmanName: s.name,
    area: s.area,
    cb: s.cb,
    salesmanStatus: 'ACTIVE',
    targetValue: s.target,
    skuTargets: {
      'CSD-E02K TARGET': 50000000,
      'NXC-E02K TARGET': 35000000,
      'PST-E500 TARGET': 25000000,
    },
    period: '2026-10',
    periodLabel: 'OKTOBER 2026',
    sourceFile: 'Target SC Oktober 2026.xlsx',
  }));

  return {
    masterOutlets,
    prevTransactions,
    currTransactions,
    targets,
  };
}

/**
 * Generate actual Excel files as downloadable Blobs
 */
export function generateOfficeExcelFiles() {
  const data = createAuthenticOfficeData();

  // 1. Previous Month: Dbase BONE - SEPTEMBER.xlsx
  const prevRows = data.prevTransactions.map(t => ({
    'KODE OUTLET': t.outletId,
    'NAMA OUTLET': t.outletName,
    'KODE SALESMAN': t.salesmanId,
    'NAMA SALESMAN': t.salesmanName,
    'NIK SALESMAN': t.salesmanNik || '',
    'TGL': t.transactionDate,
    'QTY': t.qty,
    'VALEU': t.grossValue || t.salesValue,
    'GROSS': t.grossValue || t.salesValue,
    'VALUE': t.grossValue || t.salesValue,
    'VALUE NETT': t.salesValue,
    'NO FAKTUR': t.invoiceId,
    'KD OUTLET': t.outletId,
    'KODE BARANG': t.productCode,
    'MARK NEW': t.markNew || 'ECERAN KIOS',
  }));
  const wsPrev = XLSX.utils.json_to_sheet(prevRows);
  const wbPrev = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbPrev, wsPrev, 'DBASE_SEPTEMBER');

  // 2. Current Month: _dBase KSNI BNE.xlsx
  const currRows = data.currTransactions.map(t => ({
    'KODE OUTLET': t.outletId,
    'NAMA OUTLET': t.outletName,
    'KODE SALESMAN': t.salesmanId,
    'NAMA SALESMAN': t.salesmanName,
    'NIK SALESMAN': t.salesmanNik || '',
    'TGL': t.transactionDate,
    'QTY': t.qty,
    'VALEU': t.grossValue || t.salesValue,
    'GROSS': t.grossValue || t.salesValue,
    'VALUE': t.grossValue || t.salesValue,
    'VALUE NETT': t.salesValue,
    'NO FAKTUR': t.invoiceId,
    'KD OUTLET': t.outletId,
    'KODE BARANG': t.productCode,
    'MARK NEW': t.markNew || 'ECERAN KIOS',
  }));
  const wsCurr = XLSX.utils.json_to_sheet(currRows);
  const wbCurr = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCurr, wsCurr, 'DATA_KSNI');

  // 3. Target: Target SC Oktober 2026.xlsx
  const targetRows = data.targets.map(t => ({
    'KD_SLS': t.salesmanId,
    'NM_SLS': t.salesmanName,
    'AREA': t.area,
    'CB': t.cb,
    'STATUS SALESMAN': t.salesmanStatus,
    'CSD-E02K TARGET': 50000000,
    'NXC-E02K TARGET': 35000000,
    'PST-E500 TARGET': 25000000,
    'TARGET': t.targetValue,
  }));
  const wsTrg = XLSX.utils.json_to_sheet(targetRows);
  const wbTrg = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbTrg, wsTrg, 'TARGET_SC');

  // 4. Master CB: _Master_CB BLK.xlsx
  const masterRows = data.masterOutlets.map(m => ({
    'KODE OUTLET': m.outletId,
    'KD OUTLET': m.outletId,
    'NAMA OUTLET': m.outletName,
    'CHANNEL': m.channel,
    'FC': m.fc,
    'RAYON': m.rayon,
    'KD_SLS': m.salesmanId,
    'NAMA_SLS': m.salesmanName,
    'STATUS BLN INI': m.statusCurrentMonth,
    'SC': m.sc,
    'PMA': m.pma,
    'AREA': m.area,
    'CABANG': m.cabang,
  }));
  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  const wbMaster = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbMaster, wsMaster, 'MASTER_CB');

  return {
    downloadFile: (wb: XLSX.WorkBook, fileName: string) => {
      XLSX.writeFile(wb, fileName);
    },
    wbPrev,
    wbCurr,
    wbTrg,
    wbMaster,
  };
}

export function getSampleOfficeRawData() {
  const data = createAuthenticOfficeData();

  const prevRows = data.prevTransactions.map(t => ({
    'KODE OUTLET': t.outletId,
    'NAMA OUTLET': t.outletName,
    'KODE SALESMAN': t.salesmanId,
    'NAMA SALESMAN': t.salesmanName,
    'NIK SALESMAN': t.salesmanNik || '',
    'TGL': t.transactionDate,
    'QTY': t.qty,
    'VALEU': t.grossValue || t.salesValue,
    'GROSS': t.grossValue || t.salesValue,
    'VALUE': t.grossValue || t.salesValue,
    'VALUE NETT': t.salesValue,
    'NO FAKTUR': t.invoiceId,
    'KD OUTLET': t.outletId,
    'KODE BARANG': t.productCode,
    'MARK NEW': t.markNew || 'ECERAN KIOS',
  }));

  const currRows = data.currTransactions.map(t => ({
    'KODE OUTLET': t.outletId,
    'NAMA OUTLET': t.outletName,
    'KODE SALESMAN': t.salesmanId,
    'NAMA SALESMAN': t.salesmanName,
    'NIK SALESMAN': t.salesmanNik || '',
    'TGL': t.transactionDate,
    'QTY': t.qty,
    'VALEU': t.grossValue || t.salesValue,
    'GROSS': t.grossValue || t.salesValue,
    'VALUE': t.grossValue || t.salesValue,
    'VALUE NETT': t.salesValue,
    'NO FAKTUR': t.invoiceId,
    'KD OUTLET': t.outletId,
    'KODE BARANG': t.productCode,
    'MARK NEW': t.markNew || 'ECERAN KIOS',
  }));

  const targetRows = data.targets.map(t => ({
    'KD_SLS': t.salesmanId,
    'NM_SLS': t.salesmanName,
    'AREA': t.area,
    'CB': t.cb,
    'STATUS SALESMAN': t.salesmanStatus,
    'CSD-E02K TARGET': 50000000,
    'NXC-E02K TARGET': 35000000,
    'PST-E500 TARGET': 25000000,
    'TARGET': t.targetValue,
  }));

  const masterRows = data.masterOutlets.map(m => ({
    'KODE OUTLET': m.outletId,
    'KD OUTLET': m.outletId,
    'NAMA OUTLET': m.outletName,
    'CHANNEL': m.channel,
    'FC': m.fc,
    'RAYON': m.rayon,
    'KD_SLS': m.salesmanId,
    'NAMA_SLS': m.salesmanName,
    'STATUS BLN INI': m.statusCurrentMonth,
    'SC': m.sc,
    'PMA': m.pma,
    'AREA': m.area,
    'CABANG': m.cabang,
  }));

  return {
    prevRows,
    currRows,
    targetRows,
    masterRows,
    data,
  };
}

