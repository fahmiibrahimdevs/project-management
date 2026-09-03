import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { BOMItem, BOMStatus, BOMPriority } from "../../types";
import { useCreateBOMItem, useUpdateBOMItem, useBOMCategories } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { 
  DollarSign, 
  ExternalLink, 
  ShoppingCart, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  Clock, 
  Flame,
  FileText,
  Link2,
  Store,
  Lock,
  Tags
} from "lucide-react";
import { getCategoryBadgeClass } from "./BOMCategoryMasterPage";

interface BOMModalProps {
  isOpen: boolean;
  projectId: string;
  itemToEdit: BOMItem | null;
  onClose: () => void;
}

export function BOMModal({
  isOpen,
  projectId,
  itemToEdit,
  onClose,
}: BOMModalProps) {
  const { isSuperUser } = useAuth();
  const { data: categories = [] } = useBOMCategories(projectId);

  const [itemName, setItemName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priority, setPriority] = useState<BOMPriority>("medium");
  const [status, setStatus] = useState<BOMStatus>("belum_checkout");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useCreateBOMItem();
  const updateMutation = useUpdateBOMItem();

  useEffect(() => {
    if (itemToEdit) {
      setItemName(itemToEdit.item_name);
      setCategoryId(itemToEdit.category_id || "");
      setStoreName(itemToEdit.store_name || "");
      setQuantity(itemToEdit.quantity);
      setUnitPrice(itemToEdit.unit_price);
      setPriority(itemToEdit.priority || "medium");
      setStatus(itemToEdit.status || "belum_checkout");
      setPurchaseUrl(itemToEdit.purchase_url || "");
      setNotes(itemToEdit.notes || "");
    } else {
      setItemName("");
      setCategoryId(categories.length > 0 ? categories[0].id : "");
      setStoreName("");
      setQuantity(1);
      setUnitPrice(0);
      setPriority("medium");
      setStatus("belum_checkout");
      setPurchaseUrl("");
      setNotes("");
    }
  }, [itemToEdit, isOpen, categories]);

  const numericQty = Number(quantity) || 0;
  const numericPrice = Number(unitPrice) || 0;
  const totalPrice = numericQty * numericPrice;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || numericQty <= 0) return;

    if (itemToEdit) {
      updateMutation.mutate(
        {
          id: itemToEdit.id,
          projectId,
          data: {
            item_name: itemName.trim(),
            category_id: categoryId || undefined,
            store_name: storeName.trim() || undefined,
            quantity: numericQty,
            unit_price: numericPrice,
            priority,
            status,
            purchase_url: purchaseUrl.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        },
        {
          onSuccess: () => onClose(),
        }
      );
    } else {
      createMutation.mutate(
        {
          project_id: projectId,
          item_name: itemName.trim(),
          category_id: categoryId || undefined,
          store_name: storeName.trim() || undefined,
          quantity: numericQty,
          unit_price: numericPrice,
          priority,
          status,
          purchase_url: purchaseUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: () => onClose(),
        }
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? "Edit Item Material (BOM)" : "Tambah Item Bill of Materials (BOM)"}
      subtitle="Input kebutuhan barang, kategori, nama toko, harga, prioritas, status pengadaan, dan link pembelian"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Kategori & Nama Barang */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="space-y-1.5 sm:col-span-5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Tags className="w-3.5 h-3.5 text-blue-600" />
              <span>Kategori BOM</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-800"
            >
              {categories.length === 0 ? (
                <option value="">LAIN-LAIN</option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-7">
            <label className="text-xs font-bold text-slate-800">
              Nama Barang / Komponen <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: ESP32 DevKit V1 / Sensor DHT22"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* 2. Toko / Supplier */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span>Nama Toko / Supplier</span>
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Contoh: Tokopedia Official / Slamtec / Jaya Elektronik"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          />
        </div>

        {/* 2. Qty & Harga Satuan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Kuantitas (Qty) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={quantity || ""}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              placeholder="Jumlah unit (misal: 2)"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Harga Satuan (Rp) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={unitPrice || ""}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              placeholder="Contoh: 3500000"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Live Total Calculation Card */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              Rp
            </div>
            <div>
              <span className="text-xs font-semibold text-blue-900 block">
                Total Biaya Item
              </span>
              <span className="text-[11px] text-blue-700">
                {numericQty} unit × {formatIDR(numericPrice)}
              </span>
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-blue-800 font-mono">
            {formatIDR(totalPrice)}
          </div>
        </div>

        {/* 3. Prioritas Selection (Pill Cards) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            Prioritas Kebutuhan
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPriority("low")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                priority === "low"
                  ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Low</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority("medium")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                priority === "medium"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Medium</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority("high")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                priority === "high"
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>High</span>
            </button>
          </div>
        </div>

        {/* 4. Status Item Selection (Pill Cards - PM/Owner only) */}
        {isSuperUser ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Status Item Pengadaan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setStatus("belum_checkout")}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  status === "belum_checkout"
                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Belum Checkout</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("sudah_checkout")}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  status === "sudah_checkout"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Sudah Checkout</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("ditolak")}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  status === "ditolak"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>Ditolak</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("dibatalkan")}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  status === "dibatalkan"
                    ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Ban className="w-3 h-3" />
                <span>Dibatalkan</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Item yang diajukan akan berstatus <strong>Belum Checkout</strong> dan akan ditinjau serta diverifikasi oleh PM/Owner.
            </span>
          </div>
        )}

        {/* 5. Link Pembelian */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Link Pembelian (URL Toko / Supplier)</span>
            </label>
            {purchaseUrl && (
              <a
                href={purchaseUrl.startsWith("http") ? purchaseUrl : `https://${purchaseUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Buka Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <input
            type="url"
            value={purchaseUrl}
            onChange={(e) => setPurchaseUrl(e.target.value)}
            placeholder="https://www.tokopedia.com/... atau https://shopee.co.id/..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Catatan Tambahan (Opsional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">Catatan Tambahan (Opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Catatan garansi, spesifikasi teknis, atau nomor resi..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending || !itemName.trim() || numericQty <= 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Menyimpan..."
              : itemToEdit
              ? "Perbarui Item BOM"
              : "Tambah Item BOM"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
