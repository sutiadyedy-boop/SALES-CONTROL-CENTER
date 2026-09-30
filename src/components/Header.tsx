import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Shield, 
  Database, 
  CheckCircle2, 
  PanelLeftClose, 
  PanelLeftOpen,
  User,
  LogOut,
  Settings,
  UserCheck,
  ChevronDown,
  Building2
} from 'lucide-react';
import { UserProfile } from '../types/database';
import { CaptureJpgButton } from './common/CaptureJpgButton';

interface HeaderProps {
  sessionId: string;
  userProfile: UserProfile;
  currentTab?: string;
  hasPrev: boolean;
  hasCurr: boolean;
  hasTarget: boolean;
  hasMaster: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
  onNavigateToSettings: () => void;
  onNavigateToUsers?: () => void;
  onLogout?: () => void;
}

const tabLabels: Record<string, string> = {
  dashboard: 'Control_Tower_Dashboard',
  target_realisasi: 'Target_vs_Realisasi',
  month_comparison: 'Perbandingan_Bulan_Agus_Sept',
  ro_monitoring: 'RO_Monitoring_Penetrasi_Outlet',
  drop_outlets: 'Drop_Outlets',
  new_outlets: 'New_Active_Outlets',
  salesman_performance: 'Performa_Salesman',
  opportunity: 'Opportunity_Radar',
  smart_insight: 'Smart_Insights',
  action_monitoring: 'Action_Monitoring',
  reports: 'Laporan_Eksekutif',
  database: 'Database_Center',
  mapping: 'Column_Mapping',
  validation: 'Data_Validation',
  reconciliation: 'Reconciliation_Report',
  version: 'Version_Control_Dedup',
  inspector: 'Raw_Data_Inspector',
  session: 'Upload_Session_Logs',
  settings: 'Pengaturan_Aturan',
  users: 'Admin_User_Management',
};

export function Header({
  sessionId,
  userProfile,
  currentTab = 'dashboard',
  hasPrev,
  hasCurr,
  hasTarget,
  hasMaster,
  sidebarCollapsed = false,
  onToggleSidebar,
  onLoadSampleData,
  onClearAllData,
  onNavigateToSettings,
  onNavigateToUsers,
  onLogout,
}: HeaderProps) {
  const activeMenuLabel = tabLabels[currentTab] || currentTab;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleBadgeStyle = {
    ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    MANAGER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    SUPERVISOR: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    SALESMAN: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  }[userProfile.role] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left controls */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
              SESSION:
            </span>
            <span className="text-xs font-mono font-semibold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {sessionId}
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wide">
                ENGINE ACTIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="text-slate-500 font-mono">DATASET:</span>
            <span className={hasPrev ? 'text-emerald-400 font-mono font-semibold' : 'text-slate-500 font-mono'}>
              {hasPrev ? '● 1. Bulan Lalu (Ready)' : '○ 1. Bulan Lalu'}
            </span>
            <span className="text-slate-600">·</span>
            <span className={hasCurr ? 'text-emerald-400 font-mono font-semibold' : 'text-slate-500 font-mono'}>
              {hasCurr ? '● 2. Bulan Ini (Ready)' : '○ 2. Bulan Ini'}
            </span>
            <span className="text-slate-600">·</span>
            <span className={hasTarget ? 'text-emerald-400 font-mono font-semibold' : 'text-slate-500 font-mono'}>
              {hasTarget ? '● 3. Target SC (Ready)' : '○ 3. Target SC'}
            </span>
            <span className="text-slate-600">·</span>
            <span className={hasMaster ? 'text-emerald-400 font-mono font-semibold' : 'text-slate-500 font-mono'}>
              {hasMaster ? '● 4. Master CB (Ready)' : '○ 4. Master CB'}
            </span>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Capture JPG button for currently active menu view */}
        <CaptureJpgButton
          targetId="main-capture-area"
          fileName={`Capture_${activeMenuLabel}_${new Date().toISOString().split('T')[0]}.jpg`}
          label="Capture JPG"
          className="border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 font-semibold"
        />

        {/* Demo Data button */}
        <button
          onClick={onLoadSampleData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-sm"
          title="Muat dataset contoh kantor (Bone, Agust-Sept 2026)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Muat Demo Data</span>
        </button>

        {/* Reset / Clear Data */}
        <button
          onClick={onClearAllData}
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
          title="Reset semua data upload"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* User Profile & Role Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs transition-all shadow-sm"
            title="Menu Akun Pengguna"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs font-mono">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="text-left hidden md:block">
              <div className="font-bold text-slate-100 uppercase tracking-wide leading-tight text-[11px]">
                {userProfile.name}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="font-mono text-cyan-300">@{userProfile.username || 'user'}</span>
                <span>·</span>
                <span className={`px-1 rounded text-[9px] font-bold border font-mono ${roleBadgeStyle}`}>
                  {userProfile.role}
                </span>
              </div>
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Identity Info */}
              <div className="px-4 py-3 border-b border-slate-800/80">
                <p className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                  {userProfile.name}
                </p>
                <p className="text-xs font-mono text-cyan-400 font-semibold mt-0.5">
                  @{userProfile.username}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${roleBadgeStyle}`}>
                    {userProfile.role}
                  </span>
                  {userProfile.cabang && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cabang: {userProfile.cabang}
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              <div className="py-1">
                {/* Admin User Management (ADMIN only) */}
                {userProfile.role === 'ADMIN' && onNavigateToUsers && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavigateToUsers();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors font-medium text-left"
                  >
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>Admin User Management</span>
                  </button>
                )}

                {/* Settings & Rules */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigateToSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan & Profil</span>
                </button>
              </div>

              {/* Logout Option */}
              {onLogout && (
                <div className="pt-1 mt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
