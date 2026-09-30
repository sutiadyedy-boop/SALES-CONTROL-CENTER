import React, { useState } from 'react';
import { Settings, Save, Shield, Database, Key, CheckCircle2, RotateCcw, SlidersHorizontal, AlertTriangle, ShieldAlert, Lock, Sun, Moon } from 'lucide-react';
import { AppSettings, UserProfile, UserRole, InsightThresholds } from '../../types/database';
import { DEFAULT_THRESHOLDS } from '../../services/storageService';
import { CaptureJpgButton } from '../common/CaptureJpgButton';
import { useTheme } from '../../context/ThemeContext';

interface SettingsViewProps {
  settings: AppSettings;
  userProfile: UserProfile;
  availableSalesmen: { id: string; name: string }[];
  onSaveSettings: (settings: AppSettings) => void;
  onUpdateUser: (user: UserProfile) => void;
  onResetToDefaults: () => void;
}

export function SettingsView({
  settings,
  userProfile,
  availableSalesmen,
  onSaveSettings,
  onUpdateUser,
  onResetToDefaults,
}: SettingsViewProps) {
  const isAdmin = userProfile.role === 'ADMIN';
  const { theme, setTheme } = useTheme();
  const [formSettings, setFormSettings] = useState<AppSettings>({
    ...settings,
    thresholds: settings.thresholds || DEFAULT_THRESHOLDS,
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>(userProfile.role);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>(userProfile.salesmanId || (availableSalesmen[0]?.id || ''));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const thresholds: InsightThresholds = formSettings.thresholds || DEFAULT_THRESHOLDS;

  const updateThreshold = <K extends keyof InsightThresholds>(key: K, val: number) => {
    if (!isAdmin) return;
    setFormSettings(prev => ({
      ...prev,
      thresholds: {
        ...(prev.thresholds || DEFAULT_THRESHOLDS),
        [key]: val,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    onSaveSettings(formSettings);
    onUpdateUser({
      ...userProfile,
      role: selectedRole,
      salesmanId: selectedRole === 'SALESMAN' ? selectedSalesmanId : undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>Konfigurasi Aturan Bisnis & Kontrol Akses (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sesuaikan parameter perhitungan sales value, active rule master outlet, prioritas pencocokan kunci, dan peran pengguna.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`Pengaturan_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          {isAdmin ? (
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi</span>
            </button>
          ) : (
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700 cursor-not-allowed shadow-sm"
              title="Hanya peran ADMIN yang dapat menyimpan perubahan konfigurasi"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Terkunci (Hanya Admin)</span>
            </div>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mode Baca Saja (Read-Only):</strong> Anda masuk sebagai <span className="font-mono font-bold text-amber-200">[{userProfile.role}]</span>. Parameter aturan bisnis, formula, toleransi, dan hak akses dikunci. Hanya pengguna peran <strong className="text-amber-200">ADMIN</strong> yang diizinkan mengubah konfigurasi.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0">
            READ ONLY
          </span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pengaturan dan aturan bisnis berhasil disimpan dan diterapkan ke seluruh modul!</span>
        </div>
      )}

      {/* Theme Preference Card (Accessible to all users) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-amber-400" />
          ) : (
            <Sun className="w-4 h-4 text-indigo-500" />
          )}
          <h3 className="text-sm font-bold text-slate-100">
            Tema Tampilan Antarmuka (Dark / Light Mode)
          </h3>
        </div>

        <div className="text-xs">
          <p className="text-slate-400 mb-3">
            Pilih mode tema yang paling nyaman untuk Anda. Kontras teks dan palet warna diatur presisi agar seluruh tabel metrik, chart BI, dan laporan audit terbaca tajam dan jelas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'dark'
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-100 block">Tema Gelap (Dark Mode)</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Kontras tinggi ala ruang kontrol data (default).</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'light'
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-100 block">Tema Terang (Light Mode)</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Latar bersih putih & teks arang pekat beresolusi tinggi.</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <fieldset disabled={!isAdmin} className="space-y-6 disabled:opacity-85">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Peran Pengguna & Hak Akses (RBAC)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Simulasi Login Sebagai:
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as UserRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="ADMIN">ADMIN (Akses Penuh Seluruh Cabang & Master)</option>
              <option value="MANAGER">MANAGER (Akses Cabang / Depo)</option>
              <option value="SUPERVISOR">SUPERVISOR (Akses Area Lapangan)</option>
              <option value="SALESMAN">SALESMAN (Hanya Outlet & Kinerja Diri Sendiri)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Data internal terlindungi secara aman berdasarkan hak akses.
            </p>
          </div>

          {selectedRole === 'SALESMAN' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Pilih Akun Salesman:
              </label>
              <select
                value={selectedSalesmanId}
                onChange={e => setSelectedSalesmanId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium font-mono"
              >
                {availableSalesmen.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Sales Value Business Rule */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Aturan 1: Penetapan Field Sales Value
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-400">
            Sesuai Business Rule: Hanya <span className="text-slate-200 font-semibold">SATU</span> field yang ditetapkan sebagai SALES_VALUE (jangan menjumlahkan VALUE, VALUE NETT, dan NETT EXCL PPN secara bersamaan).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Kolom Sumber Sales Value:
              </label>
              <select
                value={formSettings.salesValueField}
                onChange={e => setFormSettings({ ...formSettings, salesValueField: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="VALEU">VALEU / GROSS / VALUE (Standar Realisasi Kantor)</option>
                <option value="VALUE">VALUE (Gross Sales)</option>
                <option value="GROSS">GROSS (Gross Sales)</option>
                <option value="VALUE NETT">VALUE NETT (Nett Sales)</option>
                <option value="NETT EXCL PPN">NETT EXCL PPN</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Label Periode Berjalan (Current Month):
              </label>
              <input
                type="text"
                value={formSettings.currentMonthLabel}
                onChange={e => setFormSettings({ ...formSettings, currentMonthLabel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="SEPTEMBER 2026"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Outlet Active Rule */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Key className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Aturan 5: Rule Outlet Aktif (Master CB/ROA)
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-400">
            Default: Apabila kolom <span className="text-slate-200 font-mono">STATUS BLN INI = "OK"</span>, maka outlet dinilai AKTIF sebagai pembagi perhitungan Repeat Order (RO %).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Kolom Status:
              </label>
              <input
                type="text"
                value={formSettings.outletActiveRule.columnName}
                onChange={e => setFormSettings({
                  ...formSettings,
                  outletActiveRule: { ...formSettings.outletActiveRule, columnName: e.target.value },
                })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Operator:
              </label>
              <select
                value={formSettings.outletActiveRule.operator}
                onChange={e => setFormSettings({
                  ...formSettings,
                  outletActiveRule: { ...formSettings.outletActiveRule, operator: e.target.value as any },
                })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="equals">Sama Dengan (=)</option>
                <option value="contains">Mengandung Kata</option>
                <option value="not_empty">Tidak Kosong</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Nilai Syarat Aktif:
              </label>
              <input
                type="text"
                value={formSettings.outletActiveRule.expectedValue}
                onChange={e => setFormSettings({
                  ...formSettings,
                  outletActiveRule: { ...formSettings.outletActiveRule, expectedValue: e.target.value },
                })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Key Priority Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Key className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Aturan Prioritas Kunci Relasi & Deduplikasi
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Salesman Key Priority:
            </label>
            <select
              value={formSettings.keyPriority.salesmanKey}
              onChange={e => setFormSettings({
                ...formSettings,
                keyPriority: { ...formSettings.keyPriority, salesmanKey: e.target.value as any },
              })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
            >
              <option value="KD_SLS">1. KD_SLS / KODE SALESMAN (Utama)</option>
              <option value="NIK">2. NIK SALESMAN</option>
              <option value="NAME">3. NAMA SALESMAN (Fallback)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Outlet Key Priority:
            </label>
            <select
              value={formSettings.keyPriority.outletKey}
              onChange={e => setFormSettings({
                ...formSettings,
                keyPriority: { ...formSettings.keyPriority, outletKey: e.target.value as any },
              })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
            >
              <option value="KODE_OUTLET">1. KODE OUTLET (Utama)</option>
              <option value="KD_OUTLET">2. KD OUTLET</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Deduplication Key:
            </label>
            <select
              value={formSettings.keyPriority.transactionKey}
              onChange={e => setFormSettings({
                ...formSettings,
                keyPriority: { ...formSettings.keyPriority, transactionKey: e.target.value as any },
              })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
            >
              <option value="INVOICE_ONLY">NO FAKTUR (Nomor Unik)</option>
              <option value="INVOICE_OUTLET_ITEM">NO FAKTUR + OUTLET + ITEM</option>
              <option value="DATE_OUTLET_ITEM_VALUE">TGL + OUTLET + ITEM + VALUE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card 5: Ambang Batas Intelijen Bisnis (Configurable Thresholds) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Aturan 6: Ambang Batas Klasifikasi (PRIORITY, ATTENTION, OPPORTUNITY)
            </h3>
            <p className="text-[11px] text-slate-400">
              Konfigurasi ambang batas matematis yang menentukan kapan anomali dikelompokkan sebagai Prioritas Kritis atau Perhatian.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Achievement thresholds */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block">Achievement Rate (%)</span>
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">Warning Threshold (&lt; %):</label>
              <input
                type="number"
                value={thresholds.achievementWarning}
                onChange={e => updateThreshold('achievementWarning', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">Critical Threshold (&lt; %):</label>
              <input
                type="number"
                value={thresholds.achievementCritical}
                onChange={e => updateThreshold('achievementCritical', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Growth MoM thresholds */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block">Growth MoM (%)</span>
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">Warning Threshold (&lt; %):</label>
              <input
                type="number"
                value={thresholds.growthWarning}
                onChange={e => updateThreshold('growthWarning', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">Critical Drop (&lt; %):</label>
              <input
                type="number"
                value={thresholds.growthCritical}
                onChange={e => updateThreshold('growthCritical', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Repeat Order (RO %) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block">Repeat Order (RO %)</span>
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">Warning RO (&lt; %):</label>
              <input
                type="number"
                value={thresholds.roWarning}
                onChange={e => updateThreshold('roWarning', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">Critical RO (&lt; %):</label>
              <input
                type="number"
                value={thresholds.roCritical}
                onChange={e => updateThreshold('roCritical', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Drop Outlet Thresholds */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block">Drop Outlet Count</span>
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">Warning Count (&ge; outlet):</label>
              <input
                type="number"
                value={thresholds.dropOutletCountWarning}
                onChange={e => updateThreshold('dropOutletCountWarning', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">Critical Count (&ge; outlet):</label>
              <input
                type="number"
                value={thresholds.dropOutletCountCritical}
                onChange={e => updateThreshold('dropOutletCountCritical', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Gap Deficit Thresholds (IDR) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block">Gap Defisit Kuota (Rp)</span>
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">Warning Defisit (&ge; Rp):</label>
              <input
                type="number"
                step="1000000"
                value={thresholds.gapShortageWarning}
                onChange={e => updateThreshold('gapShortageWarning', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">Critical Defisit (&ge; Rp):</label>
              <input
                type="number"
                step="1000000"
                value={thresholds.gapShortageCritical}
                onChange={e => updateThreshold('gapShortageCritical', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Salesman Performance Thresholds */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block">Salesman Performance (%)</span>
            <div>
              <label className="text-[10px] text-amber-400 block mb-1">Warning Ach (&lt; %):</label>
              <input
                type="number"
                value={thresholds.salesmanAchWarning}
                onChange={e => updateThreshold('salesmanAchWarning', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">Critical Ach (&lt; %):</label>
              <input
                type="number"
                value={thresholds.salesmanAchCritical}
                onChange={e => updateThreshold('salesmanAchCritical', Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>
      </div>
      </fieldset>

      {/* Reset Defaults */}
      {isAdmin && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan ke Nilai Default Kantor</span>
          </button>
        </div>
      )}
    </form>
  );
}
