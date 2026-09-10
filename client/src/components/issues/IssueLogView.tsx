import React, { useState, useMemo } from "react";
import { IssueLog, IssueStatus, IssueSeverity, Member, Task } from "../../types";
import { SeverityBadge, IssueStatusBadge } from "../common/Badge";
import { Avatar } from "../common/Avatar";
import { SearchableSelect } from "../common/SearchableSelect";
import { RichContentView } from "../common/RichContentView";
import { IssueModal } from "./IssueModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { useIssueLogs, useDeleteIssueLog, useProjectLocations } from "../../api/client";
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
  MapPin,
  BarChart3,
  ChevronUp,
  ChevronDown,
  PieChart as PieChartIcon,
  TrendingUp,
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
  const { data: locations = [] } = useProjectLocations(projectId);
  const deleteMutation = useDeleteIssueLog();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(isCreateModalOpen);
  const [issueToEdit, setIssueToEdit] = useState<IssueLog | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<IssueLog | null>(null);

  const issues = data?.issues || [];
  const summary = data?.summary;

  // Analytics calculations for IssueLogView
  const issueAnalytics = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;
    const open = issues.filter((i) => i.status === "open").length;
    const investigating = issues.filter((i) => i.status === "investigating").length;

    const critical = issues.filter((i) => i.severity === "critical").length;
    const high = issues.filter((i) => i.severity === "high").length;
    const medium = issues.filter((i) => i.severity === "medium").length;
    const low = issues.filter((i) => i.severity === "low").length;

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const severitySegments = [
      { key: "critical", label: "Kritis", count: critical, color: "#f43f5e" },
      { key: "high", label: "Tinggi", count: high, color: "#f59e0b" },
      { key: "medium", label: "Sedang", count: medium, color: "#0ea5e9" },
      { key: "low", label: "Rendah", count: low, color: "#94a3b8" },
    ];

    const circumference = 2 * Math.PI * 56;
    let accumulatedOffset = 0;
    const donutSlices = severitySegments.map((seg) => {
      const percentage = total > 0 ? (seg.count / total) * 100 : 0;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += (percentage / 100) * circumference;
      return {
        ...seg,
        percentage: Math.round(percentage),
        strokeDasharray,
        strokeDashoffset,
      };
    });

    const locationIssues: Record<string, { name: string; count: number; criticalCount: number }> = {};
    issues.forEach((iss) => {
      const locName = iss.location_name || (iss.location_id ? "Lokasi Tertentu" : "Umum / Tanpa Lokasi");
      if (!locationIssues[locName]) {
        locationIssues[locName] = { name: locName, count: 0, criticalCount: 0 };
      }
      locationIssues[locName].count += 1;
      if (iss.severity === "critical" || iss.severity === "high") {
        locationIssues[locName].criticalCount += 1;
      }
    });

    const topLocations = Object.values(locationIssues).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total,
      resolved,
      open,
      investigating,
      critical,
      high,
      medium,
      low,
      resolutionRate,
      donutSlices,
      topLocations,
    };
  }, [issues]);

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

      let matchLocation = true;
      if (selectedLocation === "none") {
        matchLocation = !iss.location_id || iss.location_id === "";
      } else if (selectedLocation !== "all") {
        matchLocation = iss.location_id === selectedLocation;
      }

      return matchSearch && matchStatus && matchSeverity && matchLocation;
    });

    return [...result].sort((a, b) => {
      const dateDiff = new Date(b.log_date).getTime() - new Date(a.log_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
    });
  }, [issues, debouncedSearch, selectedStatus, selectedSeverity, selectedLocation]);

  // Group issues by date for Activity Timeline view
  const groupedIssuesByDate = useMemo(() => {
    const groups: Record<
      string,
      {
        dateKey: string;
        dateStr: string;
        formattedDate: string;
        relativeLabel?: string;
        items: IssueLog[];
      }
    > = {};

    filteredIssues.forEach((issue) => {
      const dateKey = issue.log_date;
      if (!groups[dateKey]) {
        let label: string | undefined = undefined;
        try {
          const parsed = parseISO(dateKey);
          if (isToday(parsed)) {
            label = "Hari Ini";
          } else if (isYesterday(parsed)) {
            label = "Kemarin";
          }
        } catch {}

        let formatted = dateKey;
        try {
          formatted = format(parseISO(dateKey), "EEEE, dd MMMM yyyy", { locale: localeId });
        } catch {}

        groups[dateKey] = {
          dateKey: dateKey,
          dateStr: dateKey,
          formattedDate: formatted,
          relativeLabel: label,
          items: [],
        };
      }
      groups[dateKey].items.push(issue);
    });

    return Object.values(groups).sort((a, b) => {
      return new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime();
    });
  }, [filteredIssues]);

  // Helper for status styling on timeline nodes
  const getNodeColor = (status: IssueStatus, severity: IssueSeverity) => {
    if (status === "resolved" || status === "closed") {
      return {
        bg: "bg-emerald-500",
        ring: "ring-emerald-100",
        text: "text-white",
        icon: CheckCircle2,
      };
    }
    if (severity === "critical") {
      return {
        bg: "bg-rose-500",
        ring: "ring-rose-100",
        text: "text-white",
        icon: ShieldAlert,
      };
    }
    if (severity === "high") {
      return {
        bg: "bg-amber-500",
        ring: "ring-amber-100",
        text: "text-white",
        icon: AlertTriangle,
      };
    }
    return {
      bg: "bg-blue-500",
      ring: "ring-blue-100",
      text: "text-white",
      icon: Activity,
    };
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Log Investigasi Masalah & Analisis RCA
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Dokumentasikan kendala teknis lapangan, investigasi indikasi gejala, analisis akar masalah (RCA), dan solusi penanganan.
        </p>
      </div>

      {/* Top 4 Metric Cards (Consistent Semantic Flow: Blue > Green > Yellow > Red) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Issues (Primary Sky Color - Biru) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-sky-700">
              <AlertTriangle className="w-4 h-4 text-sky-600" />
              Total Log Masalah
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
              {summary?.total || 0} Kasus
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.total || 0} Kasus
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.resolved || 0} terselesaikan, {summary?.open || 0} terbuka
          </div>
        </div>

        {/* 2. Selesai / Resolved (Semantic Success - Hijau) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Terselesaikan (Resolved)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {summary?.resolved || 0} Kasus
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {summary?.resolved || 0} Kasus
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Akar masalah & solusi terdokumentasi
          </div>
        </div>

        {/* 3. Masalah Terbuka (Semantic Pending/Warning - Kuning/Amber) */}
        {(() => {
          const openCount = summary?.open || 0;
          return (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold flex items-center gap-1.5 text-amber-700">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Masalah Terbuka
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {openCount} Kasus
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                {openCount} Kasus
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {openCount > 0 ? "Perlu investigasi & analisis akar masalah" : "Tidak ada kendala aktif yang terbuka"}
              </div>
            </div>
          );
        })()}

        {/* 4. Dampak Kritis (Semantic Danger - Merah/Rose) */}
        {(() => {
          const criticalCount = summary?.severity.critical || 0;
          return (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold flex items-center gap-1.5 text-rose-700">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Dampak Kritis
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  {criticalCount} Kasus
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                {criticalCount} Kasus
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {criticalCount > 0 ? "Prioritas penanganan tertinggi" : "Tidak ada kendala berdampak kritis"}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Toolbar: Search, Filters & Action Button (Guaranteed No-Wrap) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-44 sm:w-52 xl:w-60 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari indikasi, penyebab, solusi, atau PIC..."
              title="Ketik untuk mencari log masalah (jeda 400ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 shadow-2xs transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="shrink-0 min-w-[160px]">
            <SearchableSelect
              size="sm"
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              options={[
                { value: "all", label: "Semua Status Penanganan" },
                { value: "open", label: "Status: Terbuka", badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold">Open</span> },
                { value: "investigating", label: "Status: Investigasi", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">Investigating</span> },
                { value: "resolved", label: "Status: Terselesaikan", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Resolved</span> },
                { value: "closed", label: "Status: Ditutup", badge: <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Closed</span> },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Severity Filter */}
          <div className="shrink-0 min-w-[160px]">
            <SearchableSelect
              size="sm"
              value={selectedSeverity}
              onChange={(val) => setSelectedSeverity(val)}
              options={[
                { value: "all", label: "Semua Tingkat Dampak" },
                { value: "critical", label: "Dampak: Kritis", badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold">Critical</span> },
                { value: "high", label: "Dampak: Tinggi", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">High</span> },
                { value: "medium", label: "Dampak: Sedang", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Medium</span> },
                { value: "low", label: "Dampak: Rendah", badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">Low</span> },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Location Filter */}
          {locations.length > 0 && (
            <div className="shrink-0 min-w-[160px]">
              <SearchableSelect
                size="sm"
                value={selectedLocation}
                onChange={(val) => setSelectedLocation(val)}
                options={[
                  { value: "all", label: `Semua Lokasi (${locations.length})` },
                  { value: "none", label: "Tanpa Lokasi Spesifik" },
                  ...locations.map((loc) => ({
                    value: loc.id,
                    label: `📍 ${loc.name}`,
                    sublabel: loc.address || undefined,
                  })),
                ]}
                searchPlaceholder="Cari lokasi..."
                minItemsForSearch={5}
              />
            </div>
          )}
        </div>

        {/* Actions Cluster: Toggle Analytics & Create Issue */}
        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              showAnalytics
                ? "bg-sky-50 text-sky-700 border-sky-300 shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 shadow-2xs"
            }`}
            title="Tampilkan / Sembunyikan visualisasi grafik analisis kendala"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${showAnalytics ? "text-sky-600" : "text-slate-500"}`} />
            <span>Grafik Kendala</span>
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {isMember && (
            <button
              type="button"
              onClick={() => {
                setIssueToEdit(null);
                setIsModalOpen(true);
              }}
              title="Catat kendala teknis atau masalah baru"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Log Masalah Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Analytics Charts Panel */}
      {showAnalytics && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-100 rounded-lg text-sky-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Analisis Matriks Kendala & Tingkat Keparahan (RCA)
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  Sebaran dampak masalah, efektivitas penanganan, dan titik lokasi rawan kendala
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">
                Total: <strong className="text-slate-900 font-mono font-bold">{issueAnalytics.total}</strong> Kasus
              </span>
            </div>
          </div>

          {/* Charts Grid: Donut Severity & Issues per Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* 1. Donut Chart Severity Distribution */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Distribusi Tingkat Dampak / Keparahan</span>
              </div>
              
              {issueAnalytics.total === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada data kendala untuk dianalisis</div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* SVG Donut */}
                  <div className="relative w-32 h-32 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                      <circle
                        cx="70"
                        cy="70"
                        r="56"
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="18"
                      />
                      {issueAnalytics.donutSlices.map((slice) => (
                        <circle
                          key={slice.key}
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="18"
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          className="transition-all duration-500 ease-out"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-black font-mono text-slate-900 leading-none">
                        {issueAnalytics.resolutionRate}%
                      </span>
                      <span className="text-[11px] text-slate-700 font-bold mt-0.5">Terselesaikan</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs flex-1 w-full">
                    {issueAnalytics.donutSlices.map((slice) => (
                      <div key={slice.key} className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-slate-800 font-medium truncate text-xs">{slice.label}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {slice.count} <span className="font-medium text-slate-600 text-[11px]">({slice.percentage}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Location Issues Breakdown */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Sebaran Kasus Masalah per Lokasi</span>
              </div>

              {issueAnalytics.topLocations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada lokasi tercatat pada log masalah</div>
              ) : (
                <div className="space-y-3 text-xs">
                  {issueAnalytics.topLocations.map((loc) => {
                    const maxCount = issueAnalytics.topLocations[0]?.count || 1;
                    const pct = Math.min(100, Math.round((loc.count / maxCount) * 100));
                    return (
                      <div key={loc.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate">{loc.name}</span>
                          <span className="font-mono text-slate-900 font-bold text-xs">
                            {loc.count} kasus {loc.criticalCount > 0 && <span className="text-rose-600 font-bold">({loc.criticalCount} kritis)</span>}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all duration-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

                      {/* Timeline Activity Card (Clean White Canvas) */}
                      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden">
                        {/* Top Bar: Reporter, Status, Severity, Edit/Delete Actions */}
                        <div className="px-4 pt-4 sm:px-5 sm:pt-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-b border-slate-100">
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

                            {/* Location Badge */}
                            {issue.location_name && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50/80 border border-sky-200/80 rounded-lg max-w-[240px] truncate">
                                <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                                <span className="truncate">Lokasi: {issue.location_name}</span>
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
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
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
                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 space-y-3.5">
                          {/* 📌 Problem Statement Section (White Card + Shadow) */}
                          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                                KENDALA / MASALAH YANG TERJADI
                              </span>
                              <RichContentView
                                content={issue.problem}
                                className="text-xs sm:text-sm font-bold text-slate-900 leading-snug"
                              />
                            </div>
                          </div>

                          {/* 🔬 3-Stage Investigation & Resolution Flow (3 White Cards + Shadow, No HR lines) */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                            {/* 1. INDIKASI & GEJALA */}
                            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
                                  <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>1. INDIKASI & GEJALA</span>
                                </div>
                                <RichContentView
                                  content={issue.indication || "Tidak ada indikasi tercatat."}
                                  className="text-slate-800 text-xs sm:text-[13px] leading-relaxed font-medium"
                                />
                              </div>
                            </div>

                            {/* 2. AKAR MASALAH */}
                            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>2. AKAR MASALAH</span>
                                </div>
                                <RichContentView
                                  content={issue.root_cause || "Belum ada analisis akar masalah."}
                                  className="text-slate-800 text-xs sm:text-[13px] leading-relaxed font-medium"
                                />
                              </div>
                            </div>

                            {/* 3. SOLUSI & PENANGANAN */}
                            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>3. SOLUSI & PENANGANAN</span>
                                </div>
                                {issue.solution && issue.solution.trim() && issue.solution.trim() !== "-" ? (
                                  <RichContentView
                                    content={issue.solution}
                                    className="text-slate-800 text-xs sm:text-[13px] font-medium leading-relaxed"
                                  />
                                ) : (
                                  <p className="text-xs text-slate-400 italic py-0.5">
                                    Belum ada catatan solusi & tindakan penanganan.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Timestamp only */}
                        <div className="px-4 sm:px-5 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
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
