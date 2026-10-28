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
  ArrowLeft,
  AlertTriangle,
  Flame,
  Filter,
  Eye,
  X
} from 'lucide-react';
import { SULSEL_GEOJSON, SulselGeoFeature, SULSEL_KABUPATEN_COORDINATES } from '../../data/sulselGeoJson';
import { generateKecamatanFeatures, KecamatanGeoFeature } from '../../data/sulselKecamatanSpatial';
import { KabupatenCoverageSummary, KecamatanCoverageSummary, CoverageStatus } from '../../services/coverageMatchingService';
import { MasterOutletRecord } from '../../types/database';

export type MapDisplayMode = 'choropleth' | 'dual_bubble' | 'gap_heatmap';
export type MapViewLevel = 'PROVINSI' | 'KABUPATEN_DETAIL';

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

  // Map view level: Provinsi vs Kabupaten Detail
  const [viewLevel, setViewLevel] = useState<MapViewLevel>('KABUPATEN_DETAIL');
  const [selectedKabupatenCode, setSelectedKabupatenCode] = useState<string>('7308'); // default Kabupaten Bone (7308)
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('choropleth');
  
  // Highlighting filter for < 40%
  const [filterOnlyUnder40, setFilterOnlyUnder40] = useState<boolean>(false);

  // Hover states
  const [hoveredKabupaten, setHoveredKabupaten] = useState<KabupatenCoverageSummary | null>(null);
  const [hoveredKecamatan, setHoveredKecamatan] = useState<KecamatanCoverageSummary | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Map dimensions
  const width = 850;
  const height = 640;

  // Quick lookup map for Kabupaten
  const dataByBpsCode = useMemo(() => {
    const map = new Map<string, KabupatenCoverageSummary>();
    for (const item of kabupatenSummaries) {
      map.set(item.kodeBps, item);
    }
    return map;
  }, [kabupatenSummaries]);

  // Selected kabupaten object
  const selectedKabupaten = useMemo(() => {
    return dataByBpsCode.get(selectedKabupatenCode) || kabupatenSummaries[0] || null;
  }, [selectedKabupatenCode, dataByBpsCode, kabupatenSummaries]);

  // Quick lookup map for Kecamatan within selected Kabupaten
  const kecamatanDataMap = useMemo(() => {
    const map = new Map<string, KecamatanCoverageSummary>();
    if (selectedKabupaten) {
      for (const kc of selectedKabupaten.kecamatanSummaries) {
        map.set(kc.kodeBps, kc);
      }
    }
    return map;
  }, [selectedKabupaten]);

  // Generated spatial features for constituent kecamatans
  const kecamatanGeoFeatures: KecamatanGeoFeature[] = useMemo(() => {
    if (!selectedKabupatenCode) return [];
    return generateKecamatanFeatures(selectedKabupatenCode);
  }, [selectedKabupatenCode]);

  // Zoom behavior handler ref
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  // D3 Projection and Path Generator (Adapts to viewLevel)
  const { projection, pathGenerator } = useMemo(() => {
    let proj: d3.GeoProjection;

    if (viewLevel === 'PROVINSI') {
      // Province-level Mercator
      proj = d3.geoMercator()
        .center([120.2, -4.2])
        .scale(5400)
        .translate([width / 2, height / 2]);
    } else {
      // Kabupaten-level zoom: Center on the selected Kabupaten's centroid
      const coordConfig = SULSEL_KABUPATEN_COORDINATES[selectedKabupatenCode];
      const centroid = coordConfig?.centroid || [120.12, -4.68];
      
      // Auto scale based on size of kabupaten
      const scale = selectedKabupatenCode === '7371' || selectedKabupatenCode === '7372' || selectedKabupatenCode === '7373' 
        ? 38000 // Kota (denser)
        : 18000; // Kabupaten (larger area)

      proj = d3.geoMercator()
        .center(centroid)
        .scale(scale)
        .translate([width / 2, height / 2]);
    }

    const path = d3.geoPath().projection(proj);
    return { projection: proj, pathGenerator: path };
  }, [viewLevel, selectedKabupatenCode, width, height]);

  // Initialize D3 Zoom and SVG
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 12])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Reset zoom when switching view level or kabupaten
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);

    return () => {
      svg.on('.zoom', null);
    };
  }, [viewLevel, selectedKabupatenCode]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.35);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.75);
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
  const getKabupatenChoroplethColor = (summary?: KabupatenCoverageSummary) => {
    if (!summary || summary.masterCbTotal === 0) return '#1e293b'; // slate-800 blank
    const ratio = summary.coverageRatio;
    if (ratio < 40) return '#ef4444'; // Mencolok Red Under 40%
    if (ratio >= 70) return '#059669'; // Emerald-600
    return '#d97706'; // Amber-600 (40-69%)
  };

  // CRITICAL: Striking distinctive color for Kecamatans Under 40% (< 40% CB vs RO BPS)
  const getKecamatanColor = (summary?: KecamatanCoverageSummary) => {
    if (!summary) return '#1e293b';

    // Blank Spot (0% coveran) -> Dark Crimson Alert
    if (summary.masterCbTotal === 0) {
      return '#be123c'; // rose-700
    }

    // UNDER 40% -> STRIKING VIBRANT NEON FLAME RED / CRIMSON (PERLU PERHATIAN KHUSUS)
    if (summary.coverageRatio < 40) {
      return '#f43f5e'; // rose-500 vivid striking
    }

    // MODERAT (40% - 69.9%) -> Amber-Gold
    if (summary.coverageRatio < 70) {
      return '#d97706'; // amber-600
    }

    // OPTIMAL (>= 70%) -> Emerald Green
    return '#059669'; // emerald-600
  };

  // Calculate bubble sizes for Dual Bubble mode
  const maxRo = Math.max(...kabupatenSummaries.map(k => k.roIndustriBps), 1);
  const maxCb = Math.max(...kabupatenSummaries.map(k => k.masterCbTotal), 1);

  const roScale = d3.scaleSqrt().domain([0, maxRo]).range([8, 36]);
  const cbScale = d3.scaleSqrt().domain([0, maxCb]).range([4, 28]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-slate-100">
      {/* MAP TOP BAR / CONTROLS */}
      <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Peta Distribusi Geografis: Master CB vs RO Industri BPS
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold border border-cyan-500/30">
                BPS SULSEL RESMI (KATEGORI G & C)
              </span>
              {viewLevel === 'KABUPATEN_DETAIL' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-semibold border border-rose-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                  PERHATIAN KHUSUS: KECAMATAN &lt; 40%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewLevel === 'PROVINSI'
                ? 'Klik kabupaten untuk membuka peta geografis detail beserta seluruh batas kecamatannya'
                : `Menampilkan seluruh ${selectedKabupaten?.jumlahKecamatan || 0} kecamatan di ${selectedKabupaten?.namaKabupaten}. Kecamatan dengan coveran < 40% ditandai warna mencolok.`}
            </p>
          </div>
        </div>

        {/* CONTROLS & LEVEL SWITCHERS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Level Switcher (Provinsi vs Kabupaten) */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewLevel('PROVINSI')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                viewLevel === 'PROVINSI'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Peta Provinsi (24 Kab/Kota)
            </button>
            <button
              onClick={() => setViewLevel('KABUPATEN_DETAIL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                viewLevel === 'KABUPATEN_DETAIL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-rose-400" />
              Detail Per Kecamatan
            </button>
          </div>

          {/* Kabupaten Selector Dropdown (When in KABUPATEN_DETAIL) */}
          {viewLevel === 'KABUPATEN_DETAIL' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Kabupaten:</span>
              <select
                value={selectedKabupatenCode}
                onChange={(e) => {
                  setSelectedKabupatenCode(e.target.value);
                  const selected = dataByBpsCode.get(e.target.value);
                  if (selected && onSelectKabupaten) onSelectKabupaten(selected);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500 transition max-w-[210px] truncate"
              >
                {kabupatenSummaries.map((kab) => (
                  <option key={kab.kodeBps} value={kab.kodeBps}>
                    {kab.namaKabupaten} ({kab.under40KecamatanCount}/{kab.jumlahKecamatan} Kec &lt; 40%)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Special Attention Filter Toggle */}
          {viewLevel === 'KABUPATEN_DETAIL' && (
            <button
              onClick={() => setFilterOnlyUnder40(!filterOnlyUnder40)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border shadow-sm ${
                filterOnlyUnder40
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
                  : 'bg-slate-950 text-rose-300 border-rose-500/40 hover:bg-rose-950/30'
              }`}
              title="Isolasi tampilan hanya pada kecamatan yang memiliki rasio coveran di bawah 40%"
            >
              <Flame className="w-3.5 h-3.5 text-rose-300" />
              <span>{filterOnlyUnder40 ? 'Tampilkan Semua Kecamatan' : '⚡ Sorot Khusus Under 40%'}</span>
            </button>
          )}

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
      <div className="relative flex flex-col lg:flex-row min-h-[600px]">
        {/* SVG Canvas Area */}
        <div ref={containerRef} className="relative flex-1 bg-slate-950/80 overflow-hidden flex items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[600px] cursor-grab active:cursor-grabbing select-none"
          >
            {/* Background patterns and gradients */}
            <defs>
              <pattern id="grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
              </pattern>
              
              {/* Alert under 40% striping for blank spot */}
              <pattern id="diagonal-alert-stripes" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#ff0055" strokeWidth="3" strokeOpacity="0.7" />
                <line x1="0" y1="0" x2="0" y2="10" stroke="#0f172a" strokeWidth="7" strokeOpacity="0.8" />
              </pattern>

              {/* Glowing filters for Under 40% Alert */}
              <filter id="alert-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid background */}
            <rect width={width} height={height} fill="url(#grid-pattern)" />

            {/* Zoomable Canvas Group */}
            <g ref={gRef}>
              {/* ========================================================= */}
              {/* VIEW 1: PROVINSI SULSEL (24 KABUPATEN / KOTA)             */}
              {/* ========================================================= */}
              {viewLevel === 'PROVINSI' && (
                <g className="provinsi-view">
                  {SULSEL_GEOJSON.features.map((feature) => {
                    const kodeBps = feature.properties.kodeBps;
                    const summary = dataByBpsCode.get(kodeBps);
                    const isSelected = selectedKabupatenCode === kodeBps;
                    const isHovered = hoveredKabupaten?.kodeBps === kodeBps;
                    const pathString = pathGenerator(feature as any) || '';

                    const hasUnder40 = summary ? summary.under40KecamatanCount > 0 : false;
                    const fillColor = getKabupatenChoroplethColor(summary);

                    return (
                      <path
                        key={`prov-${kodeBps}`}
                        d={pathString}
                        fill={fillColor}
                        fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.75}
                        stroke={hasUnder40 && summary?.masterCbTotal === 0 ? '#ff0055' : isSelected ? '#38bdf8' : isHovered ? '#22d3ee' : '#334155'}
                        strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                        strokeDasharray={summary?.masterCbTotal === 0 ? '4 3' : 'none'}
                        className="transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          setSelectedKabupatenCode(kodeBps);
                          setViewLevel('KABUPATEN_DETAIL');
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

                  {/* Centroid Labels for Province Level */}
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

                    const isUnder40Kab = summary ? summary.coverageRatio < 40 : false;

                    return (
                      <g key={`prov-label-${kodeBps}`} transform={`translate(${cx}, ${cy})`} className="pointer-events-none select-none">
                        <text
                          textAnchor="middle"
                          dy="-4"
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#f8fafc"
                          stroke="#020617"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                        >
                          {feature.properties.namaSingkat}
                        </text>
                        {summary && (
                          <text
                            textAnchor="middle"
                            dy="8"
                            fontSize="7.5"
                            fontWeight="bold"
                            fill={isUnder40Kab ? '#f43f5e' : '#34d399'}
                            stroke="#020617"
                            strokeWidth="2"
                            paintOrder="stroke"
                            className="font-mono"
                          >
                            {summary.coverageRatio.toFixed(1)}% ({summary.under40KecamatanCount} Kec &lt; 40%)
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* ========================================================= */}
              {/* VIEW 2: KABUPATEN LENGKAP DENGAN SELURUH KECAMATANNYA    */}
              {/* ========================================================= */}
              {viewLevel === 'KABUPATEN_DETAIL' && (
                <g className="kabupaten-detail-view">
                  {/* Outer Kabupaten boundary outline */}
                  {(() => {
                    const kabFeature = SULSEL_GEOJSON.features.find(f => f.properties.kodeBps === selectedKabupatenCode);
                    if (!kabFeature) return null;
                    const boundaryPath = pathGenerator(kabFeature as any) || '';
                    return (
                      <path
                        d={boundaryPath}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="3"
                        strokeDasharray="6 4"
                        strokeOpacity="0.4"
                      />
                    );
                  })()}

                  {/* Kecamatan Polygons */}
                  {kecamatanGeoFeatures.map((feature) => {
                    const kodeBps = feature.properties.kodeBps;
                    const summary = kecamatanDataMap.get(kodeBps);
                    const isHovered = hoveredKecamatan?.kodeBps === kodeBps;
                    const pathString = pathGenerator(feature as any) || '';

                    const isUnder40 = summary ? summary.isUnder40 : true;
                    
                    // Dim non-under40 kecamatans if filterOnlyUnder40 is active
                    if (filterOnlyUnder40 && !isUnder40) {
                      return (
                        <path
                          key={`kec-${kodeBps}`}
                          d={pathString}
                          fill="#0f172a"
                          fillOpacity={0.25}
                          stroke="#1e293b"
                          strokeWidth={0.5}
                        />
                      );
                    }

                    const fillColor = getKecamatanColor(summary);

                    return (
                      <path
                        key={`kec-${kodeBps}`}
                        d={pathString}
                        fill={summary?.masterCbTotal === 0 ? 'url(#diagonal-alert-stripes)' : fillColor}
                        fillOpacity={isUnder40 ? 0.92 : isHovered ? 0.85 : 0.75}
                        stroke={isUnder40 ? '#ff0055' : isHovered ? '#38bdf8' : '#334155'}
                        strokeWidth={isUnder40 ? 2.5 : isHovered ? 2 : 1}
                        filter={isUnder40 ? 'url(#alert-glow)' : 'none'}
                        className="transition-all duration-200 cursor-pointer"
                        onClick={() => {
                          if (summary && summary.masterCbTotal > 0 && onInspectOutlets) {
                            onInspectOutlets({
                              title: `Kecamatan ${summary.namaKecamatan} (${summary.namaKabupaten})`,
                              type: 'KECAMATAN',
                              bpsRo: summary.roIndustriBps,
                              cbTotal: summary.masterCbTotal,
                              cbActive: summary.masterCbActive,
                              coverageRatio: summary.coverageRatio,
                              outlets: summary.outletList,
                            });
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (summary) setHoveredKecamatan(summary);
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
                          setHoveredKecamatan(null);
                          setTooltipPos(null);
                        }}
                      />
                    );
                  })}

                  {/* Kecamatan Centroid Labels & Alert Badges */}
                  {kecamatanGeoFeatures.map((feature) => {
                    const kodeBps = feature.properties.kodeBps;
                    const summary = kecamatanDataMap.get(kodeBps);
                    const centroid = feature.properties.centroid;
                    const projected = projection(centroid);
                    if (!projected) return null;

                    const [cx, cy] = projected;
                    const isUnder40 = summary ? summary.isUnder40 : true;

                    if (filterOnlyUnder40 && !isUnder40) return null;

                    return (
                      <g key={`kec-label-${kodeBps}`} transform={`translate(${cx}, ${cy})`} className="pointer-events-none select-none">
                        {/* Under 40% Warning Beacon Pin */}
                        {isUnder40 && (
                          <g transform="translate(0, -18)">
                            <circle r="4" fill="#ff0055" className="animate-ping" opacity="0.7" />
                            <circle r="3.5" fill="#ff0055" stroke="#ffffff" strokeWidth="1" />
                          </g>
                        )}

                        <text
                          textAnchor="middle"
                          dy="-2"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#ffffff"
                          stroke="#020617"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                          className="font-sans"
                        >
                          {feature.properties.namaKecamatan}
                        </text>
                        {summary && (
                          <text
                            textAnchor="middle"
                            dy="10"
                            fontSize="8"
                            fontWeight="bold"
                            fill={isUnder40 ? '#f43f5e' : '#34d399'}
                            stroke="#020617"
                            strokeWidth="2"
                            paintOrder="stroke"
                            className="font-mono"
                          >
                            {isUnder40 ? `⚠️ ${summary.coverageRatio.toFixed(1)}%` : `${summary.coverageRatio.toFixed(1)}%`}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          </svg>

          {/* FLOATING HOVER TOOLTIP */}
          {tooltipPos && (hoveredKecamatan || hoveredKabupaten) && (
            <div
              className="absolute pointer-events-none z-30 bg-slate-900/95 border border-slate-700/90 rounded-xl p-3.5 shadow-2xl backdrop-blur-md min-w-[250px] text-xs transition-all"
              style={{
                left: Math.min(tooltipPos.x + 15, width - 270),
                top: Math.max(tooltipPos.y - 120, 10),
              }}
            >
              {hoveredKecamatan ? (
                <>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                    <div>
                      <div className="font-bold text-white text-sm">
                        Kecamatan {hoveredKecamatan.namaKecamatan}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {hoveredKecamatan.namaKabupaten} • Sentra: {hoveredKecamatan.deskripsiSentra || hoveredKecamatan.kategoriWilayah}
                      </div>
                    </div>
                    {hoveredKecamatan.isUnder40 ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase whitespace-nowrap">
                        ⚠️ Under 40%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase whitespace-nowrap">
                        ✓ Optimal
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Master CB Toko:</span>
                      <strong className="text-white">{hoveredKecamatan.masterCbTotal} Toko</strong>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-400">├ Aktif:</span>
                      <span className="text-emerald-400 font-bold">{hoveredKecamatan.masterCbActive}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-rose-400">└ Non-Aktif:</span>
                      <span className="text-rose-400 font-bold">{hoveredKecamatan.masterCbInactive}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RO Industri BPS:</span>
                      <strong className="text-indigo-300">{hoveredKecamatan.roIndustriBps} Toko</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Coverage Ratio:</span>
                      <strong className={`font-bold ${hoveredKecamatan.isUnder40 ? 'text-rose-400' : 'text-teal-300'}`}>
                        {hoveredKecamatan.coverageRatio.toFixed(2)}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gap Belum Tercover:</span>
                      <strong className="text-rose-400">+{hoveredKecamatan.gapOutlets} Toko</strong>
                    </div>

                    {hoveredKecamatan.isUnder40 && (
                      <div className="mt-2 p-1.5 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-200">
                        🚨 <strong>Perlu Perhatian Khusus:</strong> Coveran di bawah 40%, perlu penambahan rute kunjungan salesman atau pembukaan toko baru.
                      </div>
                    )}
                  </div>
                </>
              ) : hoveredKabupaten ? (
                <>
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
                    <div className="flex justify-between">
                      <span className="text-slate-400">RO Industri BPS Sulsel:</span>
                      <strong className="text-indigo-300">{hoveredKabupaten.roIndustriBps.toLocaleString('id-ID')}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Coverage Ratio:</span>
                      <strong className="text-teal-300 font-bold">{hoveredKabupaten.coverageRatio.toFixed(2)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kecamatan Under 40%:</span>
                      <strong className="text-rose-400 font-bold">
                        {hoveredKabupaten.under40KecamatanCount} / {hoveredKabupaten.jumlahKecamatan} Kec
                      </strong>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* D3 MAP LEGEND OVERLAY */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/95 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur text-[11px] space-y-2 max-w-xs">
            <div className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Legenda Penetrasi Wilayah</span>
            </div>

            <div className="space-y-1.5 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-rose-500 shadow-sm shadow-rose-500/50 flex items-center justify-center text-[9px] text-white font-bold">!</span>
                <span className="text-rose-300 font-semibold">&lt; 40% (PERLU PERHATIAN KHUSUS)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-600"></span>
                <span className="text-slate-300">40% - 69% (Moderat)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600"></span>
                <span className="text-slate-300">≥ 70% (Optimal)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-rose-800 border border-dashed border-rose-400"></span>
                <span className="text-slate-300">0% (Blank Spot / Belum Ada Toko)</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
              Data RO Industri Resmi: BPS Sulsel Sensus Usaha Terbaru
            </div>
          </div>
        </div>

        {/* SIDE DETAIL PANEL: SELECTED KABUPATEN & KECAMATAN DETAILS */}
        <div className="w-full lg:w-84 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between">
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
                      Ibukota: {selectedKabupaten.ibukota} • {selectedKabupaten.jumlahKecamatan} Kecamatan
                    </div>
                  </div>
                </div>

                {/* Status Alert Badge */}
                <div className="mt-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div className="text-[11px] text-rose-300 font-medium">
                    <strong>{selectedKabupaten.under40KecamatanCount} dari {selectedKabupaten.jumlahKecamatan} Kecamatan</strong> berada di bawah 40% (Perlu Perhatian Khusus).
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
                  <div className={`text-sm font-bold ${selectedKabupaten.coverageRatio < 40 ? 'text-rose-400' : 'text-teal-300'}`}>
                    {selectedKabupaten.coverageRatio.toFixed(2)}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Penetrasi Wilayah</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Gap Peluang</div>
                  <div className="text-sm font-bold text-rose-400">+{selectedKabupaten.gapOutlets.toLocaleString('id-ID')}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Unserved Market</div>
                </div>
              </div>

              {/* Kecamatan List with Under 40% Highlight */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Daftar Kecamatan ({selectedKabupaten.kecamatanSummaries.length}):</span>
                  <span className="text-[10px] text-rose-400 font-mono">
                    {selectedKabupaten.under40KecamatanCount} Under 40%
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {selectedKabupaten.kecamatanSummaries
                    .filter(kc => !filterOnlyUnder40 || kc.isUnder40)
                    .map((kc) => {
                      return (
                        <div 
                          key={kc.kodeBps}
                          className={`p-2 rounded-lg border text-xs transition flex items-center justify-between ${
                            kc.isUnder40 
                              ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500' 
                              : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {kc.isUnder40 ? (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                            <div>
                              <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                                <span>{kc.namaKecamatan}</span>
                                {kc.isUnder40 && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                                    UNDER 40%
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                BPS: {kc.roIndustriBps} RO • CB: {kc.masterCbTotal}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className={`text-[11px] font-bold ${kc.isUnder40 ? 'text-rose-400' : 'text-teal-300'}`}>
                              {kc.coverageRatio.toFixed(1)}%
                            </div>
                            {kc.masterCbTotal > 0 && onInspectOutlets && (
                              <button
                                onClick={() => onInspectOutlets({
                                  title: `Kecamatan ${kc.namaKecamatan} (${selectedKabupaten.namaKabupaten})`,
                                  type: 'KECAMATAN',
                                  bpsRo: kc.roIndustriBps,
                                  cbTotal: kc.masterCbTotal,
                                  cbActive: kc.masterCbActive,
                                  coverageRatio: kc.coverageRatio,
                                  outlets: kc.outletList
                                })}
                                className="text-[9px] text-cyan-400 hover:underline"
                              >
                                Lihat Toko
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                  Lihat Seluruh {selectedKabupaten.masterCbTotal} Toko di {selectedKabupaten.namaSingkat}
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
