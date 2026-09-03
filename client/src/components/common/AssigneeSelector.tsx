import React, { useMemo } from "react";
import { Member } from "../../types";
import { Avatar } from "./Avatar";
import { 
  X, 
  Users, 
  ChevronRight, 
  Crown,
  Briefcase,
  UserCheck,
  Sparkles,
  Plus
} from "lucide-react";

interface AssigneeSelectorProps {
  members: Member[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  label?: string;
}

export function AssigneeSelector({
  members = [],
  selectedIds = [],
  onChange,
  disabled = false,
  isOpen = false,
  onToggleOpen,
  label = "Pelaksana Tugas yang Ditugaskan (Assignee)",
}: AssigneeSelectorProps) {
  const selectedMembers = useMemo(() => {
    return members.filter((m) => selectedIds.includes(m.id));
  }, [members, selectedIds]);

  const handleToggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 shrink-0">
            <Crown className="w-3 h-3 text-blue-600" />
            Owner
          </span>
        );
      case "pm":
      case "project_manager":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 shrink-0">
            <Briefcase className="w-3 h-3 text-purple-600" />
            PM
          </span>
        );
      case "karyawan":
      case "engineer":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 shrink-0">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            Karyawan
          </span>
        );
      case "magang":
      case "viewer":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-800 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Magang
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Header & Counter */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-600" />
          <span>{label}</span>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {selectedIds.length} personil ditugaskan
          </span>
        </label>

        {!disabled && selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Chips of Selected Assignees + Floating Side Window Trigger */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs min-h-[52px]">
        {selectedMembers.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl transition-colors shadow-2xs animate-in fade-in"
          >
            <Avatar name={m.name} color={m.avatar_color} size="xs" />
            <span className="font-bold text-slate-900">{m.name}</span>
            {getRoleBadge(m.role)}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleToggle(m.id)}
                className="hover:text-rose-600 p-0.5 ml-1 text-slate-400 hover:bg-white rounded-full transition-colors"
                title="Hapus penugasan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={onToggleOpen}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
              isOpen
                ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/30"
                : "bg-white hover:bg-blue-50 text-blue-600 border-blue-200 shadow-2xs hover:border-blue-300"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{selectedIds.length === 0 ? "Tugaskan Anggota" : "Tambah"}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-90 text-white" : "text-blue-400"}`} />
          </button>
        )}

        {selectedMembers.length === 0 && disabled && (
          <span className="text-xs text-slate-400 italic">Belum ada pelaksana yang ditugaskan.</span>
        )}
      </div>
    </div>
  );
}
