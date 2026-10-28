import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Building2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  Store, 
  Target, 
  ShieldAlert, 
  ExternalLink, 
  Layers, 
  Info,
  CheckCircle2,
  ChevronRight,
  X
} from 'lucide-react';
import { SULSEL_GEOJSON, SulselGeoFeature, SULSEL_KABUPATEN_COORDINATES } from '../../data/sulselGeoJson';
import { KabupatenCoverageSummary, CoverageStatus } from '../../services/coverageMatchingService';
import { MasterOutletRecord } from '../../types/database';

export type MapDisplayMode = 'choropleth' | 'dual_bubble' | 'gap_heatmap';

interface SulselD3MapProps {
  kabupatenSummaries: KabupatenCoverageSummary[];
  onSelectKabupaten?: (kabupaten: KabupatenCoverageSummary) => void;
  onInspectOutlets?: (data: {
    title: string;
    type: 'KABUPATEN' | 'KECAMATAN';
    bpsRo: number;
    cbTotal: number;
    cbActive: number;
    coverageRatio: number;
    outlets: MasterOutletRecord[];
  }) => void;
}

export function SulselD3Map({
  kabupatenSummaries,
  onSelectKabupaten,
  onInspectOutlets,
}: SulselD3MapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map settings state
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('choropleth');
  const [selectedKabupatenCode, setSelectedKabupatenCode] = useState<string | null>('7308'); // default Bone or null
  const [hoveredKabupaten, setHoveredKabupaten] = useState<KabupatenCoverageSummary | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Map dimensions
  const width = 800;
  const height = 650;

  // Create quick lookup map for data
  const dataByBpsCode = useMemo(() => {
    const map = new Map<string, KabupatenCoverageSummary>();
    for (const item of kabupatenSummaries) {
      map.set(item.kodeBps, item);
    }
    return map;
  }, [kabupatenSummaries]);

  // Selected kabupaten object
  const selectedKabupaten = useMemo(() => {
    if (!selectedKabupatenCode) return null;
    return dataByBpsCode.get(selectedKabupatenCode) || null;
  }, [selectedKabupatenCode, dataByBpsCode]);

  // D3 Projection and Path Generator
  const { projection, pathGenerator } = useMemo(() => {
    // Mercator projection centered on Sulawesi Selatan
    const proj = d3.geoMercator()
      .center([120.2, -4.2]) // center of Sulsel
      .scale(5400) // zoom level fitted to 800x650
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(proj);
    return { projection: proj, pathGenerator: path };
  }, [width, height]);

  // Zoom behavior handler ref
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  // Initialize D3 Zoom and SVG
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.77);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
      );
    }
  };

  // Color functions
  const getChoroplethColor = (summary?: KabupatenCoverageSummary) => {
    if (!summary || summary.masterCbTotal === 0) {
      return '#1e293b'; // slate-800 blank
    }
    const ratio = summary.coverageRatio;
    if (ratio >= 70) return '#059669'; // emerald-600
    if (ratio >= 40) return '#d97706'; // amber-600
    if (ratio >= 15) return '#0284c7'; // sky-600
    return '#0d9488'; // teal-600
  };

  const getGapHeatmapColor = (summary?: KabupatenCoverageSummary) => {
    if (!summary) return '#1e293b';
    const gap = summary.gapOutlets;
    // Scale gap from 0 to 20,000
    if (gap > 15000) return '#e11d48'; // rose-600
    if (gap > 10000) return '#ea580c'; // orange-600
    if (gap > 6000) return '#d97706'; // amber-600
    return '#475569'; // slate-600
  };

  // Calculate bubble sizes for Dual Bubble mode
  const maxRo = Math.max(...kabupatenSummaries.map(k => k.roIndustriBps), 1);
  const maxCb = Math.max(...kabupatenSummaries.map(k => k.masterCbTotal), 1);

  const roScale = d3.scaleSqrt().domain([0, maxRo]).range([6, 32]);
  const cbScale = d3.scaleSqrt().domain([0, maxCb]).range([3, 26]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-slate-100">
      {/* MAP TOP BAR / CONTROLS */}
      <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Peta Distribusi Geografis: Master CB vs RO Industri BPS
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                D3.js Interactive
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Sorot atau klik kabupaten untuk membandingkan basis outlet terdaftar dengan universe BPS
            </p>
          </div>
        </div>

        {/* Display Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setDisplayMode('choropleth')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                displayMode === 'choropleth'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Choropleth Coverage (%)
            </button>
            <button
              onClick={() => setDisplayMode('dual_bubble')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                displayMode === 'dual_bubble'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual Bubble (CB vs RO)
            </button>
            <button
              onClick={() => setDisplayMode('gap_heatmap')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                displayMode === 'gap_heatmap'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gap Potensi Pasar
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Perbesar Peta"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Perkecil Peta"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Reset Tampilan Peta"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAP BODY WITH INTERACTIVE SVG & SIDE DETAILS */}
      <div className="relative flex flex-col lg:flex-row min-h-[580px]">
        {/* SVG Canvas Area */}
        <div ref={containerRef} className="relative flex-1 bg-slate-950/70 overflow-hidden flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[580px] cursor-grab active:cursor-grabbing select-none"
          >
            {/* Background pattern */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.6" />
              </pattern>
              <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>

            {/* Grid background */}
            <rect width={width} height={height} fill="url(#grid)" />

            {/* Zoomable Group */}
            <g ref={gRef}>
              {/* Kabupaten Polygons */}
              <g className="kabupaten-polygons">
                {SULSEL_GEOJSON.features.map((feature) => {
                  const kodeBps = feature.properties.kodeBps;
                  const summary = dataByBpsCode.get(kodeBps);
                  const isSelected = selectedKabupatenCode === kodeBps;
                  const isHovered = hoveredKabupaten?.kodeBps === kodeBps;
                  const pathString = pathGenerator(feature as any) || '';

                  let fillColor = '#1e293b';
                  if (displayMode === 'choropleth') {
                    fillColor = getChoroplethColor(summary);
                  } else if (displayMode === 'gap_heatmap') {
                    fillColor = getGapHeatmapColor(summary);
                  } else {
                    // dual bubble mode: neutral dark background
                    fillColor = isSelected ? '#1e293b' : '#0f172a';
                  }

                  return (
                    <path
                      key={kodeBps}
                      d={pathString}
                      fill={fillColor}
                      fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.7}
                      stroke={isSelected ? '#38bdf8' : isHovered ? '#22d3ee' : '#334155'}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                      strokeDasharray={summary?.masterCbTotal === 0 ? '3 3' : 'none'}
                      className="transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        setSelectedKabupatenCode(kodeBps);
                        if (summary && onSelectKabupaten) {
                          onSelectKabupaten(summary);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (summary) setHoveredKabupaten(summary);
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredKabupaten(null);
                        setTooltipPos(null);
                      }}
                    />
                  );
                })}
              </g>

              {/* Dual Bubble Mode Visual Elements */}
              {displayMode === 'dual_bubble' && (
                <g className="dual-bubbles pointer-events-none">
                  {SULSEL_GEOJSON.features.map((feature) => {
                    const kodeBps = feature.properties.kodeBps;
                    const summary = dataByBpsCode.get(kodeBps);
                    if (!summary) return null;

                    const coordConfig = SULSEL_KABUPATEN_COORDINATES[kodeBps];
                    const centroid = coordConfig?.centroid || feature.properties.centroid;
                    const projected = projection(centroid);
                    if (!projected) return null;

                    const [cx, cy] = projected;
                    const roRadius = roScale(summary.roIndustriBps);
                    const cbRadius = summary.masterCbTotal > 0 ? cbScale(summary.masterCbTotal) : 0;

                    return (
                      <g key={`bubble-${kodeBps}`} transform={`translate(${cx}, ${cy})`}>
                        {/* Outer Bubble: RO Industri BPS (Universe) */}
                        <circle
                          r={roRadius}
                          fill="url(#indigoGrad)"
                          stroke="#818cf8"
                          strokeWidth="1.2"
                          strokeOpacity="0.8"
                        />
                        {/* Inner Bubble: Master CB */}
                        {cbRadius > 0 && (
                          <circle
                            r={cbRadius}
                            fill="#10b981"
                            fillOpacity="0.9"
                            stroke="#34d399"
                            strokeWidth="1.5"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Centroid Labels */}
              <g className="centroid-labels pointer-events-none">
                {SULSEL_GEOJSON.features.map((feature) => {
                  const kodeBps = feature.properties.kodeBps;
                  const summary = dataByBpsCode.get(kodeBps);
                  const coordConfig = SULSEL_KABUPATEN_COORDINATES[kodeBps];
                  const centroid = coordConfig?.centroid || feature.properties.centroid;
                  const projected = projection(centroid);
                  if (!projected) return null;

                  let [cx, cy] = projected;
                  if (coordConfig?.labelOffset) {
                    cx += coordConfig.labelOffset[0];
                    cy += coordConfig.labelOffset[1];
                  }

                  const isSelected = selectedKabupatenCode === kodeBps;

                  return (
                    <g key={`label-${kodeBps}`} transform={`translate(${cx}, ${cy})`}>
                      <text
                        textAnchor="middle"
                        dy="-4"
                        fontSize={isSelected ? '10' : '8.5'}
                        fontWeight={isSelected ? 'bold' : '600'}
                        fill={isSelected ? '#38bdf8' : '#f8fafc'}
                        stroke="#020617"
                        strokeWidth="2.5"
                        paintOrder="stroke"
                        className="select-none font-sans"
                      >
                        {feature.properties.namaSingkat}
                      </text>
                      {summary && (
                        <text
                          textAnchor="middle"
                          dy="7"
                          fontSize="7.5"
                          fontWeight="bold"
                          fill={
                            summary.masterCbTotal > 0 ? '#34d399' : '#94a3b8'
                          }
                          stroke="#020617"
                          strokeWidth="2"
                          paintOrder="stroke"
                          className="font-mono select-none"
                        >
                          {displayMode === 'dual_bubble'
                            ? `${summary.masterCbTotal} / ${summary.roIndustriBps}`
                            : displayMode === 'gap_heatmap'
                            ? `Gap: ${summary.gapOutlets}`
                            : `${summary.coverageRatio.toFixed(1)}%`}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>

          {/* FLOATING HOVER TOOLTIP */}
          {hoveredKabupaten && tooltipPos && (
            <div
              className="absolute pointer-events-none z-30 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[220px] text-xs transition-all"
              style={{
                left: Math.min(tooltipPos.x + 15, width - 240),
                top: Math.max(tooltipPos.y - 100, 10),
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-white text-sm">
                  {hoveredKabupaten.namaKabupaten}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-mono">
                  {hoveredKabupaten.kodeBps}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Master CB Terdaftar:</span>
                  <strong className="text-white">{hoveredKabupaten.masterCbTotal.toLocaleString('id-ID')} Toko</strong>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-emerald-400">├ Aktif (OK):</span>
                  <span className="text-emerald-400 font-bold">{hoveredKabupaten.masterCbActive}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-rose-400">└ Non-Aktif:</span>
                  <span className="text-rose-400 font-bold">{hoveredKabupaten.masterCbInactive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RO Industri BPS:</span>
                  <strong className="text-indigo-300">{hoveredKabupaten.roIndustriBps.toLocaleString('id-ID')}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Coverage Ratio:</span>
                  <strong className="text-teal-300 font-bold">{hoveredKabupaten.coverageRatio.toFixed(2)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gap Peluang:</span>
                  <strong className="text-rose-400">+{hoveredKabupaten.gapOutlets.toLocaleString('id-ID')} Toko</strong>
                </div>
              </div>
            </div>
          )}

          {/* D3 MAP LEGEND OVERLAY */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-lg backdrop-blur text-[11px] space-y-1.5 max-w-xs">
            <div className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              {displayMode === 'choropleth'
                ? 'Legenda Penetrasi Coverage'
                : displayMode === 'dual_bubble'
                ? 'Legenda Dual Bubble'
                : 'Legenda Gap Potensi Pasar'}
            </div>

            {displayMode === 'choropleth' && (
              <div className="grid grid-cols-2 gap-1.5 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600"></span>
                  <span className="text-slate-300">≥ 70% (Optimal)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-600"></span>
                  <span className="text-slate-300">40 - 69% (Moderat)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-600"></span>
                  <span className="text-slate-300">1 - 39% (Rendah)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-800 border border-dashed border-rose-500/50"></span>
                  <span className="text-slate-300">0% (Blank Spot)</span>
                </div>
              </div>
            )}

            {displayMode === 'dual_bubble' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/60 border border-indigo-400"></span>
                  <span className="text-slate-300">Lingkaran Ungu: Universe RO BPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400"></span>
                  <span className="text-slate-300">Lingkaran Hijau: Master CB Toko</span>
                </div>
              </div>
            )}

            {displayMode === 'gap_heatmap' && (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-600"></span>
                  <span className="text-slate-300">&gt; 15.000 Gap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-orange-600"></span>
                  <span className="text-slate-300">10k - 15k Gap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-600"></span>
                  <span className="text-slate-300">6k - 10k Gap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-600"></span>
                  <span className="text-slate-300">&lt; 6.000 Gap</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDE DETAIL PANEL: SELECTED KABUPATEN BREAKDOWN */}
        <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between">
          {selectedKabupaten ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-semibold">
                      KODE BPS {selectedKabupaten.kodeBps}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">
                      {selectedKabupaten.namaKabupaten}
                    </h4>
                    <div className="text-xs text-slate-400">
                      Ibukota: {selectedKabupaten.ibukota}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Master CB</div>
                  <div className="text-sm font-bold text-white">{selectedKabupaten.masterCbTotal} Toko</div>
                  <div className="text-[9px] text-emerald-400 mt-0.5">Aktif: {selectedKabupaten.masterCbActive}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">RO Industri BPS</div>
                  <div className="text-sm font-bold text-indigo-300">{selectedKabupaten.roIndustriBps.toLocaleString('id-ID')}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Universe Sensus</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Coverage Ratio</div>
                  <div className="text-sm font-bold text-teal-300">{selectedKabupaten.coverageRatio.toFixed(2)}%</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Penetrasi Wilayah</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Gap Peluang</div>
                  <div className="text-sm font-bold text-rose-400">+{selectedKabupaten.gapOutlets.toLocaleString('id-ID')}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Unserved Market</div>
                </div>
              </div>

              {/* Kecamatan Coverage Progress */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Kecamatan Tercover:</span>
                  <span className="font-bold text-white font-mono">
                    {selectedKabupaten.kecamatanCoveredCount} / {selectedKabupaten.jumlahKecamatan} ({selectedKabupaten.kecamatanCoverageRate.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${selectedKabupaten.kecamatanCoverageRate}%` }}
                  />
                </div>
              </div>

              {/* Kecamatan List (Mini Accordion) */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Daftar Kecamatan ({selectedKabupaten.kecamatanSummaries.length}):</span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {selectedKabupaten.kecamatanSummaries.map(kc => (
                    <div 
                      key={kc.kodeBps}
                      className="p-2 rounded bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="font-medium text-white text-[11px]">{kc.namaKecamatan}</div>
                        <div className="text-[9px] text-slate-400">{kc.kategoriWilayah}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[10px] text-teal-300 font-bold">{kc.coverageRatio.toFixed(1)}%</div>
                        <div className="text-[9px] text-slate-400">{kc.masterCbTotal} / {kc.roIndustriBps}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Store inspection action button */}
              {selectedKabupaten.masterCbTotal > 0 && onInspectOutlets && (
                <button
                  onClick={() => onInspectOutlets({
                    title: selectedKabupaten.namaKabupaten,
                    type: 'KABUPATEN',
                    bpsRo: selectedKabupaten.roIndustriBps,
                    cbTotal: selectedKabupaten.masterCbTotal,
                    cbActive: selectedKabupaten.masterCbActive,
                    coverageRatio: selectedKabupaten.coverageRatio,
                    outlets: selectedKabupaten.outletList
                  })}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Store className="w-4 h-4" />
                  Lihat {selectedKabupaten.masterCbTotal} Toko Terdaftar
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <MapPin className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
              <div className="text-xs font-semibold text-slate-400">Pilih Kabupaten / Kota</div>
              <div className="text-[11px] mt-1">Klik salah satu wilayah pada peta untuk menampilkan ringkasan data geografis</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
