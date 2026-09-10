import React, { useState, useMemo } from "react";
import { Project, Member } from "../../types";
import { SearchableSelect } from "../common/SearchableSelect";
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  ArrowRight,
  Plus,
  Search,
  Filter,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  ShieldCheck,
  Activity,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface GlobalDashboardProps {
  projects: Project[];
  members: Member[];
  onSelectProject: (projectId: string, tab?: "kanban" | "list" | "bom" | "issues" | "team") => void;
  onOpenCreateProject: () => void;
  onOpenCreateTask: (projectId: string) => void;
}

type SortOption = "progress_desc" | "progress_asc" | "bom_desc" | "issues_desc" | "name_asc" | "created_desc";
type ConditionOption = "all" | "has_issues" | "clean_issues" | "has_bom" | "has_locations";

export function GlobalDashboard({
  projects,
  members,
  onSelectProject,
  onOpenCreateProject,
  onOpenCreateTask,
}: GlobalDashboardProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<ConditionOption>("all");
  const [sortOption, setSortOption] = useState<SortOption>("progress_desc");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Global Aggregate Statistics
  const totalProjects = projects.length;
  const activeProjectsCount = projects.filter((p) => p.status === "active").length;
  const completedProjectsCount = projects.filter((p) => p.status === "completed").length;
  const planningProjectsCount = projects.filter((p) => p.status === "planning").length;
  const onHoldProjectsCount = projects.filter((p) => p.status === "on_hold").length;

  const totalAllTasks = projects.reduce((sum, p) => sum + (Number(p.total_tasks) || 0), 0);
  const totalCompletedTasks = projects.reduce((sum, p) => sum + (Number(p.completed_tasks) || 0), 0);
  const totalInProgressTasks = projects.reduce((sum, p) => sum + (Number(p.in_progress_tasks) || 0), 0);
  const totalInReviewTasks = projects.reduce((sum, p) => sum + (Number(p.in_review_tasks) || 0), 0);
  const totalRevisionTasks = projects.reduce((sum, p) => sum + (Number(p.revision_tasks) || 0), 0);
  const totalOnHoldTasks = projects.reduce((sum, p) => sum + (Number(p.on_hold_tasks) || 0), 0);
  const totalBacklogTasks = projects.reduce((sum, p) => sum + (Number(p.backlog_tasks) || 0), 0);

  const totalAllCriteria = projects.reduce((sum, p) => sum + (Number(p.total_criteria) || 0), 0);
  const totalCompletedCriteria = projects.reduce((sum, p) => sum + (Number(p.completed_criteria) || 0), 0);

  const totalAllBOMCost = projects.reduce((sum, p) => sum + (Number(p.total_bom_cost) || 0), 0);
  const totalOpenIssues = projects.reduce((sum, p) => sum + (Number(p.open_issues_count) || 0), 0);

  const totalActiveTasks = totalAllTasks - totalBacklogTasks;
  const overallCriteriaRate = totalAllCriteria > 0 
    ? Math.round((totalCompletedCriteria / totalAllCriteria) * 100)
    : totalActiveTasks > 0 
    ? Math.round((totalCompletedTasks / totalActiveTasks) * 100) 
    : 0;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const query = search.trim().toLowerCase();
        const matchSearch =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query));

        const matchStatus = statusFilter === "all" || p.status === statusFilter;

        let matchCondition = true;
        if (conditionFilter === "has_issues") {
          matchCondition = (Number(p.open_issues_count) || 0) > 0;
        } else if (conditionFilter === "clean_issues") {
          matchCondition = (Number(p.open_issues_count) || 0) === 0;
        } else if (conditionFilter === "has_bom") {
          matchCondition = (Number(p.total_bom_cost) || 0) > 0;
        } else if (conditionFilter === "has_locations") {
          matchCondition = (Number(p.location_count) || 0) > 0;
        }

        return matchSearch && matchStatus && matchCondition;
      })
      .sort((a, b) => {
        const getProgress = (p: Project) => {
          const totCrit = Number(p.total_criteria) || 0;
          const compCrit = Number(p.completed_criteria) || 0;
          const actTasks = Number(p.active_tasks) || (Number(p.total_tasks) || 0) - (Number(p.backlog_tasks) || 0);
          const compTasks = Number(p.completed_tasks) || 0;
          if (totCrit > 0) return (compCrit / totCrit) * 100;
          if (actTasks > 0) return (compTasks / actTasks) * 100;
          return 0;
        };

        switch (sortOption) {
          case "progress_desc":
            return getProgress(b) - getProgress(a);
          case "progress_asc":
            return getProgress(a) - getProgress(b);
          case "bom_desc":
            return (Number(b.total_bom_cost) || 0) - (Number(a.total_bom_cost) || 0);
          case "issues_desc":
            return (Number(b.open_issues_count) || 0) - (Number(a.open_issues_count) || 0);
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "created_desc":
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [projects, search, statusFilter, conditionFilter, sortOption]);

  // Donut Chart Segments
  const donutSegments = useMemo(() => {
    const rawData = [
      { key: "completed", label: "Selesai (Completed)", count: totalCompletedTasks, color: "#10b981", textClass: "text-emerald-500" },
      { key: "in_progress", label: "Sedang Dikerjakan", count: totalInProgressTasks, color: "#0ea5e9", textClass: "text-sky-500" },
      { key: "in_review", label: "Review Penerimaan", count: totalInReviewTasks, color: "#6366f1", textClass: "text-indigo-500" },
      { key: "revision", label: "Perlu Revisi", count: totalRevisionTasks, color: "#f59e0b", textClass: "text-amber-500" },
      { key: "on_hold", label: "Ditunda (On Hold)", count: totalOnHoldTasks, color: "#94a3b8", textClass: "text-slate-400" },
      { key: "backlog", label: "Backlog / Rencana", count: totalBacklogTasks, color: "#cbd5e1", textClass: "text-slate-400" },
    ];

    const total = rawData.reduce((acc, curr) => acc + curr.count, 0);
    const radius = 56;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPercentage = 0;
    return rawData.map((item) => {
      const percentage = total > 0 ? (item.count / total) * 100 : 0;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);
      accumulatedPercentage += percentage;

      return {
        ...item,
        percentage: Math.round(percentage * 10) / 10,
        strokeDasharray,
        strokeDashoffset,
        circumference,
      };
    });
  }, [
    totalCompletedTasks,
    totalInProgressTasks,
    totalInReviewTasks,
    totalRevisionTasks,
    totalOnHoldTasks,
    totalBacklogTasks,
  ]);

  // Project Progress Ranking Data
  const rankedProjects = useMemo(() => {
    return [...projects]
      .map((p) => {
        const totCrit = Number(p.total_criteria) || 0;
        const compCrit = Number(p.completed_criteria) || 0;
        const actTasks = Number(p.active_tasks) || (Number(p.total_tasks) || 0) - (Number(p.backlog_tasks) || 0);
        const compTasks = Number(p.completed_tasks) || 0;
        const percent = totCrit > 0 
          ? Math.round((compCrit / totCrit) * 100) 
          : actTasks > 0 
          ? Math.round((compTasks / actTasks) * 100) 
          : 0;
        return {
          id: p.id,
          name: p.name,
          code: p.code,
          status: p.status,
          percent,
          totCrit,
          compCrit,
          actTasks,
          compTasks,
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [projects]);

  // BOM Allocation Ranking Data
  const bomAllocationProjects = useMemo(() => {
    return [...projects]
      .filter((p) => (Number(p.total_bom_cost) || 0) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        cost: Number(p.total_bom_cost) || 0,
        share: totalAllBOMCost > 0 ? ((Number(p.total_bom_cost) || 0) / totalAllBOMCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [projects, totalAllBOMCost]);

  // Risk / Health Statistics
  const healthStats = useMemo(() => {
    const atRisk = projects.filter((p) => (Number(p.open_issues_count) || 0) >= 3);
    const needAttention = projects.filter(
      (p) => (Number(p.open_issues_count) || 0) > 0 && (Number(p.open_issues_count) || 0) < 3
    );
    const healthy = projects.filter((p) => (Number(p.open_issues_count) || 0) === 0);
    return { atRisk, needAttention, healthy };
  }, [projects]);

  const isFilterActive =
    search !== "" || statusFilter !== "all" || conditionFilter !== "all" || sortOption !== "progress_desc";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setConditionFilter("all");
    setSortOption("progress_desc");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Header Eksekutif */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/70">
                <BarChart3 className="w-3.5 h-3.5 text-sky-500" />
                <span>Portofolio & Analitik Eksekutif</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Pemantauan Seluruh Proyek
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Pantau akumulasi progres kriteria acceptance, distribusi tugas terintegrasi, alokasi anggaran belanja BOM, dan mitigasi kendala teknis di seluruh cabang dan lokasi proyek.
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Proyek Baru</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards (Putih Bersih dengan Shadow Card, Tanpa Background Abu-abu) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          {/* KPI 1: Overall Criteria Progress (Sejajar dengan Progress Bar seperti ProjectHeader) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 whitespace-nowrap">
                <TrendingUp className="w-4 h-4 text-sky-600 shrink-0" />
                Rata-rata Progres Selesai
              </span>
            </div>
            <div className="flex items-center gap-2.5 my-1">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {overallCriteriaRate}%
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-sky-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${overallCriteriaRate}%` }}
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-1">
              <span className="truncate">{totalCompletedCriteria} dari {totalAllCriteria} kriteria selesai</span>
              <span className="text-slate-400 font-medium shrink-0">({totalCompletedTasks}/{totalActiveTasks} task)</span>
            </div>
          </div>

          {/* KPI 2: Total Portofolio Projects */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 whitespace-nowrap">
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                Total Portofolio Proyek
              </span>
            </div>
            <div className="flex items-center gap-2.5 my-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{totalProjects}</span>
              <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {activeProjectsCount} Aktif Berjalan
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Akumulasi seluruh proyek dalam pemantauan
            </div>
          </div>

          {/* KPI 3: Global BOM Budget */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 whitespace-nowrap">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                Total Anggaran BOM
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight my-1 truncate">
              {formatIDR(totalAllBOMCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Akumulasi pengadaan hardware & part
            </div>
          </div>

          {/* KPI 4: Global Open Technical Issues */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-slate-700 whitespace-nowrap">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Kendala Teknis (Issue Logs)
              </span>
            </div>
            <div className="flex items-center gap-2.5 my-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{totalOpenIssues}</span>
              <span className="text-xs text-slate-600 font-medium">Isu Terbuka</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalOpenIssues > 0 ? (
                <span>{totalOpenIssues} isu RCA perlu penanganan teknis</span>
              ) : (
                <span>Kondisi operasional stabil & terkendali</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION VISUAL CHARTS (EXECUTIVE ANALYTICS) */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Visualisasi Grafik & Matriks Kinerja Eksekutif
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analisis performa multi-proyek, distribusi status tugas, efektivitas penanganan kendala, dan anggaran.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium shrink-0">Multi-Project Realtime Analytics</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CHART 1: Interactive Donut Chart (Distribusi Status Tugas Seluruh Proyek) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-sky-500" />
                    Distribusi Status Tugas Seluruh Portofolio
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proporsi dari total {totalAllTasks} tugas yang tersebar di semua lini proyek.
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  {totalAllTasks} Tasks
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                    {/* Background Track */}
                    <circle
                      cx="70"
                      cy="70"
                      r="56"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="16"
                    />
                    {/* Slices */}
                    {donutSegments.map((segment) => {
                      if (segment.count === 0) return null;
                      const isHovered = hoveredSlice === segment.key;
                      return (
                        <circle
                          key={segment.key}
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke={segment.color}
                          strokeWidth={isHovered ? 20 : 16}
                          strokeDasharray={segment.strokeDasharray}
                          strokeDashoffset={segment.strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredSlice(segment.key)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Donut Center Metrics */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {totalAllTasks > 0 ? Math.round((totalCompletedTasks / totalAllTasks) * 100) : 0}%
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                      Selesai
                    </span>
                  </div>
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs text-xs">
                  {donutSegments.map((segment) => {
                    const isHovered = hoveredSlice === segment.key;
                    return (
                      <div
                        key={segment.key}
                        onMouseEnter={() => setHoveredSlice(segment.key)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                          isHovered
                            ? "bg-slate-100/90 border-slate-300 shadow-2xs"
                            : "bg-slate-50/60 border-slate-200/70 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="text-slate-700 font-medium truncate">{segment.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900">{segment.count}</span>
                          <span className="text-[11px] text-slate-400 w-11 text-right">
                            ({segment.percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total Aktif: <b className="text-slate-800 font-bold">{totalActiveTasks}</b> task</span>
              <span>Backlog Perencanaan: <b className="text-slate-800 font-bold">{totalBacklogTasks}</b> task</span>
            </div>
          </div>

          {/* CHART 2: Horizontal Bar Progress Comparison (Perbandingan Progres Proyek) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Peringkat & Perbandingan Progres Proyek
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pencapaian kriteria acceptance checklist & eksekusi tiap proyek.
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Top {rankedProjects.length} Proyek
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {rankedProjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">Belum ada proyek terdaftar.</div>
                ) : (
                  rankedProjects.map((proj) => {
                    const getProgressColor = (val: number) => {
                      if (val >= 80) return "bg-emerald-500";
                      if (val >= 40) return "bg-sky-500";
                      if (val > 0) return "bg-amber-500";
                      return "bg-slate-300";
                    };

                    return (
                      <div
                        key={proj.id}
                        onClick={() => onSelectProject(proj.id, "kanban")}
                        className="p-2.5 rounded-xl border border-slate-200/70 hover:border-sky-500/60 hover:bg-sky-50/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-sky-100 group-hover:text-sky-700 transition-colors">
                              {proj.code}
                            </span>
                            <span className="font-bold text-slate-800 group-hover:text-sky-600 truncate transition-colors">
                              {proj.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-slate-900 text-xs">{proj.percent}%</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(proj.percent)}`}
                            style={{ width: `${proj.percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          {proj.totCrit > 0 ? (
                            <span>{proj.compCrit} dari {proj.totCrit} kriteria selesai</span>
                          ) : (
                            <span>{proj.compTasks} dari {proj.actTasks} task aktif selesai</span>
                          )}
                          <span className="capitalize">{proj.status.replace("_", " ")}</span>
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                <span>Klik pada bar proyek untuk langsung membuka papan Kanban</span>
                <span className="text-emerald-600 font-semibold">
                  {rankedProjects.filter((p) => p.percent === 100).length} Proyek 100%
                </span>
              </div>
            </div>

            {/* CHART 3: BOM Budget Allocation Breakdown */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Komposisi Anggaran & Belanja Hardware (BOM)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Porsi alokasi dana komponen dan bill of materials per proyek.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {formatIDR(totalAllBOMCost)}
                  </span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {bomAllocationProjects.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada komponen BOM yang dicatat di proyek manapun.
                    </div>
                  ) : (
                    bomAllocationProjects.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectProject(item.id, "bom")}
                        className="p-2.5 rounded-xl border border-slate-200/70 hover:border-emerald-500/60 hover:bg-emerald-50/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.code}
                            </span>
                            <span className="font-bold text-slate-800 group-hover:text-emerald-700 truncate transition-colors">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs shrink-0">
                            {formatIDR(item.cost)}
                          </span>
                        </div>

                        {/* Visual Bar Share */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${item.share}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Porsi anggaran portofolio</span>
                          <span className="font-bold text-emerald-700">{Math.round(item.share * 10) / 10}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                <span>Rata-rata belanja per proyek belanja:</span>
                <span className="font-bold text-slate-800">
                  {bomAllocationProjects.length > 0
                    ? formatIDR(totalAllBOMCost / bomAllocationProjects.length)
                    : "Rp 0"}
                </span>
              </div>
            </div>

            {/* CHART 4: Risk & RCA Technical Issue Matrix */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Matriks Kesehatan & Risiko Kendala (RCA)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Status stabilitas operasional berdasarkan temuan issue log di lapangan.
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    totalOpenIssues > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {totalOpenIssues > 0 ? `${totalOpenIssues} Kendala Terbuka` : "Semua Proyek Clear"}
                  </span>
                </div>

                {/* Health Segmentation Status */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <span className="text-lg font-extrabold text-emerald-900 block leading-none">
                      {healthStats.healthy.length}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">Stabil (0 Isu)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
                    <Activity className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <span className="text-lg font-extrabold text-amber-900 block leading-none">
                      {healthStats.needAttention.length}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 mt-1 block">Pantau (1-2 Isu)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-center">
                    <AlertCircle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                    <span className="text-lg font-extrabold text-rose-900 block leading-none">
                      {healthStats.atRisk.length}
                    </span>
                    <span className="text-[11px] font-semibold text-rose-700 mt-1 block">Kritis (≥3 Isu)</span>
                  </div>
                </div>

                {/* List of projects needing attention */}
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {totalOpenIssues === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span>Luar biasa! Tidak ada issue teknis aktif di seluruh portofolio.</span>
                    </div>
                  ) : (
                    projects
                      .filter((p) => (Number(p.open_issues_count) || 0) > 0)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => onSelectProject(p.id, "issues")}
                          className="p-2 rounded-xl border border-slate-200 hover:border-amber-500/60 bg-slate-50/50 hover:bg-amber-50/20 transition-all cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                              {p.code}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                            {p.open_issues_count} Isu Terbuka
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                <span>Klik proyek untuk melihat Root Cause Analysis (5-Whys)</span>
                <span className="text-slate-400">Status Terakhir</span>
              </div>
            </div>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* SECTION PROJECT CARDS & FILTER TOOLBAR */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Daftar Proyek & Monitoring Site / Lokasi Dinamis
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kelola dan pantau progres pengerjaan di setiap cabang, lokasi site lapangan, dan status milestone proyek.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium shrink-0">
            Menampilkan <span className="font-bold text-slate-800">{filteredProjects.length}</span> dari{" "}
            <span className="font-bold text-slate-800">{projects.length}</span> total proyek
          </div>
        </div>

          {/* Multi-Dimensional Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, kode proyek, atau deskripsi..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 shadow-2xs transition-colors"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {/* Status Filter */}
                <div className="shrink-0 min-w-[150px]">
                  <SearchableSelect
                    size="sm"
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                      { value: "all", label: "Semua Status" },
                      { value: "active", label: "Active (Sedang Berjalan)", badge: <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Active</span> },
                      { value: "planning", label: "Planning (Perencanaan)", badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">Plan</span> },
                      { value: "on_hold", label: "On Hold (Ditunda)", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">Hold</span> },
                      { value: "completed", label: "Completed (Selesai)", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Done</span> },
                    ]}
                    minItemsForSearch={8}
                  />
                </div>

                {/* Condition Filter */}
                <div className="shrink-0 min-w-[160px]">
                  <SearchableSelect
                    size="sm"
                    value={conditionFilter}
                    onChange={(val) => setConditionFilter(val as ConditionOption)}
                    options={[
                      { value: "all", label: "Semua Kondisi" },
                      { value: "has_issues", label: "Isu Terbuka > 0", badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold">Issues</span> },
                      { value: "clean_issues", label: "Bebas Kendala (Clear)", badge: <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Clear</span> },
                      { value: "has_bom", label: "Memiliki Alokasi BOM", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">BOM</span> },
                      { value: "has_locations", label: "Memiliki Lokasi Dinamis", badge: <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded font-bold">Loc</span> },
                    ]}
                    minItemsForSearch={8}
                  />
                </div>

                {/* Sort Option */}
                <div className="shrink-0 min-w-[160px]">
                  <SearchableSelect
                    size="sm"
                    value={sortOption}
                    onChange={(val) => setSortOption(val as SortOption)}
                    options={[
                      { value: "progress_desc", label: "Progres Tertinggi" },
                      { value: "progress_asc", label: "Progres Terendah" },
                      { value: "bom_desc", label: "Anggaran BOM Terbesar" },
                      { value: "issues_desc", label: "Kendala Terbanyak" },
                      { value: "name_asc", label: "Nama Proyek (A-Z)" },
                      { value: "created_desc", label: "Terbaru Dibuat" },
                    ]}
                    minItemsForSearch={8}
                  />
                </div>

                {/* Reset Filters Button */}
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors shrink-0"
                    title="Reset Filter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/90 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Tidak ada proyek yang cocok</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Coba sesuaikan kata kunci pencarian atau reset filter untuk melihat seluruh proyek.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter</span>
                </button>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const totalTasks = Number(project.total_tasks) || 0;
                const activeTasks = Number(project.active_tasks) ?? (totalTasks - (Number(project.backlog_tasks) || 0));
                const completedTasks = Number(project.completed_tasks) || 0;
                const backlogTasks = Number(project.backlog_tasks) || 0;
                const totalCriteria = Number(project.total_criteria) || 0;
                const completedCriteria = Number(project.completed_criteria) || 0;

                const progressPercent = totalCriteria > 0 
                  ? Math.round((completedCriteria / totalCriteria) * 100)
                  : activeTasks > 0 
                  ? Math.round((completedTasks / activeTasks) * 100) 
                  : 0;

                const bomCost = Number(project.total_bom_cost) || 0;
                const openIssues = Number(project.open_issues_count) || 0;
                const locations = project.locations || [];
                const locationCount = project.location_count ?? locations.length;

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card hover:border-sky-500/80 hover:ring-1 hover:ring-sky-500/30 transition-all duration-200 flex flex-col justify-between space-y-4 group"
                  >
                    {/* Header: Code, Name, Status */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-200/70">
                              {project.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-md capitalize border ${
                                project.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : project.status === "completed"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
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
                            className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors cursor-pointer leading-snug pt-0.5"
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

                      {/* Dynamic Locations Tagging */}
                      {locationCount > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
                            <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>{locationCount} Lokasi / Site</span>
                          </span>
                          {locations.slice(0, 2).map((loc) => (
                            <span
                              key={loc.id}
                              className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px]"
                              title={loc.name}
                            >
                              {loc.name}
                            </span>
                          ))}
                          {locationCount > 2 && (
                            <span className="text-[10px] text-slate-400">
                              +{locationCount - 2} lainnya
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress & Stats Bar */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                            <TrendingUp className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            Progres Kriteria & Tugas
                          </span>
                          <span className="font-bold text-slate-900">{progressPercent}%</span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              progressPercent >= 80
                                ? "bg-emerald-500"
                                : progressPercent >= 40
                                ? "bg-sky-500"
                                : progressPercent > 0
                                ? "bg-amber-500"
                                : "bg-slate-300"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          {totalCriteria > 0 ? (
                            <>
                              <span className="truncate">{completedCriteria} / {totalCriteria} kriteria selesai</span>
                              <span className="text-slate-400 font-medium shrink-0">({completedTasks}/{activeTasks} task)</span>
                            </>
                          ) : (
                            <>
                              <span className="truncate">{completedTasks} / {activeTasks} aktif selesai</span>
                              <span className="text-slate-400 font-medium shrink-0">({backlogTasks} antrean)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sub Metrics: BOM Cost, Issues, Team Personil */}
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
                            Isu Teknis
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {openIssues} Masalah
                            </span>
                            {openIssues > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Team Members Allocation */}
                        <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Users className="w-3 h-3 text-purple-600" />
                            Personil
                          </span>
                          <div className="mt-0.5">
                            <span className="font-bold text-slate-800 text-xs truncate block">
                              {(project.members?.length ?? project.member_count) || 0} Anggota
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Navigation Links */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectProject(project.id, "kanban")}
                          className="px-2 py-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg font-medium transition-colors"
                        >
                          Kanban
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProject(project.id, "bom")}
                          className="px-2 py-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg font-medium transition-colors"
                        >
                          BOM
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProject(project.id, "issues")}
                          className="px-2 py-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg font-medium transition-colors"
                        >
                          Isu Log
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id, "kanban")}
                        className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Buka</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
    </div>
  );
}
