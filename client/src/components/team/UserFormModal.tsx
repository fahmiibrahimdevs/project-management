import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { User, UserRole } from "../../types";
import { 
  UserPlus, 
  Shield, 
  Briefcase, 
  Mail, 
  Lock, 
  CheckCircle, 
  Crown,
  UserCheck,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  Building2,
  User as UserIcon
} from "lucide-react";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
  onSubmit: (data: {
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
  }) => void;
  isLoading: boolean;
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

export function UserFormModal({
  isOpen,
  onClose,
  userToEdit,
  onSubmit,
  isLoading,
}: UserFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("1");
  const [role, setRole] = useState<UserRole>("karyawan");
  const [jobTitle, setJobTitle] = useState("Karyawan");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Laki-laki");
  const [address, setAddress] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setEmail(userToEdit.email || "");
      setPassword(""); // Blank means don't change password
      setRole(userToEdit.role);
      setJobTitle(userToEdit.job_title || "");
      setDepartment(userToEdit.department || "");
      setPhone(userToEdit.phone || "");
      setGender(userToEdit.gender || "Laki-laki");
      setAddress(userToEdit.address || "");
      setJoinDate(userToEdit.join_date || "");
      setEndDate(userToEdit.end_date || "");
      setAvatarColor(userToEdit.avatar_color || AVATAR_COLORS[0]);
      setIsActive(userToEdit.is_active !== 0);
    } else {
      setName("");
      setEmail("");
      setPassword("1");
      setRole("karyawan");
      setJobTitle("Karyawan");
      setDepartment("Engineering & Robotics");
      setPhone("");
      setGender("Laki-laki");
      setAddress("");
      setJoinDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setAvatarColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
      setIsActive(true);
    }
  }, [userToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onSubmit({
      id: userToEdit?.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim() ? password.trim() : userToEdit ? undefined : "1",
      role,
      job_title: jobTitle.trim() || (role === "owner" ? "Owner" : role === "pm" ? "Project Manager" : role === "magang" ? "Magang" : "Karyawan"),
      department: department.trim(),
      phone: phone.trim(),
      gender: gender.trim(),
      address: address.trim(),
      join_date: joinDate || undefined,
      end_date: endDate || undefined,
      avatar_color: avatarColor,
      is_active: isActive ? 1 : 0,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userToEdit ? "Edit Data Anggota Tim" : "Tambah Anggota Tim Baru"}
      subtitle={
        userToEdit
          ? `Perbarui informasi profil dan hak akses untuk ${userToEdit.name}`
          : "Daftarkan anggota tim baru ke dalam sistem FSI (Fortunet Solusi Indonesia)"
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Email */}
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
                placeholder="Contoh: Rian Pratama"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Email Akun (Login) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@fsi.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Password & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              {userToEdit ? "Ganti Password (Opsional)" : "Password Awal"}
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={userToEdit ? "Kosongkan jika tidak diubah" : "Default: 1"}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            {!userToEdit && (
              <p className="text-[10px] text-slate-400">Password default diset: <strong>1</strong></p>
            )}
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

        {/* Job Title & Department */}
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
                placeholder="Contoh: Hardware Engineer"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                placeholder="Contoh: Robotics & AI"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Contact: Phone & Dates */}
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
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
              placeholder="Alamat lengkap domisili anggota..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Role Selection with RBAC Description */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Pilih Hak Akses (Role RBAC)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Owner */}
            <div
              onClick={() => setRole("owner")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                role === "owner"
                  ? "bg-blue-50 border-blue-400 ring-2 ring-blue-400/20 shadow-xs"
                  : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-blue-600" />
                  Owner
                </span>
                {role === "owner" && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Akses penuh: Buat proyek, kelola BOM & issue, dan Manajemen Hak Akses Tim.
              </p>
            </div>

            {/* 2. Project Manager */}
            <div
              onClick={() => setRole("pm")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                role === "pm"
                  ? "bg-purple-50 border-purple-400 ring-2 ring-purple-400/20 shadow-xs"
                  : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  Project Manager (PM)
                </span>
                {role === "pm" && <CheckCircle className="w-3.5 h-3.5 text-purple-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Kelola proyek: CRUD task, geser status kanban, alokasi tim, BOM, dan RCA.
              </p>
            </div>

            {/* 3. Karyawan */}
            <div
              onClick={() => setRole("karyawan")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                role === "karyawan"
                  ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs"
                  : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Karyawan (Engineer)
                </span>
                {role === "karyawan" && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Fokus pengerjaan: Hanya melihat & mengupdate task yang ditugaskan (*Assignee*).
              </p>
            </div>

            {/* 4. Magang */}
            <div
              onClick={() => setRole("magang")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                role === "magang"
                  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                  : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Magang (Intern)
                </span>
                {role === "magang" && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Akses terbatas: Mengerjakan task penugasan dan checklist kriteria penerimaan.
              </p>
            </div>
          </div>
        </div>

        {/* Avatar Color & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Warna Profil Avatar</label>
            <div className="flex items-center gap-2 pt-0.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-all ${
                    avatarColor === c ? "ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-xs" : "opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="text-xs font-semibold text-slate-700">Status Akun</label>
            <div className="flex items-center gap-2 pt-0.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-medium text-slate-700">
                  {isActive ? "Akun Aktif (Dapat Login)" : "Nonaktif (Login Diblokir)"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            {isLoading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>{userToEdit ? "Simpan Perubahan" : "Daftarkan Anggota"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
