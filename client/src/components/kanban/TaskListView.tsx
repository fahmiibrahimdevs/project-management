import React, { useState, useMemo } from "react";
import { Task, TaskStatus, TaskPriority, Member } from "../../types";
import { PriorityBadge, StatusBadge, DeadlineBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { SearchableSelect } from "../common/SearchableSelect";
import { Pagination } from "../common/Pagination";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import { useProjectLocations } from "../../api/client";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Clock,
  ArrowUpDown,
  Users,
  UserCheck,
  MapPin,
  BarChart3,
  ChevronUp,
  ChevronDown,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface TaskListViewProps {
  projectId?: string;
  tasks: Task[];
  members: Member[];
  isProjectMember?: boolean;
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: () => void;
}

export function TaskListView({
  projectId,
  tasks,
  members,
  isProjectMember,
  onTaskClick,
  onOpenCreateTask,
}: TaskListViewProps) {
  const { user, isSuperUser, canCrudTask } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"smart" | "deadline" | "priority" | "status" | "created">("smart");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: locations = [] } = useProjectLocations(projectId);

  const isOwner = user?.role === "owner";
  const isMember = isProjectMember !== undefined ? isProjectMember : (isOwner || members.some((m) => m.id === user?.id));
  const canCreateTask = isMember && canCrudTask;

  // Analytics calculations for TaskListView
  const taskAnalytics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;

    // Deadline status analysis
    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;
    let noDeadline = 0;

    tasks.forEach((t) => {
      if (t.status === "completed") return;
      if (!t.deadline) {
        noDeadline++;
      } else {
        const d = new Date(t.deadline);
        if (isToday(d)) {
          dueToday++;
        } else if (isPast(d)) {
          overdue++;
        } else {
          upcoming++;
        }
      }
    });

    // Workload per member
    const memberWorkload: Array<{ name: string; avatarColor?: string; active: number; completed: number; total: number }> = [];
    members.forEach((m) => {
      const memberTasks = tasks.filter((t) => t.assignees && t.assignees.some((a) => a.id === m.id));
      if (memberTasks.length > 0) {
        const mCompleted = memberTasks.filter((t) => t.status === "completed").length;
        const mActive = memberTasks.length - mCompleted;
        memberWorkload.push({
          name: m.name,
          avatarColor: m.avatar_color,
          active: mActive,
          completed: mCompleted,
          total: memberTasks.length,
        });
      }
    });
    memberWorkload.sort((a, b) => b.total - a.total);

    const deadlineSegments = [
      { key: "completed", label: "Selesai", count: completed, color: "#10b981" },
      { key: "upcoming", label: "Mendatang", count: upcoming, color: "#0ea5e9" },
      { key: "dueToday", label: "Hari Ini", count: dueToday, color: "#f59e0b" },
      { key: "overdue", label: "Lewat Tenggat", count: overdue, color: "#f43f5e" },
      { key: "noDeadline", label: "Tanpa Tenggat", count: noDeadline, color: "#94a3b8" },
    ];

    const circumference = 2 * Math.PI * 56;
    let accumulatedOffset = 0;
    const donutSlices = deadlineSegments.map((seg) => {
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
      overdue,
      dueToday,
      upcoming,
      noDeadline,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      memberWorkload: memberWorkload.slice(0, 6),
      donutSlices,
    };
  }, [tasks, members]);

  // Personalization rule: Karyawan & Magang see tasks assigned to them OR created by them
  // Owner, PM, and non-member readers see all tasks.
  const visibleTasks = useMemo(() => {
    if (isSuperUser || !isMember) {
      return tasks;
    }
    return tasks.filter((t) => (t.assignees && t.assignees.some((a) => a.id === user?.id)) || t.created_by_id === user?.id);
  }, [tasks, isSuperUser, isMember, user]);

  const filteredTasks = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return visibleTasks.filter((t) => {
      const matchSearch =
        q === "" ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));

      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;

      let matchAssignee = true;
      if (assigneeFilter === "unassigned") {
        matchAssignee = !t.assignees || t.assignees.length === 0;
      } else if (assigneeFilter !== "all") {
        matchAssignee = !!t.assignees && t.assignees.some((a) => a.id === assigneeFilter);
      }

      let matchLocation = true;
      if (locationFilter === "none") {
        matchLocation = !t.location_id || t.location_id === "";
      } else if (locationFilter !== "all") {
        matchLocation = t.location_id === locationFilter;
      }

      return matchSearch && matchStatus && matchPriority && matchAssignee && matchLocation;
    });
  }, [visibleTasks, debouncedSearch, statusFilter, priorityFilter, assigneeFilter, locationFilter]);

  // Auto-reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, locationFilter, sortBy, sortOrder]);

  const sortedTasks = useMemo(() => {
    const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

    return [...filteredTasks].sort((a, b) => {
      if (sortBy === "deadline") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        const dDiff = a.deadline.localeCompare(b.deadline);
        return sortOrder === "asc" ? dDiff : -dDiff;
      }
      if (sortBy === "priority") {
        const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        return sortOrder === "asc" ? diff : -diff;
      }
      if (sortBy === "status") {
        const sOrder: Record<string, number> = { revision: 1, in_progress: 2, in_review: 3, on_hold: 4, backlog: 5, completed: 6 };
        const diff = (sOrder[a.status] || 99) - (sOrder[b.status] || 99);
        return sortOrder === "asc" ? diff : -diff;
      }
      if (sortBy === "created") {
        return (b.created_at || "").localeCompare(a.created_at || "");
      }
      // default: "smart" (Nearest deadline first, then highest priority, then status/created)
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

      const sOrder: Record<string, number> = { revision: 1, in_progress: 2, in_review: 3, on_hold: 4, backlog: 5, completed: 6 };
      const sDiff = (sOrder[a.status] || 99) - (sOrder[b.status] || 99);
      if (sDiff !== 0) return sDiff;

      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [filteredTasks, sortBy, sortOrder]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTasks.slice(start, start + pageSize);
  }, [sortedTasks, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Daftar & Tabel Rincian Tugas
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Pantau seluruh matriks tugas, tenggat waktu, penanggung jawab (PIC), serta kriteria penerimaan (Acceptance Criteria).
        </p>
      </div>

      {/* Informative notice for Karyawan / Magang */}
      {!isSuperUser && (
        <div className="p-3 bg-blue-50/90 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Tampilan Personal:</strong> Menampilkan task yang ditugaskan kepada <strong>{user?.name}</strong>.
            </span>
          </div>
          <span className="font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200 shrink-0">
            {filteredTasks.length} Task
          </span>
        </div>
      )}

      {/* Toolbar: Search, Filters & Action Button (Guaranteed No-Wrap) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-44 sm:w-48 xl:w-52 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas..."
              title="Ketik judul tugas untuk mencari (jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 shadow-2xs transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="shrink-0 min-w-[140px]">
            <SearchableSelect
              size="sm"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "backlog", label: "Perencanaan", badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">Backlog</span> },
                { value: "in_progress", label: "Sedang Dikerjakan", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Progress</span> },
                { value: "in_review", label: "Dalam Peninjauan", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">Review</span> },
                { value: "revision", label: "Perlu Revisi", badge: <span className="text-[10px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">Revisi</span> },
                { value: "completed", label: "Selesai", badge: <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Selesai</span> },
                { value: "on_hold", label: "Ditunda", badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold">Ditunda</span> },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Priority Filter */}
          <div className="shrink-0 min-w-[150px]">
            <SearchableSelect
              size="sm"
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val)}
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
                { value: "status", label: "Status Pengerjaan" },
                { value: "created", label: "Terbaru Dibuat" },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Assignee Filter (Superusers only) */}
          {isSuperUser && (
            <div className="shrink-0 min-w-[160px]">
              <SearchableSelect
                size="sm"
                value={assigneeFilter}
                onChange={(val) => setAssigneeFilter(val)}
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
                value={locationFilter}
                onChange={(val) => setLocationFilter(val)}
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
            title="Tampilkan / Sembunyikan visualisasi grafik analisis tugas"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${showAnalytics ? "text-sky-600" : "text-slate-500"}`} />
            <span>Grafik Tugas</span>
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {canCrudTask && (
            <button
              type="button"
              onClick={onOpenCreateTask}
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
                  Analisis Tenggat Waktu & Distribusi Beban Kerja
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  Pemantauan keterlambatan tugas, beban personil pelaksana, dan progres keseluruhan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">
                Total: <strong className="text-slate-900 font-mono font-bold">{taskAnalytics.total}</strong> Tugas
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Selesai Dikerjakan</div>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                {taskAnalytics.completed} <span className="text-xs font-bold text-slate-600 font-sans">({taskAnalytics.completionRate}%)</span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                Tugas telah terverifikasi
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Lewat Tenggat (Overdue)</div>
              <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                {taskAnalytics.overdue}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                {taskAnalytics.overdue > 0 ? "Memerlukan eskalasi segera" : "Semua tepat waktu"}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Jatuh Tempo Hari Ini</div>
              <div className="text-2xl font-black font-mono text-amber-600 mt-1">
                {taskAnalytics.dueToday}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                Tenggat berakhir hari ini
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-bold text-slate-800">Tenggat Mendatang</div>
              <div className="text-2xl font-black font-mono text-sky-600 mt-1">
                {taskAnalytics.upcoming}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                {taskAnalytics.noDeadline} tugas tanpa tenggat
              </div>
            </div>
          </div>

          {/* Charts Grid: Donut Deadline & Workload Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* 1. Donut Chart Deadline Distribution */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Distribusi Kepatuhan Tenggat Waktu</span>
              </div>
              
              {taskAnalytics.total === 0 ? (
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
                      {taskAnalytics.donutSlices.map((slice) => (
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
                        {taskAnalytics.completionRate}%
                      </span>
                      <span className="text-[11px] text-slate-700 font-bold mt-0.5">Selesai</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs flex-1 w-full">
                    {taskAnalytics.donutSlices.map((slice) => (
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

            {/* 2. Top Workload Distribution Bars per Assignee */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>Distribusi Beban Kerja Personil (Top)</span>
              </div>

              {taskAnalytics.memberWorkload.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada penugasan personil pada tugas</div>
              ) : (
                <div className="space-y-3 text-xs">
                  {taskAnalytics.memberWorkload.map((m) => {
                    const maxTasks = taskAnalytics.memberWorkload[0]?.total || 1;
                    const widthPct = Math.min(100, Math.round((m.total / maxTasks) * 100));
                    return (
                      <div key={m.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-slate-800 truncate">{m.name}</span>
                          </div>
                          <div className="font-mono text-slate-700 text-xs shrink-0">
                            <strong className="text-slate-900">{m.active}</strong> aktif • <span className="text-emerald-700 font-bold">{m.completed}</span> tuntas
                          </div>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${(m.active / (m.total || 1)) * widthPct}%` }}
                            title={`${m.active} aktif`}
                          />
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(m.completed / (m.total || 1)) * widthPct}%` }}
                            title={`${m.completed} selesai`}
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

      {/* Table List View */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Judul Tugas & Deskripsi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Prioritas</th>
                <th className="py-3 px-4">Pelaksana Tugas</th>
                <th className="py-3 px-4">Kriteria Selesai</th>
                <th className="py-3 px-4">Batas Waktu (Tenggat)</th>
                <th className="py-3 px-4 text-center">Diskusi & Berkas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada task yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const hasDeadline = !!task.deadline;
                  const isOverdue =
                    hasDeadline &&
                    isPast(new Date(task.deadline!)) &&
                    !isToday(new Date(task.deadline!)) &&
                    task.status !== "completed";

                  const criteriaPercent =
                    task.total_criteria && task.total_criteria > 0
                      ? Math.round(((task.completed_criteria || 0) / task.total_criteria) * 100)
                      : 0;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Title & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {task.description}
                          </div>
                        )}
                        {task.location_name && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/70">
                              <MapPin className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                              <span className="truncate max-w-[130px]">{task.location_name}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} />
                      </td>

                      {/* Multiple Assignees Stack */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              {task.assignees.slice(0, 3).map((a) => (
                                <Avatar key={a.id} name={a.name} color={a.avatar_color} size="xs" />
                              ))}
                            </div>
                            <span className="text-[11px] text-slate-600 font-medium">
                              {task.assignees.length === 1
                                ? task.assignees[0].name
                                : `${task.assignees.length} orang`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum ditugaskan</span>
                        )}
                      </td>

                      {/* Criteria Progress */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.total_criteria && task.total_criteria > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  criteriaPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                                }`}
                                style={{ width: `${criteriaPercent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600">
                              {task.completed_criteria}/{task.total_criteria}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.deadline ? (
                          <DeadlineBadge deadline={task.deadline} status={task.status} compact={false} />
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Comments & Attachments Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-3 text-slate-400 text-xs">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{task.total_comments || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{task.total_attachments || 0}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalItems={sortedTasks.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
