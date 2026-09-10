import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// GET /api/locations?projectId=...
router.get("/", async (c) => {
  const projectId = c.req.query("projectId") || c.req.query("project_id");

  let query = `
    SELECT 
      l.*,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status != 'backlog' AND t.id IS NOT NULL THEN 1 ELSE 0 END) as active_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      (SELECT COALESCE(SUM(total_price), 0) FROM bill_of_materials WHERE location_id = l.id) as total_bom_cost,
      (SELECT COUNT(*) FROM issue_logs WHERE location_id = l.id AND status != 'closed') as open_issues_count
    FROM project_locations l
    LEFT JOIN tasks t ON t.location_id = l.id
  `;

  const params: any = {};
  if (projectId) {
    query += " WHERE l.project_id = :projectId";
    params.projectId = projectId;
  }

  query += " GROUP BY l.id ORDER BY l.name ASC, l.created_at ASC";

  const locations = await db.query(query).all(params);
  return c.json(locations);
});

// GET /api/locations/:id
router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const location = await db.query(`
    SELECT 
      l.*,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status != 'backlog' AND t.id IS NOT NULL THEN 1 ELSE 0 END) as active_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      (SELECT COALESCE(SUM(total_price), 0) FROM bill_of_materials WHERE location_id = l.id) as total_bom_cost,
      (SELECT COUNT(*) FROM issue_logs WHERE location_id = l.id AND status != 'closed') as open_issues_count
    FROM project_locations l
    LEFT JOIN tasks t ON t.location_id = l.id
    WHERE l.id = :id
    GROUP BY l.id
  `).get({ id: id });

  if (!location) {
    return c.json({ error: "Lokasi tidak ditemukan" }, 404);
  }

  return c.json(location);
});

// POST /api/locations - Create new location
router.post("/", async (c) => {
  const body = await c.req.json();
  const { project_id, name, description = "", address = "" } = body;

  if (!project_id || !name || !name.trim()) {
    return c.json({ error: "Project ID dan Nama Lokasi wajib diisi" }, 400);
  }

  const id = "loc-" + crypto.randomUUID().slice(0, 8);

  try {
    await db.query(`
      INSERT INTO project_locations (id, project_id, name, description, address)
      VALUES (:id, :project_id, :name, :description, :address)
    `).run({
      id: id,
      project_id: project_id,
      name: name.trim(),
      description: description ? description.trim() : null,
      address: address ? address.trim() : null,
    });

    const created = await db.query("SELECT * FROM project_locations WHERE id = :id").get({ id: id });
    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal menambahkan lokasi proyek" }, 500);
  }
});

// PUT /api/locations/:id - Update location
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, description, address } = body;

  try {
    await db.query(`
      UPDATE project_locations
      SET
        name = COALESCE(:name, name),
        description = CASE WHEN :desc_provided = 1 THEN :description ELSE description END,
        address = CASE WHEN :addr_provided = 1 THEN :address ELSE address END,
        updated_at = NOW()
      WHERE id = :id
    `).run({
      id: id,
      name: name ? name.trim() : null,
      description: description !== undefined ? (description ? description.trim() : null) : null,
      desc_provided: description !== undefined ? 1 : 0,
      address: address !== undefined ? (address ? address.trim() : null) : null,
      addr_provided: address !== undefined ? 1 : 0,
    });

    const updated = await db.query("SELECT * FROM project_locations WHERE id = :id").get({ id: id });
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui lokasi proyek" }, 500);
  }
});

// DELETE /api/locations/:id - Delete location
router.delete("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // Unlink any tasks, BOM items, and issues pointing to this location before deleting
    await db.transaction(async (conn) => {
      await conn.execute("UPDATE tasks SET location_id = NULL WHERE location_id = ?", [id]);
      await conn.execute("UPDATE bill_of_materials SET location_id = NULL WHERE location_id = ?", [id]);
      await conn.execute("UPDATE issue_logs SET location_id = NULL WHERE location_id = ?", [id]);
      await conn.execute("DELETE FROM project_locations WHERE id = ?", [id]);
    });

    return c.json({ success: true, message: "Lokasi berhasil dihapus" });
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal menghapus lokasi proyek" }, 500);
  }
});

export default router;
