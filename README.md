<div align="center">

# 🚀 ProTrack - Advanced Multi-Project Management & Issue Tracking System

**Sistem Manajemen Proyek, Pelacakan Tugas Kanban, Anggaran Komponen (BOM), dan Analisis Masalah Lapangan (Root Cause Analysis)**

[![Bun](https://img.shields.io/badge/Bun-1.1+-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![Hono](https://img.shields.io/badge/Hono.js-Backend-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MariaDB](https://img.shields.io/badge/MariaDB-10.11+-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org)

<br/>

[Fitur Utama](#-fitur-utama) •
[Cara Setup Cepat (1 Perintah)](#-cara-setup-cepat-sekali-jalan) •
[Panduan Instalasi Manual](#-panduan-instalasi-manual) •
[Akun Default Demo](#-akun-default-demo) •
[Hak Akses & Role (RBAC)](#-sistem-hak-akses--wewenang-rbac) •
[Struktur Project](#-struktur-direktori-project)

</div>

---

## 🌟 Tentang ProTrack

**ProTrack** adalah platform manajemen proyek modern yang dirancang khusus untuk tim *Engineering*, *Software Development*, dan *IoT Hardware*. Menggabungkan alur kerja **Kanban Board** yang intuitif dengan gerbang kendali mutu (*Quality Gate*), perhitungan pengadaan suku cadang **Bill of Materials (BOM)**, dan pencatatan investigasi masalah **Root Cause Analysis (RCA)**.

---

## 🎯 Fitur Utama

### 1. 📊 Global Portfolio Dashboard
- **Ringkasan Multi-Proyek Terpadu**: Pantau akumulasi progres kriteria acceptance task, alokasi anggaran komponen (BOM), dan penanganan kendala teknis di semua lini proyek.
- **Kartu Proyek Interaktif**: Dilengkapi statistik status (*Active, Planning, On Hold, Completed*), kalkulasi biaya BOM dalam format Rupiah, jumlah issue terbuka, dan alokasi tim personil (*stacked avatar*).

### 2. 📋 Kanban Board & Smart Ordering
- **5 Kolom Status**: *Daftar Tunggu (Backlog)*, *Sedang Dikerjakan (In Progress)*, *Dalam Peninjauan (In Review)*, *Selesai (Completed)*, dan *Ditunda (On Hold)*.
- **Smart Ordering**: Secara otomatis mengurutkan tugas berdasarkan **Batas Waktu Terdekat (Deadline)**, dilanjutkan dengan **Prioritas Tertinggi (Urgent/High → Medium → Low)**.
- **Quality Gate Approval**: Karyawan & Magang leluasa menggeser kartu antara *Backlog, In Progress, dan In Review*, sedangkan pemindahan ke status *Selesai* atau *Ditunda* memerlukan *approval* dari Project Manager (PM) / Owner.

### 3. ✏️ Acceptance Criteria dengan Live Timestamps & Inline Edit
- **Inline Editor**: Ubah teks kriteria secara langsung dengan menekan ikon pensil atau tombol `Enter`.
- **Multi-Assignee Gating**: Hanya pelaksana yang ditugaskan pada tugas tersebut (atau PM/Owner) yang berhak menyelesaikan checklist kriteria.
- **Timestamp & Pelaksana**: Mencatat siapa yang menyelesaikan kriteria beserta waktu presisi (*real-time*).
- **Diskusi & Lampiran**: Forum diskusi internal dan unggah berkas (*file attachments*) untuk setiap task.

### 4. 📦 Bill of Materials (BOM) & Master Category
- **Pelacakan Komponen Hardware**: Pencatatan spesifikasi komponen, harga satuan, kuantitas, vendor/toko, tautan pembelian, dan status pengadaan (*Belum Checkout, Sudah Checkout, Ditolak, Dibatalkan*).
- **Master Kategori BOM**: Manajemen kategori master (*Mikrokontroler, Sensor, Aktuator, Power Supply, Mekanikal, dll.*) lengkap dengan penyesuaian warna dan urutan.
- **Ekspor Data**: Ekspor daftar BOM proyek ke format CSV dengan 1 klik.

### 5. 🔍 Log Permasalahan (Root Cause Analysis - RCA)
- **Format Investigasi Standar 5 Poin**:
  1. *Tanggal & Waktu Kejadian*
  2. *Deskripsi Permasalahan*
  3. *Indikasi / Gejala yang Teramati*
  4. *Akar Masalah (Root Cause)*
  5. *Tindakan Perbaikan & Solusi Pencegahan*
- **Severity & Status**: Klasifikasi tingkat keparahan (*Critical, High, Medium, Low*) dan siklus penanganan (*Open, Investigating, Resolved, Closed*).

### 6. 👥 Manajemen Tim & Keamanan Akun
- **Direktori Tim Terpusat**: Owner dapat mendaftarkan akun baru, mengatur role, jabatan teknis, departemen, dan nomor kontak.
- **Pengaturan Profil Mandiri**: Setiap pengguna dapat memperbarui biodata dan mengganti kata sandi kapan saja.

---

## ⚡ Cara Setup Cepat (Sekali Jalan)

Bagi Anda yang ingin langsung menjalankan aplikasi tanpa konfigurasi rumit, cukup jalankan skrip otomatis berikut di terminal:

```bash
# Clone repository
git clone https://github.com/fahmiibrahimdevs/project-management.git
cd project-management

# Jalankan skrip setup otomatis
bash setup.sh
```

Skrip ini akan secara otomatis:
1. Memeriksa dan menginstall **Bun Runtime** jika belum ada.
2. Menginstall seluruh dependensi server & client.
3. Membuat database MariaDB `protrack_db` dan mengimpor tabel.
4. Membangun (*build*) aset produksi React.
5. Memberikan instruksi untuk menjalankan server.

---

## 🛠️ Panduan Instalasi Manual

Jika Anda ingin mengonfigurasi langkah demi langkah:

### 1. Persyaratan Sistem
- **Bun**: v1.1 atau lebih baru ([Install Bun](https://bun.sh))
- **MariaDB** atau **MySQL**: v10.4+ / v8.0+ aktif di port `3306`
- **Node.js**: v18+ (Opsional)

### 2. Konfigurasi Database MariaDB
Masuk ke terminal MariaDB/MySQL Anda:
```sql
CREATE DATABASE protrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexaryn'@'127.0.0.1' IDENTIFIED BY '31750321';
GRANT ALL PRIVILEGES ON protrack_db.* TO 'nexaryn'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Impor struktur tabel dari file `server/schema.sql`:
```bash
mariadb -h 127.0.0.1 -u nexaryn -p31750321 protrack_db < server/schema.sql
```

### 3. Install Dependensi
```bash
# Install dependensi Server
cd server
bun install

# Install dependensi Client
cd ../client
bun install
cd ..
```

### 4. Menjalankan Aplikasi

#### Mode Development (Hot Reloading):
```bash
bun run dev
```
- Server Backend: `http://localhost:3001`
- Client Frontend: `http://localhost:5173`

#### Mode Production (Single Port Server):
```bash
# Build frontend
bun run build

# Start server
bun run start
```
Buka browser di **`http://localhost:3001`** atau domain lokal yang Anda konfigurasi.

---

## 👤 Akun Default Demo

Aplikasi telah dilengkapi dengan akun demo siap pakai:

| Role | Nama | Email | Password |
| :--- | :--- | :--- | :---: |
| 👑 **Owner** | Awan Setiawan | `awan.setiawan@fsi.com` | `1` |
| 👑 **Owner** | Aldy Ariyanto | `aldy.afriyanto@fsi.com` | `1` |
| 💼 **Project Manager** | Dede Andri | `dede.andri@fsi.com` | `1` |
| 💼 **Project Manager** | Fahmi Ibrahim | `fahmi.ibrahim@fsi.com` | `1` |
| 🛠️ **Karyawan** | Purwanto | `purwanto@fsi.com` | `1` |
| 🎓 **Magang** | Arif Fahmi Abdillah | `arif.fahmi.abdillah@fsi.com` | `1` |

> 💡 *Catatan: Anda dapat mengubah password dan data profil kapan saja melalui menu Keamanan Akun di pojok kanan atas.*

---

## 🔐 Sistem Hak Akses & Wewenang (RBAC)

| Aksi / Modul | Owner 👑 | Project Manager 💼 | Karyawan 🛠️ | Magang 🎓 |
| :--- | :---: | :---: | :---: | :---: |
| **Buat Proyek Baru** | ✅ | ✅ | ❌ | ❌ |
| **Kelola Personil Proyek** | ✅ | ✅ | ❌ | ❌ |
| **Buat Task Baru** | ✅ | ✅ | ✅ *(Auto-Assign Diri)* | ✅ *(Auto-Assign Diri)* |
| **Drag & Drop (Backlog / In Progress / In Review)** | ✅ | ✅ | ✅ | ✅ |
| **Approval Task (Selesai / Ditunda)** | ✅ | ✅ | ❌ *(Perlu Approval PM/Owner)* | ❌ *(Perlu Approval PM/Owner)* |
| **Edit Kriteria Penerimaan** | ✅ | ✅ | ✅ *(Task Terkait)* | ✅ *(Task Terkait)* |
| **Tambah BOM & Log Permasalahan** | ✅ | ✅ | ✅ | ✅ |
| **Manajemen Tim & Pendaftaran Akun** | ✅ | 👁️ Lihat | 👁️ Lihat | 👁️ Lihat |

---

## 📁 Struktur Direktori Project

```plaintext
project-management/
├── client/                     # Frontend Application (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/                # TanStack React Query Client & API Hooks
│   │   ├── components/
│   │   │   ├── auth/           # Login & Account Security Modals
│   │   │   ├── attachments/    # File Upload & Attachment Management
│   │   │   ├── bom/            # Bill of Materials & Category Master
│   │   │   ├── common/         # Reusable UI (Avatar, Badge, Modal, Pagination)
│   │   │   ├── dashboard/      # Global Multi-Project Portfolio Dashboard
│   │   │   ├── issues/         # Root Cause Analysis Issue Logs
│   │   │   ├── kanban/         # Kanban Board, Task Cards, List View, Modal Detail
│   │   │   ├── layout/         # Navigation Bar & Project Header
│   │   │   ├── project/        # Project Creation & Team Allocation Modals
│   │   │   └── team/           # Team & Access Control Directory
│   │   ├── context/            # AuthContext & Role-Based Authorization
│   │   ├── hooks/              # Custom Utility Hooks
│   │   ├── types/              # TypeScript Interface Definitions
│   │   └── utils/              # SweetAlert2 & Helper Utilities
│   └── package.json
├── server/                     # Backend API (Bun + Hono.js + MariaDB)
│   ├── src/
│   │   ├── db/                 # MariaDB Connection Pool & Auto-Seeder
│   │   ├── routes/             # RESTful API Endpoints (Auth, Projects, Tasks, BOM, Issues)
│   │   └── index.ts            # Hono Application Entry Point & Static File Server
│   ├── schema.sql              # Database Schema Export
│   └── package.json
├── setup.sh                    # One-Click Automated Setup Script
├── package.json                # Root Workspace Commands
└── README.md                   # Dokumentasi Lengkap Proyek
```

---

## 🚀 Layanan Otomatis Systemd & Nginx (Opsional)

Aplikasi dapat dijalankan sebagai *background service* di server Linux menggunakan `systemd`:

```ini
# /etc/systemd/system/project-management.service
[Unit]
Description=Project Management Application (Bun + Hono + MariaDB)
After=network.target mariadb.service

[Service]
Type=simple
User=midpc
WorkingDirectory=/home/midpc/Documents/Project
ExecStart=/home/midpc/.bun/bin/bun run server/src/index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=PATH=/home/midpc/.bun/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
```

Perintah manajemen service:
```bash
sudo systemctl enable project-management.service
sudo systemctl start project-management.service
sudo systemctl status project-management.service
```

---

## 📝 Semantic Commit Convention

Proyek ini menerapkan standar **Conventional Commits**:
- `feat:` Penambahan fitur baru (contoh: `feat(kanban): add smart ordering by deadline and priority`)
- `fix:` Perbaikan bug (contoh: `fix(dashboard): resolve project members count zero issue`)
- `refactor:` Pembersihan dan restrukturisasi kode tanpa mengubah fungsionalitas
- `docs:` Pembaruan dokumentasi (contoh: `docs: add comprehensive readme and setup guide`)
- `chore:` Pemeliharaan dependensi dan konfigurasi build

---

## 📄 Lisensi

Hak Cipta © 2026 **[Fahmi Ibrahim](https://github.com/fahmiibrahimdevs)**.  
Dilisensikan di bawah [MIT License](LICENSE).
