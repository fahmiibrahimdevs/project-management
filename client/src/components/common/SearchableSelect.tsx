import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  minItemsForSearch?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "-- Pilih Opsi --",
  searchPlaceholder = "Cari opsi...",
  disabled = false,
  allowClear = false,
  minItemsForSearch = 5,
  className = "",
  size = "md",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && options.length > minItemsForSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen, options.length, minItemsForSearch]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const showSearchInput = options.length > minItemsForSearch;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
      const matchVal = opt.value.toLowerCase().includes(q);
      return matchLabel || matchSub || matchVal;
    });
  }, [options, search]);

  const handleSelect = (optValue: string, optDisabled?: boolean) => {
    if (optDisabled || disabled) return;
    onChange(optValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("");
  };

  const sizeClasses = {
    sm: "py-1.5 px-2.5 text-xs rounded-lg",
    md: "py-2.5 px-3 text-xs rounded-xl",
    lg: "py-3 px-3.5 text-sm rounded-xl",
  }[size];

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 border transition-all cursor-pointer select-none ${sizeClasses} ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75"
            : isOpen
            ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
            : "bg-slate-50 hover:bg-white border-slate-200 text-slate-800"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}

          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="shrink-0">{selectedOption.badge}</span>
              )}
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-400 truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
              title="Hapus Pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Popover Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-100 font-sans">
          {/* Search Box (Active if options > minItemsForSearch) */}
          {showSearchInput && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70 relative">
              <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto divide-y divide-slate-50 p-1 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 px-3">
                <span>Tidak ada opsi yang cocok</span>
                {search && (
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                    &ldquo;{search}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    className={`flex items-center justify-between p-2 text-xs rounded-lg cursor-pointer select-none transition-colors ${
                      opt.disabled
                        ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
                        : isSelected
                        ? "bg-blue-50/90 text-blue-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && <span className="shrink-0">{opt.badge}</span>}
                        </div>
                        {opt.sublabel && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                            {opt.sublabel}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0 ml-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Options count footer for large lists */}
          {options.length > 8 && (
            <div className="px-2.5 py-1 bg-slate-50/80 border-t border-slate-100 text-[10px] text-slate-400 text-right font-medium">
              Menampilkan {filteredOptions.length} dari {options.length} opsi
            </div>
          )}
        </div>
      )}
    </div>
  );
}
