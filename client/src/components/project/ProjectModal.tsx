import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Project, Member } from "../../types";
import { useCreateProject, useUpdateProject } from "../../api/client";
import { Layers, Calendar, Tag, FileText } from "lucide-react";

interface ProjectModalProps {
  isOpen: boolean;
  projectToEdit: Project | null;
  members?: Member[];
  onClose: () => void;
  onProjectCreated?: (p: Project) => void;
}

export function ProjectModal({
  isOpen,
  projectToEdit,
  onClose,
  onProjectCreated,
}: ProjectModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"planning" | "active" | "on_hold" | "completed">("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name);
      setCode(projectToEdit.code);
      setDescription(projectToEdit.description || "");
      setStatus(projectToEdit.status);
      setStartDate(projectToEdit.start_date || "");
      setEndDate(projectToEdit.end_date || "");
    } else {
      setName("");
      setCode("");
      setDescription("");
      setStatus("active");
      setStartDate("");
      setEndDate("");
    }
  }, [projectToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (projectToEdit) {
      updateMutation.mutate(
        {
          id: projectToEdit.id,
          data: {
            name: name.trim(),
            code: code.trim(),
            description: description.trim(),
            status,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          },
        },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      createMutation.mutate(
        {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          status,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
        {
          onSuccess: (newProj) => {
            onClose();
            if (onProjectCreated) onProjectCreated(newProj);
          },
        }
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={projectToEdit ? "Informasi & Parameter Proyek" : "Buat Proyek Baru"}
      subtitle="Atur identitas proyek, kode pelacakan, status pengerjaan, dan jadwal target selesai"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Nama Proyek</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Sistem Konveyor Otomatis Warehouse"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Kode Proyek</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: PRJ-CVY-01"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono uppercase"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Deskripsi & Ruang Lingkup Proyek</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Jelaskan ruang lingkup, sasaran teknis, dan target pencapaian proyek ini..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status, Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Status Proyek</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
            >
              <option value="planning">Planning (Perencanaan)</option>
              <option value="active">Active (Sedang Berjalan)</option>
              <option value="on_hold">On Hold (Ditunda)</option>
              <option value="completed">Completed (Selesai)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Tanggal Mulai</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Target Selesai</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending || !name.trim() || !code.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Menyimpan..."
              : projectToEdit
              ? "Simpan Parameter Proyek"
              : "Buat Proyek"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
