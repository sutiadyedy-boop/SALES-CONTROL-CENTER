import React, { useState } from 'react';
import { X, Table, FileSpreadsheet, Download, Search } from 'lucide-react';
import { RawUploadedFile } from '../../types/database';

interface SheetInspectorModalProps {
  file: RawUploadedFile;
  onClose: () => void;
  onSelectSheet?: (sheetName: string) => void;
}

export function SheetInspectorModal({
  file,
  onClose,
  onSelectSheet,
}: SheetInspectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = file.sampleRows.filter(row => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Sheet Inspector: {file.fileName}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  {file.rows.toLocaleString('id-ID')} Baris · {file.columns} Kolom
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Preview data mentah hasil pembacaan parser Excel kantor apa adanya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {file.sheetNames.length > 1 && onSelectSheet && (
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Pilih Sheet:</span>
                <select
                  value={file.selectedSheet}
                  onChange={e => onSelectSheet(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {file.sheetNames.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Header pill badges */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-1">
            <span className="text-[11px] text-slate-500 font-semibold shrink-0">Header Terdeteksi:</span>
            {file.headers.map(h => (
              <span key={h} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                {h}
              </span>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter baris preview..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-52"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 text-center w-12 text-[10px] text-slate-600">#</th>
                  {file.headers.map(h => (
                    <th key={h} className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-600 text-[10px] select-none">
                      {idx + 1}
                    </td>
                    {file.headers.map(h => (
                      <td key={h} className="py-2 px-3 text-slate-300 whitespace-nowrap text-xs">
                        {String(row[h] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Menampilkan 50 baris pertama dari total {file.rows.toLocaleString('id-ID')} baris data.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );
}
