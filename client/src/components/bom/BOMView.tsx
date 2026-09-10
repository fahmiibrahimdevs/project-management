import React, { useState, useMemo, useEffect } from "react";
import { BOMItem, BOMStatus, BOMPriority, BOMCategory } from "../../types";
import { BOMStatusBadge, BOMPriorityBadge } from "../common/Badge";
import { Pagination } from "../common/Pagination";
import { SearchableSelect } from "../common/SearchableSelect";
import { BOMModal } from "./BOMModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { getCategoryBadgeClass, getCategoryRowClass } from "./BOMCategoryMasterPage";
import { useBOM, useBOMCategories, useDeleteBOMItem, useProjectLocations } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import {
  Package,
  Plus,
  Search,
  DollarSign,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShoppingCart,
  Store,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  FoldHorizontal,
  UnfoldHorizontal,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import { Member } from "../../types";

interface BOMViewProps {
  projectId: string;
  members?: Member[];
  isProjectMember?: boolean;
}

export function BOMView({ projectId, members = [], isProjectMember }: BOMViewProps) {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const isMember = isProjectMember !== undefined ? isProjectMember : (isOwner || members.some((m) => m.id === user?.id));
  const canEditContent = isMember;

  const { data, isLoading } = useBOM(projectId);
  const { data: masterCategories = [] } = useBOMCategories(projectId);
  const { data: locations = [] } = useProjectLocations(projectId);
  const deleteMutation = useDeleteBOMItem();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<BOMItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BOMItem | null>(null);

  const items = data?.items || [];
  const summary = data?.summary;

  // Analytics Metrics for BOM
  const bomAnalytics = useMemo(() => {
    const totalItems = items.length;
    const totalCost = Number(summary?.total_cost) || 0;
    const dibeliCost = Number(summary?.total_sudah_checkout_cost) || 0;
    const belumCost = Number(summary?.total_belum_checkout_cost) || 0;
    const realizationRate = totalCost > 0 ? Math.round((dibeliCost / totalCost) * 100) : 0;

    // Spending per Category
    const categorySpending: Record<string, { name: string; color: string; totalCost: number; count: number }> = {};
    items.forEach((item) => {
      const catName = item.category_name || "Lain-lain";
      const cost = Number(item.total_price) || 0;
      if (!categorySpending[catName]) {
        categorySpending[catName] = {
          name: catName,
          color: item.category_color || "slate",
          totalCost: 0,
          count: 0,
        };
      }
      categorySpending[catName].totalCost += cost;
      categorySpending[catName].count += 1;
    });

    const categoryList = Object.values(categorySpending).sort((a, b) => b.totalCost - a.totalCost);

    const categoryColors = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#64748b"];
    const circumference = 2 * Math.PI * 56;
    let accumulatedOffset = 0;
    const donutSlices = categoryList.slice(0, 6).map((cat, idx) => {
      const percentage = totalCost > 0 ? (cat.totalCost / totalCost) * 100 : 0;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += (percentage / 100) * circumference;
      return {
        key: cat.name,
        label: cat.name,
        count: cat.count,
        totalCost: cat.totalCost,
        color: categoryColors[idx % categoryColors.length],
        percentage: Math.round(percentage),
        strokeDasharray,
        strokeDashoffset,
      };
    });

    // Spending per Location
    const locationSpending: Record<string, { name: string; totalCost: number; count: number }> = {};
    items.forEach((item) => {
      const locName = item.location_name || (item.location_id ? "Lokasi Tertentu" : "Tanpa Lokasi");
      const cost = Number(item.total_price) || 0;
      if (!locationSpending[locName]) {
        locationSpending[locName] = { name: locName, totalCost: 0, count: 0 };
      }
      locationSpending[locName].totalCost += cost;
      locationSpending[locName].count += 1;
    });
    const topLocations = Object.values(locationSpending).sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);

    return {
      totalItems,
      totalCost,
      dibeliCost,
      belumCost,
      realizationRate,
      donutSlices,
      topLocations,
    };
  }, [items, summary]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchSearch =
        q === "" ||
        item.item_name.toLowerCase().includes(q) ||
        (item.store_name && item.store_name.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.category_name && item.category_name.toLowerCase().includes(q)) ||
        (item.purchase_url && item.purchase_url.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === "all" ||
        item.category_id === selectedCategory ||
        (!item.category_id && selectedCategory === "cat-lain");

      const matchStatus =
        selectedStatus === "all" || item.status === selectedStatus;
      const matchPriority =
        selectedPriority === "all" || item.priority === selectedPriority;

      let matchLocation = true;
      if (selectedLocation === "none") {
        matchLocation = !item.location_id || item.location_id === "";
      } else if (selectedLocation !== "all") {
        matchLocation = item.location_id === selectedLocation;
      }

      return matchSearch && matchCategory && matchStatus && matchPriority && matchLocation;
    });
  }, [items, debouncedSearch, selectedCategory, selectedStatus, selectedPriority, selectedLocation]);

  // Auto-reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory, selectedStatus, selectedPriority, selectedLocation]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Group items by category for Tree Table structure
  const groupedCategories = useMemo(() => {
    const groups: Record<
      string,
      { category: BOMCategory | { id: string; name: string; color: string; description?: string }; items: BOMItem[]; totalCost: number }
    > = {};

    // Initialize with master categories
    masterCategories.forEach((cat) => {
      groups[cat.id] = {
        category: cat,
        items: [],
        totalCost: 0,
      };
    });

    // Ensure fallback group for LAIN-LAIN / Unassigned
    if (!groups["cat-lain"]) {
      groups["cat-lain"] = {
        category: { id: "cat-lain", name: "LAIN-LAIN", color: "slate", description: "Komponen lainnya" },
        items: [],
        totalCost: 0,
      };
    }

    // Distribute paginated items
    paginatedItems.forEach((item) => {
      const catId = item.category_id || "cat-lain";
      if (!groups[catId]) {
        groups[catId] = {
          category: {
            id: catId,
            name: item.category_name || "LAIN-LAIN",
            color: item.category_color || "slate",
          },
          items: [],
          totalCost: 0,
        };
      }
      groups[catId].items.push(item);
      groups[catId].totalCost += Number(item.total_price) || 0;
    });

    // Only return categories that have items in this project (> 0 items)
    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [paginatedItems, masterCategories, selectedCategory, debouncedSearch, selectedStatus, selectedPriority]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const expandAll = () => setCollapsedCategories({});
  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    groupedCategories.forEach((g) => {
      allCollapsed[g.category.id] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = [
      "Kategori",
      "Nama Barang",
      "Nama Toko",
      "Qty",
      "Harga Satuan",
      "Total Harga",
      "Prioritas",
      "Status Item",
      "Link Pembelian",
      "Catatan",
    ];

    const rows = items.map((item) => [
      `"${item.category_name || "LAIN-LAIN"}"`,
      `"${item.item_name.replace(/"/g, '""')}"`,
      `"${(item.store_name || "").replace(/"/g, '""')}"`,
      item.quantity,
      item.unit_price,
      item.total_price,
      item.priority || "medium",
      item.status,
      `"${(item.purchase_url || "").replace(/"/g, '""')}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BOM_Export_${projectId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-blue-600 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Kebutuhan Material & Anggaran (BOM)
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Kelola estimasi dan realisasi anggaran material, status pembelian pengadaan, serta alokasi peruntukan lokasi proyek.
        </p>
      </div>

      {/* Top Summary Cards (Semantic Flow: Total -> Sudah Checkout -> Belum Checkout -> Ditolak) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total BOM Cost (Primary Color & Item Badge) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-sky-700">
              <DollarSign className="w-4 h-4 text-sky-600" />
              Total Anggaran BOM
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
              {summary?.total_items || 0} Item
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(summary?.total_cost || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.total_items || 0} total barang terdaftar
          </div>
        </div>

        {/* 2. Sudah Checkout (Semantic Success Emerald) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Sudah Checkout
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {summary?.by_status.sudah_checkout || 0} Item
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(summary?.total_sudah_checkout_cost || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Telah diproses / dibeli
          </div>
        </div>

        {/* 3. Belum Checkout (Semantic Pending Amber) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-amber-700">
              <Clock className="w-4 h-4 text-amber-600" />
              Belum Checkout
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {summary?.by_status.belum_checkout || 0} Item
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(summary?.total_belum_checkout_cost || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Menunggu approval / pembelian
          </div>
        </div>

        {/* 4. Ditolak / Dibatalkan (Always Danger Rose) */}
        {(() => {
          const rejectedCount = (summary?.by_status.ditolak || 0) + (summary?.by_status.dibatalkan || 0);
          return (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold flex items-center gap-1.5 text-rose-700">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Ditolak / Dibatalkan
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  {rejectedCount} Item
                </span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                {rejectedCount} Item
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summary?.by_status.ditolak || 0} ditolak, {summary?.by_status.dibatalkan || 0} dibatalkan
              </div>
            </div>
          );
        })()}
      </div>

      {/* Toolbar: Search, Filters, CSV, Add Item (Guaranteed No-Wrap) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-44 sm:w-52 xl:w-60 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang, toko, catatan..."
              title="Ketik untuk mencari kebutuhan material (jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-900 shadow-2xs transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="shrink-0 min-w-[170px]">
            <SearchableSelect
              size="sm"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={[
                { value: "all", label: "Semua Kategori BOM" },
                ...masterCategories.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
              searchPlaceholder="Cari kategori..."
              minItemsForSearch={5}
            />
          </div>

          {/* Status Filter */}
          <div className="shrink-0 min-w-[150px]">
            <SearchableSelect
              size="sm"
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "belum_checkout", label: "Belum Checkout", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">Pending</span> },
                { value: "sudah_checkout", label: "Sudah Checkout", badge: <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Done</span> },
                { value: "ditolak", label: "Ditolak", badge: <span className="text-[10px] bg-rose-100 text-rose-800 px-1 py-0.2 rounded font-bold">Ditolak</span> },
                { value: "dibatalkan", label: "Dibatalkan", badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">Batal</span> },
              ]}
              minItemsForSearch={8}
            />
          </div>

          {/* Priority Filter */}
          <div className="shrink-0 min-w-[150px]">
            <SearchableSelect
              size="sm"
              value={selectedPriority}
              onChange={(val) => setSelectedPriority(val)}
              options={[
                { value: "all", label: "Semua Prioritas" },
                { value: "high", label: "Prioritas: Tinggi", badge: <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">High</span> },
                { value: "medium", label: "Prioritas: Sedang", badge: <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">Med</span> },
                { value: "low", label: "Prioritas: Rendah", badge: <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold">Low</span> },
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

        {/* Right Actions Cluster */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Analytics Button */}
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              showAnalytics
                ? "bg-sky-50 text-sky-700 border-sky-300 shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 shadow-2xs"
            }`}
            title="Tampilkan / Sembunyikan visualisasi grafik anggaran BOM"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${showAnalytics ? "text-sky-600" : "text-slate-500"}`} />
            <span>Grafik Anggaran</span>
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* Expand/Collapse All Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200/90 rounded-xl p-0.5">
            <button
              type="button"
              onClick={expandAll}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg text-xs transition-colors cursor-pointer"
              title="Buka Semua Kategori"
            >
              <UnfoldHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg text-xs transition-colors cursor-pointer"
              title="Tutup Semua Kategori"
            >
              <FoldHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Unduh seluruh rekap daftar material ke format CSV / Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Add BOM Item Button */}
          {canEditContent && (
            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setIsCreateOpen(true);
              }}
              title="Tambah item kebutuhan material baru"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item BOM</span>
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
                  Analisis Anggaran & Alokasi Belanja Material (BOM)
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  Proporsi belanja per kategori komponen, realisasi pengadaan, dan sebaran biaya ruangan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">
                Total: <strong className="text-slate-900 font-mono font-bold">{bomAnalytics.totalItems}</strong> Komponen
              </span>
            </div>
          </div>

          {/* Charts Grid: Donut Category Spending & Location Spending */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* 1. Donut Chart Category Spending */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Distribusi Alokasi Anggaran per Kategori</span>
              </div>
              
              {bomAnalytics.totalCost === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada data anggaran biaya material</div>
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
                      {bomAnalytics.donutSlices.map((slice) => (
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
                        {bomAnalytics.realizationRate}%
                      </span>
                      <span className="text-[11px] text-slate-700 font-bold mt-0.5">Terealisasi</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2 text-xs flex-1 w-full max-h-48 overflow-y-auto no-scrollbar">
                    {bomAnalytics.donutSlices.map((slice) => (
                      <div key={slice.key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-slate-800 font-medium truncate text-xs">{slice.label}</span>
                        </div>
                        <div className="font-mono text-xs text-slate-900 text-right shrink-0">
                          <strong>{formatIDR(slice.totalCost)}</strong> <span className="text-slate-600 font-medium text-[11px]">({slice.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Location Cost Breakdown */}
            <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Sebaran Anggaran per Lokasi / Ruangan</span>
              </div>

              {bomAnalytics.topLocations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">Belum ada alokasi lokasi pada material</div>
              ) : (
                <div className="space-y-3 text-xs">
                  {bomAnalytics.topLocations.map((loc) => {
                    const maxCost = bomAnalytics.topLocations[0]?.totalCost || 1;
                    const pct = maxCost > 0 ? Math.round((loc.totalCost / bomAnalytics.totalCost) * 100) : 0;
                    const barPct = maxCost > 0 ? Math.round((loc.totalCost / maxCost) * 100) : 0;
                    return (
                      <div key={loc.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate">{loc.name} ({loc.count} item)</span>
                          <span className="font-mono font-bold text-slate-900">{formatIDR(loc.totalCost)} <span className="font-medium text-slate-600 text-[11px]">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all duration-500 rounded-full"
                            style={{ width: `${barPct}%` }}
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

      {/* 1 SINGLE CARD: BOM Tree Table (MIKROKONTROLER -> Barang 1, Barang 2 | SENSOR -> Barang 1) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 sm:px-4 w-[32%]">Kategori & Nama Barang</th>
                <th className="py-3 px-2 sm:px-3 w-[15%]">Nama Toko</th>
                <th className="py-3 px-2 text-center w-[6%]">Qty</th>
                <th className="py-3 px-2 sm:px-3 text-right w-[11%]">Harga</th>
                <th className="py-3 px-2 sm:px-3 text-right w-[12%]">Total</th>
                <th className="py-3 px-2 w-[8%]">Prioritas</th>
                <th className="py-3 px-2 w-[10%]">Status</th>
                <th className="py-3 px-2 text-center w-[4%]">Toko</th>
                {canEditContent && <th className="py-3 px-2 sm:px-3 text-center w-[5%]">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Memuat data kebutuhan material BOM...
                  </td>
                </tr>
              ) : groupedCategories.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center space-y-2">
                    <Package className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">
                      Belum ada kebutuhan material yang sesuai dengan filter pencarian.
                    </p>
                    {canEditContent && (
                      <button
                        type="button"
                        onClick={() => {
                          setItemToEdit(null);
                          setIsCreateOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Item Pertama
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                groupedCategories.map((group) => {
                  const cat = group.category;
                  const isCollapsed = collapsedCategories[cat.id];
                  const groupItems = group.items;

                  return (
                    <React.Fragment key={cat.id}>
                      {/* Category Header Row (Parent Tree Node - Clean White) */}
                      <tr
                        onClick={() => toggleCategoryCollapse(cat.id)}
                        className="bg-white hover:bg-slate-50/90 border-y border-slate-200/90 cursor-pointer select-none transition-colors"
                      >
                        <td colSpan={5} className="py-2.5 px-3 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-800 transition-transform"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border tracking-wider uppercase shrink-0 shadow-2xs ${getCategoryBadgeClass(
                                cat.color
                              )}`}
                            >
                              {cat.name}
                            </span>

                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              {groupItems.length} Item
                            </span>

                            {cat.description && (
                              <span className="text-[11px] text-slate-500 truncate hidden md:inline font-normal">
                                · {cat.description}
                              </span>
                            )}
                          </div>
                        </td>

                        <td colSpan={4} className="py-2.5 px-3 sm:px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subtotal:</span>
                            <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                              {formatIDR(group.totalCost)}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Child Items Rows (Tree Branch Nodes) */}
                      {!isCollapsed &&
                        groupItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/30 transition-colors bg-white group"
                          >
                              {/* 1. Nama Barang with Tree Branch Connector */}
                              <td className="py-3 px-3 sm:px-4">
                                <div className="flex items-start gap-2 pl-4 sm:pl-6">
                                  <span className="text-slate-300 group-hover:text-blue-500 font-mono text-xs select-none mt-0.5">
                                    ↳
                                  </span>
                                  <div>
                                    <div className="font-bold text-slate-900 leading-snug break-words">
                                      {item.item_name}
                                    </div>
                                    {item.notes && (
                                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                        {item.notes}
                                      </div>
                                    )}
                                    {item.location_name && (
                                      <div className="mt-1">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/70">
                                          <MapPin className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                          <span className="truncate max-w-[130px]">{item.location_name}</span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Nama Toko */}
                              <td className="py-3 px-2 sm:px-3">
                                {item.store_name ? (
                                  <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                                    <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[130px]" title={item.store_name}>
                                      {item.store_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs italic">-</span>
                                )}
                              </td>

                              {/* 3. Qty */}
                              <td className="py-3 px-2 text-center whitespace-nowrap font-bold text-slate-800 text-xs">
                                {item.quantity}
                              </td>

                              {/* 4. Harga Satuan */}
                              <td className="py-3 px-2 sm:px-3 text-right font-mono text-slate-600 whitespace-nowrap text-xs">
                                {formatIDR(item.unit_price)}
                              </td>

                              {/* 5. Total Harga */}
                              <td className="py-3 px-2 sm:px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-xs">
                                {formatIDR(item.total_price)}
                              </td>

                              {/* 6. Prioritas */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                <BOMPriorityBadge priority={item.priority || "medium"} />
                              </td>

                              {/* 7. Status */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                <BOMStatusBadge status={item.status} />
                              </td>

                              {/* 8. Link Pembelian */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                {item.purchase_url ? (
                                  <a
                                    href={
                                      item.purchase_url.startsWith("http")
                                        ? item.purchase_url
                                        : `https://${item.purchase_url}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center p-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors shadow-2xs"
                                    title={`Buka Link Pembelian (${item.store_name || "Toko"})`}
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                                    <ExternalLink className="w-2.5 h-2.5 text-blue-500 ml-0.5" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 text-xs italic">-</span>
                                )}
                              </td>

                              {/* 9. Aksi */}
                              {canEditContent && (
                                <td className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemToEdit(item);
                                        setIsCreateOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit Item BOM"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setItemToDelete(item)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Hapus Item BOM"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination as its own separate Card */}
      {filteredItems.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[15, 30, 50, 100]}
        />
      )}

      {/* BOM Add/Edit Modal */}
      <BOMModal
        isOpen={isCreateOpen}
        projectId={projectId}
        itemToEdit={itemToEdit}
        onClose={() => {
          setIsCreateOpen(false);
          setItemToEdit(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Hapus Item BOM"
        message={`Apakah Anda yakin ingin menghapus "${itemToDelete?.item_name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Item"
        isDanger={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (itemToDelete) {
            deleteMutation.mutate(
              { id: itemToDelete.id, projectId },
              {
                onSuccess: () => setItemToDelete(null),
              }
            );
          }
        }}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
}
