import React from "react";
import { Project, ActiveTab } from "../../types";
import { Avatar } from "../common/Avatar";
import { 
  Kanban, 
  ListTodo, 
  Package, 
  AlertTriangle, 
  Users, 
  Paperclip,
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Edit3,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";

interface ProjectHeaderProps {
  project: Project;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onEditProject: () => void;
  onBackToGlobal?: () => void;
}

export function ProjectHeader({
  project,
  activeTab,
  onTabChange,
  onEditProject,
  onBackToGlobal,
}: ProjectHeaderProps) {
  // Progress calculated from acceptance criteria checklist, fallback to tasks if no criteria
  const totalTasks = project.total_tasks || 0;
  const activeTasks = project.active_tasks ?? (project.total_tasks ? project.total_tasks - (project.backlog_tasks || 0) : 0);
  const completedTasks = project.completed_tasks || 0;
  const backlogTasks = project.backlog_tasks || 0;
  const totalCriteria = project.total_criteria || 0;
  const completedCriteria = project.completed_criteria || 0;

  const progressPercent = totalCriteria > 0 
    ? Math.round((completedCriteria / totalCriteria) * 100)
    : activeTasks > 0 
    ? Math.round((completedTasks / activeTasks) * 100) 
    : 0;

  const totalBomCost = project.total_bom_cost || 0;
  const openIssues = project.open_issues_count || 0;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Back to Global Dashboard Button */}
      {onBackToGlobal && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToGlobal}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 rounded-xl transition-all shadow-2xs group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Dashboard Utama</span>
          </button>
        </div>
      )}

      {/* Top Banner & Project Info */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                {project.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {project.name}
              </h1>
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

            {project.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-0.5">
                {project.description}
              </p>
            )}

            {(project.start_date || project.end_date) && (
              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {project.start_date || "TBD"} &mdash; {project.end_date || "Selesai"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEditProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Proyek</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          {/* Card 1: Progress Metric (🔵 Blue) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-blue-700">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Progres Kriteria Checklist
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                {totalCriteria > 0 ? `${completedCriteria}/${totalCriteria} Kriteria` : `${completedTasks}/${activeTasks} Selesai`}
              </span>
            </div>
            <div className="flex items-center gap-2.5 my-0.5">
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                {progressPercent}%
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              {totalCriteria > 0 ? (
                <>
                  <span>{completedCriteria} dari {totalCriteria} kriteria selesai</span>
                  <span className="text-slate-400 font-medium">({completedTasks}/{activeTasks} task)</span>
                </>
              ) : (
                <>
                  <span>{completedTasks} dari {activeTasks} aktif selesai</span>
                  <span className="text-slate-400 font-medium">({backlogTasks} backlog)</span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Team Allocation Metric (🔴 Merah / Rose) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-rose-700">
                <Users className="w-4 h-4 text-rose-600" />
                Personil Proyek
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                {project.members?.length || 0} Anggota
              </span>
            </div>
            <div className="flex items-center justify-between my-0.5">
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                {project.members?.length || 0} Personil
              </div>
              <div className="flex items-center -space-x-1">
                {(project.members || []).slice(0, 4).map((m) => (
                  <Avatar key={m.id} name={m.name} color={m.avatar_color} size="xs" />
                ))}
                {(project.members || []).length > 4 && (
                  <span className="text-[10px] text-slate-500 font-bold ml-1.5">
                    +{(project.members || []).length - 4}
                  </span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Alokasi tim teknis & manajerial
            </div>
          </div>

          {/* Card 3: Open Issues Metric (🟠 Amber / Orange) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Log Permasalahan
              </span>
              {openIssues > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {openIssues} Terbuka
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Aman
                </span>
              )}
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight my-0.5">
              {openIssues} Masalah
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Indikasi, akar masalah & solusi
            </div>
          </div>

          {/* Card 4: BOM Total Cost (🟢 Emerald) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold flex items-center gap-1.5 text-emerald-700">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Total Anggaran BOM
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight truncate my-0.5">
              {formatIDR(totalBomCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Biaya part & komponen proyek
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-card">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onTabChange("kanban")}
            title="Tampilan visual papan alur kerja Kanban"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "kanban"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Papan Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("list")}
            title="Tampilan daftar tabel seluruh tugas proyek"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Tabel Tugas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "list" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalTasks}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("bom")}
            title="Kebutuhan material & estimasi biaya (Bill of Materials)"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "bom"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Kebutuhan Material (BOM)</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("issues")}
            title="Pencatatan kendala dan analisis akar masalah (Root Cause Analysis)"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "issues"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Log Permasalahan (RCA)</span>
            {openIssues > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange("team")}
            title="Daftar personil dan alokasi anggota proyek"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "team"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Anggota Tim</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("attachments")}
            title="Dokumen, skematik, dan berkas lampiran proyek"
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "attachments"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Lampiran Berkas</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
