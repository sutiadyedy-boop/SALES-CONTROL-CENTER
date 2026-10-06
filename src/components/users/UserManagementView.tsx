import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Key, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Ban, 
  Loader2, 
  X, 
  Check, 
  RefreshCw,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { UserProfile, UserRole, UserStatus, CreateUserData, UpdateUserData } from '../../types/database';
import { 
  getAdminUsersList, 
  createAdminUser, 
  updateAdminUser, 
  deleteAdminUser 
} from '../../services/authService';
import { CaptureJpgButton } from '../common/CaptureJpgButton';

interface UserManagementViewProps {
  currentUser: UserProfile;
  onNavigateToDashboard?: () => void;
}

export function UserManagementView({ currentUser, onNavigateToDashboard }: UserManagementViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resettingUser, setResettingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  // Form State for Create User
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SALESMAN');
  const [newStatus, setNewStatus] = useState<UserStatus>('ACTIVE');
  const [newPassword, setNewPassword] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newSalesmanId, setNewSalesmanId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset password form state
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsersList();
      if (res.success && res.users) {
        setUsers(res.users);
      } else {
        setError(res.error || 'Gagal memuat daftar pengguna.');
      }
    } catch (err: any) {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setFormError('Username wajib diisi.');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      setFormError('Username hanya boleh mengandung huruf, angka, underscore (_), dan titik (.).');
      return;
    }

    if (!newName.trim()) {
      setFormError('Nama Lengkap wajib diisi.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateUserData = {
        username: cleanUsername,
        name: newName.trim(),
        role: newRole,
        status: newStatus,
        password: newPassword.trim() || undefined,
        area: newArea.trim() || undefined,
        salesmanId: newSalesmanId.trim() || undefined,
      };

      const res = await createAdminUser(payload);
      if (res.success && res.user) {
        setShowCreateModal(false);
        resetCreateForm();
        triggerSuccess(`User @${cleanUsername} berhasil dibuat!`);
        loadUsers();
      } else {
        setFormError(res.error || 'Gagal membuat user.');
      }
    } catch (err: any) {
      setFormError('Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewUsername('');
    setNewName('');
    setNewRole('SALESMAN');
    setNewStatus('ACTIVE');
    setNewPassword('');
    setNewArea('');
    setNewSalesmanId('');
    setFormError(null);
  };

  const handleUpdateStatus = async (user: UserProfile, nextStatus: UserStatus) => {
    try {
      const res = await updateAdminUser(user.id, { status: nextStatus });
      if (res.success) {
        triggerSuccess(`Status user @${user.username} diubah menjadi ${nextStatus}.`);
        loadUsers();
      } else {
        setError(res.error || 'Gagal mengubah status user.');
      }
    } catch (err) {
      setError('Gagal mengubah status user.');
    }
  };

  const handleUpdateRole = async (user: UserProfile, nextRole: UserRole) => {
    try {
      const res = await updateAdminUser(user.id, { role: nextRole });
      if (res.success) {
        triggerSuccess(`Role user @${user.username} diubah menjadi ${nextRole}.`);
        loadUsers();
      } else {
        setError(res.error || 'Gagal mengubah role user.');
      }
    } catch (err) {
      setError('Gagal mengubah role user.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !resetPasswordVal.trim()) return;

    setSubmitting(true);
    try {
      const res = await updateAdminUser(resettingUser.id, { password: resetPasswordVal.trim() });
      if (res.success) {
        triggerSuccess(`Password untuk @${resettingUser.username} berhasil di-reset.`);
        setResettingUser(null);
        setResetPasswordVal('');
      } else {
        setError(res.error || 'Gagal mereset password.');
      }
    } catch (err) {
      setError('Gagal mereset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    try {
      const res = await deleteAdminUser(deletingUser.id);
      if (res.success) {
        triggerSuccess(`User @${deletingUser.username} berhasil dihapus.`);
        setDeletingUser(null);
        loadUsers();
      } else {
        setError(res.error || 'Gagal menghapus user.');
      }
    } catch (err) {
      setError('Gagal menghapus user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.salesmanId && u.salesmanId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/40">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold tracking-wider text-slate-100 font-mono uppercase">
                ADMIN USER MANAGEMENT
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                RBAC & CREDENTIALS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Kelola kredensial akun, otorisasi peran (Role), dan kontrol status akses pengguna sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <CaptureJpgButton
            targetId="main-capture-area"
            fileName={`User_Management_${new Date().toISOString().split('T')[0]}.jpg`}
            label="Capture JPG"
          />

          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh Data User"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ TAMBAH USER</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari username atau nama lengkap..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-mono text-[11px]">ROLE:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">Semua Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="SALESMAN">SALESMAN</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-mono text-[11px]">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs font-mono">Memuat daftar pengguna sistem...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Tidak ada pengguna yang sesuai</p>
            <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Username Login</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Area / Wilayah</th>
                  <th className="py-3 px-4">Aktivitas Terakhir</th>
                  <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser.id;

                  const roleBadgeColor = {
                    ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                    MANAGER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    SUPERVISOR: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                    SALESMAN: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                    USER: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
                  }[u.role] || 'bg-slate-800 text-slate-300';

                  const statusBadgeColor = {
                    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    SUSPENDED: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                    DISABLED: 'bg-slate-800 text-slate-400 border-slate-700',
                  }[u.status] || 'bg-slate-800 text-slate-300';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-slate-200 text-xs font-mono">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                          @{u.username}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${roleBadgeColor}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${statusBadgeColor}`}>
                          {u.status}
                        </span>
                      </td>

                      {/* Area & Salesman Code */}
                      <td className="py-3 px-4">
                        <div className="text-slate-300">
                          {u.area || u.cabang || '-'}
                        </div>
                        {u.salesmanId && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Kode: {u.salesmanId}
                          </div>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : 'Belum pernah login'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Role Toggle */}
                          <select
                            value={u.role}
                            disabled={isCurrent}
                            onChange={(e) => handleUpdateRole(u, e.target.value as UserRole)}
                            className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
                            title="Ganti Role"
                          >
                            <option value="SALESMAN">SALESMAN</option>
                            <option value="SUPERVISOR">SUPERVISOR</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>

                          {/* Quick Status Toggle */}
                          <select
                            value={u.status}
                            disabled={isCurrent}
                            onChange={(e) => handleUpdateStatus(u, e.target.value as UserStatus)}
                            className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
                            title="Ganti Status"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="PENDING">PENDING</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>

                          {/* Reset Credential Button */}
                          <button
                            onClick={() => {
                              setResettingUser(u);
                              setResetPasswordVal('password123');
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                            title="Reset Password Credential"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {!isCurrent && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Hapus User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL (Requirement #7, #8, #9) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Tambah Pengguna Baru</h3>
                  <p className="text-xs text-slate-400">Buat kredensial login dan tetapkan peran akses</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                  Username Login <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="contoh: andi.sales / supervisor_bone"
                    required
                    autoCapitalize="none"
                    spellCheck="false"
                    className="w-full pl-8 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Aturan: Huruf, angka, underscore (_), dan titik (.). Tanpa spasi.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                  Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Masukkan nama lengkap pengguna"
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                    Role Otorisasi <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="SALESMAN">SALESMAN (Default)</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                    Status Akun <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              {/* Initial Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                  Password Awal (Opsional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan untuk password default: Pma@2026!"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Area & Salesman ID Mapping */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">
                    Area / Rayon
                  </label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="contoh: BONE TIMUR"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">
                    Kode Salesman
                  </label>
                  <input
                    type="text"
                    value={newSalesmanId}
                    onChange={(e) => setNewSalesmanId(e.target.value)}
                    placeholder="contoh: 101 / SLS-01"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Buat User Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Reset Password User</h3>
                <p className="text-xs text-slate-400">Akun: @{resettingUser.username}</p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase">
                  Password Baru
                </label>
                <input
                  type="text"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Masukkan password baru"
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Pengguna akan diminta masuk menggunakan password baru ini. Sesi login aktif user akan diakhiri secara otomatis.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>Simpan Password Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Hapus Pengguna</h3>
                <p className="text-xs text-rose-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun user <strong className="text-slate-100">@{deletingUser.username}</strong> ({deletingUser.name})? Semua sesi login pengguna ini akan segera dihentikan.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Hapus Pengguna</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
