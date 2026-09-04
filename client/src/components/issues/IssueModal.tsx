import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../common/Modal";
import { IssueLog, IssueStatus, IssueSeverity, Member, Task } from "../../types";
import { useCreateIssueLog, useUpdateIssueLog } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../common/Avatar";
import { RichTextEditor } from "../common/RichTextEditor";
import { SearchableSelect } from "../common/SearchableSelect";
import { format } from "date-fns";
import { AlertTriangle, UserCheck } from "lucide-react";

interface IssueModalProps {
  isOpen: boolean;
  projectId: string;
  issueToEdit: IssueLog | null;
  members: Member[];
  tasks: Task[];
  onClose: () => void;
}

export function IssueModal({
  isOpen,
  projectId,
  issueToEdit,
  members,
  tasks,
  onClose,
}: IssueModalProps) {
  const { user, isSuperUser } = useAuth();

  const [logDate, setLogDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [problem, setProblem] = useState("");
  const [indication, setIndication] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [solution, setSolution] = useState("");
  const [status, setStatus] = useState<IssueStatus>("open");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [reportedById, setReportedById] = useState<string>(user?.id || members[0]?.id || "");
  const [taskId, setTaskId] = useState<string>("");

  const createMutation = useCreateIssueLog();
  const updateMutation = useUpdateIssueLog();

  useEffect(() => {
    if (issueToEdit) {
      setLogDate(issueToEdit.log_date);
      setProblem(issueToEdit.problem);
      setIndication(issueToEdit.indication);
      setRootCause(issueToEdit.root_cause);
      setSolution(issueToEdit.solution);
      setStatus(issueToEdit.status);
      setSeverity(issueToEdit.severity);
      setReportedById(issueToEdit.reported_by_id || user?.id || members[0]?.id || "");
      setTaskId(issueToEdit.task_id || "");
    } else {
      setLogDate(format(new Date(), "yyyy-MM-dd"));
      setProblem("");
      setIndication("");
      setRootCause("");
      setSolution("");
      setStatus("open");
      setSeverity("medium");
      // Default automatically to current logged-in user!
      setReportedById(user?.id || members[0]?.id || "");
      setTaskId("");
    }
  }, [issueToEdit, isOpen, members, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReporterId = reportedById || user?.id || members[0]?.id;

    if (!problem.trim() || !indication.trim() || !rootCause.trim() || !solution.trim() || !finalReporterId) {
      return;
    }

    if (issueToEdit) {
      updateMutation.mutate(
        {
          id: issueToEdit.id,
          projectId,
          data: {
            log_date: logDate,
            problem: problem.trim(),
            indication: indication.trim(),
            root_cause: rootCause.trim(),
            solution: solution.trim(),
            status,
            severity,
            reported_by_id: finalReporterId,
            task_id: taskId ? taskId : null,
          },
        },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      createMutation.mutate(
        {
          project_id: projectId,
          log_date: logDate,
          problem: problem.trim(),
          indication: indication.trim(),
          root_cause: rootCause.trim(),
          solution: solution.trim(),
          status,
          severity,
          reported_by_id: finalReporterId,
          task_id: taskId ? taskId : null,
        },
        {
          onSuccess: () => onClose(),
        }
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={issueToEdit ? "Edit Log Permasalahan & Solusi (RCA)" : "Catat Log Permasalahan Baru (RCA)"}
      subtitle="Dokumentasi komprehensif kendala lapangan: indikasi visual, akar masalah, tindakan perbaikan, dan lampiran foto"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Tanggal Kejadian, Severity, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Tanggal Kejadian <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Tingkat Keparahan</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="low">Low (Minor / Ringan)</option>
              <option value="medium">Medium (Sedang)</option>
              <option value="high">High (Tinggi / Signifikan)</option>
              <option value="critical">Critical (Kritis / Blocker)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Status Permasalahan</label>
            <select
              disabled={!isSuperUser}
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium disabled:opacity-75"
            >
              <option value="open">Open (Terbuka / Baru)</option>
              <option value="investigating">Investigating (Dalam Investigasi)</option>
              <option value="resolved">Resolved (Solusi Diterapkan / Selesai)</option>
              <option value="closed">Closed (Ditutup / Diverifikasi)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Reported By & Linked Task */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Reporter / PIC: Automatic default to logged in user */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Pelapor / PIC Masalah</span>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Otomatis akun login
              </span>
            </label>

            {isSuperUser ? (
              <SearchableSelect
                options={members.map((m) => ({
                  value: m.id,
                  label: m.name,
                  sublabel: m.job_title || m.role?.toUpperCase(),
                  badge: (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {m.role?.toUpperCase()}
                    </span>
                  ),
                }))}
                value={reportedById}
                onChange={setReportedById}
                placeholder="-- Pilih Pelapor Masalah --"
                searchPlaceholder="Cari nama anggota tim..."
                minItemsForSearch={5}
              />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Avatar
                  name={user?.name || "User"}
                  color={user?.avatar_color || "#2563eb"}
                  size="xs"
                />
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-800">{user?.name}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">({user?.role?.toUpperCase()})</span>
                </div>
              </div>
            )}
          </div>

          {/* Linked Kanban Task */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Terkait Task Kanban (Opsional)
            </label>
            <SearchableSelect
              options={[
                { value: "", label: "📁 Umum (Tidak Terkait Task Tertentu)" },
                ...tasks.map((t) => ({
                  value: t.id,
                  label: t.title,
                  sublabel: `Status: ${t.status.toUpperCase()}`,
                })),
              ]}
              value={taskId}
              onChange={setTaskId}
              placeholder="-- Pilih Task Terkait --"
              searchPlaceholder="Cari judul task..."
              allowClear={true}
              minItemsForSearch={5}
            />
          </div>
        </div>

        {/* 1. Permasalahan (WYSIWYG) */}
        <RichTextEditor
          label="1. Judul & Rincian Permasalahan"
          required
          value={problem}
          onChange={setProblem}
          placeholder="Jelaskan kendala apa yang terjadi di lapangan atau sistem..."
          minHeight="min-h-[90px]"
        />

        {/* 2. Indikasi Permasalahan (WYSIWYG) */}
        <RichTextEditor
          label="2. Indikasi / Gejala Masalah"
          required
          value={indication}
          onChange={setIndication}
          placeholder="Gejala visual, alarm, grafik error, atau screenshot tampilan yang terdeteksi..."
          minHeight="min-h-[90px]"
        />

        {/* 3. Akar Penyebab (WYSIWYG) */}
        <RichTextEditor
          label="3. Akar Penyebab (Root Cause Analysis)"
          required
          value={rootCause}
          onChange={setRootCause}
          placeholder="Kenapa permasalahan tersebut bisa timbul? (Contoh: cacat hardware, parameter firmware, bug kabel)..."
          minHeight="min-h-[90px]"
        />

        {/* 4. Solusi / Tindakan Perbaikan (WYSIWYG) */}
        <RichTextEditor
          label="4. Solusi / Tindakan Perbaikan"
          required
          value={solution}
          onChange={setSolution}
          placeholder="Langkah konkrit perbaikan yang dilakukan beserta link referensi atau dokumentasi..."
          minHeight="min-h-[90px]"
        />

        {/* Modal Actions */}
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
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              !problem.trim() ||
              !indication.trim() ||
              !rootCause.trim() ||
              !solution.trim()
            }
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Menyimpan..."
              : issueToEdit
              ? "Perbarui Log"
              : "Simpan Log Masalah"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
