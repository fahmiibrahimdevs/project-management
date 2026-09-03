import React, { useState, useMemo } from "react";
import { IssueLog, IssueStatus, IssueSeverity, Member, Task } from "../../types";
import { SeverityBadge, IssueStatusBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { Pagination } from "../common/Pagination";
import { RichContentView } from "../common/RichContentView";
import { IssueModal } from "./IssueModal";
import { IssueDetailModal } from "./IssueDetailModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { useIssueLogs, useDeleteIssueLog } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { format } from "date-fns";

interface IssueLogViewProps {
  projectId: string;
  members: Member[];
  tasks: Task[];
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export function IssueLogView({
  projectId,
  members,
  tasks,
  isCreateModalOpen = false,
  onCloseCreateModal,
}: IssueLogViewProps) {
  const { user, isSuperUser } = useAuth();
  const { data, isLoading } = useIssueLogs(projectId);
  const deleteMutation = useDeleteIssueLog();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(isCreateModalOpen);
  const [issueToEdit, setIssueToEdit] = useState<IssueLog | null>(null);
  const [issueToView, setIssueToView] = useState<IssueLog | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<IssueLog | null>(null);

  React.useEffect(() => {
    if (isCreateModalOpen) {
      setIssueToEdit(null);
      setIsModalOpen(true);
    }
  }, [isCreateModalOpen]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIssueToEdit(null);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const issues = data?.issues || [];
  const summary = data?.summary;

  const filteredIssues = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return issues.filter((iss) => {
      const matchSearch =
        q === "" ||
        iss.problem.toLowerCase().includes(q) ||
        iss.indication.toLowerCase().includes(q) ||
        iss.root_cause.toLowerCase().includes(q) ||
        iss.solution.toLowerCase().includes(q) ||
        (iss.reported_by_name && iss.reported_by_name.toLowerCase().includes(q));

      const matchStatus = selectedStatus === "all" || iss.status === selectedStatus;
      const matchSeverity = selectedSeverity === "all" || iss.severity === selectedSeverity;

      return matchSearch && matchStatus && matchSeverity;
    });
  }, [issues, debouncedSearch, selectedStatus, selectedSeverity]);

  // Auto-reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatus, selectedSeverity]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Top Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Issues */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-blue-700">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              Total Log Masalah
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.total || 0} Masalah
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.resolved || 0} terselesaikan, {summary?.open || 0} terbuka
          </div>
        </div>

        {/* 2. Masalah Terbuka */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-rose-700">
              <Clock className="w-4 h-4 text-rose-600" />
              Masalah Terbuka
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
              {summary?.open || 0} Kasus
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.open || 0} Masalah
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Perlu investigasi & analisis akar masalah
          </div>
        </div>

        {/* 3. Dampak Kritis */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-amber-700">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Dampak Kritis
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {summary?.severity.critical || 0} Kasus
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.severity.critical || 0} Kasus
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Prioritas penanganan tertinggi
          </div>
        </div>

        {/* 4. Selesai / Resolved */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Terselesaikan
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {summary?.resolved || 0} Solusi
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.resolved || 0} Solusi
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Solusi RCA telah terverifikasi
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Add */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari indikasi, penyebab, solusi, atau PIC..."
              title="Ketik untuk mencari log masalah (jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            title="Filter masalah berdasarkan status penanganan"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">Semua Status Penanganan</option>
            <option value="open">Status: Terbuka</option>
            <option value="investigating">Status: Investigasi</option>
            <option value="resolved">Status: Terselesaikan</option>
            <option value="closed">Status: Ditutup</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            title="Filter masalah berdasarkan tingkat dampak"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">Semua Tingkat Dampak</option>
            <option value="critical">Dampak: Kritis</option>
            <option value="high">Dampak: Tinggi</option>
            <option value="medium">Dampak: Sedang</option>
            <option value="low">Dampak: Rendah</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setIssueToEdit(null);
            setIsModalOpen(true);
          }}
          title="Catat kendala teknis atau masalah baru"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Log Masalah Baru</span>
        </button>
      </div>

      {/* Issues Cards List */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-slate-400 text-xs shadow-card">
            Memuat log permasalahan...
          </div>
        ) : filteredIssues.length > 0 ? (
          paginatedIssues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all duration-200 space-y-4 group"
            >
              {/* Header: Date, Severity, Status, Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{format(new Date(issue.log_date), "dd MMMM yyyy")}</span>
                  </div>

                  <SeverityBadge severity={issue.severity} />
                  <IssueStatusBadge status={issue.status} />

                  {issue.task_title && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      • Terkait: <strong className="text-slate-700">{issue.task_title}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
                    <Avatar
                      name={issue.reported_by_name || "User"}
                      color={issue.reported_by_avatar_color || "#2563eb"}
                      size="xs"
                    />
                    <span className="font-medium text-slate-700">
                      {issue.reported_by_name}
                    </span>
                  </div>

                  {(isSuperUser || issue.reported_by_id === user?.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIssueToEdit(issue);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit log ini"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isSuperUser && (
                    <button
                      type="button"
                      onClick={() => setIssueToDelete(issue)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus log ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 🚨 Prominent Problem Statement (Headline) */}
              <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-0.5">
                    Permasalahan / Kendala
                  </span>
                  <RichContentView content={issue.problem} className="text-xs font-bold text-slate-900 leading-snug line-clamp-2" />
                </div>
              </div>

              {/* 🔬 RCA Progression: 3-Stage Investigation & Resolution Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Indication & Symptoms */}
                <div className="p-3.5 rounded-xl bg-amber-50/30 border border-amber-200/60 flex flex-col justify-between space-y-2 hover:bg-amber-50/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      <Search className="w-3.5 h-3.5 text-amber-600" />
                      <span>Indikasi & Gejala</span>
                    </div>
                    <RichContentView content={issue.indication} className="text-slate-700 text-xs leading-relaxed line-clamp-3" />
                  </div>
                </div>

                {/* 2. Root Cause */}
                <div className="p-3.5 rounded-xl bg-purple-50/30 border border-purple-200/60 flex flex-col justify-between space-y-2 hover:bg-purple-50/50 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>Akar Penyebab (Root Cause)</span>
                    </div>
                    <RichContentView content={issue.root_cause} className="text-slate-700 text-xs leading-relaxed line-clamp-3" />
                  </div>
                </div>

                {/* 3. Solution & Preventative Action */}
                <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/80 flex flex-col justify-between space-y-2 hover:bg-emerald-50/60 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Solusi & Penanganan</span>
                    </div>
                    <RichContentView content={issue.solution} className="font-semibold text-emerald-950 text-xs leading-relaxed line-clamp-3" />
                  </div>
                </div>
              </div>

              {/* Bottom detail action button */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                <span className="text-[11px] text-slate-400">
                  {issue.updated_at !== issue.created_at ? `Diperbarui: ${issue.updated_at}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setIssueToView(issue)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Buka Investigasi Lengkap</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-slate-400 text-xs shadow-card">
            Belum ada log permasalahan yang tercatat atau cocok dengan filter.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredIssues.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Modal Add / Edit Issue */}
      <IssueModal
        isOpen={isModalOpen}
        projectId={projectId}
        issueToEdit={issueToEdit}
        members={members}
        tasks={tasks}
        onClose={handleCloseModal}
      />

      {/* Modal View Detail Issue */}
      <IssueDetailModal
        issue={issueToView}
        onClose={() => setIssueToView(null)}
        onEdit={(iss) => {
          setIssueToEdit(iss);
          setIsModalOpen(true);
        }}
      />

      {/* Modal Confirm Delete */}
      {issueToDelete && (
        <ConfirmModal
          isOpen={!!issueToDelete}
          onClose={() => setIssueToDelete(null)}
          onConfirm={() => {
            deleteMutation.mutate(
              { id: issueToDelete.id, projectId },
              { onSuccess: () => setIssueToDelete(null) }
            );
          }}
          title="Hapus Log Permasalahan"
          message={`Apakah Anda yakin ingin menghapus catatan log permasalahan tanggal ${issueToDelete.log_date}?`}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
