import React, { useState, useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus, TaskPriority, Member } from "../../types";
import { KanbanColumn } from "./KanbanColumn";
import { SearchableSelect } from "../common/SearchableSelect";
import { useReorderTasks, useProjectLocations } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import { showAlert } from "../../utils/swal";
import { 
  Search, 
  Filter, 
  Plus, 
  User, 
  Layers, 
  Eye, 
  ShieldAlert, 
  Lock, 
  UserCheck, 
  ArrowUpDown, 
  MapPin,
  BarChart3,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  PieChart as PieChartIcon
} from "lucide-react";

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  members: Member[];
  isProjectMember?: boolean;
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: (status?: TaskStatus) => void;
}

const COLUMNS: Array<{
  id: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  tooltip: string;
}> = [
  {
    id: "backlog",
    title: "Perencanaan",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-700",
    tooltip: "Tugas yang sedang direncanakan dan belum mulai dikerjakan",
  },
  {
    id: "in_progress",
    title: "Sedang Dikerjakan",
    dotColor: "bg-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    tooltip: "Tugas yang sedang dalam proses pengerjaan oleh personil",
  },
  {
    id: "in_review",
    title: "Dalam Peninjauan",
    dotColor: "bg-purple-600",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    tooltip: "Tugas selesai dikerjakan dan sedang ditinjau / diverifikasi oleh PM/Owner",
  },
  {
    id: "revision",
    title: "Perlu Revisi",
    dotColor: "bg-rose-600",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
    tooltip: "Tugas yang memerlukan perbaikan berdasarkan catatan hasil peninjauan",
  },
  {
    id: "completed",
    title: "Selesai",
    dotColor: "bg-emerald-600",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    tooltip: "Tugas yang telah tuntas 100% dan terverifikasi",
  },
  {
    id: "on_hold",
    title: "Ditunda",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    tooltip: "Tugas yang terhenti sementara karena kendala atau menunggu komponen",
  },
];

