import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Avatar } from "../common/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useUpdateProfile } from "../../api/auth";
import { notifySuccess, notifyError, notifyWarning } from "../../utils/swal";
import { 
  User as UserIcon, 
  Lock, 
  KeyRound, 
  Mail, 
  Briefcase, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Crown,
  UserCheck,
  Sparkles,
  Save,
  Phone,
  MapPin,
  Calendar,
  Building2
} from "lucide-react";

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_COLORS = [
  "#2563eb", // Blue
  "#7c3aed", // Purple
  "#0891b2", // Cyan
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Rose
  "#4f46e5", // Indigo
  "#db2777", // Pink
];

export function AccountSecurityModal({
  isOpen,
  onClose,
}: AccountSecurityModalProps) {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const updateProfileMutation = useUpdateProfile();

  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile Form States
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status Alerts
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (currentUser && isOpen) {
      setName(currentUser.name || "");
      setJobTitle(currentUser.job_title || "");
      setDepartment(currentUser.department || "");
      setPhone(currentUser.phone || "");
      setGender(currentUser.gender || "Laki-laki");
      setAddress(currentUser.address || "");
      setJoinDate(currentUser.join_date || "");
      setEndDate(currentUser.end_date || "");
      setAvatarColor(currentUser.avatar_color || AVATAR_COLORS[0]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("");
      setErrorMessage("");
    }
  }, [currentUser, isOpen]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!name.trim()) {
      notifyWarning("Validasi Gagal", "Nama lengkap tidak boleh kosong");
      setErrorMessage("Nama lengkap tidak boleh kosong");
      return;
    }

    updateProfileMutation.mutate(
      {
        name: name.trim(),
        job_title: jobTitle.trim(),
        department: department.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        address: address.trim(),
        join_date: joinDate || undefined,
        end_date: endDate || undefined,
        avatar_color: avatarColor,
      },
      {
        onSuccess: (res) => {
          if (res.user) {
            updateCurrentUser(res.user);
          }
          notifySuccess("Profil Diperbarui", "Perubahan profil akun Anda berhasil disimpan.");
          setSuccessMessage("Profil akun Anda berhasil diperbarui!");
          setTimeout(() => setSuccessMessage(""), 4000);
        },
        onError: (err: any) => {
          notifyError("Gagal Memperbarui Profil", err.message || "Terjadi kesalahan saat menyimpan profil");
          setErrorMessage(err.message || "Gagal memperbarui profil");
        },
      }
    );
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentPassword) {
      notifyWarning("Validasi Gagal", "Masukkan kata sandi saat ini");
      setErrorMessage("Masukkan kata sandi saat ini");
      return;
    }

    if (!newPassword || newPassword.length < 1) {
      notifyWarning("Validasi Gagal", "Kata sandi baru tidak boleh kosong");
      setErrorMessage("Kata sandi baru tidak boleh kosong");
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyWarning("Validasi Gagal", "Konfirmasi kata sandi baru tidak cocok");
      setErrorMessage("Konfirmasi kata sandi baru tidak cocok");
      return;
    }

    updateProfileMutation.mutate(
      {
        current_password: currentPassword,
        new_password: newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          notifySuccess("Kata Sandi Diperbarui", "Kata sandi akun Anda berhasil diubah. Gunakan kata sandi baru untuk login berikutnya.");
          setSuccessMessage("Kata sandi berhasil diubah! Gunakan kata sandi baru untuk login berikutnya.");
          setTimeout(() => setSuccessMessage(""), 5000);
        },
        onError: (err: any) => {
          notifyError("Gagal Mengubah Kata Sandi", err.message || "Kata sandi saat ini mungkin salah");
          setErrorMessage(err.message || "Gagal mengubah kata sandi");
        },
      }
    );
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <Crown className="w-3.5 h-3.5 text-blue-600" />
            Owner (Pimpinan)
          </span>
        );
      case "pm":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            <Briefcase className="w-3.5 h-3.5 text-purple-600" />
            Project Manager
          </span>
        );
      case "karyawan":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Karyawan
          </span>
        );
      case "magang":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Magang
          </span>
        );
      default:
        return <span className="text-xs text-slate-600">{role}</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keamanan & Akun"
      subtitle="Kelola data profil pengguna dan perbarui kata sandi akun resmi FSI Anda"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "profile"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profil Lengkap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("password");
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "password"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ganti Password</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: PROFIL LENGKAP PENGGUNA */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Avatar & Color Picker */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
              <Avatar
                name={name || currentUser?.name || "User"}
                color={avatarColor}
                size="lg"
                className="ring-4 ring-white shadow-md text-base"
              />
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <p className="text-xs font-bold text-slate-800">Warna Profil Avatar</p>
                <p className="text-[11px] text-slate-500">
                  Pilih warna identitas visual avatar yang tampil pada penugasan task dan komentar tim.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-all ${
                        avatarColor === c
                          ? "ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-xs"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Read-Only Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Email Akun Resmi</span>
                <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser?.email}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Peran & Hak Akses (RBAC)</span>
                <div className="mt-1">
                  {getRoleBadge(currentUser?.role)}
                </div>
              </div>
            </div>

            {/* Basic Info: Nama Lengkap & Jenis Kelamin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            {/* Position & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Jabatan / Posisi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Contoh: Lead Automation Engineer"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Departemen / Divisi
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Contoh: Engineering & Robotics"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact: Nomor Telepon & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nomor Telepon / WA
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Tanggal Bergabung
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Tanggal Selesai (Kontrak/Magang)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Alamat Tempat Tinggal
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap domisili saat ini..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {updateProfileMutation.isPending ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan Profil</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: GANTI PASSWORD */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Keamanan Akun FSI</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Gunakan kata sandi yang mudah Anda ingat namun aman. Anda akan menggunakan kata sandi baru untuk login berikutnya.
                </p>
              </div>
            </div>

            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Password Saat Ini <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini (Default: 1)"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password baru"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Konfirmasi Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Match Status indicator */}
            {newPassword && confirmPassword && (
              <div className="text-[11px] font-medium pt-0.5">
                {newPassword === confirmPassword ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Konfirmasi kata sandi cocok
                  </span>
                ) : (
                  <span className="text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Konfirmasi kata sandi belum sama
                  </span>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending || !newPassword || newPassword !== confirmPassword}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {updateProfileMutation.isPending ? (
                  <span>Mengubah...</span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Perbarui Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
