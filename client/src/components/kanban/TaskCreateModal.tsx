import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { TaskStatus, TaskPriority, Member } from "../../types";
import { useCreateTask, useProjectLocations } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AssigneeSelector } from "../common/AssigneeSelector";
import { SearchableSelect } from "../common/SearchableSelect";
import { AssigneeSidePanel } from "../common/AssigneeSidePanel";
import { Avatar } from "../common/Avatar";
import { notifySuccess } from "../../utils/swal";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Clock, 
  UserCheck,
  MapPin
} from "lucide-react";

interface TaskCreateModalProps {
  isOpen: boolean;
  projectId: string;
  initialStatus?: TaskStatus;
  members: Member[];
  onClose: () => void;
}

export function TaskCreateModal({
  isOpen,
  projectId,
  initialStatus = "backlog",
  members = [],
  onClose,
}: TaskCreateModalProps) {
  const { user, isSuperUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [criteriaList, setCriteriaList] = useState<string[]>([""]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);

  const { data: locations = [] } = useProjectLocations(projectId);
  const createTaskMutation = useCreateTask();

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setStatus(initialStatus);
      setPriority("medium");
      // If Owner/PM (SuperUser), start unassigned. If Karyawan/Magang, automatically assign to self!
      setSelectedAssigneeIds(isSuperUser ? [] : user?.id ? [user.id] : []);
      setDeadline("");
      setSelectedLocationId("");
      setCriteriaList([""]);
      setIsAssigneePickerOpen(false);
    }
  }, [isOpen, initialStatus, isSuperUser, user?.id]);

  const handleAddCriteriaField = () => {
    setCriteriaList([...criteriaList, ""]);
  };

  const handleCriteriaChange = (index: number, val: string) => {
    const updated = [...criteriaList];
    updated[index] = val;
    setCriteriaList(updated);
  };

  const handleRemoveCriteria = (index: number) => {
    if (criteriaList.length === 1) {
      setCriteriaList([""]);
    } else {
      setCriteriaList(criteriaList.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validCriteria = criteriaList
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const finalAssigneeIds = isSuperUser ? selectedAssigneeIds : user?.id ? [user.id] : [];

    createTaskMutation.mutate(
      {
        project_id: projectId,
        location_id: selectedLocationId || undefined,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assignee_ids: finalAssigneeIds,
        deadline: deadline || undefined,
        acceptance_criteria: validCriteria,
        created_by_id: user?.id,
      },
      {
        onSuccess: () => {
          notifySuccess("Task baru berhasil dibuat!");
          onClose();
        },
      }
    );
  };

  const assigneeSidePanel = isAssigneePickerOpen ? (
    <AssigneeSidePanel
      members={members}
      selectedIds={selectedAssigneeIds}
      onChange={setSelectedAssigneeIds}
      onClose={() => setIsAssigneePickerOpen(false)}
    />
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Task Pekerjaan Baru"
      subtitle="Input rincian tugas, penugasan tim (multi-assignee), prioritas, dan kriteria penyelesaian"
      maxWidth="2xl"
      sidePanel={assigneeSidePanel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800">
            Judul Task <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kalibrasi Sensor Lidar & Testing SLAM Mapping"
            className="w-full text-xs bg-white border border-slate-200/90 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800">Deskripsi Tugas</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Tuliskan spesifikasi atau instruksi teknis tugas..."
            className="w-full text-xs bg-white border border-slate-200/90 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition-colors"
          />
        </div>

        {/* Status, Priority, Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Status Awal</label>
            <SearchableSelect
              value={status}
              onChange={(val) => setStatus(val as TaskStatus)}
              options={[
                {
                  value: "backlog",
                  label: "Perencanaan",
                  badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Backlog</span>,
                },
                {
                  value: "in_progress",
                  label: "Sedang Dikerjakan",
                  badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">Progress</span>,
                },
                {
                  value: "in_review",
                  label: "Dalam Peninjauan",
                  badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Review</span>,
                },
                {
                  value: "revision",
                  label: "Perlu Revisi",
                  badge: <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">Revisi</span>,
                },
                {
                  value: "completed",
                  label: "Selesai",
                  badge: <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Selesai</span>,
                },
                {
                  value: "on_hold",
                  label: "Ditunda",
                  badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">Ditunda</span>,
                },
              ]}
              placeholder="-- Pilih Status --"
              minItemsForSearch={8}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Tingkat Prioritas</label>
            <SearchableSelect
              value={priority}
              onChange={(val) => setPriority(val as TaskPriority)}
              options={[
                {
                  value: "low",
                  label: "Prioritas: Rendah",
                  badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Rendah</span>,
                },
                {
                  value: "medium",
                  label: "Prioritas: Sedang",
                  badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">Sedang</span>,
                },
                {
                  value: "high",
                  label: "Prioritas: Tinggi",
                  badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Tinggi</span>,
                },
                {
                  value: "urgent",
                  label: "Prioritas: Mendesak",
                  badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">Mendesak</span>,
                },
              ]}
              placeholder="-- Pilih Prioritas --"
              minItemsForSearch={8}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Batas Waktu / Tenggat (Opsional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200/90 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition-colors"
            />
          </div>
        </div>

        {/* Dynamic Project Location Selection */}
        {locations.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">
              Lokasi Pelaksanaan (Opsional)
            </label>
            <SearchableSelect
              value={selectedLocationId}
              onChange={(val) => setSelectedLocationId(val)}
              options={[
                { value: "", label: "-- Seluruh Proyek / Tanpa Lokasi Spesifik --" },
                ...locations.map((loc) => ({
                  value: loc.id,
                  label: `📍 ${loc.name}`,
                  sublabel: loc.address || undefined,
                })),
              ]}
              placeholder="-- Pilih Lokasi --"
              searchPlaceholder="Cari lokasi..."
              minItemsForSearch={4}
            />
          </div>
        )}

        {/* Assignee Selection (Superuser can pick anyone; Karyawan/Magang is automatically self-assigned) */}
        {isSuperUser ? (
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <AssigneeSelector
              members={members}
              selectedIds={selectedAssigneeIds}
              onChange={setSelectedAssigneeIds}
              isOpen={isAssigneePickerOpen}
              onToggleOpen={() => setIsAssigneePickerOpen(!isAssigneePickerOpen)}
              label="Pelaksana Tugas (Assignee)"
            />
          </div>
        ) : (
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Pelaksana Tugas (Assignee)
              </label>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                Otomatis Ditugaskan ke Diri Sendiri
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <Avatar
                name={user?.name || "User"}
                color={user?.avatar_color || "#2563eb"}
                size="sm"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.job_title || user?.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Acceptance Criteria */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Acceptance Criteria (Checklist Kriteria Selesai)
            </label>
            <button
              type="button"
              onClick={handleAddCriteriaField}
              className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Kriteria</span>
            </button>
          </div>

          <div className="space-y-2">
            {criteriaList.map((crit, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={crit}
                  onChange={(e) => handleCriteriaChange(idx, e.target.value)}
                  placeholder={`Kriteria ${idx + 1}...`}
                  className="flex-1 text-xs bg-white border border-slate-200/90 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCriteria(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Hapus baris"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={createTaskMutation.isPending || !title.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
          >
            {createTaskMutation.isPending ? "Membuat Task..." : "Buat Task Baru"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
