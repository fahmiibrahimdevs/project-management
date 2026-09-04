import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../common/Modal";
import { Project, Member } from "../../types";
import { useUpdateProject } from "../../api/client";
import { notifySuccess, notifyError } from "../../utils/swal";
import { Avatar } from "../common/Avatar";
import { 
  Users, 
  Search, 
  Check, 
  X, 
  UserPlus, 
  CheckCheck, 
  RotateCcw,
  Shield,
  Briefcase,
  Mail
} from "lucide-react";

interface ProjectPersonnelModalProps {
  isOpen: boolean;
  project: Project | null;
  allMembers: Member[];
  onClose: () => void;
}

export function ProjectPersonnelModal({
  isOpen,
  project,
  allMembers = [],
  onClose,
}: ProjectPersonnelModalProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const updateMutation = useUpdateProject();

  useEffect(() => {
    if (project && isOpen) {
      setSelectedMemberIds(project.members?.map((m) => m.id) || []);
      setSearch("");
      setRoleFilter("all");
    }
  }, [project, isOpen]);

  // Filter members by keyword & role
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMembers.filter((m) => {
      const matchSearch =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.job_title && m.job_title.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q));

      const matchRole = roleFilter === "all" || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [allMembers, search, roleFilter]);

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMembers.map((m) => m.id);
    const combined = Array.from(new Set([...selectedMemberIds, ...filteredIds]));
    setSelectedMemberIds(combined);
  };

  const handleClearAll = () => {
    setSelectedMemberIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    updateMutation.mutate(
      {
        id: project.id,
        data: {
          member_ids: selectedMemberIds,
        } as any,
      },
      {
        onSuccess: () => {
          notifySuccess("Personil Diperbarui", "Daftar personil proyek berhasil disimpan.");
          onClose();
        },
        onError: (err: any) => {
          notifyError("Gagal Memperbarui Personil", err.message || "Terjadi kesalahan saat menyimpan personil proyek.");
        },
      }
    );
  };

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

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Personil & Tim Proyek"
      subtitle={`Alokasi anggota tim yang berhak bertugas dan berkolaborasi pada proyek "${project.name}" (${project.code})`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Summary & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {selectedMemberIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">
                {selectedMemberIds.length} Personil Dialokasikan
              </p>
              <p className="text-[11px] text-blue-800/80">
                dari total {allMembers.length} anggota tim yang terdaftar di organisasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl shadow-2xs transition-colors"
            >
              Pilih Semua Hasil ({filteredMembers.length})
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl shadow-2xs transition-colors"
            >
              Kosongkan
            </button>
          </div>
        </div>

        {/* 🔍 Search Bar & Role Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama personil, spesialisasi jabatan, email..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
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

          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: "all", label: `Semua (${allMembers.length})` },
              { id: "karyawan", label: "Karyawan" },
              { id: "pm", label: "PM" },
              { id: "magang", label: "Magang" },
              { id: "owner", label: "Owner" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                  roleFilter === tab.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members Grid (Spacious 2-column cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto p-1.5 bg-slate-50/60 rounded-2xl border border-slate-200/90">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              Tidak ada personil yang cocok dengan pencarian "{search}".
            </div>
          ) : (
            filteredMembers.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    isSelected
                      ? "bg-blue-50/90 border-blue-400 text-blue-950 shadow-2xs ring-1 ring-blue-300"
                      : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Avatar name={m.name} color={m.avatar_color} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {m.name}
                        </span>
                        {getRoleBadge(m.role)}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {m.job_title || m.role} • <span className="font-mono text-slate-400">{m.email}</span>
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ml-2 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
          >
            {updateMutation.isPending ? "Menyimpan Personil..." : "Simpan Personil Proyek"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
