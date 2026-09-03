import React, { useState, useMemo, useEffect } from "react";
import { BOMCategory } from "../../types";
import { Modal } from "../common/Modal";
import { Pagination } from "../common/Pagination";
import { 
  useBOMCategories, 
  useCreateBOMCategory, 
  useUpdateBOMCategory, 
  useDeleteBOMCategory 
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import { 
  Tags, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  ArrowLeft, 
  Check, 
  X, 
  Layers, 
  Info,
  Package,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { showConfirm, notifySuccess, notifyError } from "../../utils/swal";

export function getCategoryBadgeClass(color?: string) {
  switch (color) {
    case "blue":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "purple":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "teal":
      return "bg-teal-50 text-teal-700 border-teal-200";
    case "slate":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

interface BOMCategoryMasterPageProps {
  onBackToGlobal: () => void;
}

const COLOR_OPTIONS = [
  { id: "blue", name: "Biru (Blue)", bgClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "amber", name: "Amber / Oranye (Amber)", bgClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "rose", name: "Merah (Rose)", bgClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "emerald", name: "Hijau (Emerald)", bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "purple", name: "Ungu (Purple)", bgClass: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "teal", name: "Toska (Teal)", bgClass: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "slate", name: "Abu-abu (Slate)", bgClass: "bg-slate-50 text-slate-700 border-slate-200" },
];

export function BOMCategoryMasterPage({ onBackToGlobal }: BOMCategoryMasterPageProps) {
  const { canEditContent } = useAuth();
  const { data: categories = [], isLoading } = useBOMCategories();
  const createCategoryMutation = useCreateBOMCategory();
  const updateCategoryMutation = useUpdateBOMCategory();
  const deleteCategoryMutation = useDeleteBOMCategory();

  // Search state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<BOMCategory | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState("blue");

  const filteredCategories = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return categories.filter((cat) => {
      return (
        q === "" ||
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
      );
    });
  }, [categories, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  const handleOpenCreateModal = () => {
    setCategoryToEdit(null);
    setFormName("");
    setFormDesc("");
    setFormColor("blue");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: BOMCategory) => {
    setCategoryToEdit(cat);
    setFormName(cat.name);
    setFormDesc(cat.description || "");
    setFormColor(cat.color || "blue");
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      notifyError("Nama Kategori Kosong", "Silakan masukkan nama kategori.");
      return;
    }

    if (categoryToEdit) {
      updateCategoryMutation.mutate(
        {
          id: categoryToEdit.id,
          data: {
            name: formName.trim().toUpperCase(),
            description: formDesc.trim() || undefined,
            color: formColor,
          },
        },
        {
          onSuccess: () => {
            notifySuccess("Kategori berhasil diperbarui");
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            notifyError("Gagal Memperbarui", err.message || "Terjadi kesalahan.");
          },
        }
      );
    } else {
      createCategoryMutation.mutate(
        {
          name: formName.trim().toUpperCase(),
          description: formDesc.trim() || undefined,
          color: formColor,
        },
        {
          onSuccess: () => {
            notifySuccess("Kategori baru berhasil ditambahkan");
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            notifyError("Gagal Menambah Kategori", err.message || "Terjadi kesalahan.");
          },
        }
      );
    }
  };

  const handleDelete = async (cat: BOMCategory) => {
    const isConfirmed = await showConfirm({
      title: "Hapus Master Kategori?",
      text: `Kategori "${cat.name}" akan dihapus. Barang di seluruh proyek yang menggunakan kategori ini akan dipindahkan ke kategori LAIN-LAIN.`,
      confirmButtonText: "Ya, Hapus Kategori",
      isDanger: true,
    });

    if (!isConfirmed) return;

    deleteCategoryMutation.mutate(cat.id, {
      onSuccess: () => {
        notifySuccess(`Kategori ${cat.name} berhasil dihapus`);
      },
      onError: (err: any) => {
        notifyError("Gagal Menghapus Kategori", err.message || "Terjadi kesalahan.");
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBackToGlobal}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Kembali ke Dashboard Utama"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                <Tags className="w-4 h-4" />
              </span>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Master Kategori BOM
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Standarisasi pengelompokan komponen hardware & material pengadaan di seluruh proyek
            </p>
          </div>
        </div>

        {canEditContent && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        )}
      </div>

      {/* Info Guide Card */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed space-y-1">
          <p className="font-semibold text-blue-950">
            Panduan Penggunaan Master Kategori Material
          </p>
          <p className="text-blue-800/90">
            Setiap kategori yang didaftarkan di sini akan otomatis tersedia pada form input Bill of Materials (BOM) di semua proyek.
            Tabel BOM pada proyek akan otomatis menampilkan data dalam format <strong>Tree Table</strong> per kategori (Mikrokontroler, Sensor, Aktuator, dll).
          </p>
        </div>
      </div>

      {/* Toolbar: Search & Info */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kategori atau contoh komponen..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Total {filteredCategories.length} Kategori Terdaftar</span>
        </div>
      </div>

      {/* Master Categories Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-[6%] text-center">No</th>
                <th className="py-3.5 px-4 w-[24%]">Nama Kategori</th>
                <th className="py-3.5 px-4 w-[44%]">Keterangan / Contoh Komponen</th>
                <th className="py-3.5 px-4 w-[14%] text-center">Warna Badge</th>
                {canEditContent && <th className="py-3.5 px-4 w-[12%] text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    Memuat daftar master kategori...
                  </td>
                </tr>
              ) : filteredCategories.length > 0 ? (
                paginatedCategories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* No */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Nama Kategori */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold border tracking-wider uppercase inline-block shadow-2xs ${getCategoryBadgeClass(
                          cat.color
                        )}`}
                      >
                        {cat.name}
                      </span>
                    </td>

                    {/* Keterangan */}
                    <td className="py-3.5 px-4">
                      {cat.description ? (
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {cat.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada keterangan spesifik</p>
                      )}
                    </td>

                    {/* Warna Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-semibold text-slate-500 capitalize bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                        {cat.color || "blue"}
                      </span>
                    </td>

                    {/* Aksi */}
                    {canEditContent && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Kategori"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {cat.id !== "cat-lain" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada kategori yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination as its own separate Card */}
      {filteredCategories.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCategories.length}
          pageSize={pageSize}
          pageSizeOptions={[15, 30, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Add / Edit Category Modal (Single modal dedicated to this page) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={categoryToEdit ? "Edit Master Kategori BOM" : "Tambah Master Kategori BOM Baru"}
        subtitle="Kelola kelompok pengadaan komponen seperti Mikrokontroler, Sensor, Aktuator, dll."
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Nama Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: MIKROKONTROLER"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase font-bold text-slate-900 tracking-wide"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Warna Label Badge
            </label>
            <select
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Keterangan / Contoh Komponen (Opsional)
            </label>
            <textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Contoh: ESP32 DevKit, Arduino Uno, STM32 Bluepill, Raspberry Pi Pico"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800"
            />
          </div>

          {/* Preview Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pratinjau Badge:</span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-extrabold border tracking-wider uppercase ${getCategoryBadgeClass(
                formColor
              )}`}
            >
              {formName.trim() || "NAMA KATEGORI"}
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{categoryToEdit ? "Simpan Perubahan" : "Tambah Kategori"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
