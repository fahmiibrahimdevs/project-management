import React, { useState, useMemo } from "react";
import { Member, UserRole } from "../../types";
import { Avatar } from "./Avatar";
import { Search, X, Check, Users, Filter, CheckSquare, Square } from "lucide-react";

interface MultiAssigneePickerProps {
  members: Member[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  disabled?: boolean;
  maxHeight?: string;
  label?: string;
}

export function MultiAssigneePicker({
  members = [],
  selectedIds = [],
  onChange,
  disabled = false,
  maxHeight = "max-h-56",
  label = "Pilih Pelaksana Tugas (Assignee)",
}: MultiAssigneePickerProps) {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Filter members by search keyword and role
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

  const handleSelectAllFiltered = () => {
    if (disabled) return;
    const filteredIds = filteredMembers.map((m) => m.id);
    const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
    onChange(combined);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90">
      {/* Header with Selected Counter & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-blue-600" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            {selectedIds.length} dari {members.length} personil terpilih
          </span>

          {!disabled && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
            >
              Kosongkan
            </button>
          )}
        </div>
      </div>

      {/* Selected Members Badges Strip (Quick View & 1-Click Remove) */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs max-h-24 overflow-y-auto">
          {selectedMembers.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 text-xs font-medium bg-blue-50/90 text-blue-900 border border-blue-200 rounded-lg animate-in fade-in"
            >
              <Avatar name={m.name} color={m.avatar_color} size="xs" />
              <span className="truncate max-w-[120px] font-semibold">{m.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleToggle(m.id)}
                  className="p-0.5 hover:text-rose-600 rounded-full hover:bg-blue-100 transition-colors"
                  title="Hapus penugasan"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search Bar & Role Filter for Hundreds of Members */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Instant Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            disabled={disabled}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, jabatan, email..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
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

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {[
            { id: "all", label: "Semua" },
            { id: "karyawan", label: "Karyawan" },
            { id: "pm", label: "PM" },
            { id: "magang", label: "Magang" },
            { id: "owner", label: "Owner" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRole(tab.id)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedRole === tab.id
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Select All Search Results */}
      {!disabled && filteredMembers.length > 0 && (search || selectedRole !== "all") && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>Ditemukan {filteredMembers.length} anggota</span>
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="text-blue-600 hover:underline font-semibold"
          >
            Pilih semua hasil ({filteredMembers.length})
          </button>
        </div>
      )}

      {/* Scrollable Members List */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${maxHeight} overflow-y-auto pt-0.5 pr-0.5`}>
        {filteredMembers.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            Tidak ada anggota yang cocok dengan pencarian "{search}".
          </div>
        ) : (
          filteredMembers.map((m) => {
            const isChecked = selectedIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => handleToggle(m.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs select-none transition-all ${
                  disabled ? "cursor-default" : "cursor-pointer"
                } ${
                  isChecked
                    ? "bg-blue-50 border-blue-400 font-semibold text-blue-900 shadow-2xs ring-1 ring-blue-300"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={m.name} color={m.avatar_color} size="sm" />
                  <div className="truncate">
                    <p className="text-xs font-bold truncate leading-tight">{m.name}</p>
                    <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                      {m.job_title || m.role} • <span className="font-mono text-slate-400">{m.email}</span>
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ml-2 ${
                    isChecked
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
