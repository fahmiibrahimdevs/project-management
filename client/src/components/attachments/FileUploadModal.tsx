import React, { useState, useRef } from "react";
import { Modal } from "../common/Modal";
import { Task } from "../../types";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { SearchableSelect } from "../common/SearchableSelect";
import { notifySuccess, notifyError, notifyWarning } from "../../utils/swal";
import { 
  UploadCloud, 
  File, 
  X, 
  Check, 
  CheckCircle2,
  Loader2,
  Info, 
  HardDrive, 
  Tag, 
  Layers,
  Plus,
  Trash2,
  Sparkles
} from "lucide-react";

interface FileUploadModalProps {
  isOpen: boolean;
  projectId: string;
  tasks: Task[];
  onClose: () => void;
}

interface UploadQueueItem {
  id: string;
  file: File;
  customName: string;
  ext: string;
}

export function FileUploadModal({
  isOpen,
  projectId,
  tasks = [],
  onClose,
}: FileUploadModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload progress states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "ready" | "error">("idle");

  const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB per file

  const FORBIDDEN_EXTS = new Set([
    "exe", "dll", "so", "bin", "com", "bat", "cmd", "sh", "bash", "zsh", "msi", "msp", "vbs", "vbe",
    "ws", "wsf", "wsc", "wsh", "ps1", "ps2", "scr", "cpl", "hta", "jar", "war",
    "php", "phtml", "php3", "php4", "php5", "php7", "phar", "asp", "aspx", "cgi", "pl", "py", "rb", "jsp",
    "js", "mjs", "cjs", "jsx", "ts", "tsx", "htaccess", "env", "config"
  ]);

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: UploadQueueItem[] = [];
    const oversizedFiles: string[] = [];
    const forbiddenFiles: string[] = [];

    Array.from(files).forEach((file) => {
      const originalName = file.name;
      const lastDotIndex = originalName.lastIndexOf(".");
      let baseName = originalName;
      let ext = "";

      if (lastDotIndex !== -1) {
        baseName = originalName.substring(0, lastDotIndex);
        ext = originalName.substring(lastDotIndex + 1).toLowerCase();
      }

      // Security check: Reject forbidden executable/script extensions
      if (ext && FORBIDDEN_EXTS.has(ext)) {
        forbiddenFiles.push(file.name);
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        oversizedFiles.push(file.name);
        return;
      }

      newItems.push({
        id: crypto.randomUUID(),
        file,
        customName: baseName,
        ext,
      });
    });

    if (forbiddenFiles.length > 0) {
      notifyError(
        "File Ditolak demi Keamanan",
        `${forbiddenFiles.length} berkas ditolak karena berekstensi script/eksekusi: ${forbiddenFiles.join(", ")}`
      );
    }

    if (oversizedFiles.length > 0) {
      notifyWarning(
        "Ukuran File Melebihi Batas",
        `${oversizedFiles.length} file melebihi batas maksimal 100MB per file: ${oversizedFiles.join(", ")}`
      );
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = "";
    }
  };

  const handleRemoveItem = (id: string) => {
    if (isUploading) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCustomNameChange = (id: string, name: string) => {
    if (isUploading) return;
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, customName: name } : item))
    );
  };

  const handleClearAll = () => {
    if (isUploading) return;
    setQueue([]);
    setUploadProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setUploadStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queue.length === 0 || isUploading) {
      if (queue.length === 0) {
        notifyWarning("Pilih File", "Silakan pilih setidaknya satu file untuk diunggah.");
      }
      return;
    }

    const formData = new FormData();
    
    queue.forEach((item) => {
      formData.append("files", item.file);
      let finalName = item.customName.trim();
      if (!finalName) {
        finalName = item.file.name;
      } else if (item.ext && !finalName.toLowerCase().endsWith("." + item.ext.toLowerCase())) {
        finalName = `${finalName}.${item.ext}`;
      }
      formData.append("file_names", finalName);
    });

    if (selectedTaskId) {
      formData.append("task_id", selectedTaskId);
    }
    if (user?.id) {
      formData.append("uploaded_by_id", user.id);
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/attachments/project/${projectId}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        setLoadedBytes(event.loaded);
        setTotalBytes(event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadProgress(100);
        setUploadStatus("ready");

        queryClient.invalidateQueries({ queryKey: ["project-attachments", { projectId }] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });

        const count = queue.length;
        
        // Give user 1.2s to view the green "Ready ✓" indicator
        setTimeout(() => {
          notifySuccess(
            count === 1 ? "File Berhasil Diunggah!" : `${count} File Berhasil Diunggah!`,
            "Berkas telah tersimpan rapi di pusat lampiran proyek."
          );
          handleClearAll();
          setIsUploading(false);
          setUploadStatus("idle");
          setUploadProgress(0);
          onClose();
        }, 1200);
      } else {
        setIsUploading(false);
        setUploadStatus("error");
        try {
          const err = JSON.parse(xhr.responseText);
          notifyError("Gagal Mengunggah", err.error || "Terjadi kesalahan pada server.");
        } catch {
          notifyError("Gagal Mengunggah", "Terjadi kesalahan pada server.");
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadStatus("error");
      notifyError("Koneksi Terputus", "Gagal mengunggah file karena gangguan koneksi internet.");
    };

    xhr.send(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const totalQueueSize = queue.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title="Unggah Berkas ke Lampiran Proyek"
      subtitle="Mendukung unggah CAD (.dwg, .step), Desain Adobe (.psd, .ai), Dokumen PDF/Office, Gambar & ZIP (Max 100MB/file)"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          disabled={isUploading}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            isUploading
              ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50 py-4"
              : isDragging
              ? "border-blue-500 bg-blue-50/80 scale-[0.99] cursor-pointer"
              : queue.length === 0
              ? "border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 py-8 cursor-pointer"
              : "border-blue-300 bg-blue-50/20 hover:bg-blue-50/40 py-4 cursor-pointer"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">
                {queue.length === 0
                  ? "Klik untuk memilih berkas (bisa pilih banyak) atau seret & lepas file ke sini"
                  : "+ Klik atau Seret File Tambahan ke Sini"}
              </p>
              <p className="text-[11px] text-slate-500">
                Maksimal <strong className="text-blue-600">100 MB/file</strong> • Mendukung CAD (DWG, STEP, STL), Adobe (PSD, AI, INDD), Dokumen (PDF, DOCX), Spreadsheet, dan Arsip ZIP.
              </p>
            </div>
          </div>
        </div>

        {/* 🌟 REAL-TIME UPLOAD PROGRESS & READY INDICATOR */}
        {isUploading && (
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {uploadStatus === "ready" ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs animate-in zoom-in-95">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span>Ready ✓</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>Sedang mengunggah berkas...</span>
                  </span>
                )}
                {totalBytes > 0 && uploadStatus !== "ready" && (
                  <span className="text-slate-500 font-medium">
                    ({formatFileSize(loadedBytes)} / {formatFileSize(totalBytes)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {uploadStatus === "ready" ? (
                  <span className="font-bold text-emerald-700 font-mono text-xs">100% Selesai</span>
                ) : (
                  <span className="font-bold text-blue-600 font-mono text-xs">{uploadProgress}%</span>
                )}
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  uploadStatus === "ready"
                    ? "bg-emerald-500 shadow-emerald-500/50"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500"
                }`}
                style={{ width: `${Math.max(uploadProgress, 5)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              {uploadStatus === "ready"
                ? "✓ Seluruh file berhasil diproses dan siap digunakan!"
                : "Harap tunggu, proses upload dan transfer data sedang berlangsung..."}
            </p>
          </div>
        )}

        {/* Selected Files Queue List */}
        {queue.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800">
                Daftar Berkas ({queue.length} file • {formatFileSize(totalQueueSize)}):
              </span>
              {!isUploading && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Hapus Semua ({queue.length})
                </button>
              )}
            </div>

            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white hover:border-blue-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-5 text-[11px] font-mono text-slate-400 text-center shrink-0">
                      {index + 1}.
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-mono text-[10px] font-bold uppercase shadow-2xs">
                      {item.ext || "FILE"}
                    </div>
                    
                    {/* Custom Editable Name Input */}
                    <div className="flex-1 min-w-0">
                      <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-2xs">
                        <input
                          type="text"
                          required
                          disabled={isUploading}
                          value={item.customName}
                          onChange={(e) => handleCustomNameChange(item.id, e.target.value)}
                          placeholder="Nama file..."
                          className="flex-1 px-2.5 py-1 text-xs text-slate-900 bg-transparent focus:outline-none font-medium truncate disabled:opacity-75"
                          title="Edit nama tampilan berkas"
                        />
                        {item.ext && (
                          <span className="bg-slate-100 px-2 py-1 text-[11px] font-mono font-bold text-slate-500 border-l border-slate-200 flex items-center">
                            .{item.ext}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Asli: {item.file.name} • <strong className="text-slate-600">{formatFileSize(item.file.size)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Status / Remove Action */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {uploadStatus === "ready" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>Ready</span>
                      </span>
                    ) : isUploading ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                        <span>{uploadProgress}%</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus dari antrean"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Linkage Selector */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Kaitkan Semua Berkas ke Task Tertentu (Opsional)</span>
          </label>
          <SearchableSelect
            options={[
              { value: "", label: "📁 Dokumen Umum Proyek (Tanpa Task Khusus)" },
              ...tasks.map((t) => ({
                value: t.id,
                label: `Task: ${t.title}`,
                sublabel: `Status: ${t.status.toUpperCase()}`,
              })),
            ]}
            value={selectedTaskId}
            onChange={setSelectedTaskId}
            disabled={isUploading}
            placeholder="-- Pilih Task Terkait --"
            searchPlaceholder="Cari judul task..."
            minItemsForSearch={5}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={queue.length === 0 || isUploading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
          >
            {uploadStatus === "ready" ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Ready ✓</span>
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Mengunggah ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Unggah {queue.length > 0 ? `${queue.length} Berkas` : "Sekarang"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
