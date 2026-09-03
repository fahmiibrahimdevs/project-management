import React, { useState, useMemo } from "react";
import { IssueLog, IssueStatus, IssueSeverity, Member, Task } from "../../types";
import { SeverityBadge, IssueStatusBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { RichContentView } from "../common/RichContentView";
import { IssueModal } from "./IssueModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { useIssueLogs, useDeleteIssueLog } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Edit2,
  Trash2,
  ShieldAlert,
  Flame,
  Activity,
  Bookmark,
} from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface IssueLogViewProps {
  projectId: string;
  members: Member[];
  tasks: Task[];
  isProjectMember?: boolean;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export function IssueLogView({
  projectId,
  members,
  tasks,
  isProjectMember,
  isCreateModalOpen = false,
  onCloseCreateModal,
}: IssueLogViewProps) {
  const { user, isSuperUser } = useAuth();
  const isOwner = user?.role === "owner";
  const isMember = isProjectMember !== undefined ? isProjectMember : (isOwner || members.some((m) => m.id === user?.id));

  const { data, isLoading } = useIssueLogs(projectId);
  const deleteMutation = useDeleteIssueLog();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(isCreateModalOpen);
  const [issueToEdit, setIssueToEdit] = useState<IssueLog | null>(null);
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

  // Filter and sort chronologically (newest date first, then newest created_at)
  const filteredIssues = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const result = issues.filter((iss) => {
      const matchSearch =
        q === "" ||
        iss.problem.toLowerCase().includes(q) ||
        iss.indication.toLowerCase().includes(q) ||
        iss.root_cause.toLowerCase().includes(q) ||
        iss.solution.toLowerCase().includes(q) ||
        (iss.reported_by_name && iss.reported_by_name.toLowerCase().includes(q)) ||
        (iss.task_title && iss.task_title.toLowerCase().includes(q));

      const matchStatus = selectedStatus === "all" || iss.status === selectedStatus;
      const matchSeverity = selectedSeverity === "all" || iss.severity === selectedSeverity;

      return matchSearch && matchStatus && matchSeverity;
    });

    return [...result].sort((a, b) => {
      const dateDiff = new Date(b.log_date).getTime() - new Date(a.log_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
    });
  }, [issues, debouncedSearch, selectedStatus, selectedSeverity]);

  // Group issues by date for Activity Timeline view
  const groupedIssuesByDate = useMemo(() => {
    const groups: { dateKey: string; formattedDate: string; relativeLabel: string; items: IssueLog[] }[] = [];
    const map = new Map<string, IssueLog[]>();

    for (const issue of filteredIssues) {
      const dateKey = issue.log_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(issue);
    }

    for (const [dateKey, items] of map.entries()) {
      let relativeLabel = "";
      try {
        const d = parseISO(dateKey);
        if (isToday(d)) {
          relativeLabel = "Hari Ini";
        } else if (isYesterday(d)) {
          relativeLabel = "Kemarin";
        }
      } catch {
        relativeLabel = "";
      }

      let formattedDate = dateKey;
      try {
        // Format with Indonesian day name: e.g. "Kamis, 03 September 2026"
        formattedDate = format(parseISO(dateKey), "EEEE, dd MMMM yyyy", { locale: localeId });
      } catch {
        formattedDate = dateKey;
      }

      groups.push({
        dateKey,
        formattedDate,
        relativeLabel,
        items,
      });
    }

    return groups;
  }, [filteredIssues]);

  // Helper for status styling on timeline nodes
  const getNodeColor = (status: IssueStatus, severity: IssueSeverity) => {
    if (status === "resolved" || status === "closed") {
      return {
        bg: "bg-emerald-600",
        ring: "ring-emerald-100",
        text: "text-white",
        icon: CheckCircle2,
      };
    }
    if (severity === "critical") {
      return {
        bg: "bg-rose-600",
        ring: "ring-rose-100",
        text: "text-white",
        icon: ShieldAlert,
      };
    }
    if (severity === "high") {
      return {
        bg: "bg-amber-600",
        ring: "ring-amber-100",
        text: "text-white",
        icon: Flame,
      };
    }
    if (status === "investigating") {
      return {
        bg: "bg-blue-600",
        ring: "ring-blue-100",
        text: "text-white",
        icon: Clock,
      };
    }
    return {
      bg: "bg-slate-700",
      ring: "ring-slate-100",
      text: "text-white",
      icon: AlertTriangle,
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Issues */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-blue-700">
              <Activity className="w-4 h-4 text-blue-600" />
              Total Log Masalah
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.total || 0} Kasus
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
            {summary?.open || 0} Kasus
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

      {/* Toolbar: Search, Filters & Add Button */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari indikasi, penyebab, solusi, atau PIC..."
              title="Ketik untuk mencari log masalah (jeda 400ms)"
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

        {isMember && (
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
        )}
      </div>

      {/* Main Content Area: Activity Timeline View */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs shadow-card">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold text-slate-600">Memuat log investigasi masalah...</span>
          </div>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs shadow-card">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-600 text-sm">Belum ada log permasalahan</p>
          <p className="text-slate-400 mt-1">Tidak ada catatan log yang cocok dengan filter yang dipilih.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedIssuesByDate.map((group) => (
            <div key={group.dateKey} className="space-y-4">
              {/* Date Header aligned on the w-10 timeline column */}
              <div className="flex items-center gap-4">
                {/* Date milestone node centered on the spine column */}
                <div className="w-10 flex justify-center shrink-0">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-blue-400 border-2 border-white flex items-center justify-center shadow-xs">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Date Header Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-sm border border-slate-800 text-xs font-bold shrink-0">
                  <span>{group.formattedDate}</span>
                  {group.relativeLabel && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {group.relativeLabel}
                    </span>
                  )}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                  {group.items.length} Aktivitas Log
                </span>
              </div>

              {/* Timeline Items Track with Centered Continuous Spine */}
              <div className="relative space-y-5">
                {/* Continuous vertical spine line running from calendar milestone down through all nodes */}
                <div className="absolute left-[19px] -top-3 bottom-6 w-[2px] bg-slate-300 z-0" />

                {group.items.map((issue) => {
                  const nodeStyle = getNodeColor(issue.status, issue.severity);
                  const NodeIcon = nodeStyle.icon;

                  return (
                    <div key={issue.id} className="relative flex items-start gap-4 group">
                      {/* Timeline Node Icon (Centered at exactly 20px on the 40px column) */}
                      <div className="w-10 flex justify-center shrink-0 z-10 mt-4">
                        <div
                          className={`w-10 h-10 rounded-full ${nodeStyle.bg} ${nodeStyle.text} flex items-center justify-center shadow-md ring-4 ${nodeStyle.ring} border-2 border-white transition-transform group-hover:scale-105`}
                        >
                          <NodeIcon className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Timeline Activity Card */}
                      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden">
                        {/* Top Bar: Reporter, Status, Severity, Edit/Delete Actions (No bottom border, compact spacing) */}
                        <div className="px-4 pt-4 sm:px-5 sm:pt-5 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Reporter Avatar & Info */}
                            <div className="flex items-center gap-2">
                              <Avatar
                                name={issue.reported_by_name || "User"}
                                color={issue.reported_by_avatar_color || "#2563eb"}
                                size="sm"
                              />
                              <div>
                                <span className="font-bold text-xs text-slate-900 block leading-tight">
                                  {issue.reported_by_name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {issue.reported_by_role ? issue.reported_by_role.toUpperCase() : "Pelapor"}
                                </span>
                              </div>
                            </div>

                            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                            {/* Severity & Status Badges */}
                            <SeverityBadge severity={issue.severity} />
                            <IssueStatusBadge status={issue.status} />

                            {/* Associated Task Pill */}
                            {issue.task_title && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/80 rounded-lg max-w-[260px] truncate">
                                <Bookmark className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">Task: {issue.task_title}</span>
                              </span>
                            )}
                          </div>

                          {/* Action Buttons: Edit and Delete only */}
                          {isMember && (
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              {(isSuperUser || issue.reported_by_id === user?.id) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIssueToEdit(issue);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit log permasalahan ini"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isSuperUser && (
                                <button
                                  type="button"
                                  onClick={() => setIssueToDelete(issue)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Hapus log permasalahan ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 space-y-3">
                          {/* 📌 Problem Statement Section (Clean Neutral Accent) */}
                          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                              <AlertCircle className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                KENDALA / MASALAH YANG TERJADI
                              </span>
                              <RichContentView
                                content={issue.problem}
                                className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug"
                              />
                            </div>
                          </div>

                          {/* 🔬 3-Stage Investigation & Resolution Flow (Unified Neutral Styling) */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* 1. Indikasi & Gejala */}
                            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                <Search className="w-3.5 h-3.5 text-slate-500" />
                                <span>1. Indikasi & Gejala</span>
                              </div>
                              <RichContentView
                                content={issue.indication}
                                className="text-slate-700 text-xs leading-relaxed line-clamp-3"
                              />
                            </div>

                            {/* 2. Akar Masalah */}
                            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                                <span>2. Akar Masalah</span>
                              </div>
                              <RichContentView
                                content={issue.root_cause}
                                className="text-slate-700 text-xs leading-relaxed line-clamp-3"
                              />
                            </div>

                            {/* 3. Solusi & Penanganan */}
                            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>3. Solusi & Penanganan</span>
                              </div>
                              <RichContentView
                                content={issue.solution}
                                className="text-slate-800 text-xs font-medium leading-relaxed line-clamp-3"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Timestamp only */}
                        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {issue.updated_at !== issue.created_at
                              ? `Diperbarui pada ${issue.updated_at}`
                              : `Dicatat pada ${issue.created_at}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Issue */}
      <IssueModal
        isOpen={isModalOpen}
        projectId={projectId}
        issueToEdit={issueToEdit}
        members={members}
        tasks={tasks}
        onClose={handleCloseModal}
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
