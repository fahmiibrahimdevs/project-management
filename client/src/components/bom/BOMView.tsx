import React, { useState, useMemo, useEffect } from "react";
import { BOMItem, BOMStatus, BOMPriority, BOMCategory } from "../../types";
import { BOMStatusBadge, BOMPriorityBadge } from "../common/Badge";
import { Pagination } from "../common/Pagination";
import { BOMModal } from "./BOMModal";
import { ConfirmModal } from "../common/ConfirmModal";
import { getCategoryBadgeClass } from "./BOMCategoryMasterPage";
import { useBOM, useBOMCategories, useDeleteBOMItem } from "../../api/client";
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
  ChevronRight,
  Layers,
  FoldHorizontal,
  UnfoldHorizontal
} from "lucide-react";

interface BOMViewProps {
  projectId: string;
}

export function BOMView({ projectId }: BOMViewProps) {
  const { canEditContent } = useAuth();
  const { data, isLoading } = useBOM(projectId);
  const { data: masterCategories = [] } = useBOMCategories(projectId);
  const deleteMutation = useDeleteBOMItem();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<BOMItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BOMItem | null>(null);

  const items = data?.items || [];
  const summary = data?.summary;

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

      return matchSearch && matchCategory && matchStatus && matchPriority;
    });
  }, [items, debouncedSearch, selectedCategory, selectedStatus, selectedPriority]);

  // Auto-reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory, selectedStatus, selectedPriority]);

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
    <div className="space-y-5">
      {/* Top Summary Cards (Urutan: 🔵 Biru -> 🔴 Merah -> 🟠 Orange -> 🟢 Hijau) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total BOM Cost (🔵 Blue) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-blue-700">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Total Anggaran BOM
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(summary?.total_cost || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.total_items || 0} total barang terdaftar
          </div>
        </div>

        {/* 2. Ditolak / Dibatalkan (🔴 Rose) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-rose-700">
              <XCircle className="w-4 h-4 text-rose-600" />
              Ditolak / Dibatalkan
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
              {(summary?.by_status.ditolak || 0) + (summary?.by_status.dibatalkan || 0)} Item
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {(summary?.by_status.ditolak || 0) + (summary?.by_status.dibatalkan || 0)} Item
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.by_status.ditolak || 0} ditolak, {summary?.by_status.dibatalkan || 0} dibatalkan
          </div>
        </div>

        {/* 3. Belum Checkout (🟠 Amber) */}
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

        {/* 4. Sudah Checkout (🟢 Emerald) */}
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
      </div>

      {/* Toolbar: Search, Filters, CSV, Add Item */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang, toko, catatan..."
              title="Ketik untuk mencari kebutuhan material (jeda 500ms)"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            title="Filter material berdasarkan kategori"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-semibold cursor-pointer"
          >
            <option value="all">Semua Kategori BOM</option>
            {masterCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            title="Filter material berdasarkan status pembelian / pengadaan"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="belum_checkout">Belum Checkout</option>
            <option value="sudah_checkout">Sudah Checkout</option>
            <option value="ditolak">Ditolak</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            title="Filter material berdasarkan tingkat prioritas pengadaan"
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">Semua Prioritas</option>
            <option value="high">Prioritas: Tinggi</option>
            <option value="medium">Prioritas: Sedang</option>
            <option value="low">Prioritas: Rendah</option>
          </select>

          {/* Expand/Collapse All Buttons */}
          <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={expandAll}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs"
              title="Buka Semua Kategori"
            >
              <UnfoldHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs"
              title="Tutup Semua Kategori"
            >
              <FoldHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Unduh seluruh rekap daftar material ke format CSV / Excel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item BOM</span>
            </button>
          )}
        </div>
      </div>

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
                      {/* Category Header Row (Parent Tree Node) */}
                      <tr
                        onClick={() => toggleCategoryCollapse(cat.id)}
                        className="bg-slate-100/80 hover:bg-slate-200/60 border-y border-slate-200/90 cursor-pointer select-none transition-colors"
                      >
                        <td colSpan={5} className="py-2.5 px-3 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-700 transition-transform"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border tracking-wider uppercase shrink-0 ${getCategoryBadgeClass(
                                cat.color
                              )}`}
                            >
                              {cat.name}
                            </span>

                            <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
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
                            <span className="text-[10px] text-slate-500">Subtotal:</span>
                            <span className="text-xs font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
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
