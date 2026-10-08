import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Search, Download, Layers, FileSpreadsheet } from 'lucide-react';
import { exportTableToExcel } from '../../services/exportEngine';
import { CaptureJpgButton } from './CaptureJpgButton';

export interface VirtualizedColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string; // CSS width e.g. '120px' or '25%'
}

interface VirtualizedTableProps<T> {
  columns: VirtualizedColumnDef<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  rowHeight?: number; // default 42px
  viewportHeight?: number; // default 420px
  overscan?: number; // default 5 buffer rows
  exportFileName?: string;
  emptyMessage?: string;
  actionElement?: React.ReactNode;
}

export function VirtualizedTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  subtitle,
  searchPlaceholder = 'Cari data...',
  rowHeight = 44,
  viewportHeight = 440,
  overscan = 5,
  exportFileName,
  emptyMessage = 'DATA BELUM TERSEDIA',
  actionElement,
}: VirtualizedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);

  // 1. Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        const val = col.accessor ? col.accessor(row) : row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      });
    });
  }, [data, searchTerm, columns]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find(c => c.key === sortKey);
    return [...filteredData].sort((a, b) => {
      const valA = col?.accessor ? col.accessor(a) : a[sortKey];
      const valB = col?.accessor ? col.accessor(b) : b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  // 3. Virtualization calculations
  const totalCount = sortedData.length;
  const totalContentHeight = totalCount * rowHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

  const visibleRows = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * rowHeight);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    if (sortedData.length === 0) return;
    const exportRows = sortedData.map(row => {
      const flat: Record<string, any> = {};
      columns.forEach(col => {
        flat[col.header] = col.accessor ? col.accessor(row) : row[col.key];
      });
      return flat;
    });
    const finalFileName = exportFileName
      ? (exportFileName.toLowerCase().endsWith('.xlsx') ? exportFileName : exportFileName.replace(/\.csv$/i, '') + '.xlsx')
      : `${title || 'export'}_${Date.now()}.xlsx`;
    exportTableToExcel(exportRows, finalFileName, title || 'Data');
  };

  return (
    <div ref={tableCardRef} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
      {/* Table Toolbar Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
        <div>
          {title && (
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                {totalCount.toLocaleString('id-ID')} row
              </span>
            </div>
          )}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {actionElement}

          {/* Search Box */}
          <div className="relative" data-capture-ignore="true">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
            />
          </div>

          {/* Capture JPG Full HD Button */}
          <div data-capture-ignore="true">
            <CaptureJpgButton
              targetRef={tableCardRef}
              fileName={
                exportFileName
                  ? exportFileName.replace(/\.(xlsx|csv)$/i, '') + '_Full_HD.jpg'
                  : `${(title || 'Tabel').replace(/[^a-zA-Z0-9]/g, '_')}_Full_HD.jpg`
              }
              label="Capture JPG Full HD"
            />
          </div>

          {/* Export to Excel Button */}
          {exportFileName && sortedData.length > 0 && (
            <button
              onClick={handleExport}
              data-capture-ignore="true"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-800/80 transition-colors shadow-sm"
              title="Export Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}

          {/* Virtualization indicator */}
          <div 
            data-capture-ignore="true"
            className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-950/60 px-2 py-1 rounded border border-slate-800"
            title="Tabel tervirtualisasi (hanya merender baris yang terlihat di layar)"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Virtual DOM</span>
          </div>
        </div>
      </div>

      {/* Virtual Scroll Viewport */}
      {sortedData.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
          <p className="font-semibold tracking-wide text-slate-400">{emptyMessage}</p>
          {searchTerm && <p className="text-[11px] text-slate-500 mt-1">Tidak ada hasil cocok dengan kata kunci "{searchTerm}"</p>}
        </div>
      ) : (
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-auto relative"
          style={{ maxHeight: `${viewportHeight}px`, minHeight: '220px' }}
        >
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 text-slate-400 font-semibold shadow-sm">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`py-3 px-3.5 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${
                      col.sortable !== false ? 'cursor-pointer select-none hover:text-slate-200' : ''
                    } transition-colors`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.header}</span>
                      {col.sortable !== false && sortKey === col.key && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Top virtual spacer */}
              {topSpacerHeight > 0 && (
                <tr style={{ height: `${topSpacerHeight}px` }}>
                  <td colSpan={columns.length} />
                </tr>
              )}

              {/* Rendered visible slice */}
              {visibleRows.map((row, index) => {
                const actualIndex = startIndex + index;
                return (
                  <tr
                    key={row.id || row.outletId || row.salesmanId || actualIndex}
                    style={{ height: `${rowHeight}px` }}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                  >
                    {columns.map(col => {
                      const value = col.accessor ? col.accessor(row) : row[col.key];
                      return (
                        <td
                          key={col.key}
                          style={{ width: col.width }}
                          className={`py-2 px-3.5 ${
                            col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(row, actualIndex) : (value !== null && value !== undefined ? String(value) : '-')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Bottom virtual spacer */}
              {bottomSpacerHeight > 0 && (
                <tr style={{ height: `${bottomSpacerHeight}px` }}>
                  <td colSpan={columns.length} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer with Virtual Render Stats */}
      <div className="px-5 py-2.5 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between bg-slate-900/60 font-mono">
        <div>
          Total: <span className="text-slate-300 font-semibold">{totalCount.toLocaleString('id-ID')}</span> baris
          {searchTerm && <span> (terfilter dari {data.length.toLocaleString('id-ID')})</span>}
        </div>
        <div>
          Rendered DOM slice: <span className="text-cyan-400 font-semibold">{Math.min(totalCount, endIndex - startIndex)}</span> / {totalCount} baris
        </div>
      </div>
    </div>
  );
}
