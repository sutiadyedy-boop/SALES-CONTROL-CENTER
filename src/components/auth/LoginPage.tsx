import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound
} from 'lucide-react';
import { loginWithCredentials, requestPasswordRecovery } from '../../services/authService';
import { UserProfile } from '../../types/database';
import { ThemeToggle } from '../common/ThemeToggle';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strip leading @ and trim
    const cleanUser = username.trim().replace(/^@+/, '').toLowerCase();

    // Client-side validations
    if (!cleanUser) {
      setErrorMessage('Username wajib diisi.');
      return;
    }

    if (!password) {
      setErrorMessage('Password wajib diisi.');
      return;
    }

    // Username format check: only letters, numbers, dot, underscore
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(cleanUser)) {
      setErrorMessage('Username atau password salah.');
      return;
    }

    setLoading(true);

    try {
      const result = await loginWithCredentials(cleanUser, password, rememberMe);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        // Requirement #2: "Jika salah: 'Username atau password salah.' Jangan menampilkan error teknis"
        setErrorMessage(result.error || 'Username atau password salah.');
      }
    } catch (err) {
      setErrorMessage('Username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) return;

    setForgotLoading(true);
    try {
      const res = await requestPasswordRecovery(forgotUsername.trim());
      setForgotMessage(res.message);
    } catch {
      setForgotMessage('Ikuti instruksi pemulihan akses yang dikirim melalui metode recovery akun.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle showLabel={true} />
      </div>

      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute top-10 left-10 w-[250px] h-[250px] bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none" />

      {/* Decorative technical grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-slate-900/80 border border-slate-800/90 shadow-2xl backdrop-blur-xl rounded-2xl p-6 sm:p-8 transition-all hover:border-slate-700/80">
          
          {/* Header Title & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-950 via-slate-900 to-cyan-900/40 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
              <Shield className="w-7 h-7" />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-wider font-mono text-slate-100 uppercase">
              SALES CONTROL CENTER
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-cyan-400 font-mono mt-1">
              PT PINUS MERAH ABADI
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Control Tower & Enterprise Sales Execution
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/40 focus:ring-offset-0 focus:ring-offset-slate-900"
                />
                <span>Ingat saya</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotUsername(username);
                  setForgotMessage(null);
                  setShowForgotModal(true);
                }}
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline"
              >
                Lupa password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wider uppercase transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>MASUK</span>
              )}
            </button>

            {/* Quick Access Account Selector */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-mono mb-2 flex items-center justify-between">
                <span>PILIH AKUN LOGIN CEPAT:</span>
                <span className="text-[10px] text-cyan-400">PW: password123 / 12345</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'dias', label: 'dias', role: 'ADMIN' },
                  { name: 'edy.sutiady', label: 'edy.sutiady', role: 'ADMIN' },
                  { name: 'andi.sales', label: 'andi.sales', role: 'SALES' },
                  { name: 'supervisor_bone', label: 'supervisor', role: 'SPV' },
                  { name: 'manager.bone', label: 'manager', role: 'MGR' },
                  { name: 'rini.sales', label: 'rini.sales', role: 'SALES' },
                ].map(acc => (
                  <button
                    key={acc.name}
                    type="button"
                    onClick={() => {
                      setUsername(acc.name);
                      setPassword('password123');
                      setErrorMessage(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] font-mono text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center gap-1.5"
                  >
                    <span>{acc.label}</span>
                    <span className="text-slate-500 text-[9px] bg-slate-900 px-1 rounded">({acc.role})</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Security Footer Notice */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Sistem Otentikasi Terenkripsi & Terlindungi (RLS Enabled)</span>
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            Dibuat Oleh : Edy Sutiady M. © {new Date().getFullYear()} · All rights reserved
          </p>
        </div>
      </div>

      {/* Forgot Password Modal (Requirement #12) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Pemulihan Akun</h3>
                <p className="text-xs text-slate-400">Reset Akses Akun Pengguna</p>
              </div>
            </div>

            {forgotMessage ? (
              <div className="py-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-4 leading-relaxed">
                  <div className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Permintaan Diterima</span>
                  </div>
                  {forgotMessage}
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Kembali ke Halaman Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Masukkan username Anda. Jika akun terdaftar, tautan verifikasi atau instruksi reset akan diproses melalui channel recovery resmi perusahaan.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono uppercase">
                    Username
                  </label>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Masukkan username akun Anda"
                    required
                    disabled={forgotLoading}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <span>Kirim Permintaan</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
