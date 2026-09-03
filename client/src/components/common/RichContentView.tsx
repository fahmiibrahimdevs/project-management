import React, { useState } from "react";
import { ExternalLink, X, ZoomIn } from "lucide-react";

interface RichContentViewProps {
  content: string;
  className?: string;
}

export function RichContentView({ content = "", className = "" }: RichContentViewProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (!content || !content.trim()) {
    return <span className="text-slate-400 italic">-</span>;
  }

  const renderFormatted = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Check image ![alt](url)
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return (
          <div key={idx} className="my-2 group relative inline-block">
            <img
              src={imgMatch[2]}
              alt={imgMatch[1] || "Lampiran Masalah"}
              onClick={() => setZoomedImage(imgMatch[2])}
              className="max-h-56 max-w-full rounded-xl border border-slate-200 object-contain shadow-2xs bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
            />
            <button
              type="button"
              onClick={() => setZoomedImage(imgMatch[2])}
              className="absolute right-2 bottom-2 bg-slate-900/70 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Perbesar gambar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {imgMatch[1] && (
              <span className="text-[10px] text-slate-400 block mt-1">
                {imgMatch[1]}
              </span>
            )}
          </div>
        );
      }

      // Check bullet list
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed">
            {renderInline(line.substring(2))}
          </li>
        );
      }

      // Check numbered list
      const numMatch = line.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-slate-700 leading-relaxed">
            {renderInline(numMatch[2])}
          </li>
        );
      }

      if (line.trim() === "") {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs text-slate-700 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderInline = (text: string) => {
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const linkMatch = remaining.match(/^(.*?)\[(.*?)\]\((.*?)\)(.*)$/);
      if (linkMatch) {
        const [, before, lText, lUrl, after] = linkMatch;
        if (before) parts.push(<span key={keyIdx++}>{renderStyles(before)}</span>);
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

      parts.push(<span key={keyIdx++}>{renderStyles(remaining)}</span>);
      break;
    }

    return parts;
  };

  const renderStyles = (text: string) => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length >= 4) {
        return <strong key={bIdx} className="font-bold text-slate-900">{bPart.slice(2, -2)}</strong>;
      }
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
    <div className={className}>
      {renderFormatted(content)}

      {/* Fullscreen Lightbox Modal for Zoomed Image */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 bg-slate-800/80 text-white p-2 rounded-full hover:bg-slate-700 transition-colors z-10"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Gambar Perbesar"
              className="max-h-[85vh] max-w-full object-contain mx-auto rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
