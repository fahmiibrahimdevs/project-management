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
  List,
  Calendar,
  CheckCircle2,
  BarChart3,
  ChevronUp,
  ChevronDown,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface ProjectTeamTabProps {
  project: Project;
  canEditProject?: boolean;
  onEditProject: () => void;
  onOpenPersonnelModal: () => void;
  onProjectDeleted: () => void;
}

export function ProjectTeamTab({
  project,
  canEditProject: canEditProjectProp,
  onEditProject,
  onOpenPersonnelModal,
  onProjectDeleted,
}: ProjectTeamTabProps) {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const isProjectPM = isOwner || (user?.role === "pm" && (project.members || []).some((m) => m.id === user?.id));
  const canEditProject = canEditProjectProp !== undefined ? canEditProjectProp : isProjectPM;

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteMutation = useDeleteProject();

  // Search & Filter state for hundreds of members
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const members: Member[] = project.members || [];

  // Analytics calculations for ProjectTeamTab
  const teamAnalytics = useMemo(() => {
    const total = members.length;
    const owners = members.filter((m) => m.role === "owner").length;
    const pms = members.filter((m) => m.role === "pm" || m.role === "project_manager").length;
    const karyawans = members.filter((m) => m.role === "karyawan" || m.role === "engineer").length;
    const magangs = members.filter((m) => m.role === "magang" || m.role === "viewer").length;

    const roleSegments = [
      { key: "owner", label: "Owner", count: owners, color: "#0ea5e9" },
      { key: "pm", label: "Project Manager", count: pms, color: "#8b5cf6" },
      { key: "karyawan", label: "Karyawan / Engineer", count: karyawans, color: "#06b6d4" },
      { key: "magang", label: "Magang / Viewer", count: magangs, color: "#f59e0b" },
    ];

    const circumference = 2 * Math.PI * 56;
    let accumulatedOffset = 0;
    const donutSlices = roleSegments.map((seg) => {
      const percentage = total > 0 ? (seg.count / total) * 100 : 0;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += (percentage / 100) * circumference;
      return {
        ...seg,
        percentage: Math.round(percentage),
        strokeDasharray,
        strokeDashoffset,
      };
    });

    // Job Title Breakdown
    const jobTitleCounts: Record<string, number> = {};
    members.forEach((m) => {
      const title = m.job_title || (m.role ? m.role.toUpperCase() : "Anggota");
      jobTitleCounts[title] = (jobTitleCounts[title] || 0) + 1;
    });
    const topJobTitles = Object.entries(jobTitleCounts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      owners,
      pms,
      karyawans,
      magangs,
      donutSlices,
      topJobTitles,
    };
  }, [members]);

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
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Informasi Proyek & Struktur Tim
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Rincian parameter proyek, jadwal pengerjaan, serta pembagian peran dan tanggung jawab anggota tim proyek.
        </p>
      </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Nama Proyek */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-blue-700 truncate">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                Nama Proyek
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight truncate my-0.5" title={project.name}>
              {project.name}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Nama inisiatif & judul proyek
            </div>
          </div>

          {/* 2. Kode / Key */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-blue-700 truncate">
                <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                Kode / Key
              </span>
            </div>
            <div className="text-xl font-mono font-extrabold text-blue-600 tracking-tight my-0.5">
              {project.code}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Identifier unik sistem
            </div>
          </div>

          {/* 3. Status Proyek */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Status Proyek
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize border ${
                project.status === "active"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : project.status === "completed"
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : project.status === "on_hold"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {project.status.replace("_", " ")}
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight capitalize my-0.5">
              {project.status.replace("_", " ")}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Tahapan siklus pengerjaan
            </div>
          </div>

          {/* 4. Rentang Tanggal */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                Rentang Tanggal
              </span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate my-0.5">
              {project.start_date || "TBD"} &mdash; {project.end_date || "Selesai"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Periode timeline target pengerjaan
            </div>
          </div>
        </div>

        {project.description && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1 text-xs">Ringkasan Ruang Lingkup:</span>
            <p className="text-slate-600 leading-relaxed">{project.description}</p>
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                showAnalytics
                  ? "bg-sky-50 text-sky-700 border-sky-300 shadow-2xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 shadow-2xs"
              }`}
              title="Tampilkan / Sembunyikan visualisasi grafik alokasi personil tim"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${showAnalytics ? "text-sky-600" : "text-slate-500"}`} />
              <span>Grafik Tim</span>
              {showAnalytics ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {canEditProject && (
              <button
                type="button"
                onClick={onOpenPersonnelModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Kelola Personil Proyek</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Analytics Charts Panel */}
        {showAnalytics && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-100 rounded-lg text-sky-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Komposisi & Alokasi Peran Personil Tim
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Distribusi hierarki peran, jabatan keahlian, dan total keterlibatan personil
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600">
                  Total: <strong className="text-slate-900 font-mono font-bold">{teamAnalytics.total}</strong> Personil
                </span>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-800">Project Manager</div>
                <div className="text-2xl font-black font-mono text-purple-600 mt-1">
                  {teamAnalytics.pms}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Pengelola & koordinator
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-800">Karyawan / Engineer</div>
                <div className="text-2xl font-black font-mono text-sky-600 mt-1">
                  {teamAnalytics.karyawans}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Pelaksana utama proyek
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-800">Magang / Viewer</div>
                <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                  {teamAnalytics.magangs}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Personil magang & pemantau
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-800">Owner / Stakeholder</div>
                <div className="text-2xl font-black font-mono text-blue-600 mt-1">
                  {teamAnalytics.owners}
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Pemilik & pengawas proyek
                </div>
              </div>
            </div>

            {/* Charts Grid: Donut Role & Job Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* 1. Donut Chart Role Distribution */}
              <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <PieChartIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Distribusi Komposisi Peran Tim</span>
                </div>
                
                {teamAnalytics.total === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada anggota tim terdaftar</div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* SVG Donut */}
                    <div className="relative w-32 h-32 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                        <circle
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="18"
                        />
                        {teamAnalytics.donutSlices.map((slice) => (
                          <circle
                            key={slice.key}
                            cx="70"
                            cy="70"
                            r="56"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="18"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            className="transition-all duration-500 ease-out"
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black font-mono text-slate-900 leading-none">
                          {teamAnalytics.total}
                        </span>
                        <span className="text-[11px] text-slate-700 font-bold mt-0.5">Personil</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs flex-1 w-full">
                      {teamAnalytics.donutSlices.map((slice) => (
                        <div key={slice.key} className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="text-slate-800 font-medium truncate text-xs">{slice.label}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {slice.count} <span className="font-medium text-slate-600 text-[11px]">({slice.percentage}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Top Job Titles Breakdown */}
              <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sebaran Jabatan & Keahlian Personil</span>
                </div>

                {teamAnalytics.topJobTitles.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada data jabatan anggota</div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {teamAnalytics.topJobTitles.map((jt) => {
                      const maxCount = teamAnalytics.topJobTitles[0]?.count || 1;
                      const pct = Math.min(100, Math.round((jt.count / maxCount) * 100));
                      return (
                        <div key={jt.title} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 truncate">{jt.title}</span>
                            <span className="font-mono text-slate-900 font-bold text-xs">
                              {jt.count} orang <span className="font-medium text-slate-600 text-[11px]">({Math.round((jt.count / teamAnalytics.total) * 100)}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 transition-all duration-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
              className="w-full pl-9 pr-7 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 placeholder:text-slate-400 shadow-2xs transition-colors"
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
