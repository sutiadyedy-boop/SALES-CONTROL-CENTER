import React, { useState } from 'react';
import { 
  FileCheck2, 
  Store, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  CopyCheck, 
  Download, 
  Search,
  Filter
} from 'lucide-react';
import { DetailedReconciliationReport, MatchedOutletItem, UnmatchedOutletItem, MatchedSalesmanItem, UnmatchedSalesmanItem } from '../../services/reconciliationEngine';
import { formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { exportTableToExcel } from '../../services/exportEngine';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { UserProfile } from '../../types/database';
import { ShieldAlert, Lock } from 'lucide-react';

interface ReconciliationReportViewProps {
  reconciliation: DetailedReconciliationReport | null;
  userProfile?: UserProfile;
  onNavigateToUpload: () => void;
}

export function ReconciliationReportView({
  reconciliation,
  userProfile,
  onNavigateToUpload,
}: ReconciliationReportViewProps) {
  const isAdmin = userProfile?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'matched_outlets' | 'unmatched_outlets' | 'salesmen' | 'duplicates'>('matched_outlets');

  if (!reconciliation) {
    return (
      <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <p className="text-slate-400 text-xs">Belum ada data untuk laporan rekonsiliasi. Upload database kantor terlebih dahulu.</p>
        <button
          onClick={onNavigateToUpload}
          className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold rounded-xl"
        >
          Buka Database Center
        </button>
      </div>
    );
  }

  const { status, matchedOutlets, unmatchedOutlets, matchedSalesmen, unmatchedSalesmen, duplicateDetails } = reconciliation;

  // Columns for Matched Outlets
  const matchedOutletCols: ColumnDef<MatchedOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet (PK)',
      render: (r) => <span className="font-mono text-cyan-400 font-semibold text-xs">{r.outletId}</span>,
    },
    {
      key: 'outletName',
      header: 'Nama Outlet',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-100">{r.outletName}</span>
          <div className="text-[10px] text-slate-500 font-mono">
            {r.channel || 'GT'} · {r.rayon || 'Pusat'}
          </div>
        </div>
      ),
    },
    {
      key: 'salesmanId',
      header: 'Salesman',
      render: (r) => (
        <div>
          <span className="text-slate-200 text-xs">{r.salesmanName || r.salesmanId}</span>
          <div className="text-[10px] text-slate-500 font-mono">{r.salesmanId}</div>
        </div>
      ),
    },
    {
      key: 'isActiveInMaster',
      header: 'Status Master',
      align: 'center',
      render: (r) => (
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
          r.isActiveInMaster
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-slate-800 text-slate-400 border border-slate-700'
        }`}>
          {r.isActiveInMaster ? 'AKTIF (OK)' : 'NON-AKTIF'}
        </span>
      ),
    },
    {
      key: 'salesAugust',
      header: 'Sales Agustus 2026',
      align: 'right',
      accessor: (r) => r.salesAugust,
      render: (r) => (
        <span className="font-mono text-xs text-slate-300">
          {r.salesAugust > 0 ? formatRupiah(r.salesAugust) : '-'}
        </span>
      ),
    },
    {
      key: 'salesSeptember',
      header: 'Sales September 2026',
      align: 'right',
      accessor: (r) => r.salesSeptember,
      render: (r) => (
        <span className="font-mono text-xs font-bold text-cyan-300">
          {r.salesSeptember > 0 ? formatRupiah(r.salesSeptember) : '-'}
        </span>
      ),
    },
    {
      key: 'statusSinkron',
      header: 'Status Sinkronisasi',
      align: 'center',
      render: (r) => (
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Matched</span>
        </span>
      ),
    },
  ];

  // Columns for Unmatched Outlets
  const unmatchedOutletCols: ColumnDef<UnmatchedOutletItem>[] = [
    {
      key: 'outletId',
      header: 'Kode Outlet',
      render: (r) => <span className="font-mono text-cyan-400 font-semibold text-xs">{r.outletId}</span>,
    },
    {
      key: 'outletName',
      header: 'Nama Outlet',
      render: (r) => <span className="text-slate-200 text-xs font-medium">{r.outletName}</span>,
    },
    {
      key: 'source',
      header: 'Penyebab / Tipe Anomali',
      render: (r) => {
        if (r.source === 'in_master_only') {
          return (
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Di Master CB tapi Belum Bertransaksi (0 Order)</span>
            </span>
          );
        }
        return (
          <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
            <span>Ada di Transaksi, TIDAK Terdaftar di Master CB</span>
          </span>
        );
      },
    },
    {
      key: 'salesmanId',
      header: 'Salesman Terkait',
      render: (r) => <span className="font-mono text-xs text-slate-300">{r.salesmanName || r.salesmanId || '-'}</span>,
    },
    {
      key: 'salesValue',
      header: 'Nilai Transaksi (IDR)',
      align: 'right',
      accessor: (r) => r.salesValue ?? 0,
      render: (r) => (
        <span className="font-mono text-xs text-slate-300">
          {r.salesValue && r.salesValue > 0 ? formatRupiah(r.salesValue) : '-'}
        </span>
      ),
    },
  ];

  // Columns for Matched Salesmen
  const salesmanCols: ColumnDef<MatchedSalesmanItem>[] = [
    {
      key: 'salesmanId',
      header: 'KD SLS (Primary Key)',
      render: (r) => <span className="font-mono text-cyan-400 font-bold text-xs">{r.salesmanId}</span>,
    },
    {
      key: 'salesmanName',
      header: 'Nama Salesman',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-100">{r.salesmanName}</span>
          <div className="text-[10px] text-slate-500 font-mono">{r.area || 'BONE'}</div>
        </div>
      ),
    },
    {
      key: 'targetValue',
      header: 'Target Resmi (TARGET)',
      align: 'right',
      accessor: (r) => r.targetValue,
      render: (r) => (
        <span className="font-mono text-xs text-slate-200">
          {r.targetValue > 0 ? formatRupiah(r.targetValue) : 'TARGET NOT FOUND'}
        </span>
      ),
    },
    {
      key: 'actualSalesAugust',
      header: 'Realisasi Agustus',
      align: 'right',
      accessor: (r) => r.actualSalesAugust,
      render: (r) => <span className="font-mono text-xs text-slate-400">{formatRupiah(r.actualSalesAugust)}</span>,
    },
    {
      key: 'actualSalesSeptember',
      header: 'Realisasi September',
      align: 'right',
      accessor: (r) => r.actualSalesSeptember,
      render: (r) => <span className="font-mono text-xs font-bold text-cyan-300">{formatRupiah(r.actualSalesSeptember)}</span>,
    },
    {
      key: 'status',
      header: 'Status Sinkronisasi',
      align: 'center',
      render: () => (
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Target & Transaksi Terhubung</span>
        </span>
      ),
    },
  ];

  const handleExportReconciliation = () => {
    const exportRows = matchedOutlets.map(m => ({
      'Kode Outlet': m.outletId,
      'Nama Outlet': m.outletName,
      'Channel': m.channel || '-',
      'Rayon': m.rayon || '-',
      'Salesman ID': m.salesmanId,
      'Salesman Name': m.salesmanName || '-',
      'Status Master': m.isActiveInMaster ? 'AKTIF (OK)' : 'NON AKTIF',
      'Sales Agustus 2026': m.salesAugust,
      'Sales September 2026': m.salesSeptember,
    }));
    exportTableToExcel(exportRows, 'Laporan_Rekonsiliasi_Outlet_Matched.xlsx', 'Rekonsiliasi');
  };

  return (
    <div className="space-y-6">
      {/* Title & Global Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              PHASE 2
            </span>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-cyan-400" />
              <span>Laporan Rekonsiliasi & Pencocokan Database (Reconciliation Report)</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Laporan audit resmi pencocokan data antara Database Transaksi (Agustus & September), Target Salesman, dan Master CB/ROA.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Reconciliation_Report_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          <button
            onClick={handleExportReconciliation}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Rekonsiliasi (.xlsx)</span>
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Baca Saja (Read-Only):</strong> Anda masuk sebagai <span className="font-mono font-bold text-amber-200">[{userProfile?.role || 'USER'}]</span>. Menampilkan laporan hasil rekonsiliasi dan pencocokan data. Seluruh dataset terlindungi dan tidak dapat diubah oleh pengguna non-admin.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0">
            READ ONLY
          </span>
        </div>
      )}

      {/* Top 4 Reconciliation KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>MASTER OUTLETS</span>
            <Store className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-2">
            {status.totalMasterOutlets} Toko
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Aktif: <strong className="text-emerald-400">{status.activeMasterOutlets}</strong> · Inaktif: {status.inactiveMasterOutlets}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>OUTLET MATCHED</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-2">
            {matchedOutlets.length} Toko
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Transaksi terdaftar valid di Master
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SALESMEN TARGET MATCH</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-2">
            {status.matchedSalesmenWithTarget} Orang
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {status.unmatchedSalesmenWithoutTarget.length} salesman tanpa target
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>DUPLIKAT TERFILTER</span>
            <CopyCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-2">
            {status.duplicateTransactionsPrev + status.duplicateTransactionsCurr} Baris
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            100% Bebas Double Counting
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('matched_outlets')}
          className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'matched_outlets'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Outlet Sinkron ({matchedOutlets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unmatched_outlets')}
          className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'unmatched_outlets'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Outlet Belum Sinkron ({unmatchedOutlets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('salesmen')}
          className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'salesmen'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pencocokan Salesman ({matchedSalesmen.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'duplicates'
              ? 'bg-cyan-600 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <CopyCheck className="w-4 h-4" />
          <span>Audit Deduplikasi & Double Count</span>
        </button>
      </div>

      {/* Tab 1: Matched Outlets */}
      {activeTab === 'matched_outlets' && (
        <DataTable
          title="Daftar Outlet yang Berhasil Tersinkronisasi Antara Transaksi & Master CB"
          columns={matchedOutletCols}
          data={matchedOutlets}
          searchPlaceholder="Cari kode outlet, nama toko, salesman..."
          pageSizeDefault={15}
          exportFileName="Rekonsiliasi_Outlet_Matched.xlsx"
        />
      )}

      {/* Tab 2: Unmatched Outlets */}
      {activeTab === 'unmatched_outlets' && (
        <DataTable
          title="Daftar Anomali: Outlet Belum Sinkron (Belum Order / Tidak Ada di Master)"
          columns={unmatchedOutletCols}
          data={unmatchedOutlets}
          searchPlaceholder="Cari outlet..."
          pageSizeDefault={15}
          exportFileName="Rekonsiliasi_Outlet_Unmatched.xlsx"
        />
      )}

      {/* Tab 3: Salesmen */}
      {activeTab === 'salesmen' && (
        <div className="space-y-4">
          <DataTable
            title="Pencocokan Salesman: Target Resmi (KD_SLS) vs Realisasi Aktual"
            columns={salesmanCols}
            data={matchedSalesmen}
            searchPlaceholder="Cari salesman..."
            exportFileName="Rekonsiliasi_Salesman_Matched.xlsx"
          />

          {unmatchedSalesmen.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Salesman Tanpa Target atau Target Tanpa Transaksi ({unmatchedSalesmen.length})</span>
              </h3>
              <div className="space-y-2">
                {unmatchedSalesmen.map((us, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-100">{us.salesmanName || us.salesmanId}</span>
                      <span className="font-mono text-slate-500 ml-2">({us.salesmanId})</span>
                    </div>
                    <div>
                      {us.source === 'in_transactions_no_target' ? (
                        <span className="text-[11px] text-amber-400 font-semibold">Ada Transaksi, Tidak Ditemukan di Target SC (TARGET NOT FOUND)</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Ada Target, Belum Memiliki Transaksi Penjualan</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Duplicates & Double Count Audit */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
              <CopyCheck className="w-4 h-4 text-cyan-400" />
              <span>Kebijakan Anti-Double Counting & Audit Transaksi</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sistem secara otomatis mengevaluasi primary transaction key pada setiap baris faktur yang diupload. 
              Jika file diupload berulang kali atau digabungkan dari multi-file cabang, sistem melakukan deduplikasi otomatis sehingga tidak terjadi penggandaan nilai penjualan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {duplicateDetails.map((d, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{d.period}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {d.duplicateCount} Duplikat Difilter
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <div>Total Baris Bersih: <strong className="font-mono text-slate-200">{d.recordsProcessed} transaksi</strong></div>
                    <div className="mt-1">Aturan Deduplikasi: <span className="font-mono text-cyan-300">{d.dedupKeyRule}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
