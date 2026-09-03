import React, { useState, useMemo } from "react";
import { Task, ProjectAttachment, FileCategory } from "../../types";
import { 
  useProjectAttachments, 
  useRenameAttachment, 
  useDeleteProjectAttachment 
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileUploadModal } from "./FileUploadModal";
import { Pagination } from "../common/Pagination";
import { showConfirm, notifySuccess, notifyError } from "../../utils/swal";
import { useDebounce } from "../../hooks/useDebounce";
import Swal from "sweetalert2";
import { 
  UploadCloud, 
  Search, 
  FileText, 
  File, 
  FileSpreadsheet, 
  FileArchive, 
  FileCode, 
  Image as ImageIcon,
  Download,
  Eye,
  Edit2,
  Trash2,
  HardDrive,
  Filter,
  Grid,
  List as ListIcon,
  Layers,
  Calendar,
  User,
  Plus,
  ArrowUpDown,
  Sparkles
} from "lucide-react";

interface ProjectAttachmentsTabProps {
  projectId: string;
  tasks: Task[];
}

export function ProjectAttachmentsTab({ projectId, tasks = [] }: ProjectAttachmentsTabProps) {
  const { user, isSuperUser } = useAuth();
  const { data, isLoading, error } = useProjectAttachments(projectId);

  const [activeCategory, setActiveCategory] = useState<FileCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [sortBy, setSortBy] = useState<"newest" | "name" | "size">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ProjectAttachment | null>(null);

  const renameMutation = useRenameAttachment();
  const deleteMutation = useDeleteProjectAttachment();

  const attachments: ProjectAttachment[] = data?.items || [];
  const summary = data?.summary || {
    total_files: 0,
    total_bytes: 0,
    by_category: { document: 0, image: 0, spreadsheet: 0, archive: 0, cad: 0, other: 0 },
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Filter & Sort attachments
  const filteredAttachments = useMemo(() => {
    return attachments
      .filter((item) => {
        // Category filter
        if (activeCategory !== "all" && item.category !== activeCategory) {
          return false;
        }

        // Search filter with Debounce
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          const matchName = item.file_name.toLowerCase().includes(q);
          const matchTask = item.task_title ? item.task_title.toLowerCase().includes(q) : false;
          const matchUploader = item.uploaded_by_name ? item.uploaded_by_name.toLowerCase().includes(q) : false;
          const matchExt = item.file_name.split(".").pop()?.toLowerCase().includes(q);
          if (!matchName && !matchTask && !matchUploader && !matchExt) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.file_name.localeCompare(b.file_name);
        }
        if (sortBy === "size") {
          return b.file_size - a.file_size;
        }
        // default: newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [attachments, activeCategory, debouncedSearch, sortBy]);

  // Auto-reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, debouncedSearch, sortBy]);

  const paginatedAttachments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAttachments.slice(start, start + pageSize);
  }, [filteredAttachments, currentPage, pageSize]);

  const handleRename = async (att: ProjectAttachment) => {
    const ext = att.file_name.includes(".") ? att.file_name.split(".").pop() || "" : "";
    const baseName = ext ? att.file_name.slice(0, -(ext.length + 1)) : att.file_name;

    const { value: newBaseName } = await Swal.fire({
      title: "Ganti Nama Berkas",
      input: "text",
      inputValue: baseName,
      inputLabel: `Ekstensi (.${ext}) akan otomatis dipertahankan:`,
      showCancelButton: true,
      confirmButtonText: "Simpan Nama",
      cancelButtonText: "Batal",
      inputValidator: (val) => {
        if (!val || !val.trim()) return "Nama berkas tidak boleh kosong!";
        return null;
      },
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-slate-200 font-sans p-6",
        title: "text-base font-bold text-slate-900",
        confirmButton: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs ml-2",
        cancelButton: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium",
      },
      buttonsStyling: false,
    });

    if (newBaseName && newBaseName.trim() !== baseName) {
      const finalFileName = ext ? `${newBaseName.trim()}.${ext}` : newBaseName.trim();
      try {
        await renameMutation.mutateAsync({
          id: att.id,
          projectId,
          fileName: finalFileName,
        });
        notifySuccess("Nama Berkas Diperbarui", `Menjadi "${finalFileName}"`);
      } catch (err: any) {
        notifyError("Gagal Mengubah Nama", err.message || "Terjadi kesalahan.");
      }
    }
  };

  const handleDelete = async (att: ProjectAttachment) => {
    const confirmed = await showConfirm({
      title: "Hapus Berkas Ini?",
      text: `Berkas "${att.file_name}" (${formatFileSize(att.file_size)}) akan dihapus permanen dari proyek.`,
      icon: "warning",
      confirmButtonText: "Ya, Hapus File",
      isDanger: true,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync({ id: att.id, projectId });
        notifySuccess("Berkas Berhasil Dihapus");
      } catch (err: any) {
        notifyError("Gagal Menghapus", err.message || "Terjadi kesalahan.");
      }
    }
  };

  const getFileIcon = (cat?: string, ext?: string) => {
    const e = (ext || "").toLowerCase();
    if (e === "pdf" || cat === "document") {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(e) || cat === "image") {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    }
    if (["xlsx", "xls", "csv"].includes(e) || cat === "spreadsheet") {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(e) || cat === "archive") {
      return <FileArchive className="w-5 h-5 text-purple-600" />;
    }
    if (["dwg", "dxf", "step", "stp", "stl"].includes(e) || cat === "cad") {
      return <FileCode className="w-5 h-5 text-amber-600" />;
    }
    return <File className="w-5 h-5 text-slate-600" />;
  };

  const getFileBadgeBg = (cat?: string, ext?: string) => {
    const e = (ext || "").toLowerCase();
    if (e === "pdf") return "bg-rose-50 text-rose-700 border-rose-200";
    if (cat === "document") return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (cat === "image") return "bg-blue-50 text-blue-700 border-blue-200";
    if (cat === "spreadsheet") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (cat === "archive") return "bg-purple-50 text-purple-700 border-purple-200";
    if (cat === "cad") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-5">
      {/* 🌟 Top Metric Cards & Upload Action */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Storage Used */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kapasitas</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">
              {formatFileSize(summary.total_bytes)}
            </p>
          </div>
        </div>

        {/* Total Files */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
            <File className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Berkas</p>
            <p className="text-sm font-extrabold text-slate-900">{summary.total_files}</p>
          </div>
        </div>

        {/* Documents / PDF */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Dokumen / PDF</p>
            <p className="text-sm font-extrabold text-slate-900">{summary.by_category.document}</p>
          </div>
        </div>

        {/* Images */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gambar / Foto</p>
            <p className="text-sm font-extrabold text-slate-900">{summary.by_category.image}</p>
          </div>
        </div>

        {/* Spreadsheets */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Data / Excel</p>
            <p className="text-sm font-extrabold text-slate-900">{summary.by_category.spreadsheet}</p>
          </div>
        </div>

        {/* CAD & Archives */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <FileCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Arsip & CAD</p>
            <p className="text-sm font-extrabold text-slate-900">{summary.by_category.cad + summary.by_category.archive}</p>
          </div>
        </div>
      </div>

      {/* 🛠️ Main Control Bar: Sub-tabs, Search, Sort & Upload Button */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card space-y-4">
        {/* Category Filter Pills & Upload Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Semua Berkas ({summary.total_files})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("document")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "document"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📄 Dokumen & PDF ({summary.by_category.document})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("image")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "image"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              🖼️ Gambar / Foto ({summary.by_category.image})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("spreadsheet")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "spreadsheet"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📊 Spreadsheet & Data ({summary.by_category.spreadsheet})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("cad")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "cad"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📐 CAD / 3D ({summary.by_category.cad})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("archive")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "archive"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📦 Arsip ZIP ({summary.by_category.archive})
            </button>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Unggah Berkas (Max 100MB)</span>
          </button>
        </div>

        {/* Toolbar: Search, Sort & View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama berkas, task, pengunggah..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium"
              >
                <option value="newest">Terbaru</option>
                <option value="name">Nama (A - Z)</option>
                <option value="size">Ukuran Terbesar</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Grid Kartu"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Tabel"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📁 Content View (Grid or Table) */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 mx-auto border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500">Memuat lampiran berkas proyek...</p>
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Belum Ada Berkas di Kategori Ini</h4>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? "Tidak ada berkas yang sesuai dengan kata kunci pencarian Anda." : "Klik tombol Unggah Berkas untuk menambahkan dokumen atau gambar ke proyek."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah Berkas Sekarang</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* 🔳 GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedAttachments.map((att) => {
            const ext = att.file_name.split(".").pop()?.toLowerCase() || "";
            const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || att.category === "image";

            return (
              <div
                key={att.id}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-card transition-all p-4 flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Card Header & Thumbnail */}
                <div className="space-y-3">
                  {/* Thumbnail / File Header */}
                  {isImage ? (
                    <div 
                      onClick={() => setPreviewAttachment(att)}
                      className="w-full h-36 rounded-xl bg-slate-900/5 overflow-hidden border border-slate-200/60 relative cursor-pointer group-hover:opacity-95 transition-opacity flex items-center justify-center"
                    >
                      <img
                        src={att.file_url}
                        alt={att.file_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                        <Eye className="w-4 h-4" />
                        <span>Pratinjau Foto</span>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setPreviewAttachment(att)}
                      className="w-full h-24 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center cursor-pointer hover:bg-blue-50/40 transition-colors"
                    >
                      {getFileIcon(att.category, ext)}
                    </div>
                  )}

                  {/* Title & Metadata */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase ${getFileBadgeBg(att.category, ext)}`}>
                        .{ext || "FILE"}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatFileSize(att.file_size)}
                      </span>
                    </div>

                    <h4 
                      onClick={() => setPreviewAttachment(att)}
                      className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug cursor-pointer break-all"
                      title={att.file_name}
                    >
                      {att.file_name}
                    </h4>

                    {/* Source / Task Badge */}
                    <div className="mt-2">
                      {att.task_title ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 max-w-full truncate">
                          <Layers className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Task: {att.task_title}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          📁 Dokumen Proyek
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Uploader, Date & Actions */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0 text-[10px] text-slate-400 truncate">
                    {att.uploaded_by_name ? (
                      <span className="font-medium text-slate-600 truncate block">
                        {att.uploaded_by_name}
                      </span>
                    ) : (
                      <span>{att.created_at?.split(" ")[0]}</span>
                    )}
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(att)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Lihat Pratinjau"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={att.file_url}
                      download={att.file_name}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Unduh File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRename(att)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Ganti Nama File"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(att)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 📋 TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Berkas</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Ukuran</th>
                  <th className="py-3 px-3">Kaitan Proyek / Task</th>
                  <th className="py-3 px-3">Diunggah Oleh</th>
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedAttachments.map((att) => {
                  const ext = att.file_name.split(".").pop()?.toLowerCase() || "";
                  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || att.category === "image";

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          <div 
                            onClick={() => setPreviewAttachment(att)}
                            className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-50"
                          >
                            {isImage ? (
                              <img src={att.file_url} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              getFileIcon(att.category, ext)
                            )}
                          </div>
                          <span 
                            onClick={() => setPreviewAttachment(att)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer"
                            title={att.file_name}
                          >
                            {att.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase ${getFileBadgeBg(att.category, ext)}`}>
                          .{ext || "FILE"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                        {formatFileSize(att.file_size)}
                      </td>
                      <td className="py-3 px-3">
                        {att.task_title ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 max-w-xs truncate">
                            <Layers className="w-3 h-3 shrink-0" />
                            <span className="truncate">Task: {att.task_title}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            📁 Dokumen Umum
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {att.uploaded_by_name || "Anggota Tim"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {att.created_at}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Pratinjau File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={att.file_url}
                            download={att.file_name}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Unduh File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRename(att)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Ganti Nama File"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(att)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredAttachments.length}
        pageSize={pageSize}
        pageSizeOptions={[1, 15, 30, 50, 100, 250, 500]}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* 🖼️ Direct In-App Preview Modal (PDF Viewer / Image Lightbox) */}
      {previewAttachment && (
        <FilePreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* 📤 Upload Modal (Max 100MB) */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        projectId={projectId}
        tasks={tasks}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
