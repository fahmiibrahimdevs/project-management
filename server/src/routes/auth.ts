import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// Helper to decode simulated Bearer token
async function getUserFromToken(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (decoded && decoded.id) {
      const user = await db.query(`
        SELECT id, name, email, role, job_title, avatar_color, is_active, phone, address, gender, department, join_date, end_date, created_at 
        FROM members 
        WHERE id = :id AND is_active = 1
      `).get({ id: decoded.id }) as any;
      return user || null;
    }
  } catch {
    // If not base64 JSON, return null
  }
  return null;
}

// POST /api/auth/login
router.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "Email dan Password wajib diisi" }, 400);
  }

  const user = await db.query(`
    SELECT * FROM members WHERE email = :email
  `).get({ email: email.trim().toLowerCase() }) as any;

  if (!user) {
    return c.json({ error: "Email atau password tidak valid" }, 401);
  }

  if (user.is_active === 0) {
    return c.json({ error: "Akun ini telah dinonaktifkan oleh Owner" }, 403);
  }

  const isPasswordValid = await Bun.password.verify(password, user.password_hash);
  if (!isPasswordValid) {
    return c.json({ error: "Email atau password tidak valid" }, 401);
  }

  // Generate token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    timestamp: Date.now(),
  };
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    job_title: user.job_title,
    avatar_color: user.avatar_color,
    phone: user.phone || "",
    address: user.address || "",
    gender: user.gender || "",
    department: user.department || "",
    join_date: user.join_date || "",
    end_date: user.end_date || "",
  };

  return c.json({
    token,
    user: safeUser,
  });
});

// GET /api/auth/me
router.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const user = await getUserFromToken(authHeader);

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json(user);
});

