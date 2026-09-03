import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// GET /api/members - List all members
router.get("/", async (c) => {
  const members = await db.query(`
    SELECT * FROM members 
    WHERE is_active = 1
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
  return c.json(members);
});

// POST /api/members - Create new member
router.post("/", async (c) => {
  const body = await c.req.json();
  const id = "mem-" + crypto.randomUUID().slice(0, 8);
  const { name, email, role, avatar_color = "#2563eb" } = body;

  if (!name || !email || !role) {
    return c.json({ error: "Nama, email, dan peran wajib diisi" }, 400);
  }

  try {
    await db.query(`
      INSERT INTO members (id, name, email, role, avatar_color)
      VALUES (:id, :name, :email, :role, :avatar_color)
    `).run({
      id: id,
      name: name,
      email: email,
      role: role,
      avatar_color: avatar_color,
    });

    const created = await db.query("SELECT * FROM members WHERE id = :id").get({ id: id });
    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal membuat member" }, 500);
  }
});

export default router;
