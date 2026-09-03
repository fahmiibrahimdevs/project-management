import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Member } from "../../types";
import { Avatar } from "../common/Avatar";
import { useCreateMember } from "../../api/client";
import { Users, Plus, Mail, Briefcase, UserCheck } from "lucide-react";

interface MemberModalProps {
  isOpen: boolean;
  members: Member[];
  onClose: () => void;
}

const AVATAR_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // rose
  "#4f46e5", // indigo
];

export function MemberModal({ isOpen, members, onClose }: MemberModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Software Engineer");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  const createMemberMutation = useCreateMember();

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role.trim()) return;

    createMemberMutation.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        avatar_color: avatarColor,
      },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setRole("Software Engineer");
          setIsAdding(false);
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manajemen Anggota Tim"
      subtitle="Daftar personil dan penanggung jawab yang dapat ditugaskan pada tugas dan proyek"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Toggle Form to Add Member */}
        {!isAdding ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Anggota Baru</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleAddMember}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Form Anggota Baru
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rian Pratama"
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Perusahaan</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rian.pratama@company.id"
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Peran / Jabatan</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Contoh: Automation Engineer"
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Warna Avatar</label>
                <div className="flex items-center gap-2 pt-1">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAvatarColor(col)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        avatarColor === col ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={createMemberMutation.isPending || !name.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                {createMemberMutation.isPending ? "Menyimpan..." : "Simpan Anggota"}
              </button>
            </div>
          </form>
        )}

        {/* Member List */}
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/70 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar name={member.name} color={member.avatar_color} size="md" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{member.name}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      {member.role}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {member.email}
                    </span>
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                Aktif
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
