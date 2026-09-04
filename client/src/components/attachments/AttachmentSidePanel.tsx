import React, { useState } from "react";
import { TaskAttachment } from "../../types";
import { getDownloadUrl } from "../../utils/download";
import { format } from "date-fns";
import {
  X,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  Sparkles,
  Box,
  Layers,
  Calendar,
  HardDrive,
  Eye,
  Info
} from "lucide-react";

interface AttachmentSidePanelProps {
  attachment: TaskAttachment;
  onClose: () => void;
  onRename?: (attachment: TaskAttachment) => void;
  onDelete?: (attachment: TaskAttachment) => void;
  canManage?: boolean;
}

export function AttachmentSidePanel({
  attachment,
  onClose,
  onRename,
  onDelete,
  canManage = false,
}: AttachmentSidePanelProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  const ext = (attachment.file_name.split(".").pop() || "").toLowerCase();

  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif"].includes(ext);
  const isPdf = ext === "pdf";
  const isCad = ["dwg", "dxf", "step", "stp", "stl", "iges", "igs", "sldprt", "sldasm", "ipt", "iam"].includes(ext);
  const isAdobe = ["psd", "psb", "ai", "eps", "indd", "cdr", "sketch", "fig"].includes(ext);
  const isArchive = ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext);
  const isSpreadsheet = ["xls", "xlsx", "csv", "ods"].includes(ext);
  const isDocument = ["doc", "docx", "odt", "rtf", "pages"].includes(ext);
  const isCode = ["txt", "json", "md", "log", "xml", "js", "ts", "jsx", "tsx", "py", "sh", "sql", "html", "css"].includes(ext);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(attachment.file_name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let formattedDate = "-";
  if (attachment.created_at) {
    try {
      const d = new Date(attachment.created_at);
      if (!isNaN(d.getTime())) {
        formattedDate = format(d, "dd MMM yyyy, HH:mm");
      } else {
        formattedDate = attachment.created_at;
      }
    } catch {
      formattedDate = attachment.created_at;
    }
  }

  const downloadUrl = getDownloadUrl(attachment.file_url, attachment.file_name);

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              Pratinjau Berkas
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Floating window detail & pratinjau
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors shrink-0"
          title="Tutup Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Format & Size Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs uppercase text-[10px]">
              .{ext || "FILE"}
            </span>
            <span className="text-slate-600 font-semibold text-[11px]">
              {formatFileSize(attachment.file_size)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg shadow-2xs transition-colors"
              title="Buka di tab peramban baru"
            >
              <ExternalLink className="w-3 h-3 text-slate-500" />
              <span>Tab Baru</span>
            </a>
          </div>
        </div>

        {/* Dynamic Preview Canvas */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-2xs bg-white">
          {/* 1. IMAGE PREVIEW WITH CONTROLS */}
          {isImage ? (
            <div className="space-y-2">
              {/* Zoom Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 text-white text-[11px] border-b border-slate-800">
                <span className="font-medium text-slate-300">Gambar ({Math.round(zoomLevel * 100)}%)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                    title="Perkecil (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                    title="Reset Zoom"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                    title="Perbesar (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors ml-1"
                    title="Putar 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lightbox Canvas */}
              <div className="h-64 sm:h-72 bg-slate-950 flex items-center justify-center p-3 overflow-auto relative">
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                />
              </div>
            </div>
          ) : isPdf ? (
            /* 2. PDF EMBEDDED PREVIEW */
            <div className="flex flex-col">
              <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  Pratinjau Dokumen PDF
                </span>
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-[11px] font-medium flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buka Penuh
                </a>
              </div>
              <iframe
                src={`${attachment.file_url}#toolbar=0&navpanes=0`}
                className="w-full h-64 border-0 bg-slate-50"
                title={attachment.file_name}
              />
            </div>
          ) : isCad ? (
            /* 3. CAD TECHNICAL DRAWING / 3D MODEL CARD */
            <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Box className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">
                  {ext.toUpperCase()} CAD Model
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 tracking-tight">
                  AutoCAD / 3D Engineering File
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Berkas gambar teknik CAD presisi tinggi. Unduh berkas untuk dibuka dan dimodifikasi pada software CAD Anda.
                </p>
              </div>

              {/* Supported Software Pills */}
              <div className="pt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Aplikasi Rekomendasi:
                </p>
                <div className="flex flex-wrap gap-1">
                  {["AutoCAD", "SolidWorks", "Inventor", "Fusion 360", "DWG TrueView"].map((app) => (
                    <span
                      key={app}
                      className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-medium border border-slate-700"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : isAdobe ? (
            /* 4. ADOBE CREATIVE DESIGN CARD */
            <div className="p-5 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] border border-purple-500/30">
                  {ext.toUpperCase()} Design
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-purple-100 tracking-tight">
                  Adobe Creative & Graphics Asset
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Berkas desain grafis beresolusi tinggi dengan layer atau vektor. Siap diunduh untuk dibuka pada software Adobe.
                </p>
              </div>

              <div className="pt-1">
                <p className="text-[10px] font-semibold text-purple-300/80 uppercase tracking-wider mb-1.5">
                  Aplikasi Rekomendasi:
                </p>
                <div className="flex flex-wrap gap-1">
                  {["Photoshop", "Illustrator", "InDesign", "Photopea", "CorelDRAW"].map((app) => (
                    <span
                      key={app}
                      className="px-2 py-0.5 rounded-md bg-purple-900/40 text-purple-200 text-[10px] font-medium border border-purple-800/50"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : isArchive ? (
            /* 5. ARCHIVE FILE CARD */
            <div className="p-5 bg-slate-900 text-white space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileArchive className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/30">
                  {ext.toUpperCase()} Archive
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 tracking-tight">
                  Arsip Berkas Terkompresi
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Berkas kompresi arsip data. Unduh untuk mengekstrak isi berkas (WinRAR / 7-Zip / Unzip).
                </p>
              </div>
            </div>
          ) : isSpreadsheet ? (
            /* 6. SPREADSHEET CARD */
            <div className="p-5 bg-emerald-950/90 text-white space-y-3.5 border border-emerald-800/40">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">
                  {ext.toUpperCase()} Sheet
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-emerald-100 tracking-tight">
                  Lembar Kerja & Spreadsheet
                </h4>
                <p className="text-[11px] text-emerald-200/90 mt-1 leading-relaxed">
                  Berkas tabel data kalkulasi. Unduh untuk membuka di Microsoft Excel atau Google Sheets.
                </p>
              </div>
            </div>
          ) : (
            /* 7. GENERAL FILE CARD */
            <div className="p-5 bg-slate-900 text-white space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <File className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px] border border-blue-500/30">
                  .{ext.toUpperCase()}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 tracking-tight">
                  Berkas Lampiran Tugas
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Berkas siap diunduh dan dibuka di komputer Anda.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Metadata Card */}
        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Informasi Berkas
            </span>

            <button
              type="button"
              onClick={handleCopyName}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              title="Salin nama file"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Salin Nama</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Nama Berkas</p>
              <p className="font-semibold text-slate-800 break-all leading-snug mt-0.5">
                {attachment.file_name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-slate-400" />
                  Ukuran
                </span>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Waktu Upload
                </span>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Management Buttons (Rename & Delete if authorized) */}
        {canManage && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onRename && (
              <button
                type="button"
                onClick={() => onRename(attachment)}
                className="py-2 px-3 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Ganti Nama</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(attachment)}
                className="py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Berkas</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Primary Download Action Bar */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <a
          href={downloadUrl}
          download={attachment.file_name}
          className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          title={`Unduh ${attachment.file_name}`}
        >
          <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span>Unduh Berkas Sekarang</span>
        </a>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors shrink-0"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
