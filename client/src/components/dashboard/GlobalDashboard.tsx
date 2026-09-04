import React, { useState, useMemo } from "react";
import { Project, Task, Member, IssueLog } from "../../types";
import { Avatar } from "../common/Avatar";
import { PriorityBadge, SeverityBadge } from "../common/Badge";
import {
  FolderKanban,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Search,
  Filter,
  Package,
  Layers,
  Sparkles,
  BarChart3,
  Flame,
  CheckSquare,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface GlobalDashboardProps {
  projects: Project[];
  members: Member[];
  onSelectProject: (projectId: string, tab?: "kanban" | "list" | "bom" | "issues" | "team") => void;
  onOpenCreateProject: () => void;
  onOpenCreateTask: (projectId: string) => void;
}

export function GlobalDashboard({
  projects,
  members,
  onSelectProject,
  onOpenCreateProject,
  onOpenCreateTask,
}: GlobalDashboardProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Global Aggregate Statistics (Option B: Backlog excluded from progress)
  const totalProjects = projects.length;
  const activeProjectsCount = projects.filter((p) => p.status === "active").length;
  const completedProjectsCount = projects.filter((p) => p.status === "completed").length;

  const totalAllTasks = projects.reduce((sum, p) => sum + (p.total_tasks || 0), 0);
  const totalAllActiveTasks = projects.reduce(
    (sum, p) => sum + (p.active_tasks ?? (p.total_tasks ? p.total_tasks - (p.backlog_tasks || 0) : 0)),
    0
  );
  const totalCompletedTasks = projects.reduce((sum, p) => sum + (p.completed_tasks || 0), 0);
  const totalBacklogTasks = projects.reduce((sum, p) => sum + (p.backlog_tasks || 0), 0);

  const totalAllCriteria = projects.reduce((sum, p) => sum + (p.total_criteria || 0), 0);
  const totalCompletedCriteria = projects.reduce((sum, p) => sum + (p.completed_criteria || 0), 0);

  // Calculate overall progress from acceptance criteria checklist, fallback to tasks if no criteria
  const overallProgress = totalAllCriteria > 0 
    ? Math.round((totalCompletedCriteria / totalAllCriteria) * 100)
    : totalAllActiveTasks > 0 
    ? Math.round((totalCompletedTasks / totalAllActiveTasks) * 100) 
    : 0;

  const totalAllBOMCost = projects.reduce((sum, p) => sum + (p.total_bom_cost || 0), 0);
  const totalOpenIssues = projects.reduce((sum, p) => sum + (p.open_issues_count || 0), 0);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "all" || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Global Overview Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard Portfolio & Pemantauan Seluruh Proyek</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Ringkasan Kinerja & Status Seluruh Proyek
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Pantau akumulasi progres kriteria acceptance task, alokasi anggaran komponen (BOM), dan penanganan kendala teknis di semua lini proyek.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Proyek Baru</span>
            </button>
          </div>
        </div>

        {/* Global KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          {/* 1. Global Task Progress (Acceptance Criteria Checklist) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-semibold flex items-center gap-1.5 text-blue-700">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Rata-rata Progres Kriteria
              </span>
              <span className="font-bold text-slate-900 text-sm">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              {totalAllCriteria > 0 ? (
                <>
                  <span>{totalCompletedCriteria} dari {totalAllCriteria} kriteria selesai</span>
                  <span className="text-slate-400 font-medium">({totalCompletedTasks}/{totalAllActiveTasks} task)</span>
                </>
              ) : (
                <>
                  <span>{totalCompletedTasks} dari {totalAllActiveTasks} aktif selesai</span>
                  <span className="text-slate-400 font-medium">({totalBacklogTasks} perencanaan)</span>
                </>
              )}
            </div>
          </div>

          {/* 2. Total Projects Overview (🟢 Emerald) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-emerald-700">
                <Layers className="w-4 h-4 text-emerald-600" />
                Total Portofolio Proyek
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {totalProjects} Proyek
              </span>
            </div>
            <div className="flex items-center gap-2 my-1">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">{activeProjectsCount}</span>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Aktif Berjalan
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>{completedProjectsCount} Proyek Selesai</span>
              <span>{totalProjects - activeProjectsCount - completedProjectsCount} Lainnya</span>
            </div>
          </div>

          {/* 3. Global BOM Cost (🟠 Amber) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-amber-700">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Total Anggaran Seluruh BOM
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight truncate my-1">
              {formatIDR(totalAllBOMCost)}
            </div>
            <div className="text-[11px] text-slate-500">
              Akumulasi biaya part & pengadaan hardware
            </div>
          </div>

          {/* 4. Global Open Issues (🔴 Rose / Red) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Kendala Teknis Terbuka
              </span>
              {totalOpenIssues > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  {totalOpenIssues} Terbuka
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  Semua Clear
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 my-1">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">{totalOpenIssues}</span>
              <span className="text-xs text-slate-500">Issue RCA Aktif</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Root cause analysis sedang diinvestigasi
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau kode proyek..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Status Proyek</option>
              <option value="active">Active (Sedang Berjalan)</option>
              <option value="planning">Planning (Perencanaan)</option>
              <option value="on_hold">On Hold (Ditunda)</option>
              <option value="completed">Completed (Selesai)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan {filteredProjects.length} dari {projects.length} proyek
        </div>
      </div>

      {/* Project Cards Grid (3 Columns on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const totalTasks = project.total_tasks || 0;
          const activeTasks = project.active_tasks ?? (project.total_tasks ? project.total_tasks - (project.backlog_tasks || 0) : 0);
          const completedTasks = project.completed_tasks || 0;
          const backlogTasks = project.backlog_tasks || 0;
          const totalCriteria = project.total_criteria || 0;
          const completedCriteria = project.completed_criteria || 0;

          // Progress calculated from acceptance criteria checklist, fallback to tasks if no criteria
          const progressPercent = totalCriteria > 0 
            ? Math.round((completedCriteria / totalCriteria) * 100)
            : activeTasks > 0 
            ? Math.round((completedTasks / activeTasks) * 100) 
            : 0;

          const bomCost = project.total_bom_cost || 0;
          const openIssues = project.open_issues_count || 0;

          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between space-y-4 group"
            >
              {/* Header: Code, Name, Status */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
                        {project.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-md capitalize border ${
                          project.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : project.status === "completed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : project.status === "on_hold"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {project.status.replace("_", " ")}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectProject(project.id, "kanban")}
                      className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer leading-snug pt-0.5"
                    >
                      {project.name}
                    </h3>
                  </div>

                  {/* Sisa Waktu / Date range */}
                  {(project.start_date || project.end_date) && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>
                        {project.start_date ? format(new Date(project.start_date), "dd MMM") : "TBD"} -{" "}
                        {project.end_date ? format(new Date(project.end_date), "dd MMM yyyy") : "Selesai"}
                      </span>
                    </div>
                  )}
                </div>

                {project.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Progress & Stats Bar */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      Progres Kriteria Checklist
                    </span>
                    <span className="font-bold text-slate-900">{progressPercent}%</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    {totalCriteria > 0 ? (
                      <>
                        <span>{completedCriteria} dari {totalCriteria} kriteria selesai</span>
                        <span className="text-slate-400 font-medium">({completedTasks}/{activeTasks} task)</span>
                      </>
                    ) : (
                      <>
                        <span>{completedTasks} dari {activeTasks} aktif selesai</span>
                        <span className="text-slate-400 font-medium">({backlogTasks} perencanaan)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub Metrics: BOM Cost, Issues, Team Avatars */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  {/* BOM Total */}
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      BOM Biaya
                    </span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                      {formatIDR(bomCost)}
                    </span>
                  </div>

                  {/* Open Issues */}
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      Issue Log
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-slate-800 text-xs">{openIssues} Masalah</span>
                      {openIssues > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </div>
                  </div>

                  {/* Team Members Allocation */}
                  <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Users className="w-3 h-3 text-purple-600" />
                      Personil
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-bold text-slate-800 text-xs">
                        {(project.members?.length ?? project.member_count) || 0} Anggota
                      </span>
                      {project.members && project.members.length > 0 && (
                        <div className="flex items-center -space-x-1">
                          {project.members.slice(0, 2).map((m) => (
                            <Avatar key={m.id} name={m.name} color={m.avatar_color} size="xs" className="w-4 h-4 text-[8px]" />
                          ))}
                          {project.members.length > 2 && (
                            <span className="text-[9px] text-slate-500 font-bold ml-1">
                              +{project.members.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Action Navigation Links */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id, "kanban")}
                    className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    Kanban
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id, "bom")}
                    className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    BOM
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id, "issues")}
                    className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    Log Masalah
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectProject(project.id, "kanban")}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Buka Proyek</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
