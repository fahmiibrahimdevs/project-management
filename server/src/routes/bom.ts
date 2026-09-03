import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// ==========================================
// 1. BOM Master Categories Endpoints
// ==========================================

// GET /api/bom/categories - List all BOM categories
router.get("/categories", async (c) => {
  const projectId = c.req.query("projectId");
  let query = `
    SELECT 
      c.id,
      c.name,
      c.description,
      c.color,
      c.order_index,
      c.created_at,
      COUNT(b.id) as item_count,
      COALESCE(SUM(b.total_price), 0) as total_cost
    FROM bom_categories c
    LEFT JOIN bill_of_materials b ON (c.id = b.category_id ${projectId ? "AND b.project_id = :projectId" : ""})
    GROUP BY c.id
    ORDER BY c.order_index ASC, c.name ASC
  `;
  const params: any = projectId ? { projectId: projectId } : {};
  const categories = (await db.query(query).all(params)) as any[];
  return c.json(categories);
});

// POST /api/bom/categories - Create new BOM category
router.post("/categories", async (c) => {
  const body = await c.req.json();
  const { name, description = "", color = "blue", order_index } = body;

  if (!name || !name.trim()) {
    return c.json({ error: "Nama Kategori wajib diisi" }, 400);
  }

  const cleanName = name.trim().toUpperCase();
  const id = "cat-" + cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20) + "-" + crypto.randomUUID().slice(0, 4);

  // Get max order_index if not provided
  let orderIdx = Number(order_index);
  if (isNaN(orderIdx)) {
    const maxOrder = (await db.query("SELECT COALESCE(MAX(order_index), 0) as max_order FROM bom_categories").get()) as { max_order: number };
    orderIdx = (maxOrder?.max_order || 0) + 1;
  }

  try {
    await db.query(`
      INSERT INTO bom_categories (id, name, description, color, order_index)
      VALUES (:id, :name, :description, :color, :order_index)
    `).run({
      id: id,
      name: cleanName,
      description: description ? description.trim() : null,
      color: color || "blue",
      order_index: orderIdx,
    });

    const created = await db.query("SELECT * FROM bom_categories WHERE id = :id").get({ id: id });
    return c.json(created, 201);
  } catch (err: any) {
    if (err.message && (err.message.includes("UNIQUE") || err.message.includes("Duplicate entry"))) {
      return c.json({ error: "Kategori dengan nama tersebut sudah ada" }, 400);
    }
    return c.json({ error: err.message || "Gagal membuat kategori BOM" }, 500);
  }
});

// PUT /api/bom/categories/:id - Update BOM category
router.put("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, description, color, order_index } = body;

  const current = (await db.query("SELECT * FROM bom_categories WHERE id = :id").get({ id: id })) as any;
  if (!current) {
    return c.json({ error: "Kategori tidak ditemukan" }, 404);
  }

  const cleanName = name ? name.trim().toUpperCase() : current.name;

  try {
    await db.query(`
      UPDATE bom_categories
      SET 
        name = :name,
        description = CASE WHEN :desc_provided = 1 THEN :description ELSE description END,
        color = COALESCE(:color, color),
        order_index = COALESCE(:order_index, order_index)
      WHERE id = :id
    `).run({
      id: id,
      name: cleanName,
      description: description !== undefined ? (description ? description.trim() : null) : null,
      desc_provided: description !== undefined ? 1 : 0,
      color: color || null,
      order_index: order_index !== undefined ? Number(order_index) : null,
    });

    // Also update cached category_name in bill_of_materials
    await db.query("UPDATE bill_of_materials SET category_name = :name WHERE category_id = :id").run({
      name: cleanName,
      id: id,
    });

    const updated = await db.query("SELECT * FROM bom_categories WHERE id = :id").get({ id: id });
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui kategori BOM" }, 500);
  }
});

// DELETE /api/bom/categories/:id - Delete BOM category
router.delete("/categories/:id", async (c) => {
  const id = c.req.param("id");

  // Reassign existing items to 'cat-lain' or null
  const defaultCat = (await db.query("SELECT id FROM bom_categories WHERE id = 'cat-lain' LIMIT 1").get()) as any;
  const fallbackId = defaultCat ? defaultCat.id : null;

  await db.query("UPDATE bill_of_materials SET category_id = :fallbackId, category_name = 'LAIN-LAIN' WHERE category_id = :id").run({
    fallbackId: fallbackId,
    id: id,
  });

  await db.query("DELETE FROM bom_categories WHERE id = :id").run({ id: id });
  return c.json({ success: true, message: "Kategori berhasil dihapus" });
});

