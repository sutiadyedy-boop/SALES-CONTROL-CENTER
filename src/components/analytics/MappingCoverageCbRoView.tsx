import React, { useState, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Search, 
  Filter, 
  Download, 
  Camera, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  Compass, 
  Layers, 
  Store, 
  Target, 
  PieChart, 
  ArrowUpRight, 
  ShieldAlert, 
  ExternalLink,
  Sparkles,
  Info,
  X,
  FileSpreadsheet,
  Map as MapIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterOutletRecord } from '../../types/database';
import { 
  BPS_SULAWESI_SELATAN_DATA, 
  TOTAL_SULSEL_RO_BPS, 
  TOTAL_SULSEL_KECAMATAN,
  BpsKabupatenData 
} from '../../data/bpsSulselData';
import { 
  calculateSulselCoverage, 
  KabupatenCoverageSummary, 
  KecamatanCoverageSummary, 
  CoverageStatus 
} from '../../services/coverageMatchingService';
import { captureElementToJpg } from '../../services/captureEngine';
import { SulselD3Map } from './SulselD3Map';

interface MappingCoverageCbRoViewProps {
  masterOutlets: MasterOutletRecord[];
  onNavigateToUpload?: () => void;
  onLoadSampleData?: () => void;
}

export function MappingCoverageCbRoView({
  masterOutlets,
  onNavigateToUpload,
  onLoadSampleData
}: MappingCoverageCbRoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'map_d3' | 'kabupaten' | 'kecamatan' | 'gap_analysis' | 'ranking'>('map_d3');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKabupatenFilter, setSelectedKabupatenFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedKategoriWilayahFilter, setSelectedKategoriWilayahFilter] = useState<string>('ALL');

  // Outlet inspection modal
  const [inspectedRegion, setInspectedRegion] = useState<{
    title: string;
    type: 'KABUPATEN' | 'KECAMATAN';
    bpsRo: number;
    cbTotal: number;
    cbActive: number;
    coverageRatio: number;
    outlets: MasterOutletRecord[];
  } | null>(null);

  // Expanded kabupaten accordions in table
  const [expandedKabupaten, setExpandedKabupaten] = useState<Record<string, boolean>>({});

  const toggleKabupatenExpand = (kodeBps: string) => {
    setExpandedKabupaten(prev => ({
      ...prev,
      [kodeBps]: !prev[kodeBps]
    }));
  };

  // Inline map toggle on table view
  const [showInlineMap, setShowInlineMap] = useState<boolean>(false);

  // Main Coverage Calculation
  const coverageData = useMemo(() => {
    return calculateSulselCoverage(masterOutlets, BPS_SULAWESI_SELATAN_DATA);
  }, [masterOutlets]);

  // Filtered Kabupaten list
  const filteredKabupatens = useMemo(() => {
    return coverageData.kabupatenSummaries.filter(kab => {
      // Search
      const matchesSearch = 
        kab.namaKabupaten.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kab.namaSingkat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kab.ibukota.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kab.kodeBps.includes(searchQuery);

      if (!matchesSearch) return false;

      // Status
      if (selectedStatusFilter !== 'ALL' && kab.coverageStatus !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [coverageData.kabupatenSummaries, searchQuery, selectedStatusFilter]);

  // Filtered Kecamatan list
  const filteredKecamatans = useMemo(() => {
    return coverageData.allKecamatanSummaries.filter(kec => {
      // Kabupaten filter
      if (selectedKabupatenFilter !== 'ALL' && kec.kodeKabupaten !== selectedKabupatenFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL' && kec.coverageStatus !== selectedStatusFilter) {
        return false;
      }

      // Kategori Wilayah filter
      if (selectedKategoriWilayahFilter !== 'ALL' && kec.kategoriWilayah !== selectedKategoriWilayahFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          kec.namaKecamatan.toLowerCase().includes(q) ||
          kec.namaKabupaten.toLowerCase().includes(q) ||
          kec.namaSingkatKabupaten.toLowerCase().includes(q) ||
          kec.kodeBps.includes(q) ||
          kec.deskripsiSentra.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [coverageData.allKecamatanSummaries, selectedKabupatenFilter, selectedStatusFilter, selectedKategoriWilayahFilter, searchQuery]);

  // High potential opportunity gap kecamatans (highest RO BPS with low or 0 coverage)
  const topOpportunityGaps = useMemo(() => {
    return [...coverageData.allKecamatanSummaries]
      .filter(k => k.coverageRatio < 40)
      .sort((a, b) => b.gapOutlets - a.gapOutlets)
      .slice(0, 15);
  }, [coverageData.allKecamatanSummaries]);

  // Ranking sorted
  const rankedKabupatens = useMemo(() => {
    return [...coverageData.kabupatenSummaries].sort((a, b) => b.coverageRatio - a.coverageRatio);
  }, [coverageData.kabupatenSummaries]);

  // Screenshot capture handler
  const handleCapture = async () => {
    await captureElementToJpg('mapping-coverage-area-view', {
      fileName: `Mapping_Coverage_CB_vs_RO_BPS_Sulsel_${new Date().toISOString().slice(0, 10)}.jpg`
    });
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Kabupaten Summary
    const kabData = coverageData.kabupatenSummaries.map((k, idx) => ({
      'No': idx + 1,
      'Kode BPS': k.kodeBps,
      'Kabupaten / Kota': k.namaKabupaten,
      'Tipe': k.tipe,
      'Ibukota': k.ibukota,
      'Jumlah Kecamatan Total': k.jumlahKecamatan,
      'Kecamatan Tercover': k.kecamatanCoveredCount,
      'Rasio Kecamatan Tercover (%)': `${k.kecamatanCoverageRate.toFixed(1)}%`,
      'Master CB (Toko Terdaftar)': k.masterCbTotal,
      'CB Aktif': k.masterCbActive,
      'CB Non-Aktif': k.masterCbInactive,
      'RO Industri BPS Sulsel': k.roIndustriBps,
      'Coverage Ratio (%)': `${k.coverageRatio.toFixed(2)}%`,
      'Active Coverage Ratio (%)': `${k.activeCoverageRatio.toFixed(2)}%`,
      'Gap Peluang (Unserved)': k.gapOutlets,
      'Status Penetrasi': k.coverageStatus
    }));
    const wsKab = XLSX.utils.json_to_sheet(kabData);
    XLSX.utils.book_append_sheet(wb, wsKab, 'CB vs RO BPS Kabupaten');

    // Sheet 2: Kecamatan Detail
    const kecData = coverageData.allKecamatanSummaries.map((kc, idx) => ({
      'No': idx + 1,
      'Kode BPS': kc.kodeBps,
      'Nama Kecamatan': kc.namaKecamatan,
      'Kabupaten / Kota': kc.namaKabupaten,
      'Kategori Wilayah': kc.kategoriWilayah,
      'Sentra Ekonomi': kc.deskripsiSentra,
      'Master CB (Toko)': kc.masterCbTotal,
      'CB Aktif': kc.masterCbActive,
      'CB Non-Aktif': kc.masterCbInactive,
      'RO Industri BPS': kc.roIndustriBps,
      'Coverage Ratio (%)': `${kc.coverageRatio.toFixed(2)}%`,
      'Gap Peluang (Unserved)': kc.gapOutlets,
      'Status Penetrasi': kc.coverageStatus
    }));
    const wsKec = XLSX.utils.json_to_sheet(kecData);
    XLSX.utils.book_append_sheet(wb, wsKec, 'CB vs RO BPS Kecamatan');

    // Sheet 3: Top Opportunity Gaps
    const gapData = topOpportunityGaps.map((g, idx) => ({
      'Peringkat Peluang': idx + 1,
      'Kecamatan': g.namaKecamatan,
      'Kabupaten': g.namaKabupaten,
      'RO Industri BPS (Universe)': g.roIndustriBps,
      'Master CB Saat Ini': g.masterCbTotal,
      'Gap Outlet Belum Tercover': g.gapOutlets,
      'Coverage Saat Ini (%)': `${g.coverageRatio.toFixed(2)}%`,
      'Kategori Wilayah': g.kategoriWilayah,
      'Karakteristik & Potensi': g.deskripsiSentra,
      'Rekomendasi Distributor': g.masterCbTotal === 0 ? 'Buka Rute Baru / Penambahan Motoris Canvasser' : 'Penetrasi Intensif & Reaktivasi Outlet'
    }));
    const wsGap = XLSX.utils.json_to_sheet(gapData);
    XLSX.utils.book_append_sheet(wb, wsGap, 'Rekomendasi Gap Ekspansi');

    XLSX.writeFile(wb, `Mapping_Coverage_CB_vs_RO_BPS_Sulsel_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper badge for status
  const renderStatusBadge = (status: CoverageStatus) => {
    switch (status) {
      case 'OPTIMAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Optimal (≥70%)
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Moderat (40-69%)
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Rendah (1-39%)
          </span>
        );
      case 'BLANK_SPOT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Blank Spot (0%)
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} id="mapping-coverage-area-view" className="space-y-6 pb-16 text-slate-100">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Mapping Coverage Area: Master CB vs RO Industri BPS Sulawesi Selatan
                  </h1>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    BPS SULSEL RESMI
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Komparasi 100% Real Basis Pelanggan Terdaftar (Master CB) vs Sensus Industri & Retail Outlet BPS Provinsi Sulawesi Selatan (24 Kabupaten / Kota & 311 Kecamatan)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {masterOutlets.length === 0 && onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Muat Data Sample Sulsel
              </button>
            )}

            <button
              onClick={handleCapture}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
              title="Capture tampilan layar ke file JPG"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Capture JPG
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
              title="Export data lengkap per Kabupaten dan Kecamatan ke Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel (XLSX)
            </button>
          </div>
        </div>

        {/* TOP TAB NAVIGATION */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('map_d3')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'map_d3'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapIcon className="w-4 h-4 text-cyan-400" />
            Peta Geografis Interaktif (D3)
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
              Visual Sulsel
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kabupaten')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'kabupaten'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Komparasi Per Kabupaten / Kota (24)
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono">
              {coverageData.totalKabupatenUniverse}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kecamatan')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'kecamatan'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            Komparasi Per Kecamatan (Detail 311)
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono">
              {coverageData.totalKecamatanUniverse}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gap_analysis')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'gap_analysis'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-4 h-4 text-amber-400" />
            Analisa Gap & Rekomendasi Ekspansi
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              Peluang Tinggi
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ranking'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Ranking Penetrasi Wilayah
          </button>
        </div>
      </div>

      {/* METRIC KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Master CB */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Master CB</span>
            <Store className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white">
            {coverageData.totalMasterCb.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-emerald-400 font-medium">
              Aktif: {coverageData.totalMasterCbActive}
            </span>
            <span className="text-rose-400 font-medium">
              Non: {coverageData.totalMasterCbInactive}
            </span>
          </div>
        </div>

        {/* RO Industri BPS Sulsel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>RO Industri BPS</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-indigo-300">
            {coverageData.totalBpsUniverse.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Universe Sensus BPS Sulsel
          </div>
        </div>

        {/* Overall Coverage Ratio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Coverage Ratio Sulsel</span>
            <PieChart className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-teal-300">
            {coverageData.overallCoverageRatio.toFixed(2)}%
          </div>
          <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, coverageData.overallCoverageRatio * 5)}%` }}
            />
          </div>
        </div>

        {/* Kabupaten Tercover */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Kabupaten Tercover</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
            {coverageData.totalKabupatenCovered} <span className="text-xs font-normal text-slate-400">/ {coverageData.totalKabupatenUniverse}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {((coverageData.totalKabupatenCovered / coverageData.totalKabupatenUniverse) * 100).toFixed(0)}% Wilayah Kab/Kota
          </div>
        </div>

        {/* Kecamatan Tercover */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Kecamatan Tercover</span>
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-300">
            {coverageData.totalKecamatanCovered} <span className="text-xs font-normal text-slate-400">/ {coverageData.totalKecamatanUniverse}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {((coverageData.totalKecamatanCovered / coverageData.totalKecamatanUniverse) * 100).toFixed(1)}% Kecamatan Sulsel
          </div>
        </div>

        {/* Gap Peluang Outlet */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Gap Belum Tercover</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-rose-400">
            {coverageData.totalGapOutlets.toLocaleString('id-ID')}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Potensi Outlet Tambahan
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'kabupaten'
                ? "Cari nama kabupaten/kota, ibukota, kode BPS..."
                : "Cari kecamatan, kabupaten, sentra ekonomi..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'kecamatan' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Kabupaten:</span>
              <select
                value={selectedKabupatenFilter}
                onChange={(e) => setSelectedKabupatenFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="ALL">Semua Kabupaten / Kota (24)</option>
                {BPS_SULAWESI_SELATAN_DATA.map(k => (
                  <option key={k.kodeBps} value={k.kodeBps}>
                    {k.namaKabupaten}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'kecamatan' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Wilayah:</span>
              <select
                value={selectedKategoriWilayahFilter}
                onChange={(e) => setSelectedKategoriWilayahFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="Perkotaan">Perkotaan</option>
                <option value="Transisi">Transisi</option>
                <option value="Pedesaan">Pedesaan</option>
                <option value="Pesisir / Kepulauan">Pesisir / Kepulauan</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status Penetrasi:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPTIMAL">Optimal (≥ 70%)</option>
              <option value="MODERATE">Moderat (40% - 69%)</option>
              <option value="LOW">Rendah (1% - 39%)</option>
              <option value="BLANK_SPOT">Blank Spot (0%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 0: PETA GEOGRAFIS INTERAKTIF D3 */}
      {activeTab === 'map_d3' && (
        <div className="space-y-6">
          <SulselD3Map
            kabupatenSummaries={coverageData.kabupatenSummaries}
            onInspectOutlets={setInspectedRegion}
            onSelectKabupaten={(kab) => {
              // Automatically highlights and populates details in side panel
            }}
          />

          {/* Quick Geographical Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Wilayah Penetrasi Tertinggi
              </div>
              <div className="text-xs text-slate-300">
                Kabupaten/Kota dengan rasio coveran Master CB tertinggi terhadap sensus industri retail BPS:
              </div>
              <div className="space-y-1.5 pt-1">
                {rankedKabupatens.slice(0, 3).map((k, idx) => (
                  <div key={k.kodeBps} className="flex justify-between items-center text-xs font-mono p-1.5 rounded bg-slate-950">
                    <span className="text-white font-medium">{idx + 1}. {k.namaKabupaten}</span>
                    <span className="text-emerald-400 font-bold">{k.coverageRatio.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Target className="w-4 h-4 text-amber-400" />
                Gap Peluang Terbesar (Unserved Market)
              </div>
              <div className="text-xs text-slate-300">
                Wilayah dengan potensi toko sensus BPS terbesar yang belum terjangkau distributor:
              </div>
              <div className="space-y-1.5 pt-1">
                {[...coverageData.kabupatenSummaries].sort((a, b) => b.gapOutlets - a.gapOutlets).slice(0, 3).map((k, idx) => (
                  <div key={k.kodeBps} className="flex justify-between items-center text-xs font-mono p-1.5 rounded bg-slate-950">
                    <span className="text-white font-medium">{idx + 1}. {k.namaKabupaten}</span>
                    <span className="text-rose-400 font-bold">+{k.gapOutlets.toLocaleString('id-ID')} Toko</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Compass className="w-4 h-4 text-cyan-400" />
                Akses Cepat Eksplorasi
              </div>
              <div className="text-xs text-slate-300">
                Lakukan penelusuran lebih dalam ke data detail tabel:
              </div>
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setActiveTab('kabupaten')}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-between transition"
                >
                  <span>Lihat Tabel 24 Kabupaten/Kota</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  onClick={() => setActiveTab('kecamatan')}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-between transition"
                >
                  <span>Lihat Detail 311 Kecamatan</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: KOMPARASI PER KABUPATEN / KOTA */}
      {activeTab === 'kabupaten' && (
        <div className="space-y-4">
          {showInlineMap && (
            <SulselD3Map
              kabupatenSummaries={coverageData.kabupatenSummaries}
              onInspectOutlets={setInspectedRegion}
            />
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">
                  Tabel Komparasi Master CB vs RO Industri BPS Per Kabupaten / Kota
                </h2>
                <span className="text-xs text-slate-400">
                  ({filteredKabupatens.length} dari 24 Kabupaten / Kota Sulawesi Selatan)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowInlineMap(!showInlineMap)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  {showInlineMap ? 'Sembunyikan Peta D3' : 'Tampilkan Peta D3'}
                </button>
                <div className="text-xs text-slate-400 hidden lg:block">
                  Klik baris untuk expand kecamatan
                </div>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-3.5">Kode BPS</th>
                  <th className="py-3 px-3.5">Kabupaten / Kota</th>
                  <th className="py-3 px-3.5">Ibukota</th>
                  <th className="py-3 px-3.5 text-center">Kecamatan Tercover</th>
                  <th className="py-3 px-3.5 text-right font-mono">Master CB</th>
                  <th className="py-3 px-3.5 text-right font-mono">CB Aktif</th>
                  <th className="py-3 px-3.5 text-right font-mono">CB Non-Aktif</th>
                  <th className="py-3 px-3.5 text-right font-mono">RO Industri BPS</th>
                  <th className="py-3 px-3.5 text-center min-w-[140px]">Coverage Ratio (%)</th>
                  <th className="py-3 px-3.5 text-right font-mono">Gap Peluang</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredKabupatens.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-500">
                      Tidak ada kabupaten/kota yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredKabupatens.map((kab, idx) => {
                    const isExpanded = !!expandedKabupaten[kab.kodeBps];
                    return (
                      <React.Fragment key={kab.kodeBps}>
                        <tr 
                          className={`hover:bg-slate-800/40 transition cursor-pointer ${
                            kab.masterCbTotal > 0 ? 'bg-slate-900/30' : 'bg-slate-900/10 opacity-75'
                          }`}
                          onClick={() => toggleKabupatenExpand(kab.kodeBps)}
                        >
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-cyan-400">
                            {kab.kodeBps}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{kab.namaKabupaten}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                                {kab.tipe}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-slate-300">
                            {kab.ibukota}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`font-mono text-xs font-semibold ${
                              kab.kecamatanCoveredCount > 0 ? 'text-emerald-400' : 'text-slate-500'
                            }`}>
                              {kab.kecamatanCoveredCount} / {kab.jumlahKecamatan}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              ({kab.kecamatanCoverageRate.toFixed(0)}%)
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-white">
                            {kab.masterCbTotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-emerald-400">
                            {kab.masterCbActive.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-rose-400">
                            {kab.masterCbInactive.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-indigo-300 font-semibold">
                            {kab.roIndustriBps.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono font-bold text-xs text-slate-200">
                                {kab.coverageRatio.toFixed(2)}%
                              </span>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    kab.coverageRatio >= 70 
                                      ? 'bg-emerald-500' 
                                      : kab.coverageRatio >= 40 
                                      ? 'bg-amber-500' 
                                      : kab.coverageRatio > 0 
                                      ? 'bg-cyan-500' 
                                      : 'bg-transparent'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(kab.coverageRatio, 2))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono text-slate-400">
                            {kab.gapOutlets.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {renderStatusBadge(kab.coverageStatus)}
                          </td>
                          <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => toggleKabupatenExpand(kab.kodeBps)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                title="Expand kecamatan"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              {kab.masterCbTotal > 0 && (
                                <button
                                  onClick={() => setInspectedRegion({
                                    title: kab.namaKabupaten,
                                    type: 'KABUPATEN',
                                    bpsRo: kab.roIndustriBps,
                                    cbTotal: kab.masterCbTotal,
                                    cbActive: kab.masterCbActive,
                                    coverageRatio: kab.coverageRatio,
                                    outlets: kab.outletList
                                  })}
                                  className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium transition"
                                >
                                  Lihat Toko ({kab.masterCbTotal})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ACCORDION KECAMATAN BREAKDOWN */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={13} className="p-4 border-y border-slate-800">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-cyan-400" />
                                    <h3 className="text-xs font-bold text-white">
                                      Daftar Kecamatan di {kab.namaKabupaten} ({kab.kecamatanSummaries.length} Kecamatan)
                                    </h3>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedKabupatenFilter(kab.kodeBps);
                                      setActiveTab('kecamatan');
                                    }}
                                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                                  >
                                    Buka di Tab Kecamatan
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {kab.kecamatanSummaries.map(kc => (
                                    <div 
                                      key={kc.kodeBps}
                                      className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg hover:border-slate-700 transition space-y-2"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="text-xs font-bold text-white">
                                            {kc.namaKecamatan}
                                          </div>
                                          <div className="text-[10px] text-slate-400">
                                            Sentra: {kc.deskripsiSentra || kc.kategoriWilayah}
                                          </div>
                                        </div>
                                        {renderStatusBadge(kc.coverageStatus)}
                                      </div>

                                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center font-mono">
                                        <div className="bg-slate-950 p-1.5 rounded">
                                          <div className="text-[9px] text-slate-400">Master CB</div>
                                          <div className="text-xs font-bold text-white">{kc.masterCbTotal}</div>
                                        </div>
                                        <div className="bg-slate-950 p-1.5 rounded">
                                          <div className="text-[9px] text-slate-400">RO BPS</div>
                                          <div className="text-xs font-bold text-indigo-300">{kc.roIndustriBps}</div>
                                        </div>
                                        <div className="bg-slate-950 p-1.5 rounded">
                                          <div className="text-[9px] text-slate-400">Coverage</div>
                                          <div className="text-xs font-bold text-teal-300">{kc.coverageRatio.toFixed(1)}%</div>
                                        </div>
                                      </div>

                                      {kc.masterCbTotal > 0 && (
                                        <button
                                          onClick={() => setInspectedRegion({
                                            title: `Kecamatan ${kc.namaKecamatan} (${kab.namaKabupaten})`,
                                            type: 'KECAMATAN',
                                            bpsRo: kc.roIndustriBps,
                                            cbTotal: kc.masterCbTotal,
                                            cbActive: kc.masterCbActive,
                                            coverageRatio: kc.coverageRatio,
                                            outlets: kc.outletList
                                          })}
                                          className="w-full py-1 text-center text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/5 hover:bg-cyan-500/15 rounded border border-cyan-500/20 font-medium transition"
                                        >
                                          Lihat {kc.masterCbTotal} Toko Terdaftar
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {filteredKabupatens.length > 0 && (
                <tfoot className="bg-slate-950 font-bold text-white border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={4} className="py-3 px-3.5 text-right uppercase">
                      Total Seluruh Sulawesi Selatan:
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono text-emerald-400">
                      {coverageData.totalKecamatanCovered} / {coverageData.totalKecamatanUniverse}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-white">
                      {coverageData.totalMasterCb.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-emerald-400">
                      {coverageData.totalMasterCbActive.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-rose-400">
                      {coverageData.totalMasterCbInactive.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-indigo-300">
                      {coverageData.totalBpsUniverse.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono text-teal-300">
                      {coverageData.overallCoverageRatio.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-400">
                      {coverageData.totalGapOutlets.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    )}

      {/* TAB 2: KOMPARASI PER KECAMATAN */}
      {activeTab === 'kecamatan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">
                Tabel Komparasi Master CB vs RO Industri BPS Per Kecamatan
              </h2>
              <span className="text-xs text-slate-400">
                (Menampilkan {filteredKecamatans.length} dari 311 Kecamatan)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Data Resmi Sensus Retail & Industri BPS Sulsel
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-3.5">Kode BPS</th>
                  <th className="py-3 px-3.5">Kecamatan</th>
                  <th className="py-3 px-3.5">Kabupaten / Kota</th>
                  <th className="py-3 px-3.5">Kategori Wilayah</th>
                  <th className="py-3 px-3.5">Sentra Ekonomi & Potensi</th>
                  <th className="py-3 px-3.5 text-right font-mono">Master CB</th>
                  <th className="py-3 px-3.5 text-right font-mono">CB Aktif</th>
                  <th className="py-3 px-3.5 text-right font-mono">CB Non-Aktif</th>
                  <th className="py-3 px-3.5 text-right font-mono">RO Industri BPS</th>
                  <th className="py-3 px-3.5 text-center min-w-[130px]">Coverage (%)</th>
                  <th className="py-3 px-3.5 text-right font-mono">Gap Outlet</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredKecamatans.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-500">
                      Tidak ada kecamatan yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredKecamatans.map((kec, idx) => (
                    <tr 
                      key={kec.kodeBps}
                      className={`hover:bg-slate-800/40 transition ${
                        kec.masterCbTotal > 0 ? 'bg-slate-900/30' : 'bg-slate-900/10 opacity-75'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-cyan-400">
                        {kec.kodeBps}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-white">
                        {kec.namaKecamatan}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300 font-medium">
                        {kec.namaKabupaten}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          kec.kategoriWilayah === 'Perkotaan' 
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                            : kec.kategoriWilayah === 'Pesisir / Kepulauan' 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                            : kec.kategoriWilayah === 'Transisi' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {kec.kategoriWilayah}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-400 text-[11px] max-w-xs truncate" title={kec.deskripsiSentra}>
                        {kec.deskripsiSentra}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-white">
                        {kec.masterCbTotal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-emerald-400">
                        {kec.masterCbActive}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-rose-400">
                        {kec.masterCbInactive}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-indigo-300 font-semibold">
                        {kec.roIndustriBps.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-xs text-slate-200">
                            {kec.coverageRatio.toFixed(2)}%
                          </span>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                kec.coverageRatio >= 70 
                                  ? 'bg-emerald-500' 
                                  : kec.coverageRatio >= 40 
                                  ? 'bg-amber-500' 
                                  : kec.coverageRatio > 0 
                                  ? 'bg-cyan-500' 
                                  : 'bg-transparent'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(kec.coverageRatio, 2))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                        {kec.gapOutlets.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {renderStatusBadge(kec.coverageStatus)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {kec.masterCbTotal > 0 ? (
                          <button
                            onClick={() => setInspectedRegion({
                              title: `Kecamatan ${kec.namaKecamatan} (${kec.namaKabupaten})`,
                              type: 'KECAMATAN',
                              bpsRo: kec.roIndustriBps,
                              cbTotal: kec.masterCbTotal,
                              cbActive: kec.masterCbActive,
                              coverageRatio: kec.coverageRatio,
                              outlets: kec.outletList
                            })}
                            className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium transition"
                          >
                            Lihat {kec.masterCbTotal} Toko
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Belum Ada</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANALISA GAP & REKOMENDASI EKSPANSI */}
      {activeTab === 'gap_analysis' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Target className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Top 15 Wilayah Gap Terbesar / Unserved Market Potensial di Sulawesi Selatan
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PRIORITAS EKSPANSI
                  </span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wilayah-wilayah ini memiliki basis retail outlet (RO BPS) yang sangat besar namun penetrasi Master CB distributor saat ini masih di bawah 40% atau bahkan masih blank spot (0%). Membuka rute kunjungan baru di area ini akan memaksimalkan pertumbuhan omzet secara agresif.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topOpportunityGaps.map((item, idx) => (
              <div 
                key={item.kodeBps}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 shadow transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white text-sm">
                        {item.namaKecamatan}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.namaKabupaten}
                      </div>
                    </div>
                  </div>
                  {renderStatusBadge(item.coverageStatus)}
                </div>

                <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-semibold text-cyan-300">Potensi Sentra:</span> {item.deskripsiSentra}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">Universe BPS</div>
                    <div className="font-bold text-indigo-300">{item.roIndustriBps}</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">Master CB</div>
                    <div className="font-bold text-white">{item.masterCbTotal}</div>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500">Gap Peluang</div>
                    <div className="font-bold text-rose-400">+{item.gapOutlets}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Rasio Coveran:</span>
                  <span className="font-mono font-bold text-teal-300">
                    {item.coverageRatio.toFixed(2)}%
                  </span>
                </div>

                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  💡 <span className="font-semibold">Rekomendasi Tindakan:</span>{' '}
                  {item.masterCbTotal === 0 
                    ? 'Buka rute canvas baru / alokasi salesman motoris.' 
                    : 'Reaktivasi toko tidak aktif & penetrasi SKU baru.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RANKING PENETRASI WILAYAH */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Leaderboard Penetrasi Master CB vs RO BPS Sulawesi Selatan (Urutan Tertinggi ke Terendah)
            </h3>

            <div className="space-y-3">
              {rankedKabupatens.map((kab, idx) => (
                <div 
                  key={kab.kodeBps}
                  className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      idx === 0 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                        : idx === 1 
                        ? 'bg-slate-300 text-slate-950' 
                        : idx === 2 
                        ? 'bg-amber-700 text-white' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white text-sm">
                        {kab.namaKabupaten}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Ibukota: {kab.ibukota}</span>
                        <span>•</span>
                        <span>{kab.kecamatanCoveredCount} / {kab.jumlahKecamatan} Kecamatan Tercover</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-400">Master CB / Universe RO BPS</div>
                      <div className="font-bold text-white text-sm">
                        {kab.masterCbTotal.toLocaleString('id-ID')}{' '}
                        <span className="text-slate-500 font-normal">/ {kab.roIndustriBps.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="w-32">
                      <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                        <span className="text-slate-400">Coverage</span>
                        <span className="text-cyan-300">{kab.coverageRatio.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            kab.coverageRatio >= 70 
                              ? 'bg-emerald-500' 
                              : kab.coverageRatio >= 40 
                              ? 'bg-amber-500' 
                              : kab.coverageRatio > 0 
                              ? 'bg-cyan-500' 
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(kab.coverageRatio, 2))}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      {renderStatusBadge(kab.coverageStatus)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OUTLET INSPECTION MODAL */}
      {inspectedRegion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/90">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">
                    Detail Toko Terdaftar Master CB: {inspectedRegion.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>Total CB: <strong className="text-white">{inspectedRegion.cbTotal}</strong></span>
                  <span>•</span>
                  <span>Aktif: <strong className="text-emerald-400">{inspectedRegion.cbActive}</strong></span>
                  <span>•</span>
                  <span>Universe BPS: <strong className="text-indigo-300">{inspectedRegion.bpsRo}</strong></span>
                  <span>•</span>
                  <span>Coverage: <strong className="text-teal-300">{inspectedRegion.coverageRatio.toFixed(2)}%</strong></span>
                </div>
              </div>

              <button
                onClick={() => setInspectedRegion(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 font-mono">Kode Outlet</th>
                    <th className="py-2.5 px-3">Nama Outlet</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Salesman</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Alamat / Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {inspectedRegion.outlets.map((o, idx) => (
                    <tr key={o.outletId || idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">
                        {o.outletId}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {o.outletName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {o.channel || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {o.salesmanName || o.salesmanId || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          o.isActive 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {o.statusCurrentMonth || (o.isActive ? 'OK' : 'NON AKTIF')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {o.address || o.kecamatan || o.area || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Menampilkan {inspectedRegion.outlets.length} outlet terdaftar
              </span>
              <button
                onClick={() => setInspectedRegion(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
