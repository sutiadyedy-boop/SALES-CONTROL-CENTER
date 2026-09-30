import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Users, Store, CopyCheck, FileQuestion } from 'lucide-react';
import { ReconciliationDetail } from '../../services/reconciliationEngine';

interface ValidationReconciliationModalProps {
  reconciliation: ReconciliationDetail | null;
  hasPrev: boolean;
  hasCurr: boolean;
  hasTarget: boolean;
  hasMaster: boolean;
  onClose: () => void;
}

export function ValidationReconciliationModal({
  reconciliation,
  hasPrev,
  hasCurr,
  hasTarget,
  hasMaster,
  onClose,
}: ValidationReconciliationModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'unmatched_outlets' | 'unmatched_salesmen' | 'warnings'>('overview');

  const status = reconciliation?.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              <span>Validation & Reconciliation Center</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pemeriksaan integritas relasi antar database transaksi, target, dan master CB/ROA.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/30 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Ringkasan Status Database
          </button>
          <button
            onClick={() => setActiveTab('unmatched_outlets')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'unmatched_outlets'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Outlet Belum Sinkron</span>
            {reconciliation && reconciliation.unmatchedOutlets.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({reconciliation.unmatchedOutlets.length})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('unmatched_salesmen')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'unmatched_salesmen'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Salesman Belum Sinkron</span>
            {reconciliation && reconciliation.unmatchedSalesmen.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({reconciliation.unmatchedSalesmen.length})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('warnings')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'warnings'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Peringatan & Duplikat</span>
            {status && (status.duplicateTransactionsPrev + status.duplicateTransactionsCurr > 0 || status.missingDataWarnings.length > 0) && (
              <span className="text-[10px] text-amber-400 font-mono">(!)</span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Database Readiness */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Status Kesiapan Database Utama
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400">Database 1</span>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">Bulan Lalu</p>
                    <div className="mt-2 text-xs font-mono flex items-center gap-1.5">
                      {hasPrev ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-slate-500">Belum diupload</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400">Database 2</span>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">Bulan Ini</p>
                    <div className="mt-2 text-xs font-mono flex items-center gap-1.5">
                      {hasCurr ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-slate-500">Belum diupload</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400">Database 3</span>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">Target Salesman</p>
                    <div className="mt-2 text-xs font-mono flex items-center gap-1.5">
                      {hasTarget ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-slate-500">Belum diupload</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400">Database 4</span>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">Master CB/ROA</p>
                    <div className="mt-2 text-xs font-mono flex items-center gap-1.5">
                      {hasMaster ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-slate-500">Belum diupload</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matching Status Counters */}
              {status && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Hasil Rekonsiliasi & Pencocokan Kunci
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-cyan-400" />
                          Master Outlet
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">{status.totalMasterOutlets}</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Matched Transaksi:</span>
                          <span className="text-emerald-400 font-mono font-medium">{status.matchedMasterOutletsWithTransactions}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Unmatched (Belum Order):</span>
                          <span className="text-amber-400 font-mono font-medium">{status.unmatchedMasterOutlets.length}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Transaksi Tanpa Master:</span>
                          <span className="text-slate-300 font-mono">{status.transactionsWithoutMasterOutlet}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-400" />
                          Salesman Transaksi
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">{status.totalSalesmenInTransactions}</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Matched Target:</span>
                          <span className="text-emerald-400 font-mono font-medium">{status.matchedSalesmenWithTarget}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Tanpa Target di File:</span>
                          <span className="text-amber-400 font-mono font-medium">{status.unmatchedSalesmenWithoutTarget.length}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Target Tanpa Transaksi:</span>
                          <span className="text-slate-300 font-mono">{status.targetSalesmenWithoutTransactions.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <CopyCheck className="w-4 h-4 text-purple-400" />
                          Integritas Transaksi
                        </span>
                        <span className="font-mono text-slate-200 font-semibold">Verified</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Duplikat Bulan Lalu:</span>
                          <span className="text-slate-300 font-mono">{status.duplicateTransactionsPrev} difilter</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Duplikat Bulan Ini:</span>
                          <span className="text-slate-300 font-mono">{status.duplicateTransactionsCurr} difilter</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Outlet Aktif (Status OK):</span>
                          <span className="text-emerald-400 font-mono font-medium">{status.activeMasterOutlets}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'unmatched_outlets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Daftar outlet yang belum sinkron antara file transaksi dengan master CB/ROA:
              </p>
              <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-950/50">
                {reconciliation?.unmatchedOutlets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">Semua outlet sinkron sempurna.</div>
                ) : (
                  reconciliation?.unmatchedOutlets.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">{item.outletName}</span>
                        <span className="text-slate-500 font-mono ml-2">({item.outletId})</span>
                      </div>
                      <div>
                        {item.source === 'in_master_only' ? (
                          <span className="text-[11px] text-amber-400">Di Master CB (Belum Order)</span>
                        ) : (
                          <span className="text-[11px] text-rose-400">Di Transaksi (Tidak ada di Master)</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'unmatched_salesmen' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Daftar salesman yang bertransaksi namun targetnya tidak tercantum pada file target atau sebaliknya:
              </p>
              <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-950/50">
                {reconciliation?.unmatchedSalesmen.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">Semua salesman memiliki target terdaftar.</div>
                ) : (
                  reconciliation?.unmatchedSalesmen.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">{item.salesmanName || item.salesmanId}</span>
                        <span className="text-slate-500 font-mono ml-2">({item.salesmanId})</span>
                      </div>
                      <div>
                        {item.source === 'in_transactions_no_target' ? (
                          <span className="text-[11px] text-amber-400">Ada Transaksi, Target Belum Ada</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Ada Target, Belum Ada Transaksi</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="space-y-4">
              {status?.missingDataWarnings.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8" />
                  <span>Tidak ada anomali atau data penting yang hilang.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {status?.missingDataWarnings.map((warn, idx) => (
                    <div key={idx} className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