// PUT /api/auth/profile - Update current user profile & password
router.put("/profile", async (c) => {
  const authHeader = c.req.header("Authorization");
  const currentUser = await getUserFromToken(authHeader);

  if (!currentUser) {
    return c.json({ error: "Sesi telah berakhir, silakan login kembali" }, 401);
  }

  const body = await c.req.json();
  const { 
    name, 
    job_title, 
    avatar_color, 
    phone, 
    address, 
    gender, 
    department, 
    join_date, 
    end_date, 
    current_password, 
    new_password 
  } = body;

  const dbUser = await db.query("SELECT * FROM members WHERE id = :id").get({ id: currentUser.id }) as any;
  if (!dbUser) {
    return c.json({ error: "User tidak ditemukan" }, 404);
  }

  let newPasswordHash = undefined;
  if (new_password && new_password.trim()) {
    if (!current_password) {
      return c.json({ error: "Password saat ini wajib diisi untuk mengubah kata sandi" }, 400);
    }
    const isCurrentValid = await Bun.password.verify(current_password, dbUser.password_hash);
    if (!isCurrentValid) {
      return c.json({ error: "Password saat ini salah. Periksa kembali kata sandi lama Anda." }, 400);
    }
    newPasswordHash = await Bun.password.hash(new_password.trim());
  }

  try {
    await db.query(`
      UPDATE members
      SET
        name = COALESCE(:name, name),
        job_title = COALESCE(:job_title, job_title),
        avatar_color = COALESCE(:avatar_color, avatar_color),
        phone = COALESCE(:phone, phone),
        address = COALESCE(:address, address),
        gender = COALESCE(:gender, gender),
        department = COALESCE(:department, department),
        join_date = COALESCE(:join_date, join_date),
        end_date = COALESCE(:end_date, end_date),
        password_hash = COALESCE(:password_hash, password_hash)
      WHERE id = :id
    `).run({
      id: currentUser.id,
      name: name !== undefined ? name.trim() : null,
      job_title: job_title !== undefined ? job_title.trim() : null,
      avatar_color: avatar_color || null,
      phone: phone !== undefined ? phone.trim() : null,
      address: address !== undefined ? address.trim() : null,
      gender: gender !== undefined ? gender.trim() : null,
      department: department !== undefined ? department.trim() : null,
      join_date: join_date !== undefined ? join_date : null,
      end_date: end_date !== undefined ? end_date : null,
      password_hash: newPasswordHash || null,
    });

    const updated = await db.query(`
      SELECT id, name, email, role, job_title, avatar_color, is_active, phone, address, gender, department, join_date, end_date, created_at 
      FROM members 
      WHERE id = :id
    `).get({ id: currentUser.id }) as any;

    return c.json({
      success: true,
      message: "Profil dan keamanan akun berhasil diperbarui",
      user: updated,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui profil" }, 500);
  }
});

// GET /api/auth/users - List all users (for Owner & PM User Management)
router.get("/users", async (c) => {
  const users = await db.query(`
    SELECT id, name, email, role, job_title, avatar_color, is_active, phone, address, gender, department, join_date, end_date, created_at 
    FROM members 
    ORDER BY 
      CASE role 
        WHEN 'owner' THEN 1 
        WHEN 'pm' THEN 2 
        WHEN 'karyawan' THEN 3 
        WHEN 'magang' THEN 4
        ELSE 5 
      END,
      name ASC
  `).all();

  return c.json(users);
});

// POST /api/auth/register-user - Register user by Owner
router.post("/register-user", async (c) => {
  const body = await c.req.json();
  const { 
    name, 
    email, 
    password = "1", 
    role = "karyawan", 
    job_title = "Karyawan", 
    avatar_color = "#2563eb",
    phone = "",
    address = "",
    gender = "",
    department = "",
    join_date = "",
    end_date = ""
  } = body;

  if (!name || !email) {
    return c.json({ error: "Nama dan Email wajib diisi" }, 400);
  }

  const existing = await db.query("SELECT id FROM members WHERE email = :email").get({ email: email.trim().toLowerCase() });
  if (existing) {
    return c.json({ error: "Email sudah terdaftar" }, 400);
  }

  const id = "usr-" + crypto.randomUUID().slice(0, 8);
  const passwordHash = await Bun.password.hash(password);

  try {
    await db.query(`
      INSERT INTO members (id, name, email, password_hash, role, job_title, avatar_color, is_active, phone, address, gender, department, join_date, end_date)
      VALUES (:id, :name, :email, :password_hash, :role, :job_title, :avatar_color, 1, :phone, :address, :gender, :department, :join_date, :end_date)
    `).run({
      id: id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role: role,
      job_title: job_title.trim(),
      avatar_color: avatar_color,
      phone: phone.trim(),
      address: address.trim(),
      gender: gender.trim(),
      department: department.trim(),
      join_date: join_date || null,
      end_date: end_date || null,
    });

    const created = await db.query(`
      SELECT id, name, email, role, job_title, avatar_color, is_active, phone, address, gender, department, join_date, end_date, created_at 
      FROM members 
      WHERE id = :id
    `).get({ id: id });
    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mendaftarkan user" }, 500);
  }
});

// PUT /api/auth/users/:id - Update user role / job title / status / password / profile fields
router.put("/users/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { 
    name, 
    email, 
    role, 
    job_title, 
    is_active, 
    avatar_color, 
    password,
    phone,
    address,
    gender,
    department,
    join_date,
    end_date
  } = body;

  let passwordHash = undefined;
  if (password && password.trim()) {
    passwordHash = await Bun.password.hash(password.trim());
  }

  try {
    await db.query(`
      UPDATE members
      SET 
        name = COALESCE(:name, name),
        email = COALESCE(:email, email),
        role = COALESCE(:role, role),
        job_title = COALESCE(:job_title, job_title),
        is_active = CASE WHEN :is_active_provided = 1 THEN :is_active ELSE is_active END,
        avatar_color = COALESCE(:avatar_color, avatar_color),
        phone = COALESCE(:phone, phone),
        address = COALESCE(:address, address),
        gender = COALESCE(:gender, gender),
        department = COALESCE(:department, department),
        join_date = COALESCE(:join_date, join_date),
        end_date = COALESCE(:end_date, end_date),
        password_hash = COALESCE(:password_hash, password_hash)
      WHERE id = :id
    `).run({
      id: id,
      name: name !== undefined ? name.trim() : null,
      email: email ? email.trim().toLowerCase() : null,
      role: role || null,
      job_title: job_title !== undefined ? job_title.trim() : null,
      is_active: is_active ? 1 : 0,
      is_active_provided: is_active !== undefined ? 1 : 0,
      avatar_color: avatar_color || null,
      phone: phone !== undefined ? phone.trim() : null,
      address: address !== undefined ? address.trim() : null,
      gender: gender !== undefined ? gender.trim() : null,
      department: department !== undefined ? department.trim() : null,
      join_date: join_date !== undefined ? join_date : null,
      end_date: end_date !== undefined ? end_date : null,
      password_hash: passwordHash || null,
    });

    const updated = await db.query(`
      SELECT id, name, email, role, job_title, avatar_color, is_active, phone, address, gender, department, join_date, end_date, created_at 
      FROM members 
      WHERE id = :id
    `).get({ id: id });
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mengupdate user" }, 500);
  }
});

// DELETE /api/auth/users/:id - Delete user
router.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  const user = await db.query("SELECT role FROM members WHERE id = :id").get({ id: id }) as any;
  if (user && user.role === "owner") {
    const ownerCount = await db.query("SELECT COUNT(*) as count FROM members WHERE role = 'owner'").get() as { count: number };
    if (ownerCount.count <= 1) {
      return c.json({ error: "Tidak dapat menghapus satu-satunya akun Owner utama" }, 400);
    }
  }

  await db.query("DELETE FROM members WHERE id = :id").run({ id: id });
  return c.json({ success: true, message: "User berhasil dihapus" });
});

export default router;
