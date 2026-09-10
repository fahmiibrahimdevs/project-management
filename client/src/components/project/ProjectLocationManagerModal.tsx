import React, { useState, useMemo } from "react";
import { Modal } from "../common/Modal";
import { ProjectLocation } from "../../types";
import {
  useProjectLocations,
  useCreateProjectLocation,
  useUpdateProjectLocation,
  useDeleteProjectLocation,
} from "../../api/client";
import { showConfirm, notifySuccess, notifyError } from "../../utils/swal";
import {
  MapPin,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  Info,
  Search,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface ProjectLocationManagerModalProps {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  canManage?: boolean;
  onClose: () => void;
}

export function ProjectLocationManagerModal({
  isOpen,
  projectId,
  projectName,
  canManage = true,
  onClose,
}: ProjectLocationManagerModalProps) {
  const { data: locations = [], isLoading } = useProjectLocations(projectId);
  const createMutation = useCreateProjectLocation();
  const updateMutation = useUpdateProjectLocation();
  const deleteMutation = useDeleteProjectLocation();

  const [editingLocation, setEditingLocation] = useState<ProjectLocation | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const startEdit = (loc: ProjectLocation) => {
    setEditingLocation(loc);
    setName(loc.name);
    setAddress(loc.address || "");
    setDescription(loc.description || "");
  };

  const cancelEdit = () => {
    setEditingLocation(null);
    setName("");
    setAddress("");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingLocation) {
      updateMutation.mutate(
        {
          id: editingLocation.id,
          projectId,
          data: {
            name: name.trim(),
            address: address.trim() || undefined,
            description: description.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            cancelEdit();
            notifySuccess("Lokasi berhasil diperbarui");
          },
          onError: (err: any) => {
            notifyError("Gagal memperbarui lokasi", err?.message);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          project_id: projectId,
          name: name.trim(),
          address: address.trim() || undefined,
          description: description.trim() || undefined,
        },
        {
          onSuccess: () => {
            cancelEdit();
            notifySuccess("Lokasi proyek berhasil ditambahkan");
          },
          onError: (err: any) => {
            notifyError("Gagal menambah lokasi", err?.message);
          },
        }
      );
    }
  };

  const handleDeleteLocation = async (loc: ProjectLocation) => {
    const confirmed = await showConfirm({
      title: `Hapus Lokasi "${loc.name}"?`,
      text: "Tugas, kebutuhan material (BOM), dan log isu yang terhubung dengan lokasi ini tidak akan dihapus, melainkan diubah menjadi 'Tanpa Lokasi'.",
      confirmButtonText: "Ya, Hapus Lokasi",
      cancelButtonText: "Batal",
      icon: "warning",
      isDanger: true,
    });

    if (!confirmed) return;

    deleteMutation.mutate(
      { id: loc.id, projectId },
      {
        onSuccess: () => {
          if (editingLocation?.id === loc.id) {
            cancelEdit();
          }
          notifySuccess("Lokasi proyek berhasil dihapus");
        },
        onError: (err: any) => {
          notifyError("Gagal menghapus lokasi", err?.message);
        },
      }
    );
  };

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address && l.address.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q))
    );
  }, [locations, search]);

  // =========================================================================
  // JENDELA KIRI: Card Form Saja (Tanpa Header Modal & Tanpa Notif Info)
  // =========================================================================
  const formCardSidePanel = canManage ? (
    <div className="flex flex-col h-full bg-white">
      {/* Header Card Form */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 shrink-0 shadow-2xs">
            {editingLocation ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {editingLocation ? "Edit Informasi Lokasi" : "Tambah Lokasi Baru"}
            </h4>
            <p className="text-[11px] text-slate-500">
              {editingLocation ? "Perbarui detail site terpilih" : "Form site / gedung pengerjaan"}
            </p>
          </div>
        </div>
        {editingLocation && (
          <button
            type="button"
            onClick={cancelEdit}
            className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200/60"
          >
            Batal
          </button>
        )}
      </div>

      {/* Body Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nama Lokasi / Site <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Contoh: Site Surabaya / Line 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Alamat / Area Gedung
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Contoh: Jl. Rungkut Industri No. 12"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Deskripsi / Lingkup Pengerjaan
          </label>
          <textarea
            rows={4}
            placeholder="Keterangan lingkup pengerjaan atau kontak penanggung jawab lokasi..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors resize-none shadow-2xs"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all"
          >
            {editingLocation ? (
              <>
                <Check className="w-4 h-4" />
                <span>{updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>{createMutation.isPending ? "Menyimpan..." : "Simpan Lokasi"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  ) : (
    <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center text-xs text-slate-500 flex flex-col items-center justify-center h-full">
      <MapPin className="w-8 h-8 text-slate-300 mb-2" />
      <span>Akses Hanya-Lihat: Anda tidak memiliki wewenang untuk menambah atau mengedit lokasi proyek ini.</span>
    </div>
  );

  // =========================================================================
  // JENDELA KANAN: Main Window (Lebar, Memiliki Modal Header, Notif & Daftar Lokasi Baru)
  // =========================================================================
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Lokasi Proyek"
      subtitle={`Daftar lokasi dinamis untuk proyek "${projectName}"`}
      maxWidth="3xl"
      sidePanel={formCardSidePanel}
      sidePanelPosition="left"
    >
      <div className="space-y-4">
        {/* Notif Pemberitahuan di Bagian Atas Main Window */}
        <div className="p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-2xl flex items-start gap-3 text-sky-950 text-xs shadow-2xs">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Lokasi proyek yang Anda daftarkan di sini akan otomatis menjadi opsi filter pada{" "}
            <span className="font-semibold text-sky-900">Papan Kanban</span>,{" "}
            <span className="font-semibold text-sky-900">Tabel Tugas</span>,{" "}
            <span className="font-semibold text-sky-900">Kebutuhan Material (BOM)</span>, dan{" "}
            <span className="font-semibold text-sky-900">Log Masalah (RCA)</span>.
          </p>
        </div>

        {/* Header List & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Daftar Lokasi Terdaftar</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {locations.length} Lokasi
            </span>
          </div>

          {locations.length > 2 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari lokasi atau alamat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-colors shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Desain Baru Daftar Lokasi */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Memuat daftar lokasi...</div>
        ) : locations.length === 0 ? (
          <div className="py-16 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-white text-slate-300 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
              <MapPin className="w-6 h-6 text-slate-400" />
            </div>
            <h5 className="text-sm font-bold text-slate-800">Belum Ada Lokasi Terdaftar</h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Proyek ini saat ini masih menggunakan lingkup terpusat. Gunakan form di jendela sebelah kiri untuk mendaftarkan site, gedung, atau cabang pengerjaan.
            </p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada lokasi yang cocok dengan kata kunci pencarian &quot;{search}&quot;.
          </div>
        ) : (
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredLocations.map((loc, index) => {
              const isEditing = editingLocation?.id === loc.id;
              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    isEditing
                      ? "bg-sky-50/40 border-sky-500 ring-2 ring-sky-500/20 shadow-md"
                      : "bg-white border-slate-200/90 hover:border-sky-400 hover:shadow-card shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Info Utama Lokasi */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Site #{index + 1}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 truncate">
                          {loc.name}
                        </h5>
                        {isEditing && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                            Sedang Diedit di Form Kiri
                          </span>
                        )}
                      </div>

                      {loc.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{loc.address}</span>
                        </div>
                      )}

                      {loc.description && (
                        <div className="text-xs text-slate-500 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          {loc.description}
                        </div>
                      )}

                      {/* Status Terintegrasi */}
                      <div className="pt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Tersinkron di Kanban, BOM & RCA</span>
                        </span>
                      </div>
                    </div>

                    {/* Tombol Aksi */}
                    {canManage && (
                      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => startEdit(loc)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                            isEditing
                              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                              : "text-slate-700 hover:text-sky-700 bg-white hover:bg-sky-50 border-slate-200/90 hover:border-sky-300 shadow-2xs"
                          }`}
                          title="Edit informasi lokasi ini"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200/60 rounded-xl transition-all"
                          title="Hapus lokasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
