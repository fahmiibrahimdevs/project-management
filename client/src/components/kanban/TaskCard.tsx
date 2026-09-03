import React from "react";
import { Task } from "../../types";
import { PriorityBadge, DeadlineBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { 
  CheckSquare, 
  MessageSquare, 
  Paperclip
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const totalCriteria = task.total_criteria || 0;
  const completedCriteria = task.completed_criteria || 0;
  const totalComments = task.total_comments || 0;
  const totalAttachments = task.total_attachments || 0;
  const assignees = task.assignees || [];

  return (
    <div
      onClick={onClick}
      title="Klik untuk membuka detail & progres tugas"
      className={`group bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none relative ${
        isDragging
          ? "rotate-2 shadow-2xl border-blue-400 ring-2 ring-blue-400/20"
          : "hover:border-blue-300"
      }`}
    >
      {/* Top Header: Priority Badge & Deadline */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 flex-nowrap min-w-0">
        <PriorityBadge priority={task.priority} />

        {task.deadline && (
          <DeadlineBadge deadline={task.deadline} status={task.status} compact={true} />
        )}
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-2">
        {task.title}
      </h4>

      {/* Description Snippet (if available) */}
      {task.description && (
        <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-normal">
          {task.description}
        </p>
      )}

      {/* Acceptance Criteria Mini Progress Bar (if exists) */}
      {totalCriteria > 0 && (
        <div 
          className="mb-3"
          title={`Kriteria penerimaan: ${completedCriteria} dari ${totalCriteria} selesai (${Math.round((completedCriteria / totalCriteria) * 100)}%)`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-medium">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-slate-400" />
              Kriteria
            </span>
            <span>
              {completedCriteria}/{totalCriteria} ({Math.round((completedCriteria / totalCriteria) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                completedCriteria === totalCriteria ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${(completedCriteria / totalCriteria) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Multiple Assignees & Meta Counts */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
        {/* Assignees Avatar Stack */}
        {assignees.length > 0 ? (
          <div 
            className="flex items-center gap-1.5"
            title={`Pelaksana tugas: ${assignees.map((a) => a.name).join(", ")}`}
          >
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {assignees.slice(0, 3).map((a) => (
                <Avatar
                  key={a.id}
                  name={a.name}
                  color={a.avatar_color || "#2563eb"}
                  size="xs"
                  className="ring-2 ring-white"
                />
              ))}
              {assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-slate-600 truncate max-w-[90px]">
              {assignees.length === 1
                ? assignees[0].name.split(" ")[0]
                : `${assignees.length} orang`}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Belum ditugaskan</span>
        )}

        {/* Indicators (Comments & Attachments) */}
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
          {totalComments > 0 && (
            <div className="flex items-center gap-1 hover:text-slate-600" title={`Ada ${totalComments} pesan diskusi`}>
              <MessageSquare className="w-3 h-3" />
              <span>{totalComments}</span>
            </div>
          )}
          {totalAttachments > 0 && (
            <div className="flex items-center gap-1 hover:text-slate-600" title={`Ada ${totalAttachments} berkas lampiran`}>
              <Paperclip className="w-3 h-3" />
              <span>{totalAttachments}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
