import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Search, Download, Layers, FileSpreadsheet, Columns, Check, Eye, EyeOff, RotateCcw } from 'lucide-react';
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
  defaultPageSize?: number | 'all';
  pageSizeOptions?: (number | 'all')[];
}

const DEFAULT_PAGE_SIZE_OPTIONS: (number | 'all')[] = [5, 10, 25, 50, 100, 'all'];

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
  defaultPageSize = 'all',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: VirtualizedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [scrollTop, setScrollTop] = useState(0);
  const [pageSize, setPageSize] = useState<number | 'all'>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Column visibility state: array of keys of currently active/visible columns
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() =>
    columns.map(c => c.key)
  );

  // Sync visibleColumnKeys when columns definition changes (e.g. switching tabs)
  useEffect(() => {
    setVisibleColumnKeys(columns.map(c => c.key));
  }, [columns]);

  // Wrap text mode: true = wrap text completely without cut-offs, false = compact single line
  const [isWrapText, setIsWrapText] = useState<boolean>(true);

  // Dropdown open state for column picker
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
    };
    if (isColumnDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnDropdownOpen]);

  // Filtered active columns based on user selection
  const activeColumns = useMemo(() => {
    const active = columns.filter(col => visibleColumnKeys.includes(col.key));
    return active.length > 0 ? active : columns; // Fallback to all if somehow none selected
  }, [columns, visibleColumnKeys]);

  const toggleColumn = (key: string) => {
    if (visibleColumnKeys.includes(key)) {
      if (visibleColumnKeys.length > 1) {
        setVisibleColumnKeys(prev => prev.filter(k => k !== key));
      }
    } else {
      setVisibleColumnKeys(prev => [...prev, key]);
    }
  };

  const showAllColumns = () => {
    setVisibleColumnKeys(columns.map(c => c.key));
  };

  const resetColumns = () => {
    setVisibleColumnKeys(columns.map(c => c.key));
  };

  // Compute table minimum width so columns are never squished
  const tableMinWidth = useMemo(() => {
    return activeColumns.reduce((sum, col) => {
      const w = parseInt(col.width || '130', 10);
      return sum + (isNaN(w) ? 130 : w);
    }, 0);
  }, [activeColumns]);

  // 1. Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(row => {
      return activeColumns.some(col => {
        const val = col.accessor ? col.accessor(row) : row[col.key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      });
    });
  }, [data, searchTerm, activeColumns]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = activeColumns.find(c => c.key === sortKey);
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
  }, [filteredData, sortKey, sortDirection, activeColumns]);

  // Reset to first page when search, sort, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortDirection, pageSize]);

  // 3. Pagination & Virtualization calculations
  const totalCount = sortedData.length;
  const isPaged = pageSize !== 'all';
  const limit = typeof pageSize === 'number' ? pageSize : totalCount;
  const totalPages = isPaged ? Math.max(1, Math.ceil(totalCount / limit)) : 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Sliced data for the active page (if paged)
  const pageData = useMemo(() => {
    if (!isPaged) return sortedData;
    const start = (safePage - 1) * limit;
    return sortedData.slice(start, start + limit);
  }, [sortedData, isPaged, safePage, limit]);

  // Virtualization is active when all rows are displayed and count > 50
  const isVirtual = !isPaged && totalCount > 50;

  const startIndex = isVirtual
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    : 0;
  const endIndex = isVirtual
    ? Math.min(totalCount, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan)
    : pageData.length;

  const visibleRows = useMemo(() => {
    if (isVirtual) {
      return sortedData.slice(startIndex, endIndex);
    }
    return pageData;
  }, [isVirtual, sortedData, pageData, startIndex, endIndex]);

  const topSpacerHeight = isVirtual ? startIndex * rowHeight : 0;
  const bottomSpacerHeight = isVirtual ? Math.max(0, (totalCount - endIndex) * rowHeight) : 0;

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
      activeColumns.forEach(col => {
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

          {/* Atur Kolom (Column Customizer) Dropdown */}
          <div className="relative" ref={columnDropdownRef} data-capture-ignore="true">
            <button
              type="button"
              onClick={() => setIsColumnDropdownOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                visibleColumnKeys.length < columns.length
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-cyan-300'
              }`}
              title="Pilih kolom yang ingin ditampilkan"
            >
              <Columns className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kolom</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {visibleColumnKeys.length}/{columns.length}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isColumnDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                  <span className="font-bold text-slate-200">Pilih Kolom Tampil</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={showAllColumns}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={resetColumns}
                      className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                  {columns.map(col => {
                    const isChecked = visibleColumnKeys.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs transition-colors select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColumn(col.key)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className={isChecked ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'}>
                          {col.header}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{visibleColumnKeys.length} dari {columns.length} kolom aktif</span>
                  <button
                    type="button"
                    onClick={() => setIsColumnDropdownOpen(false)}
                    className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wrap Text Toggle */}
          <button
            type="button"
            onClick={() => setIsWrapText(prev => !prev)}
            data-capture-ignore="true"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isWrapText
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
            title={isWrapText ? 'Mode Teks Lengkap Aktif (Teks utuh tanpa terpotong)' : 'Klik untuk menampilkan seluruh teks tanpa terpotong'}
          >
            <span className="text-[11px] font-mono font-bold">WRAP</span>
            <span className="hidden xl:inline">{isWrapText ? 'Teks Lengkap' : 'Teks Kompak'}</span>
          </button>

          {/* Quick Rows Selector in Toolbar */}
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-800" data-capture-ignore="true">
            <span className="text-[11px] text-slate-400 font-sans">Tampil:</span>
            <div className="inline-flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
              {pageSizeOptions.map((opt) => (
                <button
                  key={`top-${opt}`}
                  type="button"
                  onClick={() => setPageSize(opt)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    pageSize === opt
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={opt === 'all' ? 'Tampilkan Semua Baris' : `Tampilkan ${opt} Baris`}
                >
                  {opt === 'all' ? 'Semua' : opt}
                </button>
              ))}
            </div>
          </div>

          {/* Virtualization indicator */}
          <div 
            data-capture-ignore="true"
            className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-950/60 px-2 py-1 rounded border border-slate-800"
            title={isPaged ? `Menampilkan ${limit} baris per halaman` : 'Tabel tervirtualisasi (hanya merender baris yang terlihat di layar)'}
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{isPaged ? `Halaman (${limit} / hal)` : 'Virtual DOM'}</span>
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
          style={{ 
            maxHeight: isPaged && limit <= 25 ? 'none' : `${viewportHeight}px`, 
            minHeight: isPaged && limit <= 10 ? 'auto' : '220px' 
          }}
        >
          <table 
            className="w-full text-left text-xs border-collapse"
            style={{ minWidth: `${Math.max(tableMinWidth, 750)}px` }}
          >
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 text-slate-400 font-semibold shadow-sm">
              <tr>
                {activeColumns.map(col => (
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
                  <td colSpan={activeColumns.length} />
                </tr>
              )}

              {/* Rendered visible slice */}
              {visibleRows.map((row, index) => {
                const actualIndex = isPaged ? (safePage - 1) * limit + index : startIndex + index;
                return (
                  <tr
                    key={row.id || row.outletId || row.salesmanId || actualIndex}
                    style={{ height: `${rowHeight}px` }}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                  >
                    {activeColumns.map(col => {
                      const value = col.accessor ? col.accessor(row) : row[col.key];
                      return (
                        <td
                          key={col.key}
                          style={{ width: col.width }}
                          className={`py-2 px-3.5 align-middle ${
                            isWrapText ? 'break-words whitespace-normal' : 'truncate whitespace-nowrap'
                          } ${
                            col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
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
                  <td colSpan={activeColumns.length} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer with Pilihan Jumlah yang Ingin Ditampilkan & Pagination */}
      <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 font-mono">
        {/* Left: Total baris & Pilihan Jumlah Tampil */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-slate-400">
            Total: <span className="text-slate-200 font-bold">{totalCount.toLocaleString('id-ID')}</span> baris
            {searchTerm && <span className="text-slate-500"> (dari {data.length.toLocaleString('id-ID')})</span>}
          </div>

          {/* Pilihan Jumlah yang ingin ditampilkan */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800" data-capture-ignore="true">
            <span className="text-[11px] text-slate-400 font-sans font-semibold">Tampilkan:</span>
            <div className="inline-flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              {pageSizeOptions.map((opt) => {
                const isSelected = pageSize === opt;
                return (
                  <button
                    key={String(opt)}
                    type="button"
                    onClick={() => setPageSize(opt)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title={opt === 'all' ? 'Tampilkan Semua Baris' : `Tampilkan ${opt} Baris per Halaman`}
                  >
                    {opt === 'all' ? 'Semua' : opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Indikator Kolom Aktif di Footer */}
          {visibleColumnKeys.length < columns.length && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-[11px] text-amber-300 font-sans" data-capture-ignore="true">
              <span>Kolom: {visibleColumnKeys.length}/{columns.length}</span>
              <button
                type="button"
                onClick={showAllColumns}
                className="text-[10px] underline hover:text-amber-200 cursor-pointer font-bold"
              >
                (Tampilkan Semua Kolom)
              </button>
            </div>
          )}
        </div>

        {/* Right: Pagination Navigation & Row Slice Details */}
        <div className="flex items-center gap-3">
          {isPaged && totalPages > 1 && (
            <div className="flex items-center gap-1.5" data-capture-ignore="true">
              <span className="text-slate-400">
                Hal <strong className="text-cyan-300 font-bold">{safePage}</strong> / {totalPages}
              </span>
              <div className="inline-flex items-center gap-1 ml-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 border border-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  &larr; Prev
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 border border-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Halaman Berikutnya"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 hidden sm:inline-block">
            {isPaged ? (
              <span>Menampilkan baris <strong className="text-cyan-400">{(safePage - 1) * limit + 1}–{Math.min(totalCount, safePage * limit)}</strong> dari {totalCount}</span>
            ) : (
              <span>Render DOM: <strong className="text-cyan-400">{Math.min(totalCount, endIndex - startIndex)}</strong> / {totalCount} baris</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