// ==========================================
// 2. BOM Items Endpoints
// ==========================================

// GET /api/bom?projectId=...&categoryId=...
router.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const categoryId = c.req.query("categoryId");

  let query = `
    SELECT 
      b.*,
      COALESCE(c.name, b.category_name, 'LAIN-LAIN') as category_name,
      COALESCE(c.color, 'slate') as category_color
    FROM bill_of_materials b
    LEFT JOIN bom_categories c ON b.category_id = c.id
    WHERE 1=1
  `;
  const params: any = {};

  if (projectId) {
    query += " AND b.project_id = :projectId";
    params.projectId = projectId;
  }

  if (categoryId && categoryId !== "all") {
    if (categoryId === "uncategorized") {
      query += " AND (b.category_id IS NULL OR b.category_id = '')";
    } else {
      query += " AND b.category_id = :categoryId";
      params.categoryId = categoryId;
    }
  }

  query += ` ORDER BY 
    COALESCE(c.order_index, 999) ASC,
    CASE b.status 
      WHEN 'belum_checkout' THEN 1 
      WHEN 'sudah_checkout' THEN 2 
      WHEN 'ditolak' THEN 3 
      WHEN 'dibatalkan' THEN 4 
      ELSE 5 
    END,
    CASE b.priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
      ELSE 4 
    END,
    b.created_at DESC`;

  const items = (await db.query(query).all(params)) as any[];

  // Calculate summary metrics
  const totalCost = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalItemsCount = items.length;

  const sudahCheckoutItems = items.filter((i) => i.status === "sudah_checkout");
  const belumCheckoutItems = items.filter((i) => i.status === "belum_checkout");
  const ditolakItems = items.filter((i) => i.status === "ditolak");
  const dibatalkanItems = items.filter((i) => i.status === "dibatalkan");

  const totalSudahCheckoutCost = sudahCheckoutItems.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0);
  const totalBelumCheckoutCost = belumCheckoutItems.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0);

  const byStatus = {
    belum_checkout: belumCheckoutItems.length,
    sudah_checkout: sudahCheckoutItems.length,
    ditolak: ditolakItems.length,
    dibatalkan: dibatalkanItems.length,
  };

  const byPriority = {
    high: items.filter((i) => i.priority === "high").length,
    medium: items.filter((i) => i.priority === "medium").length,
    low: items.filter((i) => i.priority === "low").length,
  };

  return c.json({
    items,
    summary: {
      total_cost: totalCost,
      total_items: totalItemsCount,
      total_sudah_checkout_cost: totalSudahCheckoutCost,
      total_belum_checkout_cost: totalBelumCheckoutCost,
      by_status: byStatus,
      by_priority: byPriority,
    },
  });
});

// POST /api/bom - Create new BOM item
router.post("/", async (c) => {
  const body = await c.req.json();
  const id = "bom-" + crypto.randomUUID().slice(0, 8);
  const {
    project_id,
    item_name,
    category_id,
    store_name = "",
    quantity = 1,
    unit_price = 0,
    priority = "medium",
    status = "belum_checkout",
    purchase_url = "",
    notes = "",
  } = body;

  if (!project_id || !item_name) {
    return c.json({ error: "Project ID dan Nama Barang wajib diisi" }, 400);
  }

  // Lookup category name if category_id provided
  let catName = "LAIN-LAIN";
  let catId = category_id || null;
  if (catId) {
    const cat = (await db.query("SELECT name FROM bom_categories WHERE id = :id").get({ id: catId })) as any;
    if (cat) catName = cat.name;
  } else {
    // default to cat-lain if exists
    const defaultCat = (await db.query("SELECT id, name FROM bom_categories WHERE id = 'cat-lain' LIMIT 1").get()) as any;
    if (defaultCat) {
      catId = defaultCat.id;
      catName = defaultCat.name;
    }
  }

  const q = Number(quantity) || 1;
  const p = Number(unit_price) || 0;
  const totalPrice = q * p;

  try {
    await db.query(`
      INSERT INTO bill_of_materials (
        id, project_id, category_id, category_name, 
        item_name, store_name, quantity, unit_price, total_price, priority, status, purchase_url, notes
      )
      VALUES (
        :id, :project_id, :category_id, :category_name,
        :item_name, :store_name, :quantity, :unit_price, :total_price, :priority, :status, :purchase_url, :notes
      )
    `).run({
      id: id,
      project_id: project_id,
      category_id: catId,
      category_name: catName,
      item_name: item_name.trim(),
      store_name: store_name ? store_name.trim() : null,
      quantity: q,
      unit_price: p,
      total_price: totalPrice,
      priority: priority,
      status: status,
      purchase_url: purchase_url ? purchase_url.trim() : null,
      notes: notes ? notes.trim() : null,
    });

    const created = await db.query(`
      SELECT 
        b.*,
        COALESCE(c.name, b.category_name, 'LAIN-LAIN') as category_name,
        COALESCE(c.color, 'slate') as category_color
      FROM bill_of_materials b
      LEFT JOIN bom_categories c ON b.category_id = c.id
      WHERE b.id = :id
    `).get({ id: id });

    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal membuat item BOM" }, 500);
  }
});

