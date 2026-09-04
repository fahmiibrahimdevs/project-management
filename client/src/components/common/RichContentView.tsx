import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  X,
  ZoomIn,
  Download,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { getDownloadUrl } from "../../utils/download";

interface RichContentViewProps {
  content: string;
  className?: string;
  collapsible?: boolean;
  maxLines?: number;
}

interface ExtractedImage {
  alt: string;
  url: string;
}

export function RichContentView({
  content = "",
  className = "",
  collapsible = false,
  maxLines = 4,
}: RichContentViewProps) {
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content || !content.trim()) {
    return <span className="text-slate-400 italic text-xs">-</span>;
  }

  // Parse lines, separate text and images
  const lines = content.split("\n");
  const extractedImages: ExtractedImage[] = [];
  const textLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    // Check markdown image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      extractedImages.push({
        alt: imgMatch[1] || "Lampiran Gambar",
        url: imgMatch[2],
      });
    } else {
      textLines.push(line);
    }
  });

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (zoomedImageIndex === null) return;
      if (e.key === "Escape") {
        setZoomedImageIndex(null);
      } else if (e.key === "ArrowLeft" && extractedImages.length > 1) {
        setZoomedImageIndex((prev) =>
          prev !== null ? (prev > 0 ? prev - 1 : extractedImages.length - 1) : null
        );
      } else if (e.key === "ArrowRight" && extractedImages.length > 1) {
        setZoomedImageIndex((prev) =>
          prev !== null ? (prev < extractedImages.length - 1 ? prev + 1 : 0) : null
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedImageIndex, extractedImages.length]);

  const renderInlineStyles = (text: string) => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
        return (
          <strong key={bIdx} className="font-bold text-slate-900">
            {bPart.slice(2, -2)}
          </strong>
        );
      }
      const italicParts = bPart.split(/(\*.*?\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith("*") && iPart.endsWith("*") && iPart.length >= 2) {
          return (
            <em key={iIdx} className="italic">
              {iPart.slice(1, -1)}
            </em>
          );
        }
        return iPart;
      });
    });
  };

  const renderInlineLinksAndText = (text: string) => {
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const linkMatch = remaining.match(/^(.*?)\[(.*?)\]\((.*?)\)(.*)$/);
      if (linkMatch) {
        const [, before, lText, lUrl, after] = linkMatch;
        if (before) parts.push(<span key={keyIdx++}>{renderInlineStyles(before)}</span>);
        parts.push(
          <a
            key={keyIdx++}
            href={lUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-0.5 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{lText}</span>
            <ExternalLink className="w-2.5 h-2.5 inline opacity-70" />
          </a>
        );
        remaining = after;
        continue;
      }

      parts.push(<span key={keyIdx++}>{renderInlineStyles(remaining)}</span>);
      break;
    }

    return parts;
  };

  const renderTextContent = () => {
    const renderedElements: React.ReactNode[] = [];
    let inList = false;
    let listType: "ul" | "ol" = "ul";
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === "ul") {
          renderedElements.push(
            <ul key={`ul-${renderedElements.length}`} className="list-disc pl-4 space-y-0.5 my-1 text-xs">
              {listItems}
            </ul>
          );
        } else {
          renderedElements.push(
            <ol key={`ol-${renderedElements.length}`} className="list-decimal pl-4 space-y-0.5 my-1 text-xs">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    textLines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Bullet list item
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList || listType !== "ul") {
          flushList();
          inList = true;
          listType = "ul";
        }
        listItems.push(
          <li key={idx} className="text-xs leading-relaxed text-slate-700">
            {renderInlineLinksAndText(trimmed.substring(2))}
          </li>
        );
        return;
      }

      // Numbered list item
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        if (!inList || listType !== "ol") {
          flushList();
          inList = true;
          listType = "ol";
        }
        listItems.push(
          <li key={idx} className="text-xs leading-relaxed text-slate-700">
            {renderInlineLinksAndText(numMatch[2])}
          </li>
        );
        return;
      }

      // Normal text or spacing
      flushList();

      if (trimmed === "") {
        renderedElements.push(<div key={idx} className="h-1" />);
      } else {
        renderedElements.push(
          <p key={idx} className="text-xs leading-relaxed text-slate-700 break-words">
            {renderInlineLinksAndText(line)}
          </p>
        );
      }
    });

    flushList();
    return renderedElements;
  };

  const currentZoomedImage =
    zoomedImageIndex !== null ? extractedImages[zoomedImageIndex] : null;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 📝 Formatted Text Body */}
      {textLines.length > 0 && (
        <div className="space-y-1">
          {renderTextContent()}
        </div>
      )}

      {/* 🖼️ Compact Image Gallery (Horizontal Thumbnail Cards) */}
      {extractedImages.length > 0 && (
        <div className="pt-1.5">
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <ImageIcon className="w-3 h-3 text-blue-600" />
            <span>
              Lampiran ({extractedImages.length} Foto/Screenshot)
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {extractedImages.map((img, i) => (
              <div
                key={i}
                onClick={() => setZoomedImageIndex(i)}
                className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200/90 bg-slate-100 hover:bg-slate-200 overflow-hidden shadow-2xs hover:shadow-md cursor-pointer transition-all duration-200 shrink-0 hover:border-blue-400"
                title={`Klik untuk memperbesar ${img.alt || "Gambar"}`}
              >
                {/* Image Thumbnail with Object-Cover to prevent distortion */}
                <img
                  src={img.url}
                  alt={img.alt || `Lampiran ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Dark Hover Overlay with Zoom Icon & Filename */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-white">
                  <div className="w-6 h-6 rounded-lg bg-slate-900/80 flex items-center justify-center shadow-xs">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                  {img.alt && (
                    <span className="text-[9px] font-medium truncate w-full text-center mt-1 px-1 drop-shadow-sm">
                      {img.alt}
                    </span>
                  )}
                </div>

                {/* Index Pill in bottom right */}
                {extractedImages.length > 1 && (
                  <span className="absolute bottom-1 right-1 bg-slate-900/70 text-white text-[9px] font-mono px-1 rounded backdrop-blur-xs">
                    {i + 1}/{extractedImages.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🌟 Fullscreen Lightbox Modal */}
      {currentZoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 font-sans"
          onClick={() => setZoomedImageIndex(null)}
        >
          {/* Top Bar Controls */}
          <div
            className="w-full max-w-5xl flex items-center justify-between pb-3 text-white px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold text-slate-200 truncate">
                {currentZoomedImage.alt || "Lampiran Foto / Screenshot"}
              </span>
              {extractedImages.length > 1 && (
                <span className="text-[11px] font-mono bg-slate-800/80 px-2 py-0.5 rounded-full text-slate-300 border border-slate-700">
                  {(zoomedImageIndex || 0) + 1} dari {extractedImages.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={getDownloadUrl(currentZoomedImage.url, currentZoomedImage.alt || "lampiran.jpg")}
                download={currentZoomedImage.alt || "lampiran.jpg"}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800/90 hover:bg-blue-600 rounded-xl transition-colors text-white border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
                title="Unduh Gambar Asli"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Unduh</span>
              </a>

              <button
                type="button"
                onClick={() => setZoomedImageIndex(null)}
                className="p-2 bg-slate-800/90 hover:bg-rose-600 rounded-xl transition-colors text-white border border-slate-700"
                title="Tutup Preview (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Image Stage */}
          <div
            className="relative max-w-5xl w-full max-h-[82vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Image Navigation Button */}
            {extractedImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setZoomedImageIndex((prev) =>
                    prev !== null ? (prev > 0 ? prev - 1 : extractedImages.length - 1) : null
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white border border-slate-700 shadow-xl transition-colors"
                title="Gambar Sebelumnya (Panah Kiri)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* High-Res Image Display */}
            <div className="bg-slate-900/90 rounded-2xl overflow-hidden p-2 border border-slate-800 shadow-2xl flex items-center justify-center max-h-[80vh]">
              <img
                src={currentZoomedImage.url}
                alt={currentZoomedImage.alt || "Lampiran Full"}
                className="max-h-[76vh] max-w-full object-contain rounded-xl select-none"
              />
            </div>

            {/* Next Image Navigation Button */}
            {extractedImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setZoomedImageIndex((prev) =>
                    prev !== null ? (prev < extractedImages.length - 1 ? prev + 1 : 0) : null
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white border border-slate-700 shadow-xl transition-colors"
                title="Gambar Selanjutnya (Panah Kanan)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Caption & Hint */}
          <div className="text-center pt-2 text-[11px] text-slate-400 font-medium">
            Tekan <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 border border-slate-700">ESC</kbd> untuk menutup
            {extractedImages.length > 1 && (
              <span> • Gunakan tombol panah keyboard ◀ ▶ untuk melihat gambar lainnya</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
