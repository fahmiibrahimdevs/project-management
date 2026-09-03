import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "nexaryn",
  password: process.env.DB_PASSWORD || "31750321",
  database: process.env.DB_NAME || "protrack_db",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  dateStrings: true,
  namedPlaceholders: true,
});

function formatSql(sql: string): string {
  // Convert SQLite $param style to MySQL/MariaDB :param style
  // Also convert SQLite datetime('now') to MySQL NOW()
  return sql
    .replace(/\$([a-zA-Z0-9_]+)/g, ":$1")
    .replace(/datetime\('now'\)/gi, "NOW()");
}

function formatParams(params?: any): any {
  if (!params) return {};
  if (Array.isArray(params)) return params;
  if (typeof params === "object") {
    const formatted: Record<string, any> = {};
    for (const key of Object.keys(params)) {
      const cleanKey = key.startsWith("$") || key.startsWith(":") ? key.slice(1) : key;
      formatted[cleanKey] = params[key] === undefined ? null : params[key];
    }
    return formatted;
  }
  return params;
}

export async function query<T = any>(sql: string, params?: any): Promise<T[]> {
  const [rows] = await pool.query(formatSql(sql), formatParams(params));
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(formatSql(sql), formatParams(params));
  return result as mysql.ResultSetHeader;
}

// Unified db helper interface compatible with async calls
export const db = {
  query: (sql: string) => ({
    all: async (params?: any) => query(sql, params),
    get: async (params?: any) => queryOne(sql, params),
    run: async (params?: any) => execute(sql, params),
  }),
  prepare: (sql: string) => ({
    all: async (params?: any) => query(sql, params),
    get: async (params?: any) => queryOne(sql, params),
    run: async (params?: any) => execute(sql, params),
  }),
  run: async (sql: string, params?: any) => execute(sql, params),
};

export async function initDatabase() {
  // Test connection
  try {
    const connection = await pool.getConnection();
    console.log("🐬 Connected to MariaDB (database: protrack_db, user: nexaryn)");
    connection.release();
  } catch (err) {
    console.error("❌ Failed to connect to MariaDB:", err);
    throw err;
  }

  // Ensure notifications table exists
  await execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      actor_id VARCHAR(50) NOT NULL,
      project_id VARCHAR(50) NOT NULL,
      task_id VARCHAR(50) NULL,
      type VARCHAR(50) DEFAULT 'task_comment',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_read (user_id, is_read),
      INDEX idx_created (created_at)
    )
  `);

  // Ensure default BOM categories seeded if empty
  const countRes = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM bom_categories");
  if (!countRes || countRes.count === 0) {
    console.log("📦 Seeding default BOM master categories into MariaDB...");
    const defaultCategories = [
      { id: "cat-mikrokontroler", name: "MIKROKONTROLER", description: "Board mikrokontroler, dev kit & processor (ESP32, Arduino, STM32)", color: "blue", order_index: 1 },
      { id: "cat-sensor", name: "SENSOR", description: "Sensor suhu, jarak, tegangan, kelembaban & optik", color: "amber", order_index: 2 },
      { id: "cat-aktuator", name: "AKTUATOR", description: "Motor DC, servo, stepper, solenoid & relay", color: "rose", order_index: 3 },
      { id: "cat-power", name: "POWER SUPPLY", description: "Baterai, adaptor, regulator step-down/step-up & charger", color: "emerald", order_index: 4 },
      { id: "cat-pasif", name: "KOMPONEN PASIF", description: "Resistor, kapasitor, induktor, dioda & transistor", color: "purple", order_index: 5 },
      { id: "cat-mekanikal", name: "MEKANIKAL & CASING", description: "Casing, akrilik, 3D print part, baut & spacer", color: "slate", order_index: 6 },
      { id: "cat-kabel", name: "KABEL & KONEKTOR", description: "Kabel jumper, terminal block, soket & header pin", color: "teal", order_index: 7 },
      { id: "cat-lain", name: "LAIN-LAIN", description: "Komponen atau perkakas pendukung lainnya", color: "slate", order_index: 8 },
    ];

    for (const c of defaultCategories) {
      await execute(
        "INSERT INTO bom_categories (id, name, description, color, order_index) VALUES (:id, :name, :description, :color, :order_index) ON DUPLICATE KEY UPDATE name=VALUES(name)",
        c
      );
    }
  }

  // Ensure default FSI accounts seeded if empty
  const memberCount = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM members WHERE email = 'awan.setiawan@fsi.com'");
  if (!memberCount || memberCount.count === 0) {
    console.log("🏢 Seeding official FSI accounts into MariaDB...");
    const defaultPasswordHash = await Bun.password.hash("1");
    const realUsers = [
      {
        id: "usr-fsi-owner-1",
        name: "Awan Setiawan",
        email: "awan.setiawan@fsi.com",
        password_hash: defaultPasswordHash,
        role: "owner",
        job_title: "Owner",
        avatar_color: "#2563eb",
      },
      {
        id: "usr-fsi-owner-2",
        name: "Aldy Ariyanto",
        email: "aldy.afriyanto@fsi.com",
        password_hash: defaultPasswordHash,
        role: "owner",
        job_title: "Owner",
        avatar_color: "#4f46e5",
      },
      {
        id: "usr-fsi-pm-1",
        name: "Dede Andri",
        email: "dede.andri@fsi.com",
        password_hash: defaultPasswordHash,
        role: "pm",
        job_title: "Project Manager",
        avatar_color: "#7c3aed",
      },
      {
        id: "usr-fsi-pm-2",
        name: "Fahmi Ibrahim",
        email: "fahmi.ibrahim@fsi.com",
        password_hash: defaultPasswordHash,
        role: "pm",
        job_title: "Project Manager",
        avatar_color: "#0891b2",
      },
      {
        id: "usr-fsi-karyawan-1",
        name: "Purwanto",
        email: "purwanto@fsi.com",
        password_hash: defaultPasswordHash,
        role: "karyawan",
        job_title: "Karyawan",
        avatar_color: "#059669",
      },
      {
        id: "usr-fsi-magang-1",
        name: "Arif Fahmi Abdillah",
        email: "arif.fahmi.abdillah@fsi.com",
        password_hash: defaultPasswordHash,
        role: "magang",
        job_title: "Magang",
        avatar_color: "#d97706",
      },
    ];

    for (const u of realUsers) {
      await execute(
        "INSERT INTO members (id, name, email, password_hash, role, job_title, avatar_color) VALUES (:id, :name, :email, :password_hash, :role, :job_title, :avatar_color) ON DUPLICATE KEY UPDATE name=VALUES(name)",
        u
      );
    }
  }
}
