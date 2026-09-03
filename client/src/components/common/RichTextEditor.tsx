import React, { useState, useRef } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Eye, 
  Edit3, 
  UploadCloud,
  X,
  ExternalLink,
  Code
} from "lucide-react";
import { notifyWarning, notifyError, notifySuccess } from "../../utils/swal";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  required?: boolean;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Tulis deskripsi atau catatan...",
  minHeight = "min-h-[120px]",
  label,
  required = false,
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to insert markdown/HTML tags around selection
  const insertFormatting = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;

    const newText =
      value.substring(0, start) +
      before +
      selected +
      after +
      value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + before.length + selected.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleOpenLinkModal = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const selected = value.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selected) setLinkText(selected);
    }
    setLinkUrl("");
    setShowLinkModal(true);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    const finalUrl = linkUrl.startsWith("http://") || linkUrl.startsWith("https://") 
      ? linkUrl.trim() 
      : `https://${linkUrl.trim()}`;
    const finalText = linkText.trim() || finalUrl;

    const linkMarkdown = `[${finalText}](${finalUrl})`;
    insertFormatting(linkMarkdown, "", "");

    setShowLinkModal(false);
    setLinkText("");
    setLinkUrl("");
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      notifyWarning("Format Tidak Didukung", "File harus berupa gambar (PNG, JPG, JPEG, WEBP, GIF)");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal mengunggah gambar");
      const data = await res.json();

      const imageMarkdown = `\n![${data.file_name}](${data.file_url})\n`;
      insertFormatting(imageMarkdown, "", "");
      notifySuccess("Gambar berhasil disematkan!");
    } catch (err) {
      console.error(err);
      notifyError("Gagal Mengunggah", "Terjadi kesalahan saat mengunggah gambar.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Convert simple markdown to safe HTML for preview
  const renderFormattedPreview = (content: string) => {
    if (!content.trim()) {
      return <p className="text-slate-400 italic">Belum ada konten untuk ditampilkan.</p>;
    }

    // Split lines and parse basic markdown
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Check for image: ![alt](url)
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return (
          <div key={idx} className="my-2.5">
            <img
              src={imgMatch[2]}
              alt={imgMatch[1] || "Lampiran"}
              className="max-h-64 rounded-xl border border-slate-200 object-contain shadow-xs bg-slate-50"
            />
            {imgMatch[1] && (
              <span className="text-[10px] text-slate-400 block mt-1">
                {imgMatch[1]}
              </span>
            )}
          </div>
        );
      }

      // Check for bullet list: - item or * item
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed">
            {renderInlineMarkdown(line.substring(2))}
          </li>
        );
      }

      // Check for numbered list: 1. item
      const numMatch = line.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-slate-700 leading-relaxed">
            {renderInlineMarkdown(numMatch[2])}
          </li>
        );
      }

      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs text-slate-700 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper for inline bold, italic, and links
  const renderInlineMarkdown = (text: string) => {
    // Basic parser for [text](url), **bold**, *italic*
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Check Link [title](url)
      const linkMatch = remaining.match(/^(.*?)\[(.*?)\]\((.*?)\)(.*)$/);
      if (linkMatch) {
        const [, before, lText, lUrl, after] = linkMatch;
        if (before) parts.push(<span key={keyIdx++}>{renderBasicStyles(before)}</span>);
        parts.push(
          <a
            key={keyIdx++}
            href={lUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-0.5 font-medium"
          >
            <span>{lText}</span>
            <ExternalLink className="w-2.5 h-2.5 inline opacity-70" />
          </a>
        );
        remaining = after;
        continue;
      }

      parts.push(<span key={keyIdx++}>{renderBasicStyles(remaining)}</span>);
      break;
    }

    return parts;
  };

  const renderBasicStyles = (text: string) => {
    // Handle **bold**
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
        return <strong key={bIdx} className="font-bold text-slate-900">{bPart.slice(2, -2)}</strong>;
      }
      // Handle *italic*
      const italicParts = bPart.split(/(\*.*?\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith("*") && iPart.endsWith("*") && iPart.length >= 2) {
          return <em key={iIdx} className="italic">{iPart.slice(1, -1)}</em>;
        }
        return iPart;
      });
    });
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[10px] text-slate-400">Mendukung Format, Link & Gambar</span>
        </div>
      )}

      {/* Editor Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/90 border-b border-slate-200/80 gap-2 flex-wrap">
          {/* Formatting buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**", "teks tebal")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              title="Tebal (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("*", "*", "teks miring")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              title="Miring (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("<u>", "</u>", "teks garis bawah")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              title="Garis Bawah (Underline)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting("- ", "", "Item poin")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              title="Daftar Poin (Bullet List)"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("1. ", "", "Langkah pertama")}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              title="Daftar Angka (Numbered List)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Hyperlink Button */}
            <button
              type="button"
              onClick={handleOpenLinkModal}
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Sisipkan Tautan / Hyperlink"
            >
              <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Link</span>
            </button>

            {/* Image Upload Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 text-[11px] font-medium disabled:opacity-50"
              title="Unggah & Sisipkan Gambar"
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{isUploading ? "Mengunggah..." : "Gambar"}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Mode Switcher: Tulis vs Preview */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                activeTab === "write"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Tulis</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                activeTab === "preview"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full p-3 text-xs text-slate-800 bg-white focus:outline-none resize-y ${minHeight} leading-relaxed placeholder:text-slate-400`}
          />
        ) : (
          <div className={`p-3 text-xs bg-slate-50/50 ${minHeight} overflow-y-auto`}>
            {renderFormattedPreview(value)}
          </div>
        )}
      </div>

      {/* Insert Hyperlink Popover Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-4 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Sisipkan Hyperlink</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertLink} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Teks Tautan</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Contoh: Skema Wiring Diagram atau Datasheet"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  URL / Tautan Web <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/file atau drive.google.com"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
                >
                  Sisipkan Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
