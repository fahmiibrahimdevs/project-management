import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "../../api/client";
import { NotificationItem } from "../../types";
import { Avatar } from "../common/Avatar";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  CheckSquare,
  Clock,
  Trash2,
  ExternalLink,
  Sparkles,
  Inbox,
  Filter
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface NotificationDropdownProps {
  onSelectTask: (projectId: string, taskId: string) => void;
}

export function NotificationDropdown({ onSelectTask }: NotificationDropdownProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNotifications(user?.id);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteNotifMutation = useDeleteNotification();

  const unreadCount = data?.unread_count || 0;
  const notifications: NotificationItem[] = data?.notifications || [];

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n) => n.is_read === 0)
    : notifications;

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || unreadCount === 0) return;
    markAllReadMutation.mutate(user.id);
  };

  const handleMarkSingleRead = (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    if (notif.is_read === 0) {
      markReadMutation.mutate(notif.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotifMutation.mutate(id);
  };

  const handleItemClick = (notif: NotificationItem) => {
    if (notif.is_read === 0) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
    if (notif.project_id && notif.task_id) {
      onSelectTask(notif.project_id, notif.task_id);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return formatDistanceToNow(date, { addSuffix: true, locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🔔 Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifikasi Komentar & Tugas"
        className={`relative p-2 rounded-xl border transition-all ${
          isOpen
            ? "bg-blue-50 border-blue-300 text-blue-600 shadow-2xs"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* 🔴 Unread Badge Indicator */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 🪟 Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[540px] animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                      {unreadCount} baru
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* "Tandai telah dibaca semua" Action Button */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markAllReadMutation.isPending}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                title="Tandai seluruh notifikasi telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>

          {/* Filter Bar (Semua / Belum Dibaca) */}
          <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  filter === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Semua ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  filter === "unread"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Belum Dibaca ({unreadCount})
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-medium">
              Otomatis sinkron 10d
            </span>
          </div>

          {/* Notification List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat notifikasi...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-600">
                  {filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi"}
                </p>
                <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  {filter === "unread"
                    ? "Semua notifikasi komentar dan tugas telah Anda baca."
                    : "Komentar task dan penugasan baru akan muncul di sini."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUnread = notif.is_read === 0;
                const isComment = notif.type === "task_comment";

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3 sm:p-3.5 transition-all flex items-start gap-3 cursor-pointer group hover:bg-slate-50 relative ${
                      isUnread ? "bg-blue-50/40" : "bg-white"
                    }`}
                  >
                    {/* Unread Glow Ribbon Indicator */}
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute left-1.5 top-5 ring-2 ring-blue-200" />
                    )}

                    {/* Actor Avatar or Icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar
                        name={notif.actor_name || "User"}
                        color={notif.actor_avatar_color || "#2563eb"}
                        size="sm"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs ${
                        isComment ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                      }`}>
                        {isComment ? (
                          <MessageSquare className="w-2 h-2 stroke-[3]" />
                        ) : (
                          <CheckSquare className="w-2 h-2 stroke-[3]" />
                        )}
                      </div>
                    </div>

                    {/* Message Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
                          {notif.actor_name ? <span>{notif.actor_name}</span> : <span>Seseorang</span>}
                          <span className="font-normal text-slate-600 ml-1">
                            {isComment ? "mengomentari" : "menugaskan Anda di"}
                          </span>
                        </p>

                        <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatRelativeTime(notif.created_at)}</span>
                        </span>
                      </div>

                      {/* Project & Task Code Pill */}
                      {notif.task_title && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold font-mono text-[9px] border border-blue-200/80">
                            {notif.project_code || "TASK"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[200px]">
                            {notif.task_title}
                          </span>
                        </div>
                      )}

                      {/* Comment Message Snippet */}
                      <p className="text-xs text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 italic line-clamp-2 leading-relaxed">
                        &ldquo;{notif.message}&rdquo;
                      </p>
                    </div>

                    {/* Item Actions (Mark as Read / Delete) */}
                    <div className="flex flex-col items-center gap-1 shrink-0 self-center opacity-70 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkSingleRead(e, notif)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Tandai telah dibaca"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, notif.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus notifikasi"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/90 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
            Klik notifikasi untuk membuka task terkait
          </div>
        </div>
      )}
    </div>
  );
}
