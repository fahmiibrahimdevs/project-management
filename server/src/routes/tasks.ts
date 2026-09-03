import { Hono } from "hono";
import { db } from "../db/database";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";
import { sanitizeFileName } from "../utils/fileSecurity";

const router = new Hono();
const uploadsDir = join(import.meta.dir, "../../uploads");

// Helper to fetch assignees for a list of tasks
async function attachAssigneesToTasks(tasks: any[]) {
  if (tasks.length === 0) return tasks;

  const placeholders = tasks.map(() => "?").join(",");
  const taskIds = tasks.map((t) => t.id);
  const assigneesQuery = `
    SELECT ta.task_id, m.id, m.name, m.email, m.role, m.job_title, m.avatar_color
    FROM task_assignees ta
    JOIN members m ON m.id = ta.member_id
    WHERE ta.task_id IN (${placeholders})
  `;
  const allAssignees = (await db.query(assigneesQuery).all(taskIds)) as any[];

  const assigneesMap: Record<string, any[]> = {};
  for (const a of allAssignees) {
    if (!assigneesMap[a.task_id]) {
      assigneesMap[a.task_id] = [];
    }
    assigneesMap[a.task_id].push({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      job_title: a.job_title,
      avatar_color: a.avatar_color,
    });
  }

  return tasks.map((t) => ({
    ...t,
    assignees: assigneesMap[t.id] || [],
  }));
}

// GET /api/tasks?projectId=...
router.get("/", async (c) => {
  const projectId = c.req.query("projectId");

  let query = `
    SELECT 
      t.*,
      creator.name as created_by_name,
      creator.role as created_by_role,
      creator.job_title as created_by_job_title,
      creator.avatar_color as created_by_avatar_color,
      (SELECT COUNT(*) FROM task_acceptance_criteria WHERE task_id = t.id) as total_criteria,
      (SELECT COUNT(*) FROM task_acceptance_criteria WHERE task_id = t.id AND is_completed = 1) as completed_criteria,
      (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as total_comments,
      (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as total_attachments
    FROM tasks t
    LEFT JOIN members creator ON creator.id = t.created_by_id
  `;

  const params: any = {};
  if (projectId) {
    query += " WHERE t.project_id = :projectId";
    params.projectId = projectId;
  }

  query += ` ORDER BY 
    CASE WHEN t.deadline IS NOT NULL AND t.deadline != '' THEN 0 ELSE 1 END ASC,
    t.deadline ASC,
    CASE t.priority 
      WHEN 'urgent' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
      ELSE 5 
    END ASC,
    t.order_index ASC, 
    t.created_at DESC`;

  const tasks = await db.query(query).all(params);
  const tasksWithAssignees = await attachAssigneesToTasks(tasks);

  return c.json(tasksWithAssignees);
});

// GET /api/tasks/:id - Single task with full relational details
router.get("/:id", async (c) => {
  const id = c.req.param("id");

  const task = await db.query(`
    SELECT 
      t.*,
      creator.name as created_by_name,
      creator.role as created_by_role,
      creator.job_title as created_by_job_title,
      creator.avatar_color as created_by_avatar_color,
      p.name as project_name,
      p.code as project_code
    FROM tasks t
    LEFT JOIN members creator ON creator.id = t.created_by_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = :id
  `).get({ id: id }) as any;

  if (!task) {
    return c.json({ error: "Task tidak ditemukan" }, 404);
  }

  // Fetch multiple assignees
  task.assignees = await db.query(`
    SELECT m.id, m.name, m.email, m.role, m.job_title, m.avatar_color
    FROM task_assignees ta
    JOIN members m ON m.id = ta.member_id
    WHERE ta.task_id = :id
  `).all({ id: id });

  // Fetch criteria with completed_by info
  task.acceptance_criteria = await db.query(`
    SELECT tac.*, m.name as completed_by_name
    FROM task_acceptance_criteria tac
    LEFT JOIN members m ON m.id = tac.completed_by_id
    WHERE tac.task_id = :id 
    ORDER BY tac.order_index ASC, tac.created_at ASC
  `).all({ id: id });

  // Fetch comments with member info
  task.comments = await db.query(`
    SELECT 
      tc.*,
      m.name as author_name,
      m.role as author_role,
      m.job_title as author_job_title,
      m.avatar_color as author_avatar_color
    FROM task_comments tc
    JOIN members m ON m.id = tc.member_id
    WHERE tc.task_id = :id
    ORDER BY tc.created_at ASC
  `).all({ id: id });

  // Fetch attachments
  task.attachments = await db.query(`
    SELECT * FROM task_attachments
    WHERE task_id = :id
    ORDER BY created_at DESC
  `).all({ id: id });

  return c.json(task);
});

