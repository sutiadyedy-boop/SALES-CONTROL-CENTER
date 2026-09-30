import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, X, Search, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { FilterOptions, GlobalFilterState } from '../types/analytics';

interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  allLabel: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (newValues: string[]) => void;
}

function MultiSelectDropdown({
  label,
  allLabel,
  options,
  selectedValues,
  isOpen,
  onToggle,
  onClose,
  onChange,
}: MultiSelectDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const isSelected = (val: string) => selectedValues.includes(val);

  const toggleOption = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allFilteredVals = filteredOptions.map(o => o.value);
    const combined = Array.from(new Set([...selectedValues, ...allFilteredVals]));
    onChange(combined);
  };

  const clearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const hasSelection = selectedValues.length > 0;

  // Text on trigger button
  const triggerText = useMemo(() => {
    if (selectedValues.length === 0) return allLabel;
    if (selectedValues.length === 1) {
      const match = options.find(o => o.value === selectedValues[0]);
      return `${label}: ${match?.label || selectedValues[0]}`;
    }
    return `${label} (${selectedValues.length})`;
  }, [selectedValues, options, label, allLabel]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-medium transition-all select-none ${
          hasSelection
            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-950/60'
            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
        }`}
        title={`Filter ${label} (Bisa pilih lebih dari 1)`}
      >
        <span className="truncate max-w-[130px]">{triggerText}</span>

        {/* Clear selection single button */}
        {hasSelection && (
          <span
            role="button"
            tabIndex={0}
            onClick={clearAll}
            className="hover:bg-cyan-900/60 p-0.5 rounded text-cyan-400 hover:text-white transition-colors ml-0.5"
            title={`Hapus filter ${label}`}
          >
            <X className="w-3 h-3" />
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 text-slate-400 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] max-w-[320px] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-200">Filter {label}</span>
              {hasSelection && (
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded-full border border-cyan-800 font-mono">
                  {selectedValues.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium px-1 py-0.5"
              >
                Pilih Semua
              </button>
              {hasSelection && (
                <>
                  <span className="text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-rose-400 hover:text-rose-300 transition-colors font-medium px-1 py-0.5"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search Box if list has more than 4 items */}
          {options.length > 4 && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Cari ${label.toLowerCase()}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-6 pr-6 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options Checklist */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-3 text-slate-500 text-[11px]">
                Tidak ada pilihan ditemukan
              </div>
            ) : (
              filteredOptions.map(opt => {
                const checked = isSelected(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={e => toggleOption(opt.value, e)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                      checked
                        ? 'bg-cyan-950/60 text-cyan-200 font-medium'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        checked
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                          : 'border-slate-700 bg-slate-950/60'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs leading-snug">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer stats */}
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>
              {selectedValues.length} dari {options.length} dipilih
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface GlobalFilterBarProps {
  filters: GlobalFilterState;
  options: FilterOptions;
  onFilterChange: (newFilters: GlobalFilterState) => void;
  onResetFilters: () => void;
}

export function GlobalFilterBar({
  filters,
  options,
  onFilterChange,
  onResetFilters,
}: GlobalFilterBarProps) {
  // Track open dropdown (only 1 open at a time for clean UX)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(prev => (prev === id ? null : id));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // Helper to extract selected values as array
  const getSelected = (val: string | string[] | undefined): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return [val].filter(Boolean);
  };

  const handleMultiChange = (key: keyof GlobalFilterState, newValues: string[]) => {
    onFilterChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleSearchChange = (val: string) => {
    onFilterChange({
      ...filters,
      searchQuery: val || undefined,
    });
  };

  // Count active filter categories
  const activeCount = [
    getSelected(filters.cabang).length > 0,
    getSelected(filters.depo).length > 0,
    getSelected(filters.pma).length > 0,
    getSelected(filters.rayon).length > 0,
    getSelected(filters.salesmanId).length > 0,
    getSelected(filters.channel).length > 0,
    getSelected(filters.fc).length > 0,
    Boolean(filters.searchQuery),
  ].filter(Boolean).length;

  // Options formatted for MultiSelectDropdown
  const cabangOptions = useMemo(
    () => options.cabangs.map(c => ({ value: c, label: c })),
    [options.cabangs]
  );

  const depoOptions = useMemo(
    () => options.depos.map(d => ({ value: d, label: d })),
    [options.depos]
  );

  // PMA options - primary from options.pmas, fallback to areas if no PMAs
  const pmaOptions = useMemo(() => {
    const list = options.pmas.length > 0 ? options.pmas : options.areas;
    return list.map(p => ({ value: p, label: `PMA ${p}`.replace('PMA PMA', 'PMA') }));
  }, [options.pmas, options.areas]);

  const rayonOptions = useMemo(
    () => options.rayons.map(r => ({ value: r, label: r })),
    [options.rayons]
  );

  const salesmanOptions = useMemo(
    () =>
      options.salesmen.map(s => ({
        value: s.id,
        label: s.name,
        sublabel: s.id,
      })),
    [options.salesmen]
  );

  const channelOptions = useMemo(
    () => options.channels.map(c => ({ value: c, label: c })),
    [options.channels]
  );

  const fcOptions = useMemo(
    () => options.fcs.map(f => ({ value: f, label: `FC ${f}`.replace('FC FC', 'FC') })),
    [options.fcs]
  );

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-sm relative z-30">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filter Tower:</span>
        </div>

        {/* 1. Cabang Filter (Multi-Select) */}
        {cabangOptions.length > 0 && (
          <MultiSelectDropdown
            id="cabang"
            label="Cabang"
            allLabel="Semua Cabang"
            options={cabangOptions}
            selectedValues={getSelected(filters.cabang)}
            isOpen={openDropdown === 'cabang'}
            onToggle={() => toggleDropdown('cabang')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('cabang', vals)}
          />
        )}

        {/* 2. Depo Filter (Multi-Select) */}
        {depoOptions.length > 0 && (
          <MultiSelectDropdown
            id="depo"
            label="Depo"
            allLabel="Semua Depo"
            options={depoOptions}
            selectedValues={getSelected(filters.depo)}
            isOpen={openDropdown === 'depo'}
            onToggle={() => toggleDropdown('depo')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('depo', vals)}
          />
        )}

        {/* 3. PMA Filter (Multi-Select) - Replaced Semua Area & PMA */}
        {pmaOptions.length > 0 && (
          <MultiSelectDropdown
            id="pma"
            label="PMA"
            allLabel="Semua PMA"
            options={pmaOptions}
            selectedValues={getSelected(filters.pma)}
            isOpen={openDropdown === 'pma'}
            onToggle={() => toggleDropdown('pma')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('pma', vals)}
          />
        )}

        {/* 4. Rayon Filter (Multi-Select) */}
        {rayonOptions.length > 0 && (
          <MultiSelectDropdown
            id="rayon"
            label="Rayon"
            allLabel="Semua Rayon"
            options={rayonOptions}
            selectedValues={getSelected(filters.rayon)}
            isOpen={openDropdown === 'rayon'}
            onToggle={() => toggleDropdown('rayon')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('rayon', vals)}
          />
        )}

        {/* 5. Salesman Filter (Multi-Select) */}
        {salesmanOptions.length > 0 && (
          <MultiSelectDropdown
            id="salesman"
            label="Salesman"
            allLabel="Semua Salesman"
            options={salesmanOptions}
            selectedValues={getSelected(filters.salesmanId)}
            isOpen={openDropdown === 'salesman'}
            onToggle={() => toggleDropdown('salesman')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('salesmanId', vals)}
          />
        )}

        {/* 6. Channel Filter (Multi-Select) */}
        {channelOptions.length > 0 && (
          <MultiSelectDropdown
            id="channel"
            label="Channel"
            allLabel="Semua Channel"
            options={channelOptions}
            selectedValues={getSelected(filters.channel)}
            isOpen={openDropdown === 'channel'}
            onToggle={() => toggleDropdown('channel')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('channel', vals)}
          />
        )}

        {/* 7. FC Filter (Multi-Select) */}
        {fcOptions.length > 0 && (
          <MultiSelectDropdown
            id="fc"
            label="FC"
            allLabel="Semua FC"
            options={fcOptions}
            selectedValues={getSelected(filters.fc)}
            isOpen={openDropdown === 'fc'}
            onToggle={() => toggleDropdown('fc')}
            onClose={closeDropdown}
            onChange={vals => handleMultiChange('fc', vals)}
          />
        )}

        {/* Reset Filter Button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-colors ml-1 font-medium"
            title="Reset semua filter ke kondisi awal"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter ({activeCount})</span>
          </button>
        )}
      </div>

      {/* Global Search box */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={filters.searchQuery || ''}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Cari outlet / kode / salesman..."
          className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-60"
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            title="Hapus pencarian"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
