import React, { useState, useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Task, TaskStatus, TaskPriority, Member } from "../../types";
import { KanbanColumn } from "./KanbanColumn";
import { useReorderTasks } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import { showAlert } from "../../utils/swal";
import { Search, Filter, Plus, User, Layers, Eye, ShieldAlert, Lock, UserCheck, ArrowUpDown } from "lucide-react";

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  members: Member[];
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
    title: "Daftar Tunggu",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-700",
    tooltip: "Antrean tugas yang direncanakan dan belum mulai dikerjakan",
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
  onTaskClick,
  onOpenCreateTask,
}: KanbanBoardProps) {
  const { user, isSuperUser, canCrudTask } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"smart" | "priority" | "deadline" | "newest" | "manual">("smart");
  const [mobileActiveCol, setMobileActiveCol] = useState<TaskStatus | "all">("all");

  const reorderMutation = useReorderTasks();

  // Drag & drop is available for all users, but restricted to backlog, in_progress, and in_review for Karyawan/Magang
  const canDrag = true;
  const canCreateTask = canCrudTask;

  // Personalization rule: Karyawan & Magang see tasks assigned to them OR created by them
  // Owner & PM can see all tasks.
  const visibleTasks = useMemo(() => {
    if (isSuperUser) {
      return tasks;
    }
    // For Karyawan and Magang: tasks assigned to them OR created by them
    return tasks.filter((t) => (t.assignees && t.assignees.some((a) => a.id === user?.id)) || t.created_by_id === user?.id);
  }, [tasks, isSuperUser, user]);

  // Filter visible tasks based on search, priority, assignee filter
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

      return matchSearch && matchPriority && matchAssignee;
    });
  }, [visibleTasks, debouncedSearch, selectedPriority, selectedAssignee]);

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
      {/* Informative notice for Karyawan / Magang */}
      {!isSuperUser && (
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

      {/* Toolbar: Search, Filters & Action Button */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas atau kriteria..."
              title="Ketik untuk mencari tugas (otomatis jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              title="Filter tugas berdasarkan tingkat prioritas"
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
              title="Urutan tugas di dalam kolom kanban"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
            >
              <option value="smart">⚡ Deadline Terdekat & Prioritas</option>
              <option value="priority">🔥 Prioritas Tertinggi (High → Low)</option>
              <option value="deadline">📅 Deadline Terdekat (Ascending)</option>
              <option value="newest">✨ Terbaru Dibuat</option>
              <option value="manual">📌 Urutan Manual (Drag & Drop)</option>
            </select>
          </div>

          {/* Assignee Filter (Superuser only) */}
          {isSuperUser && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                title="Filter tugas berdasarkan pelaksana tugas"
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none max-w-[160px] truncate font-medium cursor-pointer"
              >
                <option value="all">Semua Pelaksana</option>
                <option value="unassigned">Belum Ditugaskan</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === "pm" ? "PM" : m.role === "owner" ? "Owner" : m.role === "karyawan" ? "Karyawan" : "Magang"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Create Task Button (PM / Owner only) */}
        {canCreateTask && (
          <button
            type="button"
            onClick={() => onOpenCreateTask("backlog")}
            title="Tambah tugas pekerjaan baru ke dalam proyek"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Task Baru</span>
          </button>
        )}
      </div>

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
