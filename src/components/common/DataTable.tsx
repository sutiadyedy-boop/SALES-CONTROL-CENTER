import React, { useState, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Search, Download, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { exportTableToExcel } from '../../services/exportEngine';
import { CaptureJpgButton } from './CaptureJpgButton';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  title?: string;
  searchPlaceholder?: string;
  pageSizeDefault?: number;
  exportFileName?: string;
  emptyMessage?: string;
  summaryRow?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  searchPlaceholder = 'Cari data...',
  pageSizeDefault = 10,
  exportFileName,
  emptyMessage = 'Tidak ada data ditemukan.',
  summaryRow,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const tableCardRef = useRef<HTMLDivElement>(null);

  // Filtered rows
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

  // Sorted rows
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

  // Paginated rows
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

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
      : `${title || 'export'}.xlsx`;
    exportTableToExcel(exportRows, finalFileName, title || 'Data');
  };

  return (
    <div ref={tableCardRef} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
      {/* Table Header toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center gap-3">
          {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
          <span className="text-xs text-slate-400 font-mono">
            {sortedData.length.toLocaleString('id-ID')} baris
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative" data-capture-ignore="true">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-64 transition-colors"
            />
          </div>

          {/* Capture JPG Full HD button */}
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

          {/* Export Excel button */}
          <button
            onClick={handleExport}
            disabled={sortedData.length === 0}
            data-capture-ignore="true"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-emerald-200 text-xs font-semibold rounded-lg border border-emerald-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            title="Export Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 select-none">
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => (col.sortable !== false ? handleSort(col.key) : undefined)}
                  className={`py-3 px-4 font-semibold tracking-wide uppercase text-[10px] ${
                    col.sortable !== false ? 'cursor-pointer hover:text-slate-200' : ''
                  } ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 ${
                      col.align === 'right'
                        ? 'justify-end w-full'
                        : col.align === 'center'
                        ? 'justify-center w-full'
                        : ''
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <span className="text-slate-500">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                          )
                        ) : (
                          <span className="opacity-0 group-hover:opacity-50">↕</span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-normal">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || row.outletId || row.salesmanId || idx}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-4 text-slate-200 ${
                        col.align === 'right'
                          ? 'text-right font-mono'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.render
                        ? col.render(row)
                        : col.accessor
                        ? col.accessor(row)
                        : row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {summaryRow && (
            <tfoot>
              {summaryRow}
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>dari {sortedData.length} baris</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">
            Halaman {currentPage} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
