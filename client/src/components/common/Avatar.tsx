import React from "react";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showName?: boolean;
  subtext?: string;
}

export function Avatar({
  name,
  color = "#2563eb",
  size = "sm",
  className = "",
  showName = false,
  subtext,
}: AvatarProps) {
  const getInitials = (str: string) => {
    if (!str) return "?";
    const parts = str.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold text-white shadow-xs select-none shrink-0`}
        style={{ backgroundColor: color }}
        title={name}
      >
        {getInitials(name)}
      </div>
      {showName && (
        <div className="flex flex-col text-left">
          <span className="text-xs font-medium text-slate-800 leading-tight">{name}</span>
          {subtext && <span className="text-[11px] text-slate-500 leading-tight">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