// PUT /api/bom/:id - Update BOM item
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const {
    item_name,
    category_id,
    store_name,
    quantity,
    unit_price,
    priority,
    status,
    purchase_url,
    notes,
  } = body;

  const current = (await db.query("SELECT * FROM bill_of_materials WHERE id = :id").get({ id: id })) as any;
  if (!current) {
    return c.json({ error: "Item BOM tidak ditemukan" }, 404);
  }

  let catId = category_id !== undefined ? category_id : current.category_id;
  let catName = current.category_name;
  if (category_id !== undefined && category_id) {
    const cat = (await db.query("SELECT name FROM bom_categories WHERE id = :id").get({ id: category_id })) as any;
    if (cat) catName = cat.name;
  }

  const newQty = quantity !== undefined ? Number(quantity) : current.quantity;
  const newPrice = unit_price !== undefined ? Number(unit_price) : current.unit_price;
  const totalPrice = newQty * newPrice;

  try {
    await db.query(`
      UPDATE bill_of_materials
      SET 
        item_name = COALESCE(:item_name, item_name),
        category_id = CASE WHEN :cat_provided = 1 THEN :category_id ELSE category_id END,
        category_name = CASE WHEN :cat_provided = 1 THEN :category_name ELSE category_name END,
        store_name = CASE WHEN :store_name_provided = 1 THEN :store_name ELSE store_name END,
        quantity = :quantity,
        unit_price = :unit_price,
        total_price = :total_price,
        priority = COALESCE(:priority, priority),
        status = COALESCE(:status, status),
        purchase_url = CASE WHEN :purchase_url_provided = 1 THEN :purchase_url ELSE purchase_url END,
        notes = CASE WHEN :notes_provided = 1 THEN :notes ELSE notes END,
        updated_at = NOW()
      WHERE id = :id
    `).run({
      id: id,
      item_name: item_name ? item_name.trim() : null,
      category_id: catId || null,
      category_name: catName || "LAIN-LAIN",
      cat_provided: category_id !== undefined ? 1 : 0,
      store_name: store_name ? store_name.trim() : null,
      store_name_provided: store_name !== undefined ? 1 : 0,
      quantity: newQty,
      unit_price: newPrice,
      total_price: totalPrice,
      priority: priority,
      status: status,
      purchase_url: purchase_url ? purchase_url.trim() : null,
      purchase_url_provided: purchase_url !== undefined ? 1 : 0,
      notes: notes ? notes.trim() : null,
      notes_provided: notes !== undefined ? 1 : 0,
    });

    const updated = await db.query(`
      SELECT 
        b.*,
        COALESCE(c.name, b.category_name, 'LAIN-LAIN') as category_name,
        COALESCE(c.color, 'slate') as category_color
      FROM bill_of_materials b
      LEFT JOIN bom_categories c ON b.category_id = c.id
      WHERE b.id = :id
    `).get({ id: id });

    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui item BOM" }, 500);
  }
});

// DELETE /api/bom/:id - Delete BOM item
router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.query("DELETE FROM bill_of_materials WHERE id = :id").run({ id: id });
  return c.json({ success: true, message: "Item BOM berhasil dihapus" });
});

export default router;
