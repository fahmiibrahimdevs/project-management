import React, { useState, useMemo } from "react";
import { Project, Member } from "../../types";
import { Avatar } from "../common/Avatar";
import { ConfirmModal } from "../common/ConfirmModal";
import { useDeleteProject } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { 
  Users, 
  Layers, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  Briefcase, 
  Mail,
  UserCheck,
  Search,
  LayoutGrid,
  List
} from "lucide-react";
import { format } from "date-fns";

interface ProjectTeamTabProps {
  project: Project;
  onEditProject: () => void;
  onOpenPersonnelModal: () => void;
  onProjectDeleted: () => void;
}

export function ProjectTeamTab({
  project,
  onEditProject,
  onOpenPersonnelModal,
  onProjectDeleted,
}: ProjectTeamTabProps) {
  const { canEditProject } = useAuth();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteProject();

  // Search & Filter state for hundreds of members
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const members: Member[] = project.members || [];

  // Filtered members by search keyword & role
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchSearch =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.job_title && m.job_title.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q));

      const matchRole = selectedRole === "all" || m.role === selectedRole;
      return matchSearch && matchRole;
    });
  }, [members, search, selectedRole]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">Owner</span>;
      case "pm":
      case "project_manager":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">PM</span>;
      case "karyawan":
      case "engineer":
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-cyan-100 text-cyan-800 border border-cyan-200">Karyawan</span>;
      case "magang":
      case "viewer":
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-800 border border-amber-200">Magang</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Informasi & Parameter Proyek Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Informasi & Parameter Proyek
            </h3>
          </div>

          {canEditProject && (
            <button
              type="button"
              onClick={onEditProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ubah Parameter Proyek</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-1">Nama Proyek</span>
            <span className="font-bold text-slate-800 text-sm">{project.name}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-1">Kode / Key</span>
            <span className="font-mono font-bold text-blue-700">{project.code}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-1">Status Proyek</span>
            <span className="font-semibold text-slate-800 capitalize">
              {project.status.replace("_", " ")}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
            <span className="text-slate-400 block mb-1">Rentang Tanggal</span>
            <span className="font-semibold text-slate-800">
              {project.start_date || "TBD"} s/d {project.end_date || "Selesai"}
            </span>
          </div>
        </div>

        {project.description && (
          <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">Ringkasan Ruang Lingkup:</span>
            {project.description}
          </div>
        )}
      </div>

      {/* 2. Anggota Tim Proyek Card (Separated Dedicated Management) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-card space-y-4">
        {/* Header & Dedicated "Kelola Personil Proyek" Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Anggota Tim Proyek ({members.length} Personil)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daftar personil yang dialokasikan untuk mengerjakan proyek ini.
            </p>
          </div>

          {canEditProject && (
            <button
              type="button"
              onClick={onOpenPersonnelModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Kelola Personil Proyek</span>
            </button>
          )}
        </div>

        {/* 🔍 Search & Filter Toolbar for Large Teams */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Instant Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, jabatan, email..."
              className="w-full pl-9 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter Tabs & View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "all", label: `Semua (${members.length})` },
                { id: "karyawan", label: "Karyawan" },
                { id: "pm", label: "PM" },
                { id: "magang", label: "Magang" },
                { id: "owner", label: "Owner" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRole(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    selectedRole === tab.id
                      ? "bg-white text-blue-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Table vs Grid */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === "table" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
                }`}
                title="Tampilan Tabel Rapi"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === "grid" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Counter Info */}
        <div className="text-[11px] text-slate-500 font-medium px-0.5">
          Menampilkan {filteredMembers.length} dari {members.length} anggota tim
        </div>

        {/* Members Display: Table View vs Grid View */}
        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Tidak ada anggota tim yang cocok dengan filter pencarian "{search}".
          </div>
        ) : viewMode === "table" ? (
          /* 🗂️ COMPACT TABLE VIEW (Best for 50-200 members) */
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Nama Personil</th>
                  <th className="py-3 px-4">Peran / Role</th>
                  <th className="py-3 px-4">Spesialisasi / Jabatan</th>
                  <th className="py-3 px-4">Alamat Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} color={member.avatar_color} size="sm" />
                        <span className="font-bold text-slate-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getRoleBadge(member.role)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {member.job_title || member.role}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {member.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* 👥 VISUAL GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-96 overflow-y-auto p-0.5">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-all flex items-start gap-3.5 shadow-2xs"
              >
                <Avatar name={member.name} color={member.avatar_color} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                    {getRoleBadge(member.role)}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-1">
                    <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{member.job_title || member.role}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate font-mono">{member.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone (Owner only) */}
      {canEditProject && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Zona Bahaya</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Menghapus proyek ini akan menghapus seluruh task kanban, kriteria, komentar, lampiran, data BOM, dan catatan log permasalahan yang terkait secara permanen.
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Seluruh Proyek</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate(project.id, {
            onSuccess: () => {
              setIsDeleteOpen(false);
              onProjectDeleted();
            },
          });
        }}
        title="Konfirmasi Hapus Proyek"
        message={`Apakah Anda yakin ingin menghapus proyek "${project.name}" (${project.code}) beserta seluruh task, BOM, dan log permasalahan di dalamnya? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
