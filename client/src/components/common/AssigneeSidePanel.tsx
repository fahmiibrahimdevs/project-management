import React, { useState, useRef, useEffect, useMemo } from "react";
import { Member } from "../../types";
import { Avatar } from "./Avatar";
import { useDebounce } from "../../hooks/useDebounce";
import { 
  Search, 
  X, 
  Check, 
  Users, 
  UserPlus, 
  Crown,
  Briefcase,
  UserCheck,
  Sparkles,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Pin
} from "lucide-react";

interface AssigneeSidePanelProps {
  members: Member[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  onClose: () => void;
}

const INITIAL_LIMIT = 5;
const LOAD_MORE_STEP = 5;

export function AssigneeSidePanel({
  members = [],
  selectedIds = [],
  onChange,
  onClose,
}: AssigneeSidePanelProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto focus search input on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Reset pagination limit when search keyword or role filter changes
  useEffect(() => {
    setVisibleLimit(INITIAL_LIMIT);
  }, [debouncedSearch, selectedRole]);

  // Role counts for category tree tabs
  const roleCounts = useMemo(() => {
    return {
      all: members.length,
      karyawan: members.filter((m) => m.role === "karyawan" || (m.role as any) === "engineer").length,
      pm: members.filter((m) => m.role === "pm" || (m.role as any) === "project_manager").length,
      magang: members.filter((m) => m.role === "magang" || (m.role as any) === "viewer").length,
      owner: members.filter((m) => m.role === "owner").length,
    };
  }, [members]);

  // Filter members by debounced search keyword and role
  const filteredMembers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return members.filter((m) => {
      const matchSearch =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.job_title && m.job_title.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q));

      let matchRole = true;
      if (selectedRole === "karyawan") {
        matchRole = m.role === "karyawan" || (m.role as any) === "engineer";
      } else if (selectedRole === "pm") {
        matchRole = m.role === "pm" || (m.role as any) === "project_manager";
      } else if (selectedRole === "magang") {
        matchRole = m.role === "magang" || (m.role as any) === "viewer";
      } else if (selectedRole === "owner") {
        matchRole = m.role === "owner";
      }

      return matchSearch && matchRole;
    });
  }, [members, debouncedSearch, selectedRole]);

  // 📌 1. SELECTED FIRST (PINNED AT TOP) SORTING LOGIC
  const sortedMembers = useMemo(() => {
    const selected: Member[] = [];
    const unselected: Member[] = [];

    for (const m of filteredMembers) {
      if (selectedIds.includes(m.id)) {
        selected.push(m);
      } else {
        unselected.push(m);
      }
    }

    selected.sort((a, b) => a.name.localeCompare(b.name));
    unselected.sort((a, b) => a.name.localeCompare(b.name));

    return [...selected, ...unselected];
  }, [filteredMembers, selectedIds]);

  // 🔄 2. PROGRESSIVE LOAD MORE (BATCH OF 15)
  const visibleMembers = useMemo(() => {
    return sortedMembers.slice(0, visibleLimit);
  }, [sortedMembers, visibleLimit]);

  const hasMore = sortedMembers.length > visibleLimit;
  const remainingCount = sortedMembers.length - visibleLimit;

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMembers.map((m) => m.id);
    const allFilteredSelected = filteredIds.every((id) => selectedIds.includes(id));
    if (allFilteredSelected) {
      onChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
      onChange(combined);
    }
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

  const isAllFilteredSelected = filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.includes(m.id));
  const selectedInFilteredCount = filteredMembers.filter((m) => selectedIds.includes(m.id)).length;

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Pilih Pelaksana Tugas
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Floating side window penugasan tim
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
          title="Tutup Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Search Bar with Debounce */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, divisi, jabatan..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

        {/* Tree / Category Segmented Filter Tabs (Clean Scroll Without Scrollbar Line) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "Semua", count: roleCounts.all },
            { id: "karyawan", label: "Karyawan", count: roleCounts.karyawan },
            { id: "pm", label: "PM", count: roleCounts.pm },
            { id: "magang", label: "Magang", count: roleCounts.magang },
            { id: "owner", label: "Owner", count: roleCounts.owner },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRole(tab.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedRole === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedRole === tab.id ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Subheader: Results count & Select all toggle */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>{filteredMembers.length} personil ditemukan</span>
            {selectedInFilteredCount > 0 && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                {selectedInFilteredCount} terpilih
              </span>
            )}
          </div>
          {filteredMembers.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isAllFilteredSelected ? "Batal Pilih Semua" : `Pilih Semua (${filteredMembers.length})`}</span>
            </button>
          )}
        </div>

        {/* 👥 Rich Member Cards List (Pinned Selected First + Load More) */}
        <div className="space-y-2">
          {sortedMembers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <span>Tidak ada anggota tim yang cocok dengan filter.</span>
            </div>
          ) : (
            visibleMembers.map((m) => {
              const isChecked = selectedIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => handleToggle(m.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? "bg-blue-50/90 border-blue-400 text-blue-900 shadow-xs ring-2 ring-blue-400/20"
                      : "bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <Avatar name={m.name} color={m.avatar_color} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {m.name}
                        </span>
                        {getRoleBadge(m.role)}
                        {isChecked && (
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-100/80 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 fill-blue-600" />
                            Terpilih
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium flex items-center gap-1.5">
                        <span>{m.job_title || m.email}</span>
                        {m.department && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 truncate">{m.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Smooth Animated Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ml-2 ${
                      isChecked
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}

          {/* 🔄 LOAD MORE CONTROLS */}
          {hasMore && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + LOAD_MORE_STEP)}
                className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-600 font-semibold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-2xs group"
              >
                <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform text-blue-500" />
                <span>
                  Muat Lebih Banyak (+{Math.min(remainingCount, LOAD_MORE_STEP)} Personil)
                </span>
              </button>
              <div className="text-center mt-1.5">
                <span className="text-[10px] text-slate-400">
                  Menampilkan {visibleMembers.length} dari {sortedMembers.length} personil
                </span>
              </div>
            </div>
          )}

          {/* Collapse option when expanded */}
          {visibleLimit > INITIAL_LIMIT && sortedMembers.length > INITIAL_LIMIT && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setVisibleLimit(INITIAL_LIMIT)}
                className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium text-[11px] rounded-xl transition-all flex items-center justify-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Sembunyikan ({INITIAL_LIMIT} pertama)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-xs font-bold text-slate-800">
            {selectedIds.length} personil terpilih
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}
