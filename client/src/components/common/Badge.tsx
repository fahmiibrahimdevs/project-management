import React from "react";
import { TaskPriority, TaskStatus, BOMStatus, BOMPriority, IssueStatus, IssueSeverity } from "../../types";
import { CheckCircle2, Clock, XCircle, Ban, AlertCircle } from "lucide-react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

export function Badge({ children, variant = "default", size = "sm", className = "", title }: BadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";

  const variantClasses = {
    default: "bg-slate-100 text-slate-700 border border-slate-200/80",
    primary: "bg-blue-50 text-blue-700 border border-blue-200/80",
    secondary: "bg-slate-50 text-slate-600 border border-slate-200/60",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/80",
    info: "bg-cyan-50 text-cyan-700 border border-cyan-200/80",
    purple: "bg-purple-50 text-purple-700 border border-purple-200/80",
  }[variant];

  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-md ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case "urgent":
      return (
        <Badge variant="danger" title="Tingkat Prioritas: Mendesak (Harus segera diselesaikan)">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Mendesak
        </Badge>
      );
    case "high":
      return (
        <Badge variant="warning" title="Tingkat Prioritas: Tinggi">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Tinggi
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="primary" title="Tingkat Prioritas: Sedang">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Sedang
        </Badge>
      );
    case "low":
    default:
      return (
        <Badge variant="secondary" title="Tingkat Prioritas: Rendah">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Rendah
        </Badge>
      );
  }
}

export function BOMPriorityBadge({ priority }: { priority: BOMPriority }) {
  switch (priority) {
    case "high":
      return (
        <Badge variant="danger" title="Prioritas Pengadaan: Tinggi">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Tinggi
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="warning" title="Prioritas Pengadaan: Sedang">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Sedang
        </Badge>
      );
    case "low":
    default:
      return (
        <Badge variant="secondary" title="Prioritas Pengadaan: Rendah">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Rendah
        </Badge>
      );
  }
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case "completed":
      return <Badge variant="success" title="Status: Tugas Selesai Dikerjakan">Selesai</Badge>;
    case "in_review":
      return <Badge variant="purple" title="Status: Dalam Peninjauan / Verifikasi Hasil">Ditinjau</Badge>;
    case "in_progress":
      return <Badge variant="primary" title="Status: Sedang Dikerjakan oleh Anggota">Dikerjakan</Badge>;
    case "on_hold":
      return <Badge variant="warning" title="Status: Ditunda Sementara">Ditunda</Badge>;
    case "backlog":
    default:
      return <Badge variant="secondary" title="Status: Antrean / Rencana Tugas">Antrean</Badge>;
  }
}

export function BOMStatusBadge({ status }: { status: BOMStatus }) {
  switch (status) {
    case "sudah_checkout":
      return (
        <span 
          title="Status Pembelian: Barang sudah dicheckout / dibeli"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Sudah Checkout
        </span>
      );
    case "ditolak":
      return (
        <span 
          title="Status Pembelian: Permintaan pengadaan ditolak"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200"
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Ditolak
        </span>
      );
    case "dibatalkan":
      return (
        <span 
          title="Status Pembelian: Pengadaan dibatalkan"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200"
        >
          <Ban className="w-3.5 h-3.5 text-slate-400" />
          Dibatalkan
        </span>
      );
    case "belum_checkout":
    default:
      return (
        <span 
          title="Status Pembelian: Belum dicheckout, menunggu proses pembelian"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Belum Checkout
        </span>
      );
  }
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  switch (status) {
    case "resolved":
      return <Badge variant="success" title="Status Masalah: Solusi telah diterapkan dan terverifikasi">Terselesaikan</Badge>;
    case "closed":
      return <Badge variant="secondary" title="Status Masalah: Selesai dan ditutup permanen">Ditutup</Badge>;
    case "investigating":
      return <Badge variant="warning" title="Status Masalah: Sedang diinvestigasi / analisis akar masalah">Investigasi</Badge>;
    case "open":
    default:
      return <Badge variant="danger" title="Status Masalah: Baru dilaporkan, belum ditangani">Terbuka</Badge>;
  }
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  switch (severity) {
    case "critical":
      return (
        <Badge variant="danger" title="Tingkat Dampak: Kritis (Menghentikan proyek / fatal)">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
          Kritis
        </Badge>
      );
    case "high":
      return <Badge variant="danger" title="Tingkat Dampak: Tinggi">Tinggi</Badge>;
    case "medium":
      return <Badge variant="warning" title="Tingkat Dampak: Sedang">Sedang</Badge>;
    case "low":
    default:
      return <Badge variant="secondary" title="Tingkat Dampak: Rendah">Rendah</Badge>;
  }
}

export function getDeadlineInfo(deadlineStr?: string | null, status?: TaskStatus) {
  if (!deadlineStr) return null;
  try {
    const parts = deadlineStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const target = new Date(year, month, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const formattedDate = `${day} ${monthNames[month]} ${year}`;
    const shortDate = `${day} ${monthNames[month]}`;

    if (status === "completed") {
      return {
        formattedDate,
        shortDate,
        label: formattedDate,
        shortLabel: shortDate,
        isCompleted: true,
        isOverdue: false,
        days: diffDays,
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200/80",
      };
    }

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        formattedDate,
        shortDate,
        label: `Terlambat ${overdueDays} hari (${shortDate})`,
        shortLabel: `Terlambat ${overdueDays}h`,
        isCompleted: false,
        isOverdue: true,
        days: diffDays,
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
      };
    }

    if (diffDays === 0) {
      return {
        formattedDate,
        shortDate,
        label: `Hari ini tenggat (${shortDate})`,
        shortLabel: "Hari ini",
        isCompleted: false,
        isOverdue: false,
        days: 0,
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
      };
    }

    if (diffDays === 1) {
      return {
        formattedDate,
        shortDate,
        label: `Besok (1 hari lagi • ${shortDate})`,
        shortLabel: "Besok",
        isCompleted: false,
        isOverdue: false,
        days: 1,
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
      };
    }

    return {
      formattedDate,
      shortDate,
      label: `${diffDays} hari lagi (${shortDate})`,
      shortLabel: `${diffDays} hari lagi`,
      isCompleted: false,
      isOverdue: false,
      days: diffDays,
      badgeClass: diffDays <= 3 
        ? "bg-amber-50 text-amber-800 border-amber-200 font-semibold" 
        : "bg-blue-50 text-blue-700 border-blue-200 font-medium",
    };
  } catch {
    return null;
  }
}

export function DeadlineBadge({ 
  deadline, 
  status, 
  compact = false 
}: { 
  deadline?: string | null; 
  status?: TaskStatus; 
  compact?: boolean;
}) {
  const info = getDeadlineInfo(deadline, status);
  if (!info) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 select-none ${info.badgeClass}`}
      title={`Batas Waktu Pengerjaan: ${info.formattedDate}`}
    >
      {info.isOverdue ? (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
      ) : (
        <Clock className="w-3 h-3 opacity-60 shrink-0" />
      )}
      <span className="whitespace-nowrap">{compact ? info.shortLabel : info.label}</span>
    </span>
  );
}
