import React, { useMemo } from 'react';
import { 
  AlertOctagon, 
  ArrowRight, 
  Store, 
  User, 
  TrendingDown,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { DropOutletItem } from '../../types/analytics';
import { formatRupiah } from '../../services/smartInsightEngine';

interface TopLeakageOutletsCardProps {
  dropOutlets: DropOutletItem[];
  totalLostRevenue: number;
  onNavigate: (tab: string) => void;
}

export function TopLeakageOutletsCard({
  dropOutlets,
  totalLostRevenue,
  onNavigate,
}: TopLeakageOutletsCardProps) {
  // Memoized top 10 drop outlets sorted strictly by lost sales descending (0ms compute)
  const top10Leakage = useMemo(() => {
    return [...dropOutlets]
      .sort((a, b) => b.salesPrevious - a.salesPrevious)
      .slice(0, 10);
  }, [dropOutlets]);

  const top10LostTotal = useMemo(() => {
    return top10Leakage.reduce((sum, item) => sum + item.salesPrevious, 0);
  }, [top10Leakage]);

  const paretoPercentage = totalLostRevenue > 0 
    ? Math.round((top10LostTotal / totalLostRevenue) * 100) 
    : 0;

  if (dropOutlets.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Top 10 Leakage Outlets (Penyumbang Penurunan Terbesar)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                Pareto {paretoPercentage}% Omset Hilang
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Fokus pemulihan 10 toko teratas ini menyumbang {formatRupiah(top10LostTotal)} dari total defisit drop outlet ({formatRupiah(totalLostRevenue)})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('drop_outlet')}
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
        >
          <span>Lihat Seluruh Drop Outlet ({dropOutlets.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Responsive Table of Top Leakage Outlets */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">OUTLET / TOKO</th>
              <th className="py-2.5 px-3">SALESMAN PIC</th>
              <th className="py-2.5 px-3">AREA / RAYON</th>
              <th className="py-2.5 px-3 text-right">OMSET BLN LALU (LOST)</th>
              <th className="py-2.5 px-3 text-right">KONTRIBUSI</th>
              <th className="py-2.5 px-3 text-center w-28">AKSI CEPAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {top10Leakage.map((item, idx) => {
              const contributionPct = totalLostRevenue > 0
                ? ((item.salesPrevious / totalLostRevenue) * 100).toFixed(1)
                : '0.0';

              return (
                <tr key={item.outletId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-sans font-bold text-slate-200">
                          {item.outletName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ID: {item.outletId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <div className="flex items-center gap-1.5 font-sans">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{item.salesmanName || item.salesmanId || '-'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {item.area || item.rayon || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                    {formatRupiah(item.salesPrevious)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                    {contributionPct}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onNavigate('action')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-sans font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <span>Kawal Misi</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
