import React, { useState } from 'react';
import { Users, Award, TrendingUp, AlertTriangle, Zap, Store, Send, MessageSquare, ArrowUpRight, ArrowDownRight, Minus, Building2 } from 'lucide-react';
import { CalculationResult, DepoPmaPerformanceItem, SalesmanPerformanceItem } from '../../types/analytics';
import { AppSettings } from '../../types/database';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { WhatsAppSalesmanReportModal } from '../dashboard/WhatsAppSalesmanReportModal';
import { soundManager } from '../../services/soundManager';

interface SalesmanPerformanceViewProps {
  calculation: CalculationResult | null;
  settings: AppSettings;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function SalesmanPerformanceView({
  calculation,
  settings,
  onNavigateToUpload,
  onLoadSampleData,
}: SalesmanPerformanceViewProps) {
  const [selectedSalesman, setSelectedSalesman] = useState<SalesmanPerformanceItem | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const currLabel = settings.currentMonthLabel || 'September 2026';
  const storageKey = `target_work_days_${currLabel.replace(/\s+/g, '_')}`;

  const [totalHariKerja] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.blnIni === 'number' && parsed.blnIni > 0) return parsed.blnIni;
      }
    } catch {}
    return 26;
  });

  const [hariKerjaBerjalan] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.berjalan === 'number' && parsed.berjalan >= 0) return parsed.berjalan;
      }
    } catch {}
    return 18;
  });

  if (!calculation || calculation.salesmanPerformances.length === 0) {
    return (
      <EmptyState
        title="DATA SALESMAN BELUM TERSEDIA"
        description="Upload database transaksi dan target untuk melihat matriks kinerja salesman secara menyeluruh."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const { salesmanPerformances, depoPmaPerformances = [] } = calculation;

  const depoPmaColumns: ColumnDef<DepoPmaPerformanceItem>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '50px',
      align: 'center',
      render: (row) => (
        <span className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 ${
          row.rank === 1 ? 'bg-amber-400 text-slate-950' : row.rank === 2 ? 'bg-slate-300 text-slate-950' : row.rank === 3 ? 'bg-amber-700 text-white' : 'text-slate-400'
        }`}>
          {row.rank}
        </span>
      ),
    },
    {
      key: 'depoPmaName',
      header: 'Depo / PMA',
      accessor: (row) => row.depoPmaName,
      render: (row) => (
        <div>
          <span className="font-bold text-amber-300 font-mono">{row.depoPmaName}</span>
          {(row.cabang || row.area) && (
            <div className="text-[10px] text-slate-500 font-mono">
              {[row.cabang, row.area].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'salesmenCount',
      header: 'Jml Sales',
      align: 'center',
      accessor: (row) => row.salesmenCount,
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-semibold text-cyan-300">
          {row.salesmenCount} Sales
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target (IDR)',
      align: 'right',
      accessor: (row) => row.target,
      render: (row) => (
        <span className="font-mono text-slate-300">
          {row.target > 0 ? formatRupiah(row.target) : <span className="text-slate-500">N/A</span>}
        </span>
      ),
    },
    {
      key: 'actualCurrent',
      header: 'Realisasi (IDR)',
      align: 'right',
      accessor: (row) => row.actualCurrent,
      render: (row) => <span className="font-mono font-bold text-cyan-300">{formatRupiah(row.actualCurrent)}</span>,
    },
    {
      key: 'achievementRate',
      header: 'Ach %',
      align: 'right',
      accessor: (row) => row.achievementRate ?? -1,
      render: (row) => (
        <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
          row.achievementRate !== null && row.achievementRate >= 100
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'text-slate-100'
        }`}>
          {row.achievementRate !== null ? `${row.achievementRate.toFixed(1)}%` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'gap',
      header: 'Gap (IDR)',
      align: 'right',
      accessor: (row) => row.gap,
      render: (row) => (
        <span className={`font-mono text-xs ${row.gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {(row.gap >= 0 ? '+' : '') + formatRupiah(row.gap)}
        </span>
      ),
    },
    {
      key: 'growthRate',
      header: 'Growth Omset %',
      align: 'right',
      accessor: (row) => row.growthRate ?? -999,
      render: (row) => {
        if (row.growthRate === null) {
          return (
            <span className="font-mono text-xs text-cyan-400 font-bold inline-flex items-center justify-end gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>NEW</span>
            </span>
          );
        }
        const isUp = row.growthRate > 0.05;
        const isDown = row.growthRate < -0.05;
        return (
          <span className={`font-mono text-xs font-bold inline-flex items-center justify-end gap-1 ${
            isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-300'
          }`} title={isUp ? 'Tren Omset Naik' : isDown ? 'Tren Omset Turun' : 'Tren Omset Tetap'}>
            {isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            ) : isDown ? (
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{formatPercent(row.growthRate)}</span>
          </span>
        );
      },
    },
    {
      key: 'activeOutlets',
      header: 'Outlet Aktif',
      align: 'center',
      accessor: (row) => row.activeOutlets,
      render: (row) => <span className="font-mono text-slate-300">{row.activeOutlets}</span>,
    },
    {
      key: 'transactingOutlets',
      header: 'Toko Transaksi (EC)',
      align: 'center',
      accessor: (row) => row.transactingOutlets,
      render: (row) => <span className="font-mono font-semibold text-emerald-300">{row.transactingOutlets}</span>,
    },
    {
      key: 'roRate',
      header: 'EC / RO %',
      align: 'center',
      accessor: (row) => row.roRate ?? -1,
      render: (row) => {
        const netEcDiff = (row.newOutletsCount || 0) - (row.dropOutletsCount || 0);
        const isEcUp = netEcDiff > 0;
        const isEcDown = netEcDiff < 0;
        return (
          <span className="font-mono font-bold text-cyan-400 text-xs inline-flex items-center justify-center gap-1" title={isEcUp ? `Tren EC Naik (+${netEcDiff} Toko)` : isEcDown ? `Tren EC Turun (${netEcDiff} Toko)` : 'Tren EC Tetap'}>
            {isEcUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : isEcDown ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span>{row.roRate !== null ? `${row.roRate.toFixed(0)}%` : 'N/A'}</span>
          </span>
        );
      },
    },
    {
      key: 'dropOutletsCount',
      header: 'Drop',
      align: 'center',
      accessor: (row) => row.dropOutletsCount,
      render: (row) => (
        <span className={`font-mono text-xs ${row.dropOutletsCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
          {row.dropOutletsCount}
        </span>
      ),
    },
    {
      key: 'newOutletsCount',
      header: 'New',
      align: 'center',
      accessor: (row) => row.newOutletsCount,
      render: (row) => (
        <span className={`font-mono text-xs ${row.newOutletsCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
          {row.newOutletsCount}
        </span>
      ),
    },
  ];

  const columns: ColumnDef<SalesmanPerformanceItem>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '50px',
      align: 'center',
      render: (row) => (
        <span className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 ${
          row.rank === 1 ? 'bg-amber-400 text-slate-950' : row.rank === 2 ? 'bg-slate-300 text-slate-950' : row.rank === 3 ? 'bg-amber-700 text-white' : 'text-slate-400'
        }`}>
          {row.rank}
        </span>
      ),
    },
    {
      key: 'salesmanId',
      header: 'KD SLS',
      render: (row) => <span className="font-mono text-cyan-400 font-semibold">{row.salesmanId}</span>,
    },
    {
      key: 'salesmanName',
      header: 'Nama Salesman',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-200">{row.salesmanName}</span>
          <div className="text-[10px] text-slate-500 font-mono">{row.area || '-'}</div>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Target (IDR)',
      align: 'right',
      accessor: (row) => row.target,
      render: (row) => (
        <span className="font-mono text-slate-300">
          {row.target > 0 ? formatRupiah(row.target) : <span className="text-slate-500">N/A</span>}
        </span>
      ),
    },
    {
      key: 'actualCurrent',
      header: 'Realisasi (IDR)',
      align: 'right',
      accessor: (row) => row.actualCurrent,
      render: (row) => <span className="font-mono font-bold text-cyan-300">{formatRupiah(row.actualCurrent)}</span>,
    },
    {
      key: 'achievementRate',
      header: 'Ach %',
      align: 'right',
      accessor: (row) => row.achievementRate ?? -1,
      render: (row) => (
        <span className="font-mono font-bold text-slate-100">
          {row.achievementRate !== null ? `${row.achievementRate.toFixed(1)}%` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'gap',
      header: 'Gap (IDR)',
      align: 'right',
      accessor: (row) => row.gap,
      render: (row) => (
        <span className={`font-mono text-xs ${row.gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {(row.gap >= 0 ? '+' : '') + formatRupiah(row.gap)}
        </span>
      ),
    },
    {
      key: 'growthRate',
      header: 'Growth Omset %',
      align: 'right',
      accessor: (row) => row.growthRate ?? -999,
      render: (row) => {
        if (row.growthRate === null) {
          return (
            <span className="font-mono text-xs text-cyan-400 font-bold inline-flex items-center justify-end gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>NEW</span>
            </span>
          );
        }
        const isUp = row.growthRate > 0.05;
        const isDown = row.growthRate < -0.05;
        return (
          <span className={`font-mono text-xs font-bold inline-flex items-center justify-end gap-1 ${
            isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-300'
          }`} title={isUp ? 'Tren Omset Naik' : isDown ? 'Tren Omset Turun' : 'Tren Omset Tetap'}>
            {isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            ) : isDown ? (
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{formatPercent(row.growthRate)}</span>
          </span>
        );
      },
    },
    {
      key: 'activeOutlets',
      header: 'Outlet Aktif',
      align: 'center',
      render: (row) => <span className="font-mono text-slate-300">{row.activeOutlets}</span>,
    },
    {
      key: 'roRate',
      header: 'EC / RO %',
      align: 'center',
      accessor: (row) => row.roRate ?? -1,
      render: (row) => {
        const netEcDiff = (row.newOutletsCount || 0) - (row.dropOutletsCount || 0);
        const isEcUp = netEcDiff > 0;
        const isEcDown = netEcDiff < 0;
        return (
          <span className="font-mono font-bold text-cyan-400 text-xs inline-flex items-center justify-center gap-1" title={isEcUp ? `Tren EC Naik (+${netEcDiff} Toko)` : isEcDown ? `Tren EC Turun (${netEcDiff} Toko)` : 'Tren EC Tetap'}>
            {isEcUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : isEcDown ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span>{row.roRate !== null ? `${row.roRate.toFixed(0)}%` : 'N/A'}</span>
          </span>
        );
      },
    },
    {
      key: 'dropOutletsCount',
      header: 'Drop',
      align: 'center',
      render: (row) => (
        <span className={`font-mono text-xs ${row.dropOutletsCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
          {row.dropOutletsCount}
        </span>
      ),
    },
    {
      key: 'newOutletsCount',
      header: 'New',
      align: 'center',
      render: (row) => (
        <span className={`font-mono text-xs ${row.newOutletsCount > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
          {row.newOutletsCount}
        </span>
      ),
    },
    {
      key: 'actionWA',
      header: 'Kirim WA',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundManager.playClick();
            setSelectedSalesman(row);
            setIsWhatsAppModalOpen(true);
          }}
          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors mx-auto cursor-pointer"
          title={`Kirim report WhatsApp ke ${row.salesmanName}`}
        >
          <Send className="w-3 h-3" />
          <span>WA</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Matriks Kinerja Salesman Lengkap (Salesman Performance Scorecard)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Konsolidasi Target, Realisasi, Achievement, Growth, RO %, Outlet Aktif, dan Pergerakan Toko per Salesman.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setIsWhatsAppModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Kirim report pencapaian ke masing-masing salesman via WhatsApp"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Report WA Salesman</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950/40 text-white font-mono font-bold">Auto</span>
          </button>
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Performa_Salesman_${currLabel.replace(/\s+/g, '_')}.jpg`}
            label="Capture JPG"
          />
        </div>
      </div>

      {/* Depo / PMA Performance Matrix (Above Salesman Matrix) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            Matriks Kinerja Depo / PMA ({currLabel})
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
            {depoPmaPerformances.length} Depo / PMA
          </span>
        </div>
        <DataTable
          title={`Matriks Kinerja Depo / PMA (${currLabel})`}
          columns={depoPmaColumns}
          data={depoPmaPerformances}
          searchPlaceholder="Cari Depo, PMA, atau Area..."
          exportFileName={`Matriks_Kinerja_Depo_PMA_${currLabel}.xlsx`}
        />
      </div>

      {/* Salesman Performance Table */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            Matriks Kinerja Salesman ({currLabel})
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
            {salesmanPerformances.length} Salesman
          </span>
        </div>
        <DataTable
          title={`Matriks Salesman (${currLabel})`}
          columns={columns}
          data={salesmanPerformances}
          searchPlaceholder="Cari salesman atau kode..."
          exportFileName={`Salesman_Performance_${currLabel}.xlsx`}
        />
      </div>

      {calculation && (
        <WhatsAppSalesmanReportModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          calculation={calculation}
          settings={settings}
          totalHariKerja={totalHariKerja}
          hariKerjaBerjalan={hariKerjaBerjalan}
        />
      )}
    </div>
  );
}
