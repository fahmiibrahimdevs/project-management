import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { PriorityBadge, StatusBadge, DeadlineBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { AssigneeSelector } from "../common/AssigneeSelector";
import { AssigneeSidePanel } from "../common/AssigneeSidePanel";
import { Task, TaskPriority, TaskStatus, Member, AcceptanceCriterion, TaskComment, TaskAttachment } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { showAlert, showConfirm, notifySuccess, notifyError, notifyWarning, notifyInfo } from "../../utils/swal";
import Swal from "sweetalert2";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useAddCriteria,
  useUpdateCriteria,
  useToggleCriteria,
  useDeleteCriteria,
  useAddComment,
  useDeleteComment,
  useAddAttachment,
  useDeleteAttachment,
  useRenameAttachment,
} from "../../api/client";
import {
  Calendar,
  User,
  Users,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Trash2,
  Plus,
  Send,
  UploadCloud,
  File,
  X,
  Clock,
  Edit2,
  Check,
  Lock,
  Tag,
  Flag,
  Download,
  Eye
} from "lucide-react";
import { getDownloadUrl } from "../../utils/download";
import { format } from "date-fns";

interface TaskDetailModalProps {
  taskId: string;
  projectId: string;
  members: Member[];
  isProjectMember?: boolean;
  onClose: () => void;
}

