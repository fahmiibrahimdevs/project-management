import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { ProjectAttachment } from "../../types";
import { 
  Download, 
  ExternalLink, 
  FileText, 
  File, 
  FileSpreadsheet, 
  FileArchive, 
  FileCode, 
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  Calendar,
  User,
  Layers
} from "lucide-react";

interface FilePreviewModalProps {
  attachment: ProjectAttachment | null;
  onClose: () => void;
}

export function FilePreviewModal({ attachment, onClose }: FilePreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!attachment) return null;

  const ext = attachment.file_name.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext) || attachment.category === "image";
  const isPdf = ext === "pdf" || attachment.category === "document" && ext === "pdf";
  const isText = ["txt", "csv", "json", "md", "log", "xml", "js", "ts", "py", "sh"].includes(ext);

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

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={attachment.file_name} 
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-mono uppercase">
              .{ext || "FILE"}
            </span>
            <span className="text-slate-500 font-medium">
              {formatFileSize(attachment.file_size)}
            </span>
            {attachment.task_title && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                <Layers className="w-3 h-3" />
                <span>Task: {attachment.task_title}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Image zoom controls */}
            {isImage && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Perkecil (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 text-[11px] font-mono font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Perbesar (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Putar 90 Derajat"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Direct Open in New Tab */}
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl shadow-2xs transition-colors"
              title="Buka di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tab Baru</span>
            </a>

            {/* Download Button */}
            <a
              href={attachment.file_url}
              download={attachment.file_name}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors"
              title="Unduh Berkas"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </a>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="bg-slate-900/5 rounded-2xl border border-slate-200/90 overflow-hidden flex items-center justify-center min-h-[400px] max-h-[75vh]">
          {/* 1. PDF Viewer */}
          {isPdf ? (
            <div className="w-full h-[70vh] bg-slate-100 flex flex-col">
              <iframe
                src={`${attachment.file_url}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0 rounded-xl"
                title={attachment.file_name}
              />
            </div>
          ) : isImage ? (
            /* 2. Image Lightbox Viewer */
            <div className="w-full h-[65vh] overflow-auto flex items-center justify-center p-4 bg-slate-950/90 rounded-xl">
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            /* 3. Non-previewable File Card (e.g. DOCX, XLSX, ZIP, CAD) */
            <div className="p-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-md">
                {attachment.category === "spreadsheet" ? (
                  <FileSpreadsheet className="w-10 h-10" />
                ) : attachment.category === "archive" ? (
                  <FileArchive className="w-10 h-10" />
                ) : attachment.category === "cad" ? (
                  <FileCode className="w-10 h-10" />
                ) : (
                  <File className="w-10 h-10" />
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 break-all">
                  {attachment.file_name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Format berkas <strong>.{ext.toUpperCase()}</strong> ({formatFileSize(attachment.file_size)}) tidak mendukung pratinjau langsung di dalam browser.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={attachment.file_url}
                  download={attachment.file_name}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh & Buka di Komputer</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Meta Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-4 flex-wrap">
            {attachment.uploaded_by_name && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Diunggah oleh: <strong>{attachment.uploaded_by_name}</strong></span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Waktu: {attachment.created_at}</span>
            </span>
          </div>

          <span className="text-slate-400 font-mono text-[10px]">
            Sumber: {attachment.source === "project" ? "Pusat Lampiran Proyek" : `Task Kanban (${attachment.task_title || "Task"})`}
          </span>
        </div>
      </div>
    </Modal>
  );
}