export function KanbanBoard({
  projectId,
  tasks,
  members,
  isProjectMember,
  onTaskClick,
  onOpenCreateTask,
}: KanbanBoardProps) {
  const { user, isSuperUser, canCrudTask } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"smart" | "priority" | "deadline" | "newest" | "manual">("smart");
  const [mobileActiveCol, setMobileActiveCol] = useState<TaskStatus | "all">("all");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: locations = [] } = useProjectLocations(projectId);
  const reorderMutation = useReorderTasks();

  const isOwner = user?.role === "owner";
  const isMember = isProjectMember !== undefined ? isProjectMember : (isOwner || members.some((m) => m.id === user?.id));

  // Analytics Metrics for Kanban Board
  const kanbanAnalytics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const revision = tasks.filter((t) => t.status === "revision").length;
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const onHold = tasks.filter((t) => t.status === "on_hold").length;

    const urgentPriority = tasks.filter((t) => t.priority === "urgent").length;
    const highPriority = tasks.filter((t) => t.priority === "high").length;
    const mediumPriority = tasks.filter((t) => t.priority === "medium").length;
    const lowPriority = tasks.filter((t) => t.priority === "low").length;

    const statusSegments = [
      { key: "completed", label: "Selesai", count: completed, color: "#10b981" },
      { key: "in_progress", label: "Dikerjakan", count: inProgress, color: "#0ea5e9" },
      { key: "in_review", label: "Peninjauan", count: inReview, color: "#a855f7" },
      { key: "revision", label: "Revisi", count: revision, color: "#f43f5e" },
      { key: "on_hold", label: "Ditunda", count: onHold, color: "#f59e0b" },
      { key: "backlog", label: "Perencanaan", count: backlog, color: "#94a3b8" },
    ];

    const circumference = 2 * Math.PI * 56;
    let accumulatedOffset = 0;
    const donutSlices = statusSegments.map((seg) => {
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

    return {
      total,
      completed,
      inProgress,
      inReview,
      revision,
      backlog,
      onHold,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      urgentPriority,
      highPriority,
      mediumPriority,
      lowPriority,
      donutSlices,
    };
  }, [tasks]);

  // Drag & drop and task creation are only allowed for project members and owner
  const canDrag = isMember;
  const canCreateTask = isMember && canCrudTask;

  // Personalization rule: Karyawan & Magang see tasks assigned to them OR created by them
  // Owner, PM, and non-member readers can see all tasks.
  const visibleTasks = useMemo(() => {
    if (isSuperUser || !isMember) {
      return tasks;
    }
    // For Karyawan and Magang: tasks assigned to them OR created by them
    return tasks.filter((t) => (t.assignees && t.assignees.some((a) => a.id === user?.id)) || t.created_by_id === user?.id);
  }, [tasks, isSuperUser, isMember, user]);

  // Filter visible tasks based on search, priority, assignee filter, and location filter
  const filteredTasks = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return visibleTasks.filter((t) => {
      const matchSearch =
        q === "" ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));

      const matchPriority =
        selectedPriority === "all" || t.priority === selectedPriority;

      let matchAssignee = true;
      if (selectedAssignee === "unassigned") {
        matchAssignee = !t.assignees || t.assignees.length === 0;
      } else if (selectedAssignee !== "all") {
        matchAssignee = !!t.assignees && t.assignees.some((a) => a.id === selectedAssignee);
      }

      let matchLocation = true;
      if (selectedLocation === "none") {
        matchLocation = !t.location_id || t.location_id === "";
      } else if (selectedLocation !== "all") {
        matchLocation = t.location_id === selectedLocation;
      }

      return matchSearch && matchPriority && matchAssignee && matchLocation;
    });
  }, [visibleTasks, debouncedSearch, selectedPriority, selectedAssignee, selectedLocation]);

  // Group tasks by column status with smart ordering (Deadline terdekat & Priority tertinggi)
  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      in_review: [],
      revision: [],
      completed: [],
      on_hold: [],
    };

    filteredTasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.backlog.push(task);
      }
    });

    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

    const sortFn = (a: Task, b: Task) => {
      if (sortBy === "manual") {
        return a.order_index - b.order_index;
      }

      if (sortBy === "priority") {
        const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        return (b.created_at || "").localeCompare(a.created_at || "");
      }

      if (sortBy === "deadline") {
        if (a.deadline && b.deadline) {
          const dDiff = a.deadline.localeCompare(b.deadline);
          if (dDiff !== 0) return dDiff;
        } else if (a.deadline && !b.deadline) {
          return -1;
        } else if (!a.deadline && b.deadline) {
          return 1;
        }
        const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return (b.created_at || "").localeCompare(a.created_at || "");
      }

      if (sortBy === "newest") {
        return (b.created_at || "").localeCompare(a.created_at || "");
      }

      // Default: "smart" (Deadline paling terdekat lebih dulu, lalu Prioritas tertinggi)
      if (a.deadline && b.deadline) {
        const dDiff = a.deadline.localeCompare(b.deadline);
        if (dDiff !== 0) return dDiff;
      } else if (a.deadline && !b.deadline) {
        return -1; // Task with deadline has higher urgency
      } else if (!a.deadline && b.deadline) {
        return 1;
      }

      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      return (b.created_at || "").localeCompare(a.created_at || "");
    };

    // Sort each column
    Object.keys(map).forEach((col) => {
      map[col as TaskStatus].sort(sortFn);
    });

    return map;
  }, [filteredTasks, sortBy]);

  const handleDragEnd = (result: DropResult) => {
    if (!canDrag) return;

    const { destination, source } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColId = source.droppableId as TaskStatus;
    const destColId = destination.droppableId as TaskStatus;

    // RBAC Rule for Karyawan & Magang:
    // Drag & Drop is allowed only between: backlog, in_progress, and in_review!
    if (!isSuperUser && (destColId === "completed" || destColId === "on_hold")) {
      showAlert({
        icon: "warning",
        title: "Persetujuan Diperlukan",
        text: destColId === "completed"
          ? "Hanya Project Manager (PM) atau Owner yang dapat menyetujui dan memindahkan tugas ke status 'Selesai'."
          : "Hanya Project Manager (PM) atau Owner yang dapat memindahkan tugas ke status 'Ditunda'.",
      });
      return;
    }

    const sourceList = Array.from(tasksByColumn[sourceColId]);
    const destList = sourceColId === destColId ? sourceList : Array.from(tasksByColumn[destColId]);

    const [movedTask] = sourceList.splice(source.index, 1);
    if (!movedTask) return;

    movedTask.status = destColId;
    destList.splice(destination.index, 0, movedTask);

    const updatePayload: Array<{ id: string; status: string; order_index: number }> = [];

    if (sourceColId === destColId) {
      destList.forEach((task, index) => {
        updatePayload.push({
          id: task.id,
          status: destColId,
          order_index: index,
        });
      });
    } else {
      sourceList.forEach((task, index) => {
        updatePayload.push({
          id: task.id,
          status: sourceColId,
          order_index: index,
        });
      });
      destList.forEach((task, index) => {
        updatePayload.push({
          id: task.id,
          status: destColId,
          order_index: index,
        });
      });
    }

    reorderMutation.mutate({
      projectId,
      items: updatePayload,
    });
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Papan Alur Kerja Kanban
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Visualisasi dan kelola pergerakan tugas proyek antar kolom tahapan kerja secara interaktif dan efisien.
        </p>
      </div>

      {/* Informative notice for Non-members (Read-Only) vs Karyawan/Magang */}
      {!isMember ? (
        <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mode Hanya Lihat:</strong> Anda bukan anggota terdaftar pada proyek ini, sehingga Anda hanya memiliki akses baca (read-only) untuk melihat alur kerja Kanban dan rincian tugas.
            </span>
          </div>
          <span className="font-bold bg-white px-2 py-0.5 rounded-lg border border-amber-200 shrink-0 text-amber-800">
            Read-Only
          </span>
        </div>
      ) : !isSuperUser && (
        <div className="p-3 bg-blue-50/90 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Tampilan Personal:</strong> Anda masuk sebagai <strong>{user?.name}</strong> ({user?.role?.toUpperCase()}). Hanya task yang ditugaskan kepada Anda yang ditampilkan di board ini.
            </span>
          </div>
          <span className="font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200 shrink-0">
            {filteredTasks.length} Task Anda
          </span>
        </div>
      )}

      {/* Toolbar: Search, Filters & Action Button (Guaranteed No-Wrap) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-44 sm:w-48 xl:w-56 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas..."
              title="Ketik untuk mencari tugas (otomatis jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 shadow-2xs transition-colors"
            />
          </div>

          {/* Priority Filter */}
          <div className="shrink-0 min-w-[150px]">
            <SearchableSelect
              size="sm"
              value={selectedPriority}
              onChange={(val) => setSelectedPriority(val)}
              options={[
                { value: "all", label: "Semua Prioritas" },
                { value: "low", label: "Prioritas: Rendah", badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">Low</span> },
                { value: "medium", label: "Prioritas: Sedang", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Med</span> },
                { value: "high", label: "Prioritas: Tinggi", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">High</span> },
                { value: "urgent", label: "Prioritas: Mendesak", badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold">Urg</span> },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Sort Selector */}
          <div className="shrink-0 min-w-[160px]">
            <SearchableSelect
              size="sm"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: "smart", label: "Deadline & Prioritas" },
                { value: "priority", label: "Prioritas Tertinggi" },
                { value: "deadline", label: "Deadline Terdekat" },
                { value: "newest", label: "Terbaru Dibuat" },
                { value: "manual", label: "Urutan Manual" },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Assignee Filter (Superuser only) */}
          {isSuperUser && (
            <div className="shrink-0 min-w-[160px]">
              <SearchableSelect
                size="sm"
                value={selectedAssignee}
                onChange={(val) => setSelectedAssignee(val)}
                options={[
                  { value: "all", label: "Semua Pelaksana" },
                  { value: "unassigned", label: "Belum Ditugaskan" },
                  ...members.map((m) => ({
                    value: m.id,
                    label: m.name,
                    sublabel: m.job_title || m.role?.toUpperCase(),
                  })),
                ]}
                searchPlaceholder="Cari pelaksana..."
                minItemsForSearch={5}
              />
            </div>
          )}

          {/* Location Filter */}
          {locations.length > 0 && (
            <div className="shrink-0 min-w-[160px]">
              <SearchableSelect
                size="sm"
                value={selectedLocation}
                onChange={(val) => setSelectedLocation(val)}
                options={[
                  { value: "all", label: `Semua Lokasi (${locations.length})` },
                  { value: "none", label: "Tanpa Lokasi" },
                  ...locations.map((loc) => ({
                    value: loc.id,
                    label: `📍 ${loc.name}`,
                    sublabel: loc.address || undefined,
                  })),
                ]}
                searchPlaceholder="Cari lokasi..."
                minItemsForSearch={5}
              />
            </div>
          )}
        </div>

        {/* Action Buttons: Toggle Analytics & Create Task Button */}
        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              showAnalytics
                ? "bg-sky-50 text-sky-700 border-sky-300 shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 shadow-2xs"
            }`}
            title="Tampilkan / Sembunyikan visualisasi grafik alur kerja Kanban"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${showAnalytics ? "text-sky-600" : "text-slate-500"}`} />
            <span>Grafik Alur</span>
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {canCreateTask && (
            <button
              type="button"
              onClick={() => onOpenCreateTask("backlog")}
              title="Tambah tugas pekerjaan baru ke dalam proyek"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-all shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Task Baru</span>
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
                  Analisis Alur Kerja & Beban Tugas
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  Sebaran status alur kanban, rasio penyelesaian, dan tingkat prioritas pekerjaan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">
                Total: <strong className="text-slate-900 font-mono font-bold">{kanbanAnalytics.total}</strong> Tugas
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Tingkat Penyelesaian</div>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                {kanbanAnalytics.completionRate}%
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                {kanbanAnalytics.completed} dari {kanbanAnalytics.total} tugas selesai
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Aktif Pengerjaan</div>
              <div className="text-2xl font-black font-mono text-sky-600 mt-1">
                {kanbanAnalytics.inProgress}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                Sedang dalam proses eksekusi
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Dalam Peninjauan / Revisi</div>
              <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                {kanbanAnalytics.inReview + kanbanAnalytics.revision}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                {kanbanAnalytics.inReview} review • {kanbanAnalytics.revision} revisi
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Prioritas Mendesak</div>
              <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                {kanbanAnalytics.urgentPriority}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                Urgent & butuh perhatian cepat
              </div>
            </div>
          </div>

          {/* Charts Grid: Donut Status & Priority Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* 1. Donut Chart Status Distribution */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Distribusi Status Pekerjaan</span>
              </div>
              
              {kanbanAnalytics.total === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada data tugas untuk dianalisis</div>
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
                      {kanbanAnalytics.donutSlices.map((slice) => (
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
                        {kanbanAnalytics.completionRate}%
                      </span>
                      <span className="text-[11px] text-slate-700 font-bold mt-0.5">Tuntas</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs flex-1 w-full">
                    {kanbanAnalytics.donutSlices.map((slice) => (
                      <div key={slice.key} className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-slate-800 font-medium truncate text-xs">{slice.label}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-xs">{slice.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Priority Distribution Bars */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                <span>Sebaran Beban Prioritas Tugas</span>
              </div>

              {kanbanAnalytics.total === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada data tugas untuk dianalisis</div>
              ) : (
                <div className="space-y-3 text-xs">
                  {[
                    { label: "Mendesak (Urgent)", count: kanbanAnalytics.urgentPriority, color: "bg-rose-500" },
                    { label: "Tinggi (High)", count: kanbanAnalytics.highPriority, color: "bg-amber-500" },
                    { label: "Sedang (Medium)", count: kanbanAnalytics.mediumPriority, color: "bg-sky-500" },
                    { label: "Rendah (Low)", count: kanbanAnalytics.lowPriority, color: "bg-slate-400" },
                  ].map((p) => {
                    const pct = kanbanAnalytics.total > 0 ? Math.round((p.count / kanbanAnalytics.total) * 100) : 0;
                    return (
                      <div key={p.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800">{p.label}</span>
                          <span className="font-mono font-bold text-slate-900">{p.count} <span className="font-medium text-slate-600 text-[11px]">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${p.color} transition-all duration-500 rounded-full`}
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

      {/* Kanban Board Columns Container (Horizontal Scrollable within container) */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4 pt-1 w-full">
          <div className="flex gap-4 items-start min-w-max">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                config={col}
                tasks={tasksByColumn[col.id]}
                canCreateTask={canCreateTask}
                canDrag={canDrag}
                onTaskClick={onTaskClick}
                onAddTask={onOpenCreateTask}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
