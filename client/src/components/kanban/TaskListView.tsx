import React, { useState, useMemo } from "react";
import { Task, TaskStatus, TaskPriority, Member } from "../../types";
import { PriorityBadge, StatusBadge, DeadlineBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { Pagination } from "../common/Pagination";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
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
  UserCheck
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

interface TaskListViewProps {
  tasks: Task[];
  members: Member[];
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: () => void;
}

export function TaskListView({
  tasks,
  members,
  onTaskClick,
  onOpenCreateTask,
}: TaskListViewProps) {
  const { user, isSuperUser, canCrudTask } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"smart" | "deadline" | "priority" | "status" | "created">("smart");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Personalization rule: Karyawan & Magang see tasks assigned to them OR created by them
  const visibleTasks = useMemo(() => {
    if (isSuperUser) {
      return tasks;
    }
    return tasks.filter((t) => (t.assignees && t.assignees.some((a) => a.id === user?.id)) || t.created_by_id === user?.id);
  }, [tasks, isSuperUser, user]);

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

      return matchSearch && matchStatus && matchPriority && matchAssignee;
    });
  }, [visibleTasks, debouncedSearch, statusFilter, priorityFilter, assigneeFilter]);

  // Auto-reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder]);

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

      {/* Toolbar: Search, Filters, Sort & Action Button */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas..."
              title="Ketik judul tugas untuk mencari (jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter daftar berdasarkan status tugas"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="backlog">Daftar Tunggu</option>
              <option value="in_progress">Sedang Dikerjakan</option>
              <option value="in_review">Dalam Peninjauan</option>
              <option value="revision">Perlu Revisi</option>
              <option value="completed">Selesai</option>
              <option value="on_hold">Ditunda</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              title="Filter daftar berdasarkan prioritas tugas"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
            >
              <option value="all">Semua Prioritas</option>
              <option value="low">Prioritas: Rendah</option>
              <option value="medium">Prioritas: Sedang</option>
              <option value="high">Prioritas: Tinggi</option>
              <option value="urgent">Prioritas: Mendesak</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              title="Urutan daftar tugas"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
            >
              <option value="smart">⚡ Deadline Terdekat & Prioritas</option>
              <option value="priority">🔥 Prioritas Tertinggi (High → Low)</option>
              <option value="deadline">📅 Deadline Terdekat (Ascending)</option>
              <option value="status">📊 Status Pengerjaan</option>
              <option value="created">✨ Terbaru Dibuat</option>
            </select>
          </div>

          {/* Assignee Filter (Superusers only) */}
          {isSuperUser && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                title="Filter daftar berdasarkan personil yang ditugaskan"
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none max-w-[160px] truncate font-medium cursor-pointer"
              >
                <option value="all">Semua Pelaksana</option>
                <option value="unassigned">Belum Ditugaskan</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Create Task Button (PM / Owner only) */}
        {canCrudTask && (
          <button
            type="button"
            onClick={onOpenCreateTask}
            title="Tambah tugas baru ke proyek ini"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Task Baru</span>
          </button>
        )}
      </div>

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
