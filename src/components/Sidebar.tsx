import React, { useState, useEffect } from 'react';
import { 
  Database, 
  SlidersHorizontal, 
  ShieldCheck, 
  Table, 
  History, 
  FileCheck2,
  GitBranch,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  LayoutDashboard,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  AlertOctagon,
  Sparkles,
  Users,
  Lightbulb,
  FileText,
  Settings,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  Lock
} from 'lucide-react';
import { ControlTowerKPIs } from '../types/analytics';
import { UserProfile } from '../types/database';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  totalFiles: number;
  totalRows: number;
  validationIssuesCount: number;
  matchedCount: number;
  kpis?: ControlTowerKPIs | null;
  pendingActionCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userProfile?: UserProfile;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  totalFiles,
  totalRows,
  validationIssuesCount,
  matchedCount,
  kpis,
  pendingActionCount,
  collapsed,
  onToggleCollapse,
  userProfile,
}: SidebarProps) {
  // Support both controlled & uncontrolled collapsed state
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem('control_tower_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('control_tower_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  const analyticsItems = [
    { 
      id: 'dashboard', 
      label: 'Control Tower Dashboard', 
      icon: LayoutDashboard, 
      badge: kpis?.achievementRate !== null && kpis?.achievementRate !== undefined ? `${kpis.achievementRate.toFixed(0)}%` : null,
      badgeColor: kpis && kpis.achievementRate !== null && kpis.achievementRate >= 100 
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
    },
    { 
      id: 'target_realisasi', 
      label: 'Target vs Realisasi', 
      icon: Target, 
      badge: null 
    },
    { 
      id: 'month_comparison', 
      label: 'Perbandingan Agus vs Sept', 
      icon: TrendingUp, 
      badge: kpis?.growthRate !== null && kpis?.growthRate !== undefined ? `${kpis.growthRate >= 0 ? '+' : ''}${kpis.growthRate.toFixed(1)}%` : null,
      badgeColor: kpis && kpis.growthRate !== null && kpis.growthRate >= 0
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono'
        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono'
    },
    { 
      id: 'ro_monitoring', 
      label: 'Monitoring RO Aktif', 
      icon: Zap, 
      badge: kpis?.repeatOrderRate !== null && kpis?.repeatOrderRate !== undefined ? `${kpis.repeatOrderRate.toFixed(0)}%` : null,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono'
    },
    { 
      id: 'ebp_monitoring', 
      label: 'Monitoring EPB', 
      icon: BarChart3, 
      badge: 'MARK NEW',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono'
    },
    { 
      id: 'monitoring_ec', 
      label: 'Monitoring EC', 
      icon: Activity, 
      badge: 'PMA & Sales',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono'
    },
    { 
      id: 'drop_outlets', 
      label: 'Drop Outlets', 
      icon: AlertOctagon, 
      badge: kpis && kpis.dropOutletCount > 0 ? `${kpis.dropOutletCount}` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono'
    },
    { 
      id: 'new_outlets', 
      label: 'New Active Outlets', 
      icon: Sparkles, 
      badge: kpis && kpis.newActiveOutletCount > 0 ? `+${kpis.newActiveOutletCount}` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono'
    },
    { 
      id: 'salesman_performance', 
      label: 'Salesman Performance', 
      icon: Users, 
      badge: null 
    },
    { 
      id: 'smart_insight', 
      label: 'Smart Insights', 
      icon: Sparkles, 
      badge: '7 Domain',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
    },
    { 
      id: 'opportunity', 
      label: 'Opportunity Radar', 
      icon: Lightbulb, 
      badge: 'Radar',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    { 
      id: 'action_monitoring', 
      label: 'Action Monitoring', 
      icon: ClipboardCheck, 
      badge: pendingActionCount !== undefined && pendingActionCount > 0 ? `${pendingActionCount} todo` : 'Ready',
      badgeColor: pendingActionCount !== undefined && pendingActionCount > 0
        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono'
        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono'
    },
    { 
      id: 'reports', 
      label: 'Reports & Export', 
      icon: FileText, 
      badge: null 
    },
  ];

  const isNonAdmin = userProfile?.role !== 'ADMIN';

  const databaseItems = [
    { 
      id: 'database', 
      label: 'Upload Database', 
      icon: Database, 
      badge: totalFiles > 0 ? `${totalFiles} file` : null,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
    },
    { 
      id: 'mapping', 
      label: 'Auto Column Mapping', 
      icon: SlidersHorizontal, 
      badge: isNonAdmin ? 'Lihat Saja' : null,
      badgeColor: 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono'
    },
    { 
      id: 'validation', 
      label: 'Data Validation', 
      icon: ShieldCheck, 
      badge: validationIssuesCount > 0 
        ? `${validationIssuesCount} alert` 
        : (isNonAdmin ? 'Lihat Saja' : 'Valid'),
      badgeColor: validationIssuesCount > 0 
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
        : (isNonAdmin ? 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
    },
    { 
      id: 'reconciliation', 
      label: 'Reconciliation Report', 
      icon: FileCheck2, 
      badge: matchedCount > 0 
        ? `${matchedCount} match` 
        : (isNonAdmin ? 'Lihat Saja' : null),
      badgeColor: matchedCount > 0 
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono' 
        : 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono'
    },
    { 
      id: 'version', 
      label: 'Version Control & Dedup', 
      icon: GitBranch, 
      badge: isNonAdmin ? 'Lihat Saja' : 'Dedup OK',
      badgeColor: isNonAdmin 
        ? 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono' 
        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
    },
    { 
      id: 'inspector', 
      label: 'Raw Data Inspector', 
      icon: Table, 
      badge: totalRows > 0 
        ? `${totalRows.toLocaleString('id-ID')} rows` 
        : (isNonAdmin ? 'Lihat Saja' : null),
      badgeColor: isNonAdmin && totalRows === 0
        ? 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono'
        : 'bg-slate-800 text-slate-300 border border-slate-700'
    },
    { 
      id: 'session', 
      label: 'Upload Session & Logs', 
      icon: History, 
      badge: isNonAdmin ? 'Lihat Saja' : null,
      badgeColor: 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono'
    },
    { 
      id: 'settings', 
      label: 'Settings & Rules', 
      icon: Settings, 
      badge: isNonAdmin ? 'Lihat Saja' : null,
      badgeColor: 'bg-amber-500/10 text-amber-300/80 border border-amber-500/20 font-mono'
    },
    ...(userProfile?.role === 'ADMIN' ? [{
      id: 'users',
      label: 'Admin User Management',
      icon: UserCheck,
      badge: 'Admin',
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono',
    }] : []),
  ];

  return (
    <aside 
      className={`bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen transition-all duration-300 ease-in-out relative z-40 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`border-b border-slate-800/80 flex items-center transition-all ${
        isCollapsed ? 'p-3 flex-col gap-2 justify-center' : 'p-4 justify-between gap-2'
      }`}>
        {isCollapsed ? (
          <>
            <button
              onClick={toggleCollapse}
              className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all group"
              title="Klik untuk Expand Sidebar (Ctrl+B)"
            >
              <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={toggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
              title="Expand Sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h1 className="text-xs font-extrabold tracking-wider uppercase text-slate-100 font-mono truncate">
                  CONTROL TOWER
                </h1>
                <span className="text-[10px] text-cyan-400 font-bold block -mt-0.5 truncate">
                  PHASE 3 · CALCULATION & BI
                </span>
              </div>
            </div>

            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors shrink-0"
              title="Minimize Sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav List */}
      <nav className={`p-2.5 space-y-4 flex-1 overflow-y-auto ${isCollapsed ? 'overflow-x-visible' : ''}`}>
        {/* Section 1: Analytics & Control Tower */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1 flex items-center justify-between">
              <span>Analytics & BI Engine</span>
              <span className="text-[9px] text-cyan-400 font-mono">PHASE 3</span>
            </div>
          ) : (
            <div className="py-1 flex justify-center" title="Analytics & BI Engine">
              <div className="w-6 h-[1px] bg-slate-800" />
            </div>
          )}

          {analyticsItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors ${
                    isCollapsed 
                      ? 'justify-center p-2.5' 
                      : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                    <Icon className={`w-4 h-4 transition-colors shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed ? (
                    item.badge ? (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity ${isActive ? 'opacity-100 text-cyan-400' : ''}`} />
                    )
                  ) : (
                    item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                    )
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-700/90 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50 flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section 2: Database & Normalization Engine */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          {!isCollapsed ? (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1 flex items-center justify-between">
              <span>Database & ETL Center</span>
              {isNonAdmin ? (
                <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1 font-semibold">
                  <Lock className="w-2.5 h-2.5" />
                  HANYA LIHAT
                </span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-mono">PHASE 1-2</span>
              )}
            </div>
          ) : (
            <div className="py-1 flex justify-center" title={isNonAdmin ? "Database & ETL Center (Hanya Lihat / Read-Only)" : "Database & ETL Center"}>
              <div className="w-6 h-[1px] bg-slate-800" />
            </div>
          )}

          {databaseItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isReadOnlyItem = isNonAdmin && item.id !== 'database';

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors ${
                    isCollapsed 
                      ? 'justify-center p-2.5' 
                      : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  }`}
                  title={isCollapsed ? (isReadOnlyItem ? `${item.label} (Hanya Lihat - Read Only)` : item.label) : undefined}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                    <Icon className={`w-4 h-4 transition-colors shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{item.label}</span>
                        {isReadOnlyItem && (
                          <span title="Mode Hanya Lihat (Read-Only)">
                            <Lock className="w-3 h-3 text-amber-400/80 shrink-0" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isCollapsed ? (
                    item.badge ? (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity ${isActive ? 'opacity-100 text-cyan-400' : ''}`} />
                    )
                  ) : (
                    item.badge && (
                      <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-slate-950 ${isReadOnlyItem ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    )
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute left-[64px] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-700/90 text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50 flex items-center gap-2">
                    <span>{item.label}</span>
                    {isReadOnlyItem && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Hanya Lihat
                      </span>
                    )}
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer System Info */}
      <div className={`border-t border-slate-800/80 bg-slate-950 text-slate-500 text-[10px] font-mono transition-all ${
        isCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-3.5 flex items-center justify-between'
      }`}>
        {isCollapsed ? (
          <>
            <span 
              className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" 
              title="PHASE 5 VERIFIED · SMART BI" 
            />
            <button
              onClick={toggleCollapse}
              className="p-1 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              title="Expand Sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span>PHASE 5 VERIFIED</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SMART BI
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