export function TaskDetailModal({
  taskId,
  projectId,
  members = [],
  isProjectMember,
  onClose,
}: TaskDetailModalProps) {
  const { user, canEditContent, isViewer } = useAuth();
  const { data: task, isLoading } = useTask(taskId);

  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const addCriteriaMutation = useAddCriteria();
  const updateCriteriaMutation = useUpdateCriteria();
  const toggleCriteriaMutation = useToggleCriteria();
  const deleteCriteriaMutation = useDeleteCriteria();
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();
  const addAttachmentMutation = useAddAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();
  const renameAttachmentMutation = useRenameAttachment();
  const queryClient = useQueryClient();

  // Local editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");

  // Criteria inline editing state
  const [editingCriteriaId, setEditingCriteriaId] = useState<string | null>(null);
  const [editingCriteriaText, setEditingCriteriaText] = useState("");

  // Input states
  const [newCriteriaText, setNewCriteriaText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setSelectedAssigneeIds(task.assignees ? task.assignees.map((a: Member) => a.id) : []);
      setDeadline(task.deadline ? task.deadline.slice(0, 10) : "");
    }
  }, [task]);

  if (isLoading || !task) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Memuat Task..." maxWidth="4xl">
        <div className="flex items-center justify-center py-12 text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Modal>
    );
  }

  // Permission: Who can edit task properties, checklist, add/delete criteria?
  // Owner, PM, Creator of the task, or Assigned Member of this task!
  const isOwner = user?.role === "owner";
  const isMember = isProjectMember !== undefined ? isProjectMember : (isOwner || members.some((m: Member) => m.id === user?.id));

  const isAssigned = isMember && !!task.assignees && task.assignees.some((a: Member) => a.id === user?.id);
  const isSuperUser = isOwner || (user?.role === "pm" && isMember);
  const isCreator = isMember && !!user?.id && task.created_by_id === user?.id;

  const canEditTaskProperties = isMember && (isSuperUser || isCreator || isAssigned);
  const canManageCriteria = isMember && (isSuperUser || isCreator || isAssigned);
  const canCheckCriteria = isMember && (isSuperUser || isCreator || isAssigned);
  const canChangeStatus = isMember && (isSuperUser || isCreator || isAssigned);
  const canDeleteTask = isMember && (isSuperUser || isCreator);
  const canEditTask = isSuperUser;
  const canComment = isMember;
  const canUploadAttachment = isMember;

  const handleSaveTitleDesc = () => {
    if (!title.trim()) return;
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        title: title.trim(),
        description: description.trim(),
      },
    });
    setIsEditingTitle(false);
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: newStatus },
    });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    setPriority(newPriority);
    updateTaskMutation.mutate({
      id: task.id,
      data: { priority: newPriority },
    });
  };

  const handleAssigneesChange = (newAssigneeIds: string[]) => {
    if (!canEditContent) return;
    setSelectedAssigneeIds(newAssigneeIds);
    updateTaskMutation.mutate({
      id: task.id,
      data: { assignee_ids: newAssigneeIds },
    });
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeadline(val);
    updateTaskMutation.mutate({
      id: task.id,
      data: { deadline: val || undefined },
    });
  };

  const handleAddCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriteriaText.trim()) return;
    addCriteriaMutation.mutate(
      { taskId: task.id, text: newCriteriaText.trim() },
      { onSuccess: () => setNewCriteriaText("") }
    );
  };

  const handleStartEditCriteria = (c: AcceptanceCriterion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCriteriaId(c.id);
    setEditingCriteriaText(c.text);
  };

  const handleSaveCriteriaEdit = (c: AcceptanceCriterion) => {
    if (editingCriteriaText.trim() && editingCriteriaText.trim() !== c.text) {
      updateCriteriaMutation.mutate(
        {
          taskId: task.id,
          criteriaId: c.id,
          text: editingCriteriaText.trim(),
        },
        {
          onSuccess: () => notifySuccess("Kriteria berhasil diperbarui"),
        }
      );
    }
    setEditingCriteriaId(null);
  };

  const handleCancelCriteriaEdit = () => {
    setEditingCriteriaId(null);
    setEditingCriteriaText("");
  };

  const handleToggleCriteria = (criterion: AcceptanceCriterion) => {
    if (criterion.is_completed === 1) {
      // Unchecking: only person who checked it OR PM/Owner (isSuperUser)
      const canUncheck = isSuperUser || criterion.completed_by_id === user?.id;
      if (!canUncheck) {
        showAlert({
          icon: "warning",
          title: "Akses Dibatasi",
          text: `Hanya ${criterion.completed_by_name || "orang yang menceklis"} atau PM/Owner yang berhak membatalkan kriteria ini.`,
        });
        return;
      }
      toggleCriteriaMutation.mutate(
        {
          taskId: task.id,
          criteriaId: criterion.id,
          is_completed: false,
          completed_by_id: null,
        },
        {
          onSuccess: () => notifyInfo("Kriteria dibatalkan"),
        }
      );
    } else {
      // Checking: only assigned members OR PM/Owner
      if (!canCheckCriteria) return;
      toggleCriteriaMutation.mutate(
        {
          taskId: task.id,
          criteriaId: criterion.id,
          is_completed: true,
          completed_by_id: user?.id,
        },
        {
          onSuccess: () => notifySuccess("Kriteria diselesaikan!"),
        }
      );
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user) return;
    addCommentMutation.mutate(
      {
        taskId: task.id,
        memberId: user.id,
        content: newCommentText.trim(),
      },
      {
        onSuccess: () => {
          setNewCommentText("");
          notifySuccess("Komentar terkirim");
        },
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsUploading(true);
    setUploadProgressText(`Mengunggah 0/${fileList.length} berkas...`);

    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("task_id", task.id);
    if (user?.id) {
      formData.append("uploaded_by_id", user.id);
    }

    try {
      const res = await fetch(`/api/attachments/project/${projectId}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah file lampiran");
      }

      // Invalidate queries so task attachments and project attachments tab both update instantly
      queryClient.invalidateQueries({ queryKey: ["tasks", "detail", task.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-attachments", projectId] });

      notifySuccess(
        "Lampiran Berhasil Diunggah",
        `${data.count || fileList.length} berkas berhasil ditambahkan ke task.`
      );
    } catch (err: any) {
      console.error(err);
      notifyError("Gagal Mengunggah", err.message || "Terjadi kesalahan saat mengunggah file.");
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
      e.target.value = "";
    }
  };

  const handleRenameAttachment = async (att: TaskAttachment) => {
    const ext = att.file_name.includes(".") ? att.file_name.split(".").pop() || "" : "";
    const baseName = ext ? att.file_name.slice(0, -(ext.length + 1)) : att.file_name;

    const { value: newBaseName } = await Swal.fire({
      title: "Ganti Nama Berkas",
      input: "text",
      inputValue: baseName,
      inputLabel: `Ekstensi (.${ext}) akan otomatis dipertahankan:`,
      showCancelButton: true,
      confirmButtonText: "Simpan Nama",
      cancelButtonText: "Batal",
      inputValidator: (val) => {
        if (!val || !val.trim()) return "Nama berkas tidak boleh kosong!";
        return null;
      },
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-slate-200 font-sans p-6",
        title: "text-base font-bold text-slate-900",
        confirmButton: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs ml-2",
        cancelButton: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium",
      },
      buttonsStyling: false,
    });

    if (newBaseName && newBaseName.trim() !== baseName) {
      const finalFileName = ext ? `${newBaseName.trim()}.${ext}` : newBaseName.trim();
      try {
        await renameAttachmentMutation.mutateAsync({
          id: att.id,
          projectId,
          taskId: task.id,
          fileName: finalFileName,
        });
        notifySuccess("Nama Berkas Diperbarui", `Menjadi "${finalFileName}"`);
      } catch (err: any) {
        notifyError("Gagal Mengubah Nama", err.message || "Terjadi kesalahan.");
      }
    }
  };

  const handleDeleteTask = async () => {
    const confirmed = await showConfirm({
      title: "Hapus Task Ini?",
      text: `Task "${task.title}" beserta seluruh kriteria, komentar, dan lampirannya akan dihapus permanen.`,
      icon: "warning",
      confirmButtonText: "Ya, Hapus Task",
      cancelButtonText: "Batal",
      isDanger: true,
    });

    if (confirmed) {
      deleteTaskMutation.mutate(
        { id: task.id, projectId },
        {
          onSuccess: () => {
            notifySuccess("Task berhasil dihapus");
            onClose();
          },
        }
      );
    }
  };

  const criteria: AcceptanceCriterion[] = task.acceptance_criteria || [];
  const completedCount = criteria.filter((c: AcceptanceCriterion) => c.is_completed === 1).length;
  const progressPercent = criteria.length > 0 ? Math.round((completedCount / criteria.length) * 100) : 0;

  const assigneeSidePanel = isAssigneePickerOpen ? (
    <AssigneeSidePanel
      members={members}
      selectedIds={selectedAssigneeIds}
      onChange={handleAssigneesChange}
      onClose={() => setIsAssigneePickerOpen(false)}
    />
  ) : undefined;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Detail & Progres Task"
      maxWidth="4xl"
      sidePanel={assigneeSidePanel}
    >
      <div className="space-y-6">
        {/* Header: Project Code, Creator Info & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {task.project_code || "TASK"}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{task.project_name}</span>

            {task.created_by_name && (
              <>
                <span className="text-xs text-slate-300">|</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/80">
                  <Avatar
                    name={task.created_by_name}
                    color={task.created_by_avatar_color || "#2563eb"}
                    size="xs"
                    className="w-4 h-4 text-[9px]"
                  />
                  <span>
                    Dibuat oleh: <strong className="text-slate-800">{task.created_by_name}</strong>
                    <span className="text-slate-400 font-normal"> ({task.created_by_role === "pm" ? "PM" : task.created_by_role === "owner" ? "Owner" : task.created_by_role === "karyawan" ? "Karyawan" : "Magang"})</span>
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isMember && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Mode Hanya Lihat</span>
              </span>
            )}

            {canDeleteTask && (
              <button
                type="button"
                onClick={handleDeleteTask}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Hapus Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!isMember && (
          <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Akses Hanya Lihat:</strong> Anda bukan anggota terdaftar pada proyek ini. Anda hanya dapat melihat rincian progres tugas dan mengunduh berkas lampiran.
              </span>
            </div>
          </div>
        )}

        {/* Task Title & Description */}
        <div className="space-y-3">
          {isEditingTitle ? (
            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-base font-bold bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tambahkan deskripsi lengkap tugas..."
                className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveTitleDesc}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-xs hover:bg-blue-700"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  {task.title}
                </h2>
                <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap leading-relaxed">
                  {task.description || (
                    <span className="text-slate-400 italic">Belum ada deskripsi task.</span>
                  )}
                </p>
              </div>
              {canEditTaskProperties && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                  title="Edit Judul & Deskripsi"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 🌟 PROMINENT METADATA PANEL (ABOVE Acceptance Criteria) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-card space-y-4">
          {/* Quick Properties: Status, Priority, Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-slate-100">
            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Status Kolom</span>
              </label>
              {canChangeStatus ? (
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  title="Ubah status pengerjaan tugas"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="backlog">Daftar Tunggu</option>
                  <option value="in_progress">Sedang Dikerjakan</option>
                  <option value="in_review">Dalam Peninjauan</option>
                  <option value="revision">Perlu Revisi</option>
                  <option value="completed" disabled={!isSuperUser}>
                    Selesai {!isSuperUser ? "(Khusus PM/Owner)" : ""}
                  </option>
                  <option value="on_hold" disabled={!isSuperUser}>
                    Ditunda {!isSuperUser ? "(Khusus PM/Owner)" : ""}
                  </option>
                </select>
              ) : (
                <div className="pt-1">
                  <StatusBadge status={task.status} />
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-500" />
                <span>Tingkat Prioritas</span>
              </label>
              <select
                disabled={!canEditTaskProperties}
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                title="Ubah tingkat prioritas tugas"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-75 cursor-pointer"
              >
                <option value="low">Prioritas: Rendah</option>
                <option value="medium">Prioritas: Sedang</option>
                <option value="high">Prioritas: Tinggi</option>
                <option value="urgent">Prioritas: Mendesak</option>
              </select>
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Batas Waktu (Tenggat)</span>
              </label>
              {canEditTaskProperties ? (
                <div className="space-y-1">
                  <input
                    type="date"
                    value={deadline}
                    onChange={handleDeadlineChange}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800"
                  />
                  {deadline && (
                    <div className="pt-0.5">
                      <DeadlineBadge deadline={deadline} status={status} compact={false} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-semibold text-slate-800">
                    {deadline ? format(new Date(deadline), "dd MMM yyyy") : "-"}
                  </span>
                  {deadline && (
                    <DeadlineBadge deadline={deadline} status={status} compact={true} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Spacious Assignee Selector (Positioned right above Acceptance Criteria!) */}
          <AssigneeSelector
            members={members}
            selectedIds={selectedAssigneeIds}
            onChange={handleAssigneesChange}
            disabled={!isSuperUser}
            isOpen={isAssigneePickerOpen}
            onToggleOpen={() => setIsAssigneePickerOpen(!isAssigneePickerOpen)}
            label="Pelaksana Tugas yang Ditugaskan (Assignee)"
          />
        </div>

        {/* 📋 Acceptance Criteria Checklist (Spacious Full Width) */}
        <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Acceptance Criteria ({completedCount}/{criteria.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {progressPercent}% Selesai
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Info role restriction for criteria */}
          {!canCheckCriteria && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center gap-2 text-[11px] text-amber-800">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Anda bukan pelaksana pada task ini. Hanya pelaksana yang ditugaskan (atau PM/Owner) yang dapat mencentang kriteria selesai.
              </span>
            </div>
          )}

          {/* Criteria List */}
          <div className="space-y-2">
            {criteria.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2">
                Belum ada kriteria penerimaan untuk tugas ini.
              </p>
            )}
            {criteria.map((c: AcceptanceCriterion) => {
              const isChecked = c.is_completed === 1;
              const canClick = isChecked
                ? isSuperUser || isCreator || c.completed_by_id === user?.id
                : canCheckCriteria;
              const canUncheck = isSuperUser || isCreator || c.completed_by_id === user?.id;

              let formattedCompletedTime = "";
              if (c.completed_at) {
                try {
                  const dateObj = new Date(c.completed_at);
                  if (!isNaN(dateObj.getTime())) {
                    formattedCompletedTime = format(dateObj, "dd MMM yyyy, HH:mm");
                  } else {
                    formattedCompletedTime = c.completed_at;
                  }
                } catch {
                  formattedCompletedTime = c.completed_at;
                }
              }

              const isEditingThis = editingCriteriaId === c.id;

              return (
                <div
                  key={c.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                    isChecked
                      ? "bg-emerald-50/60 border-emerald-200 text-slate-600"
                      : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {isEditingThis ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={editingCriteriaText}
                        onChange={(e) => setEditingCriteriaText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCriteriaEdit(c);
                          if (e.key === "Escape") handleCancelCriteriaEdit();
                        }}
                        className="flex-1 text-xs bg-white border border-blue-400 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCriteriaEdit(c)}
                        className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors shrink-0"
                        title="Simpan Perubahan (Enter)"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelCriteriaEdit}
                        className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                        title="Batal (Esc)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => handleToggleCriteria(c)}
                        className={`flex items-start gap-3 flex-1 select-none ${
                          canClick ? "cursor-pointer" : "cursor-not-allowed opacity-80"
                        }`}
                        title={
                          isChecked && !canUncheck
                            ? `Hanya ${c.completed_by_name || "yang menceklis"} atau PM/Owner yang dapat membatalkan ceklis kriteria ini.`
                            : !canCheckCriteria
                            ? "Hanya pelaksana tugas atau PM/Owner yang dapat menceklis kriteria ini."
                            : ""
                        }
                      >
                        <div
                          className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-xs block ${
                              isChecked ? "line-through text-slate-400 font-normal" : "text-slate-800 font-medium"
                            }`}
                          >
                            {c.text}
                          </span>
                          {isChecked && (c.completed_by_name || c.completed_at) && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium mt-1">
                              <span className="inline-flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200/80 shadow-2xs">
                                <Clock className="w-3 h-3 text-emerald-700 shrink-0" />
                                <span>
                                  Diselesaikan oleh: <strong>{c.completed_by_name || "Anggota Tim"}</strong>
                                </span>
                                {formattedCompletedTime && (
                                  <>
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span className="font-mono text-[10px] text-emerald-800">
                                      {formattedCompletedTime}
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {canManageCriteria && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => handleStartEditCriteria(c, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit teks kriteria"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCriteriaMutation.mutate({ taskId: task.id, criteriaId: c.id })}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus kriteria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Criteria Input (PM / Owner only) */}
          {canManageCriteria && (
            <form onSubmit={handleAddCriteria} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCriteriaText}
                onChange={(e) => setNewCriteriaText(e.target.value)}
                placeholder="Tambah kriteria penerimaan tugas..."
                className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={!newCriteriaText.trim() || addCriteriaMutation.isPending}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* 💬 Bottom 2-Column Grid: Diskusi Komentar & Lampiran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Comments Thread */}
          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Diskusi & Komentar ({task.comments?.length || 0})
              </h3>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {(task.comments || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Belum ada diskusi. Mulai tinggalkan pesan di bawah.
                </p>
              ) : (
                task.comments?.map((comment: TaskComment) => (
                  <div
                    key={comment.id}
                    className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={comment.author_name || "User"}
                          color={comment.author_avatar_color || "#2563eb"}
                          size="xs"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          {comment.author_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(comment.created_at), "dd MMM, HH:mm")}
                        </span>
                      </div>

                      {user && (user.id === comment.member_id || isSuperUser) && (
                        <button
                          type="button"
                          onClick={() =>
                            deleteCommentMutation.mutate({
                              taskId: task.id,
                              commentId: comment.id,
                            })
                          }
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap pl-6">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            {canComment ? (
              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Tulis pesan diskusi teknis..."
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || addCommentMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim</span>
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-2 bg-white rounded-xl border border-slate-200/70">
                Hanya anggota terdaftar dalam proyek yang dapat mengirim komentar.
              </p>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Lampiran File ({task.attachments?.length || 0})
                </h3>
              </div>

              {canUploadAttachment && (
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/80">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isUploading ? (uploadProgressText || "Mengunggah...") : "+ Upload File (Bisa Banyak)"}</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(task.attachments || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Belum ada file lampiran.</p>
              ) : (
                task.attachments?.map((att: TaskAttachment) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs group"
                  >
                    <a
                      href={getDownloadUrl(att.file_url, att.file_name)}
                      download={att.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:text-blue-600 transition-colors"
                      title={`Klik untuk mengunduh ${att.file_name}`}
                    >
                      <File className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">{att.file_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round(att.file_size / 1024)} KB
                        </p>
                      </div>
                    </a>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <a
                        href={getDownloadUrl(att.file_url, att.file_name)}
                        download={att.file_name}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Unduh Berkas"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      {canUploadAttachment && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRenameAttachment(att)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Ganti Nama Berkas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteAttachmentMutation.mutate({
                                taskId: task.id,
                                attachmentId: att.id,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus File Lampiran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
