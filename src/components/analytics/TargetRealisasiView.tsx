import React, { useState, useMemo, useEffect } from 'react';
import { 
  Target, 
  Award, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  CheckCircle, 
  Users,
  Download,
  Calendar,
  Clock,
  Hourglass,
  Zap,
  Sliders,
  RotateCcw,
  Info,
  ArrowRight,
  Plus,
  Minus,
  Send
} from 'lucide-react';
import { CalculationResult, SalesmanPerformanceItem } from '../../types/analytics';
import { AppSettings, TargetRecord, TransactionRecord } from '../../types/database';
import { formatPercent, formatRupiah } from '../../services/smartInsightEngine';
import { DataTable, ColumnDef } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { WhatsAppSalesmanReportModal } from '../dashboard/WhatsAppSalesmanReportModal';
import { TargetSpeedometerCluster } from './TargetSpeedometerCluster';

interface TargetRealisasiViewProps {
  calculation: CalculationResult | null;
  rawTargets: TargetRecord[];
  currTransactions?: TransactionRecord[];
  settings: AppSettings;
  onNavigateToUpload: () => void;
  onLoadSampleData: () => void;
}

export function TargetRealisasiView({
  calculation,
  rawTargets,
  currTransactions = [],
  settings,
  onNavigateToUpload,
  onLoadSampleData,
}: TargetRealisasiViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'achieved' | 'under' | 'no_target'>('all');
  const [tableViewMode, setTableViewMode] = useState<'all' | 'run_rate' | 'standard'>('all');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const currLabel = settings.currentMonthLabel || 'September 2026';

  // Smart auto-detection of default working days based on transactions and standard calendar
  const autoDetectDefaults = useMemo(() => {
    // Standard working days in Indonesia FMCG/distribution is typically 26 days (6 working days/week)
    const defaultTotal = 26;
    
    let defaultElapsed = 18;
    if (currTransactions && currTransactions.length > 0) {
      const uniqueDays = new Set(
        currTransactions
          .map(t => t.transactionDate ? t.transactionDate.slice(0, 10) : '')
          .filter(Boolean)
      );
      if (uniqueDays.size > 0) {
        defaultElapsed = Math.min(defaultTotal, Math.max(1, uniqueDays.size));
      }
    }
    return {
      total: defaultTotal,
      elapsed: defaultElapsed,
    };
  }, [currTransactions]);

  // Working days state with localStorage persistence (keyed by currentMonthLabel)
  const storageKey = `target_work_days_${currLabel.replace(/\s+/g, '_')}`;

  const [hariKerjaBlnIni, setHariKerjaBlnIni] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.blnIni === 'number' && parsed.blnIni > 0) {
          return parsed.blnIni;
        }
      }
    } catch {
      // ignore
    }
    return autoDetectDefaults.total;
  });

  const [hariKerjaBerjalan, setHariKerjaBerjalan] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.berjalan === 'number' && parsed.berjalan >= 0) {
          return parsed.berjalan;
        }
      }
    } catch {
      // ignore
    }
    return autoDetectDefaults.elapsed;
  });

  // Save to localStorage whenever working days change and broadcast to other views
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        blnIni: hariKerjaBlnIni,
        berjalan: hariKerjaBerjalan,
      }));
      window.dispatchEvent(new Event('target_work_days_updated'));
    } catch {
      // ignore
    }
  }, [storageKey, hariKerjaBlnIni, hariKerjaBerjalan]);

  // Synchronize when working days change from other components (e.g. Dashboard Navigasi Run-Rate)
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.blnIni === 'number' && parsed.blnIni > 0 && parsed.blnIni !== hariKerjaBlnIni) {
            setHariKerjaBlnIni(parsed.blnIni);
          }
          if (typeof parsed.berjalan === 'number' && parsed.berjalan >= 0 && parsed.berjalan !== hariKerjaBerjalan) {
            setHariKerjaBerjalan(parsed.berjalan);
          }
        }
      } catch {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('target_work_days_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('target_work_days_updated', handleSync);
    };
  }, [storageKey, hariKerjaBlnIni, hariKerjaBerjalan]);

  // Derived: Sisa Hari Kerja = Hari Kerja Bln ini - Hari Kerja Berjalan
  const sisaHariKerja = Math.max(0, hariKerjaBlnIni - hariKerjaBerjalan);

  // Time progress ratio
  const timeProgressPct = hariKerjaBlnIni > 0 ? (hariKerjaBerjalan / hariKerjaBlnIni) * 100 : 0;

  // Handler to reset working days to defaults
  const handleResetWorkingDays = () => {
    setHariKerjaBlnIni(autoDetectDefaults.total);
    setHariKerjaBerjalan(autoDetectDefaults.elapsed);
  };

  // Preset handlers
  const handleSetPreset = (total: number, elapsed?: number) => {
    setHariKerjaBlnIni(total);
    if (elapsed !== undefined) {
      setHariKerjaBerjalan(Math.min(total, elapsed));
    } else if (hariKerjaBerjalan > total) {
      setHariKerjaBerjalan(total);
    }
  };

  if (!calculation || calculation.salesmanPerformances.length === 0) {
    return (
      <EmptyState
        title="TARGET BELUM TERSEDIA"
        description="Database Target Salesman atau transaksi berjalan belum diupload. Upload file Target SC untuk melihat analisa per salesman."
        onNavigateToUpload={onNavigateToUpload}
        onLoadSampleData={onLoadSampleData}
      />
    );
  }

  const { salesmanPerformances, kpis } = calculation;

  // Shortfall & Run Rate Measurements at Team Level
  const totalKekurangan = Math.max(0, kpis.totalTarget - kpis.totalActualCurrent);
  const targetHarianSisa = sisaHariKerja > 0 ? Math.round(totalKekurangan / sisaHariKerja) : 0;
  const runRateHarianBerjalan = hariKerjaBerjalan > 0 ? Math.round(kpis.totalActualCurrent / hariKerjaBerjalan) : 0;
  const proyeksiAkhirBulan = hariKerjaBerjalan > 0 ? Math.round((kpis.totalActualCurrent / hariKerjaBerjalan) * hariKerjaBlnIni) : kpis.totalActualCurrent;
  const proyeksiAchRate = kpis.totalTarget > 0 ? (proyeksiAkhirBulan / kpis.totalTarget) * 100 : null;

  // Filtered list
  const filteredSalesmen = salesmanPerformances.filter(s => {
    if (filterType === 'achieved') return s.achievementRate !== null && s.achievementRate >= 100;
    if (filterType === 'under') return s.achievementRate !== null && s.achievementRate < 100;
    if (filterType === 'no_target') return s.targetStatus === 'TARGET_NOT_FOUND';
    return true;
  });

  const topAchievers = salesmanPerformances.filter(s => s.achievementRate !== null && s.achievementRate >= 100);
  const lowAchievers = salesmanPerformances.filter(s => s.achievementRate !== null && s.achievementRate < 100);
  const targetNotFound = salesmanPerformances.filter(s => s.targetStatus === 'TARGET_NOT_FOUND');

  // Enriched rows with dynamic working days measurement without modifying raw data
  interface EnrichedSalesmanPerformance extends SalesmanPerformanceItem {
    kekurangan: number;
    targetPerHariSisa: number;
    runRateHarian: number;
    proyeksiSales: number;
    proyeksiAch: number | null;
  }

  const enrichedSalesmen: EnrichedSalesmanPerformance[] = filteredSalesmen.map(s => {
    const kekurangan = Math.max(0, s.target - s.actualCurrent);
    const targetPerHariSisa = sisaHariKerja > 0 && kekurangan > 0 ? Math.round(kekurangan / sisaHariKerja) : 0;
    const runRateHarian = hariKerjaBerjalan > 0 ? Math.round(s.actualCurrent / hariKerjaBerjalan) : 0;
    const proyeksiSales = hariKerjaBerjalan > 0 ? Math.round((s.actualCurrent / hariKerjaBerjalan) * hariKerjaBlnIni) : s.actualCurrent;
    const proyeksiAch = s.target > 0 ? (proyeksiSales / s.target) * 100 : null;

    return {
      ...s,
      kekurangan,
      targetPerHariSisa,
      runRateHarian,
      proyeksiSales,
      proyeksiAch,
    };
  });

  // DataTable columns
  const allColumns: ColumnDef<EnrichedSalesmanPerformance>[] = [
    {
      key: 'rank',
      header: 'Rank',
      width: '56px',
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
      render: (row) => <span className="font-mono text-cyan-400 text-xs">{row.salesmanId}</span>,
    },
    {
      key: 'salesmanName',
      header: 'Nama Salesman',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200">{row.salesmanName}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.area || 'Area Default'}</div>
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
          {row.target > 0 ? formatRupiah(row.target) : <span className="text-slate-500">TARGET NOT FOUND</span>}
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
      header: 'Achievement %',
      align: 'right',
      accessor: (row) => row.achievementRate ?? -1,
      render: (row) => {
        if (row.achievementRate === null) {
          return <span className="text-[11px] text-slate-500">N/A</span>;
        }
        const isAch = row.achievementRate >= 100;
        return (
          <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
            isAch ? 'bg-emerald-500/20 text-emerald-300' : row.achievementRate >= 80 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {row.achievementRate.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'kekurangan',
      header: 'Sisa Target (Kekurangan)',
      align: 'right',
      accessor: (row) => row.kekurangan,
      render: (row) => {
        if (row.targetStatus === 'TARGET_NOT_FOUND') {
          return <span className="text-[10px] text-slate-500 font-mono">-</span>;
        }
        if (row.actualCurrent >= row.target) {
          const surplus = row.actualCurrent - row.target;
          return (
            <div className="text-right">
              <span className="font-mono font-semibold text-emerald-400 text-xs">
                +{formatRupiah(surplus)}
              </span>
              <div className="text-[10px] text-emerald-500">Surplus Tercapai</div>
            </div>
          );
        }
        return (
          <div className="text-right">
            <span className="font-mono font-bold text-rose-400 text-xs">
              {formatRupiah(row.kekurangan)}
            </span>
            <div className="text-[10px] text-rose-500">Kekurangan</div>
          </div>
        );
      },
    },
    {
      key: 'targetPerHariSisa',
      header: 'Target / Hari (Sisa Kerja)',
      align: 'right',
      accessor: (row) => row.targetPerHariSisa,
      render: (row) => {
        if (row.targetStatus === 'TARGET_NOT_FOUND') {
          return <span className="text-[10px] text-slate-500 font-mono">-</span>;
        }
        if (row.actualCurrent >= row.target) {
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              TERCAPAI (0/hr)
            </span>
          );
        }
        if (sisaHariKerja === 0) {
          return <span className="text-xs text-slate-500 font-mono">Hari Habis</span>;
        }
        return (
          <div className="text-right">
            <span className="font-mono font-bold text-amber-300 text-xs">
              {formatRupiah(row.targetPerHariSisa)}
            </span>
            <div className="text-[10px] text-slate-400">/ hari ({sisaHariKerja} hr sisa)</div>
          </div>
        );
      },
    },
    {
      key: 'runRateHarian',
      header: 'Run Rate Saat Ini',
      align: 'right',
      accessor: (row) => row.runRateHarian,
      render: (row) => (
        <div className="text-right">
          <span className="font-mono text-cyan-300 text-xs">
            {formatRupiah(row.runRateHarian)}
          </span>
          <div className="text-[10px] text-slate-400">/ hari ({hariKerjaBerjalan} hr)</div>
        </div>
      ),
    },
    {
      key: 'proyeksiSales',
      header: 'Proyeksi Akhir Bulan',
      align: 'right',
      accessor: (row) => row.proyeksiSales,
      render: (row) => {
        if (row.targetStatus === 'TARGET_NOT_FOUND') {
          return <span className="font-mono text-slate-300 text-xs">{formatRupiah(row.proyeksiSales)}</span>;
        }
        const ach = row.proyeksiAch;
        return (
          <div className="text-right">
            <div className="font-mono text-slate-200 text-xs font-semibold">
              {formatRupiah(row.proyeksiSales)}
            </div>
            {ach !== null && (
              <div className={`text-[10px] font-mono font-bold ${ach >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ach.toFixed(1)}% est
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'targetStatus',
      header: 'Status',
      align: 'center',
      render: (row) => {
        if (row.targetStatus === 'ACHIEVED') {
          return <span className="text-[11px] text-emerald-400 font-semibold">Tercapai</span>;
        }
        if (row.targetStatus === 'UNDER') {
          return <span className="text-[11px] text-amber-400 font-semibold">Di Bawah Target</span>;
        }
        return <span className="text-[10px] text-slate-500 font-mono">TARGET NOT FOUND</span>;
      },
    },
  ];

  // Active columns based on view mode
  const columns = useMemo(() => {
    if (tableViewMode === 'standard') {
      return allColumns.filter(c => !['kekurangan', 'targetPerHariSisa', 'runRateHarian', 'proyeksiSales'].includes(c.key));
    }
    if (tableViewMode === 'run_rate') {
      return allColumns.filter(c => !['gap'].includes(c.key));
    }
    return allColumns;
  }, [tableViewMode, allColumns]);

  return (
    <div className="space-y-6">
      {/* Title & Period */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <span>Analisa Target vs Realisasi Salesman ({currLabel})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Business Key: <span className="font-mono text-slate-300">SALESMAN_ID = KD_SLS</span> · Target Resmi: Kolom <span className="font-mono text-slate-300">TARGET</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Kirim report pencapaian ke masing-masing salesman via WhatsApp"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Report WA Salesman</span>
          </button>

          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Target_vs_Realisasi_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PENGUKURAN HARI KERJA & KEKURANGAN SISA HARI KERJA (USER REQUESTED FEATURE) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-cyan-800/50 rounded-xl p-3 shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-100 tracking-wide uppercase">
                  Pengukuran Hari Kerja & Kekurangan Target Bulan Ini
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Simulasi Dinamis (Tanpa Merubah Data)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Ukur gap defisit penjualan dan target harian yang wajib dicapai di sisa hari kerja efektif.
              </p>
            </div>
          </div>

          {/* Quick Actions & Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400">Preset Kalender:</span>
            <button
              onClick={() => handleSetPreset(26)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                hariKerjaBlnIni === 26 
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="6 Hari Kerja per minggu (Senin-Sabtu)"
            >
              6 Hari (26 hr)
            </button>
            <button
              onClick={() => handleSetPreset(22)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                hariKerjaBlnIni === 22 
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="5 Hari Kerja per minggu (Senin-Jumat)"
            >
              5 Hari (22 hr)
            </button>
            <button
              onClick={handleResetWorkingDays}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1 transition-colors"
              title="Reset ke hitungan default transaksi"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* 3 Main Working Days Interactive Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-2.5">
          {/* 1. Hari Kerja Bln ini */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Hari Kerja Bln ini :
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Target Kalender</span>
            </div>
            
            <div className="my-1 flex items-center justify-between gap-2">
              <div className="text-xl font-black font-mono text-cyan-300">
                {hariKerjaBlnIni}
                <span className="text-[10px] font-sans text-slate-400 ml-1 font-normal">Hari</span>
              </div>

              {/* Stepper buttons & direct input */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700/80 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setHariKerjaBlnIni(prev => Math.max(1, prev - 1))}
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-cyan-300 active:scale-95 transition-transform"
                  title="Kurang 1 hari"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={hariKerjaBlnIni}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= 31) {
                      setHariKerjaBlnIni(val);
                    }
                  }}
                  className="w-8 text-center font-mono font-bold bg-transparent text-slate-100 text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setHariKerjaBlnIni(prev => Math.min(31, prev + 1))}
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-cyan-300 active:scale-95 transition-transform"
                  title="Tambah 1 hari"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 truncate">
              Total hari kerja efektif operasional bulan {currLabel}.
            </div>
          </div>

          {/* 2. Hari Kerja Berjalan */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Hari Kerja Berjalan :
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Elapsed Days</span>
            </div>

            <div className="my-1 flex items-center justify-between gap-2">
              <div className="text-xl font-black font-mono text-emerald-300">
                {hariKerjaBerjalan}
                <span className="text-[10px] font-sans text-slate-400 ml-1 font-normal">Hari</span>
              </div>

              {/* Stepper buttons & direct input */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700/80 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setHariKerjaBerjalan(prev => Math.max(0, prev - 1))}
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-emerald-300 active:scale-95 transition-transform"
                  title="Kurang 1 hari"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="0"
                  max={hariKerjaBlnIni}
                  value={hariKerjaBerjalan}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0 && val <= 31) {
                      setHariKerjaBerjalan(val);
                    }
                  }}
                  className="w-8 text-center font-mono font-bold bg-transparent text-slate-100 text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setHariKerjaBerjalan(prev => Math.min(hariKerjaBlnIni, prev + 1))}
                  className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-emerald-300 active:scale-95 transition-transform"
                  title="Tambah 1 hari"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 truncate">
              Hari kerja yang telah dilalui penjualan sampai hari ini.
            </div>
          </div>

          {/* 3. Sisa Hari Kerja */}
          <div className="bg-slate-950/70 border border-amber-500/30 rounded-lg px-3 py-2 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Sisa Hari Kerja :
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {sisaHariKerja > 0 ? `${sisaHariKerja} Hari Tersisa` : 'Waktu Habis'}
              </span>
            </div>

            <div className="my-1 flex items-center justify-between gap-2">
              <div className="text-xl font-black font-mono text-amber-400">
                {sisaHariKerja}
                <span className="text-[10px] font-sans text-slate-400 ml-1 font-normal">Hari</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {hariKerjaBlnIni} - {hariKerjaBerjalan} = {sisaHariKerja}
              </div>
            </div>

            <div className="text-[10px] text-amber-200/80 truncate">
              Kesempatan hari kerja tersisa untuk mengejar kekurangan target.
            </div>
          </div>
        </div>

        {/* Executive Summary Insight Box */}
        <div className="mt-2.5 bg-slate-950/90 border border-cyan-800/40 rounded-lg px-2.5 py-2 text-[11px] flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-slate-300 leading-snug">
            <span className="font-bold text-cyan-300">Kesimpulan Ukuran Sisa Hari Kerja:</span>{' '}
            {totalKekurangan > 0 ? (
              <>
                Dengan tersisa <strong className="text-amber-300 font-mono">{sisaHariKerja} hari kerja</strong> dan kekurangan target tim sebesar <strong className="text-rose-300 font-mono">{formatRupiah(totalKekurangan)}</strong>, tim penjualan membutuhkan rata-rata penjualan <strong className="text-amber-300 font-mono">{formatRupiah(targetHarianSisa)} per hari kerja</strong>.{' '}
                {targetHarianSisa > runRateHarianBerjalan ? (
                  <span className="text-amber-200">
                    Dibutuhkan percepatan (acceleration) sebesar <strong className="font-mono">+{formatRupiah(targetHarianSisa - runRateHarianBerjalan)}/hari</strong> dibanding rata-rata berjalan saat ini ({formatRupiah(runRateHarianBerjalan)}/hari).
                  </span>
                ) : (
                  <span className="text-emerald-300">
                    Kecepatan saat ini ({formatRupiah(runRateHarianBerjalan)}/hari) sudah melampaui target harian sisa ({formatRupiah(targetHarianSisa)}/hari). Pertahankan konsistensi penagihan dan distribusi.
                  </span>
                )}
              </>
            ) : (
              <span className="text-emerald-300">
                Target tim bulan {currLabel} sudah terpenuhi 100% dengan surplus total <strong className="font-mono">{formatRupiah(Math.abs(kpis.gapValue))}</strong>. Di sisa {sisaHariKerja} hari kerja, fokus maksimalkan pemerataan salesman yang masih di bawah target.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3 Speedometer Telemetry Gauges + Gap Bersih Strip (Replaces static cards without changing data) */}
      <TargetSpeedometerCluster
        totalTarget={kpis.totalTarget}
        totalActualCurrent={kpis.totalActualCurrent}
        achievementRate={kpis.achievementRate}
        gapValue={kpis.gapValue}
        salesValueField={settings.salesValueField}
        hariKerjaBlnIni={hariKerjaBlnIni}
        hariKerjaBerjalan={hariKerjaBerjalan}
        sisaHariKerja={sisaHariKerja}
        timeProgressPct={timeProgressPct}
        runRateHarianBerjalan={runRateHarianBerjalan}
        proyeksiAkhirBulan={proyeksiAkhirBulan}
        proyeksiAchRate={proyeksiAchRate}
        totalSalesmen={salesmanPerformances.length}
        achievedSalesmenCount={topAchievers.length}
      />

      {/* Target Not Found Warning if any */}
      {targetNotFound.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Target Tidak Ditemukan (TARGET NOT FOUND):</span>
            <p className="mt-0.5 text-[11px] text-amber-300">
              Terdapat {targetNotFound.length} salesman yang memiliki transaksi penjualan, namun kode salesman (KD_SLS) tidak ditemukan pada Database Target Salesman ({targetNotFound.map(s => s.salesmanName).join(', ')}). Nilai achievement ditampilkan N/A.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs and Table View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        {/* Left Filter Status Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-cyan-600 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Salesman ({salesmanPerformances.length})
          </button>
          <button
            onClick={() => setFilterType('achieved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'achieved'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Top Achievement &ge; 100% ({topAchievers.length})
          </button>
          <button
            onClick={() => setFilterType('under')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'under'
                ? 'bg-amber-600 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Low Achievement &lt; 100% ({lowAchievers.length})
          </button>
          {targetNotFound.length > 0 && (
            <button
              onClick={() => setFilterType('no_target')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'no_target'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Target Not Found ({targetNotFound.length})
            </button>
          )}
        </div>

        {/* Right Table View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Mode Kolom:</span>
          </span>
          <button
            onClick={() => setTableViewMode('all')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tableViewMode === 'all'
                ? 'bg-cyan-600 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Tampilkan semua kolom termasuk analisa sisa hari kerja"
          >
            Semua Kolom
          </button>
          <button
            onClick={() => setTableViewMode('run_rate')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tableViewMode === 'run_rate'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Fokus kolom kekurangan dan target per hari sisa"
          >
            Fokus Sisa Hari Kerja
          </button>
          <button
            onClick={() => setTableViewMode('standard')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tableViewMode === 'standard'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Tampilan ringkas standar"
          >
            Standar
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        title={`Tabel Peringkat Performance Salesman (${currLabel}) - Sisa ${sisaHariKerja} Hari Kerja`}
        columns={columns}
        data={enrichedSalesmen}
        searchPlaceholder="Cari salesman atau kode..."
        exportFileName={`Target_vs_Realisasi_Sisa_${sisaHariKerja}_Hari_Kerja_${currLabel}.xlsx`}
      />

      {calculation && (
        <WhatsAppSalesmanReportModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          calculation={calculation}
          settings={settings}
          totalHariKerja={hariKerjaBlnIni}
          hariKerjaBerjalan={hariKerjaBerjalan}
        />
      )}
    </div>
  );
}
