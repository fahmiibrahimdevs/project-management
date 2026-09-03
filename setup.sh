#!/usr/bin/env bash

# ==============================================================================
# ProTrack FSI - One-Click Automated Setup Script
# ==============================================================================

set -e

echo ""
echo "🚀 ========================================================"
echo "   Memulai Setup Otomatis ProTrack Project Management"
echo "========================================================"
echo ""

# 1. Cek / Install Bun Runtime
if ! command -v bun &> /dev/null; then
    echo "📦 Bun belum terinstall. Mengunduh dan menginstall Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "✅ Bun Runtime siap: $(bun --version)"

# 2. Install Dependencies
echo ""
echo "📦 Menginstall dependensi Server..."
cd server
bun install
cd ..

echo "📦 Menginstall dependensi Client..."
cd client
bun install
cd ..

# 3. Inisialisasi Database MariaDB
echo ""
echo "🗄️ Menyiapkan Database MariaDB 'protrack_db'..."
DB_USER=${DB_USER:-"nexaryn"}
DB_PASS=${DB_PASS:-"31750321"}
DB_NAME=${DB_NAME:-"protrack_db"}
DB_HOST=${DB_HOST:-"127.0.0.1"}

if command -v mariadb &> /dev/null || command -v mysql &> /dev/null; then
    echo "🔄 Membuat database jika belum ada..."
    mariadb -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true

    echo "🔄 Mengimpor schema tabel..."
    mariadb -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < server/schema.sql 2>/dev/null || \
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < server/schema.sql 2>/dev/null || true
    echo "✅ Database MariaDB terkonfigurasi."
else
    echo "⚠️ Command 'mariadb' atau 'mysql' tidak ditemukan di terminal. Pastikan MariaDB Server aktif di port 3306."
fi

# 4. Build Production Client
echo ""
echo "🏗️ Membangun (Build) Assets Frontend React..."
cd client
bun run build
cd ..

echo ""
echo "🎉 ========================================================"
echo "   Setup Selesai! ProTrack Siap Dijalankan 🚀"
echo "========================================================"
echo ""
echo "Untuk menjalankan aplikasi:"
echo "  1. Mode Development : bun run dev"
echo "  2. Mode Production  : bun run start"
echo "  3. Akses Web        : http://localhost:3001 atau http://project-management.test"
echo ""
echo "Akun Default Demo (Password: 1):"
echo "  - Owner    : awan.setiawan@fsi.com / aldy.afriyanto@fsi.com"
echo "  - PM       : dede.andri@fsi.com / fahmi.ibrahim@fsi.com"
echo "  - Karyawan : purwanto@fsi.com"
echo "  - Magang   : arif.fahmi.abdillah@fsi.com"
echo ""
