import { Hono } from "hono";
import { db } from "../db/database";
import { join } from "path";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { getFileCategory, validateUploadedFile, sanitizeFileName } from "../utils/fileSecurity";

const router = new Hono();

const uploadsDir = join(import.meta.dir, "../../uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// GET /api/attachments/project/:id - Get all attachments for project (both project level & task level)
router.get("/project/:id", async (c) => {
  const projectId = c.req.param("id");

  // 1. Direct project attachments
  const directAttachments = (await db.query(`
    SELECT 
      pa.id,
      pa.project_id,
      pa.task_id,
      pa.uploaded_by_id,
      pa.file_name,
      pa.file_url,
      pa.file_size,
      pa.file_type,
      pa.category,
      pa.created_at,
      'project' as source,
      m.name as uploaded_by_name,
      m.avatar_color as uploaded_by_avatar_color,
      t.title as task_title,
      t.status as task_status,
      t.priority as task_priority
    FROM project_attachments pa
    LEFT JOIN members m ON m.id = pa.uploaded_by_id
    LEFT JOIN tasks t ON t.id = pa.task_id
    WHERE pa.project_id = :projectId
  `).all({ projectId: projectId })) as any[];

  // 2. Task attachments linked to tasks in this project
  const taskAttachments = (await db.query(`
    SELECT 
      ta.id,
      t.project_id,
      ta.task_id,
      NULL as uploaded_by_id,
      ta.file_name,
      ta.file_url,
      ta.file_size,
      ta.file_type,
      NULL as category,
      ta.created_at,
      'task' as source,
      'Anggota Tim' as uploaded_by_name,
      '#2563eb' as uploaded_by_avatar_color,
      t.title as task_title,
      t.status as task_status,
      t.priority as task_priority
    FROM task_attachments ta
    JOIN tasks t ON t.id = ta.task_id
    WHERE t.project_id = :projectId
  `).all({ projectId: projectId })) as any[];

  // Merge avoiding duplicates by file_url
  const seenUrls = new Set<string>();
  const combined: any[] = [];

  for (const item of directAttachments) {
    seenUrls.add(item.file_url);
    const ext = item.file_name.split(".").pop() || item.file_type || "";
    combined.push({
      ...item,
      category: item.category || getFileCategory(ext, item.file_type),
    });
  }

  for (const item of taskAttachments) {
    if (!seenUrls.has(item.file_url)) {
      seenUrls.add(item.file_url);
      const ext = item.file_name.split(".").pop() || item.file_type || "";
      combined.push({
        ...item,
        category: getFileCategory(ext, item.file_type),
      });
    }
  }

  // Sort newest first
  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Statistics
  const totalFiles = combined.length;
  const totalBytes = combined.reduce((sum, item) => sum + (Number(item.file_size) || 0), 0);

  const byCategory = {
    document: combined.filter((i) => i.category === "document").length,
    image: combined.filter((i) => i.category === "image").length,
    design: combined.filter((i) => i.category === "design").length,
    cad: combined.filter((i) => i.category === "cad").length,
    spreadsheet: combined.filter((i) => i.category === "spreadsheet").length,
    archive: combined.filter((i) => i.category === "archive").length,
    other: combined.filter((i) => !["document", "image", "design", "cad", "spreadsheet", "archive"].includes(i.category)).length,
  };

  return c.json({
    items: combined,
    summary: {
      total_files: totalFiles,
      total_bytes: totalBytes,
      by_category: byCategory,
    },
  });
});

// POST /api/attachments/project/:id - Upload new attachments (Single or Multiple, Max 100MB per file)
router.post("/project/:id", async (c) => {
  const projectId = c.req.param("id");

  try {
    const body = await c.req.parseBody({ all: true });
    
    // Extract files (supporting single or multiple)
    let rawFiles = body["files"] || body["file"];
    if (!rawFiles) {
      return c.json({ error: "Tidak ada berkas yang dipilih untuk diunggah" }, 400);
    }

    const fileList: File[] = Array.isArray(rawFiles)
      ? (rawFiles.filter((f) => f instanceof File) as File[])
      : rawFiles instanceof File
      ? [rawFiles]
      : [];

    if (fileList.length === 0) {
      return c.json({ error: "File tidak valid atau tidak ditemukan" }, 400);
    }

    const rawNames = body["file_names"] || body["file_name"];
    const customNames: string[] = Array.isArray(rawNames)
      ? (rawNames as string[])
      : typeof rawNames === "string"
      ? [rawNames]
      : [];

    const taskId = (Array.isArray(body["task_id"]) ? body["task_id"][0] : body["task_id"] as string | undefined) || null;
    const uploadedById = (Array.isArray(body["uploaded_by_id"]) ? body["uploaded_by_id"][0] : body["uploaded_by_id"] as string | undefined) || null;

    const createdItems: any[] = [];

    // Pre-validate all files first
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateUploadedFile(file);
      if (!validation.isValid) {
        return c.json({ error: validation.error || `File "${file.name}" ditolak oleh kebijakan keamanan sistem` }, 400);
      }
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateUploadedFile(file);
      const ext = validation.ext;

      let finalDisplayName = customNames[i] ? sanitizeFileName(customNames[i]) : validation.safeDisplayName;
      if (ext && !finalDisplayName.toLowerCase().endsWith("." + ext.toLowerCase())) {
        finalDisplayName = `${finalDisplayName}.${ext}`;
      }

      const uniqueFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 12)}${ext ? "." + ext : ""}`;
      const filePath = join(uploadsDir, uniqueFileName);

      const arrayBuffer = await file.arrayBuffer();
      await Bun.write(filePath, arrayBuffer);

      const fileUrl = `/uploads/${uniqueFileName}`;
      const category = validation.category;
      const id = "att-" + crypto.randomUUID().slice(0, 8);

      await db.query(`
        INSERT INTO project_attachments (id, project_id, task_id, uploaded_by_id, file_name, file_url, file_size, file_type, category)
        VALUES (:id, :project_id, :task_id, :uploaded_by_id, :file_name, :file_url, :file_size, :file_type, :category)
      `).run({
        id: id,
        project_id: projectId,
        task_id: taskId,
        uploaded_by_id: uploadedById,
        file_name: finalDisplayName,
        file_url: fileUrl,
        file_size: file.size,
        file_type: file.type || ext,
        category: category,
      });

      // If task_id provided, also link to task_attachments
      if (taskId) {
        const taskAttId = "tatt-" + crypto.randomUUID().slice(0, 8);
        try {
          await db.query(`
            INSERT INTO task_attachments (id, task_id, file_name, file_url, file_size, file_type)
            VALUES (:id, :task_id, :file_name, :file_url, :file_size, :file_type)
          `).run({
            id: taskAttId,
            task_id: taskId,
            file_name: finalDisplayName,
            file_url: fileUrl,
            file_size: file.size,
            file_type: file.type || ext,
          });
        } catch {}
      }

      const created = await db.query(`
        SELECT 
          pa.*,
          m.name as uploaded_by_name,
          m.avatar_color as uploaded_by_avatar_color,
          t.title as task_title
        FROM project_attachments pa
        LEFT JOIN members m ON m.id = pa.uploaded_by_id
        LEFT JOIN tasks t ON t.id = pa.task_id
        WHERE pa.id = :id
      `).get({ id: id });

      createdItems.push(created);
    }

    return c.json({ success: true, count: createdItems.length, items: createdItems }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mengunggah file" }, 500);
  }
});

// PUT /api/attachments/:id - Rename file display name
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { file_name } = body;

  if (!file_name || !file_name.trim()) {
    return c.json({ error: "Nama file tidak boleh kosong" }, 400);
  }

  const cleanName = sanitizeFileName(file_name);

  // Update in project_attachments
  await db.query(`
    UPDATE project_attachments
    SET file_name = :file_name
    WHERE id = :id
  `).run({
    id: id,
    file_name: cleanName,
  });

  // Update in task_attachments if matches
  await db.query(`
    UPDATE task_attachments
    SET file_name = :file_name
    WHERE id = :id
  `).run({
    id: id,
    file_name: cleanName,
  });

  return c.json({ success: true, file_name: cleanName });
});

// DELETE /api/attachments/:id - Delete attachment securely
router.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const item = (await db.query("SELECT file_url FROM project_attachments WHERE id = :id").get({ id: id })) as any
    || (await db.query("SELECT file_url FROM task_attachments WHERE id = :id").get({ id: id })) as any;

  if (item && item.file_url) {
    const filename = item.file_url.replace("/uploads/", "");
    const safeClean = sanitizeFileName(filename);
    const filePath = join(uploadsDir, safeClean);
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {}
  }

  await db.query("DELETE FROM project_attachments WHERE id = :id").run({ id: id });
  await db.query("DELETE FROM task_attachments WHERE id = :id").run({ id: id });

  return c.json({ success: true });
});

export default router;
