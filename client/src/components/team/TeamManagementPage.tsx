import React, { useState, useMemo, useEffect } from "react";
import { User, UserRole } from "../../types";
import { Avatar } from "../common/Avatar";
import { useUsers, useRegisterUser, useUpdateUser, useDeleteUser } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { UserFormModal } from "./UserFormModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { Pagination } from "../common/Pagination";
import { useDebounce } from "../../hooks/useDebounce";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Briefcase, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle,
  Crown,
  Search,
  ArrowLeft,
  UserCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  FilterX,
  Phone,
  Calendar,
  Building2,
  MapPin
} from "lucide-react";

interface TeamManagementPageProps {
  onBackToGlobal: () => void;
}

export function TeamManagementPage({ onBackToGlobal }: TeamManagementPageProps) {
  const { user: currentUser, canManageUsers } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const registerMutation = useRegisterUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Search & Filter states with Debounce
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const handleOpenCreateModal = () => {
    setUserToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setUserToEdit(u);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    job_title: string;
    avatar_color: string;
    is_active?: number;
    phone?: string;
    address?: string;
    gender?: string;
    department?: string;
    join_date?: string;
    end_date?: string;
  }) => {
    if (formData.id) {
      updateMutation.mutate(
        {
          id: formData.id,
          data: formData,
        },
        {
          onSuccess: () => {
            setIsFormModalOpen(false);
            setUserToEdit(null);
          },
        }
      );
    } else {
      registerMutation.mutate(
        formData,
        {
          onSuccess: () => {
            setIsFormModalOpen(false);
            setUserToEdit(null);
          },
        }
      );
    }
  };

  const handleToggleActiveStatus = (u: User) => {
    if (!canManageUsers) return;
    if (u.id === currentUser?.id) return; // Prevent disabling self

    const nextStatus = u.is_active === 0 ? 1 : 0;
    updateMutation.mutate({
      id: u.id,
      data: { is_active: nextStatus },
    });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteMutation.mutate(userToDelete.id, {
      onSuccess: () => {
        setUserToDelete(null);
      },
    });
  };

  // Filtered users list with Debounced Search
  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        q === "" ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.job_title && u.job_title.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active !== 0) ||
        (statusFilter === "inactive" && u.is_active === 0);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  // Paginated users
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Quick stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active !== 0).length;
    const owners = users.filter((u) => u.role === "owner").length;
    const pms = users.filter((u) => u.role === "pm").length;
    const karyawans = users.filter((u) => u.role === "karyawan").length;
    const magangs = users.filter((u) => u.role === "magang").length;

    return { total, active, owners, pms, karyawans, magangs };
  }, [users]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Owner</span>
          </span>
        );
      case "pm":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
            <Briefcase className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Project Manager</span>
          </span>
        );
      case "karyawan":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Karyawan</span>
          </span>
        );
      case "magang":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Magang</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header & Back Button */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackToGlobal}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Dashboard Utama</span>
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Kelola Tim & Hak Akses
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Manajemen data lengkap profil anggota, departemen, masa kontrak, dan pengaturan peran RBAC tim FSI
                </p>
              </div>
            </div>
          </div>

          {/* Create User Button (Owner only) */}
          {canManageUsers && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Anggota Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Anggota</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{stats.active} akun aktif</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Owner</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Crown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.owners}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">Akses penuh sistem</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Project Manager</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.pms}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">Kelola task & BOM</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Karyawan</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.karyawans}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">Engineer pelaksana</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Magang</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.magangs}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">Intern & dukungan</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        {/* Left: Search Box with Debounce Indicator */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, jabatan, departemen..."
            title="Ketik untuk mencari data anggota tim (jeda 500ms)"
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Right: Role & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              title="Filter anggota berdasarkan peran hak akses (RBAC)"
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Semua Peran</option>
              <option value="owner">👑 Owner</option>
              <option value="pm">💼 Project Manager</option>
              <option value="karyawan">🛠️ Karyawan</option>
              <option value="magang">🎓 Magang</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Status Akun:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter anggota berdasarkan status keaktifan akun"
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Semua Status Akun</option>
              <option value="active">Akun Aktif</option>
              <option value="inactive">Akun Nonaktif</option>
            </select>
          </div>

          {(search || roleFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Hapus semua filter pencarian"
            >
              <FilterX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat data anggota tim...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">Tidak ada anggota tim yang cocok</p>
            <p className="text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter peran.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[28%]">Anggota Tim</th>
                  <th className="py-3.5 px-4 w-[16%]">Peran RBAC</th>
                  <th className="py-3.5 px-4 w-[20%]">Posisi & Departemen</th>
                  <th className="py-3.5 px-4 w-[14%]">Masa Kerja</th>
                  <th className="py-3.5 px-4 w-[10%]">Status</th>
                  <th className="py-3.5 px-4 w-[12%] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isActiveUser = u.is_active !== 0;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !isActiveUser ? "bg-slate-50/30 opacity-70" : ""
                      }`}
                    >
                      {/* Member Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={u.name}
                            color={u.avatar_color}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {u.name}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-700">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {u.email}
                            </div>
                            {u.phone && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 truncate">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Job Title & Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {u.job_title || "-"}
                        </div>
                        {u.department && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{u.department}</span>
                          </div>
                        )}
                      </td>

                      {/* Join Date / End Date */}
                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="text-slate-700 font-medium">
                          Gabung: {formatDate(u.join_date)}
                        </div>
                        {u.end_date && (
                          <div className="text-slate-400 text-[10px] mt-0.5">
                            Selesai: {formatDate(u.end_date)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActiveUser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canManageUsers ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active Switch */}
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleToggleActiveStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed"
                                  : isActiveUser
                                  ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={
                                isSelf
                                  ? "Tidak dapat menonaktifkan akun sendiri"
                                  : isActiveUser
                                  ? "Nonaktifkan Akun"
                                  : "Aktifkan Akun"
                              }
                            >
                              {isActiveUser ? (
                                <ToggleRight className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-slate-400" />
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Profil & Hak Akses"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => setUserToDelete(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed"
                                  : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              }`}
                              title={
                                isSelf
                                  ? "Tidak dapat menghapus akun sendiri"
                                  : "Hapus Akun Anggota"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Smart Pagination (Separate Standalone Card) */}
      {filteredUsers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={[1, 15, 30, 50, 100, 250, 500]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Modals */}
      {isFormModalOpen && (
        <UserFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setUserToEdit(null);
          }}
          userToEdit={userToEdit}
          onSubmit={handleFormSubmit}
          isLoading={registerMutation.isPending || updateMutation.isPending}
        />
      )}

      {userToDelete && (
        <ConfirmModal
          isOpen={!!userToDelete}
          title="Hapus Akun Anggota Tim?"
          message={`Apakah Anda yakin ingin menghapus akun "${userToDelete.name}" (${userToDelete.email})? Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Hapus Akun"
          isDanger
          isLoading={deleteMutation.isPending}
          onConfirm={handleDeleteUser}
          onClose={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
}
