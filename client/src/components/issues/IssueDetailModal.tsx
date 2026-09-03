import React from "react";
import { Modal } from "../common/Modal";
import { IssueLog } from "../../types";
import { SeverityBadge, IssueStatusBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { RichContentView } from "../common/RichContentView";
import { format } from "date-fns";
import { 
  Calendar, 
  AlertTriangle, 
  Search, 
  HelpCircle, 
  CheckCircle2, 
  User, 
  ExternalLink 
} from "lucide-react";

interface IssueDetailModalProps {
  issue: IssueLog | null;
  onClose: () => void;
  onEdit: (issue: IssueLog) => void;
}

export function IssueDetailModal({ issue, onClose, onEdit }: IssueDetailModalProps) {
  if (!issue) return null;

  return (
    <Modal
      isOpen={!!issue}
      onClose={onClose}
      title="Rincian Log Permasalahan & Solusi"
      subtitle={`Laporan tanggal ${format(new Date(issue.log_date), "dd MMMM yyyy")}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Top Badges & Reporter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <IssueStatusBadge status={issue.status} />
            {issue.task_title && (
              <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-medium">
                Task: {issue.task_title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-400">Pelapor:</span>
            <Avatar
              name={issue.reported_by_name || "User"}
              color={issue.reported_by_avatar_color || "#2563eb"}
              size="xs"
            />
            <span className="font-semibold text-slate-800">
              {issue.reported_by_name}
            </span>
          </div>
        </div>

        {/* 4 Structured Cards for Problem, Indication, Root Cause, Solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Problem */}
          <div className="bg-rose-50/40 rounded-2xl border border-rose-200/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>1. Permasalahan</span>
            </div>
            <RichContentView content={issue.problem} className="text-xs text-slate-800 font-medium" />
          </div>

          {/* Card 2: Indication */}
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <Search className="w-4 h-4 text-amber-600" />
              <span>2. Indikasi & Gejala Masalah</span>
            </div>
            <RichContentView content={issue.indication} className="text-xs text-slate-800" />
          </div>

          {/* Card 3: Root Cause */}
          <div className="bg-purple-50/40 rounded-2xl border border-purple-200/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-purple-600" />
              <span>3. Akar Penyebab (Root Cause)</span>
            </div>
            <RichContentView content={issue.root_cause} className="text-xs text-slate-800" />
          </div>

          {/* Card 4: Solution */}
          <div className="bg-emerald-50/40 rounded-2xl border border-emerald-200/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>4. Solusi & Tindakan Perbaikan</span>
            </div>
            <RichContentView content={issue.solution} className="text-xs text-slate-800 font-medium" />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            Dicatat pada {format(new Date(issue.created_at), "dd MMM yyyy, HH:mm")}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(issue);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              Edit Log Ini
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