// POST /api/tasks - Create task with multiple assignees
router.post("/", async (c) => {
  const body = await c.req.json();
  const id = "tsk-" + crypto.randomUUID().slice(0, 8);
  const {
    project_id,
    title,
    description = "",
    status = "backlog",
    priority = "medium",
    assignee_ids = [],
    deadline = null,
    acceptance_criteria = [],
    created_by_id = null,
  } = body;

  if (!project_id || !title) {
    return c.json({ error: "Project ID dan Judul Task wajib diisi" }, 400);
  }

  const maxOrder = await db.query(`
    SELECT COALESCE(MAX(order_index), -1) as max_order 
    FROM tasks 
    WHERE project_id = :project_id AND status = :status
  `).get({ project_id: project_id, status: status }) as { max_order: number };

  const nextOrder = (maxOrder?.max_order ?? -1) + 1;

  try {
    await db.query(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, deadline, order_index, created_by_id)
      VALUES (:id, :project_id, :title, :description, :status, :priority, :deadline, :order_index, :created_by_id)
    `).run({
      id: id,
      project_id: project_id,
      title: title.trim(),
      description: description.trim(),
      status: status,
      priority: priority,
      deadline: deadline || null,
      order_index: nextOrder,
      created_by_id: created_by_id || null,
    });

    // Insert multiple assignees
    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      for (const mId of assignee_ids) {
        if (mId) {
          await db.query(`
            INSERT INTO task_assignees (task_id, member_id)
            VALUES (:task_id, :member_id)
            ON DUPLICATE KEY UPDATE task_id=task_id
          `).run({ task_id: id, member_id: mId });
        }
      }
    }

    // Insert criteria if provided
    if (Array.isArray(acceptance_criteria) && acceptance_criteria.length > 0) {
      for (let idx = 0; idx < acceptance_criteria.length; idx++) {
        const text = acceptance_criteria[idx];
        if (text && text.trim()) {
          await db.query(`
            INSERT INTO task_acceptance_criteria (id, task_id, text, is_completed, order_index)
            VALUES (:id, :task_id, :text, 0, :order_index)
          `).run({
            id: "ac-" + crypto.randomUUID().slice(0, 8),
            task_id: id,
            text: text.trim(),
            order_index: idx,
          });
        }
      }
    }

    const created = await db.query(`
      SELECT 
        t.*,
        creator.name as created_by_name,
        creator.role as created_by_role,
        creator.job_title as created_by_job_title,
        creator.avatar_color as created_by_avatar_color
      FROM tasks t
      LEFT JOIN members creator ON creator.id = t.created_by_id
      WHERE t.id = :id
    `).get({ id: id }) as any;

    created.assignees = await db.query(`
      SELECT m.id, m.name, m.email, m.role, m.job_title, m.avatar_color
      FROM task_assignees ta
      JOIN members m ON m.id = ta.member_id
      WHERE ta.task_id = :id
    `).all({ id: id });

    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal membuat task" }, 500);
  }
});

// PUT /api/tasks/:id - Update task fields & multiple assignees
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { title, description, status, priority, assignee_ids, deadline, order_index } = body;

  try {
    await db.query(`
      UPDATE tasks 
      SET 
        title = COALESCE(:title, title),
        description = COALESCE(:description, description),
        status = COALESCE(:status, status),
        priority = COALESCE(:priority, priority),
        deadline = CASE WHEN :deadline_provided = 1 THEN :deadline ELSE deadline END,
        order_index = COALESCE(:order_index, order_index),
        updated_at = NOW()
      WHERE id = :id
    `).run({
      id: id,
      title: title ? title.trim() : null,
      description: description !== undefined ? description : null,
      status: status,
      priority: priority,
      deadline: deadline,
      deadline_provided: deadline !== undefined ? 1 : 0,
      order_index: order_index,
    });

    // Update multiple assignees if provided
    if (Array.isArray(assignee_ids)) {
      await db.query("DELETE FROM task_assignees WHERE task_id = :id").run({ id: id });
      for (const mId of assignee_ids) {
        if (mId) {
          await db.query(`
            INSERT INTO task_assignees (task_id, member_id)
            VALUES (:task_id, :member_id)
            ON DUPLICATE KEY UPDATE task_id=task_id
          `).run({ task_id: id, member_id: mId });
        }
      }
    }

    const updated = await db.query("SELECT * FROM tasks WHERE id = :id").get({ id: id }) as any;
    updated.assignees = await db.query(`
      SELECT m.id, m.name, m.email, m.role, m.job_title, m.avatar_color
      FROM task_assignees ta
      JOIN members m ON m.id = ta.member_id
      WHERE ta.task_id = :id
    `).all({ id: id });

    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui task" }, 500);
  }
});

// POST /api/tasks/reorder - Batch update order and status for Kanban Drag & Drop
router.post("/reorder", async (c) => {
  const body = await c.req.json();
  const { items } = body as { items: Array<{ id: string; status: string; order_index: number }> };

  if (!Array.isArray(items)) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  try {
    for (const item of items) {
      await db.query(`
        UPDATE tasks 
        SET status = :status, order_index = :order_index, updated_at = NOW() 
        WHERE id = :id
      `).run({
        id: item.id,
        status: item.status,
        order_index: item.order_index,
      });
    }
    return c.json({ success: true, count: items.length });
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui urutan task" }, 500);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.query("DELETE FROM tasks WHERE id = :id").run({ id: id });
  return c.json({ success: true, message: "Task berhasil dihapus" });
});

// --- ACCEPTANCE CRITERIA ENDPOINTS ---

// POST /api/tasks/:id/criteria - Add criterion
router.post("/:id/criteria", async (c) => {
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const { text } = body;

  if (!text || !text.trim()) {
    return c.json({ error: "Teks kriteria tidak boleh kosong" }, 400);
  }

  const id = "ac-" + crypto.randomUUID().slice(0, 8);
  const maxOrder = await db.query(`
    SELECT COALESCE(MAX(order_index), -1) as max_order 
    FROM task_acceptance_criteria 
    WHERE task_id = :taskId
  `).get({ taskId: taskId }) as { max_order: number };

  await db.query(`
    INSERT INTO task_acceptance_criteria (id, task_id, text, is_completed, order_index)
    VALUES (:id, :taskId, :text, 0, :order_index)
  `).run({
    id: id,
    taskId: taskId,
    text: text.trim(),
    order_index: (maxOrder?.max_order ?? -1) + 1,
  });

  const created = await db.query("SELECT * FROM task_acceptance_criteria WHERE id = :id").get({ id: id });
  return c.json(created, 201);
});

// PUT /api/tasks/:id/criteria/:criteriaId - Toggle or edit criterion
router.put("/:id/criteria/:criteriaId", async (c) => {
  const criteriaId = c.req.param("criteriaId");
  const body = await c.req.json();
  const { text, is_completed, completed_by_id } = body;

  const isCompletedNum = is_completed ? 1 : 0;
  // Format local date time: YYYY-MM-DD HH:mm:ss
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  
  const completedAtVal = is_completed ? nowFormatted : null;
  const completedByIdVal = is_completed ? completed_by_id : null;

  await db.query(`
    UPDATE task_acceptance_criteria
    SET 
      text = COALESCE(:text, text),
      is_completed = CASE WHEN :is_completed_provided = 1 THEN :is_completed ELSE is_completed END,
      completed_by_id = CASE WHEN :is_completed_provided = 1 THEN :completed_by_id ELSE completed_by_id END,
      completed_at = CASE WHEN :is_completed_provided = 1 THEN :completed_at ELSE completed_at END
    WHERE id = :criteriaId
  `).run({
    criteriaId: criteriaId,
    text: text,
    is_completed: isCompletedNum,
    is_completed_provided: is_completed !== undefined ? 1 : 0,
    completed_by_id: completedByIdVal,
    completed_at: completedAtVal,
  });

  const updated = await db.query(`
    SELECT tac.*, m.name as completed_by_name 
    FROM task_acceptance_criteria tac
    LEFT JOIN members m ON m.id = tac.completed_by_id
    WHERE tac.id = :id
  `).get({ id: criteriaId });

  return c.json(updated);
});

// DELETE /api/tasks/:id/criteria/:criteriaId - Delete criterion
router.delete("/:id/criteria/:criteriaId", async (c) => {
  const criteriaId = c.req.param("criteriaId");
  await db.query("DELETE FROM task_acceptance_criteria WHERE id = :id").run({ id: criteriaId });
  return c.json({ success: true });
});

// --- COMMENTS ENDPOINTS ---

// POST /api/tasks/:id/comments - Add comment
router.post("/:id/comments", async (c) => {
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const { member_id, content } = body;

  if (!content || !content.trim()) {
    return c.json({ error: "Isi komentar tidak boleh kosong" }, 400);
  }

  const id = "com-" + crypto.randomUUID().slice(0, 8);

  await db.query(`
    INSERT INTO task_comments (id, task_id, member_id, content)
    VALUES (:id, :taskId, :member_id, :content)
  `).run({
    id: id,
    taskId: taskId,
    member_id: member_id,
    content: content.trim(),
  });

  const created = await db.query(`
    SELECT 
      tc.*,
      m.name as author_name,
      m.role as author_role,
      m.job_title as author_job_title,
      m.avatar_color as author_avatar_color
    FROM task_comments tc
    JOIN members m ON m.id = tc.member_id
    WHERE tc.id = :id
  `).get({ id: id });

  return c.json(created, 201);
});

// DELETE /api/tasks/:id/comments/:commentId - Delete comment
router.delete("/:id/comments/:commentId", async (c) => {
  const commentId = c.req.param("commentId");
  await db.query("DELETE FROM task_comments WHERE id = :id").run({ id: commentId });
  return c.json({ success: true });
});

// --- ATTACHMENTS ENDPOINTS ---

// POST /api/tasks/:id/attachments - Add attachment
router.post("/:id/attachments", async (c) => {
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const { file_name, file_url, file_size = 0, file_type = "" } = body;

  if (!file_name || !file_url) {
    return c.json({ error: "Nama dan URL file wajib diisi" }, 400);
  }

  const id = "att-" + crypto.randomUUID().slice(0, 8);

  await db.query(`
    INSERT INTO task_attachments (id, task_id, file_name, file_url, file_size, file_type)
    VALUES (:id, :taskId, :file_name, :file_url, :file_size, :file_type)
  `).run({
    id: id,
    taskId: taskId,
    file_name: file_name,
    file_url: file_url,
    file_size: file_size,
    file_type: file_type,
  });

  const created = await db.query("SELECT * FROM task_attachments WHERE id = :id").get({ id: id });
  return c.json(created, 201);
});

// DELETE /api/tasks/:id/attachments/:attachmentId - Delete attachment
router.delete("/:id/attachments/:attachmentId", async (c) => {
  const attachmentId = c.req.param("attachmentId");

  const att = (await db.query("SELECT file_url FROM task_attachments WHERE id = :id").get({ id: attachmentId })) as any
    || (await db.query("SELECT file_url FROM project_attachments WHERE id = :id").get({ id: attachmentId })) as any;

  if (att && att.file_url) {
    const filename = att.file_url.replace("/uploads/", "");
    const safeClean = sanitizeFileName(filename);
    const filePath = join(uploadsDir, safeClean);
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {}

    await db.query("DELETE FROM project_attachments WHERE id = :id OR file_url = :fileUrl").run({ id: attachmentId, fileUrl: att.file_url });
    await db.query("DELETE FROM task_attachments WHERE id = :id OR file_url = :fileUrl").run({ id: attachmentId, fileUrl: att.file_url });
  } else {
    await db.query("DELETE FROM task_attachments WHERE id = :id").run({ id: attachmentId });
    await db.query("DELETE FROM project_attachments WHERE id = :id").run({ id: attachmentId });
  }

  return c.json({ success: true });
});

// PUT /api/tasks/:id/attachments/:attachmentId - Rename task attachment
router.put("/:id/attachments/:attachmentId", async (c) => {
  const attachmentId = c.req.param("attachmentId");
  const body = await c.req.json();
  const { file_name } = body;

  if (!file_name || !file_name.trim()) {
    return c.json({ error: "Nama file tidak boleh kosong" }, 400);
  }

  const cleanName = sanitizeFileName(file_name);

  // Retrieve existing file_url from either table
  const existing = (await db.query("SELECT file_url FROM task_attachments WHERE id = :id").get({ id: attachmentId })) as any
    || (await db.query("SELECT file_url FROM project_attachments WHERE id = :id").get({ id: attachmentId })) as any;

  if (existing && existing.file_url) {
    // Synchronize both tables
    await db.query(`
      UPDATE task_attachments
      SET file_name = :file_name
      WHERE id = :id OR file_url = :fileUrl
    `).run({ id: attachmentId, fileUrl: existing.file_url, file_name: cleanName });

    await db.query(`
      UPDATE project_attachments
      SET file_name = :file_name
      WHERE id = :id OR file_url = :fileUrl
    `).run({ id: attachmentId, fileUrl: existing.file_url, file_name: cleanName });
  } else {
    await db.query(`
      UPDATE task_attachments
      SET file_name = :file_name
      WHERE id = :id
    `).run({ id: attachmentId, file_name: cleanName });

    await db.query(`
      UPDATE project_attachments
      SET file_name = :file_name
      WHERE id = :id
    `).run({ id: attachmentId, file_name: cleanName });
  }

  return c.json({ success: true, file_name: cleanName });
});

export default router;
