import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// GET /api/issue-logs?projectId=...
router.get("/", async (c) => {
  const projectId = c.req.query("projectId");

  let query = `
    SELECT 
      i.*,
      m.name as reported_by_name,
      m.email as reported_by_email,
      m.role as reported_by_role,
      m.avatar_color as reported_by_avatar_color,
      t.title as task_title,
      t.status as task_status
    FROM issue_logs i
    LEFT JOIN members m ON m.id = i.reported_by_id
    LEFT JOIN tasks t ON t.id = i.task_id
  `;

  const params: any = {};
  if (projectId) {
    query += " WHERE i.project_id = :projectId";
    params.projectId = projectId;
  }

  query += ` ORDER BY 
    CASE i.status 
      WHEN 'open' THEN 1 
      WHEN 'investigating' THEN 2 
      WHEN 'resolved' THEN 3 
      WHEN 'closed' THEN 4 
      ELSE 5 
    END,
    CASE i.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
      ELSE 5 
    END,
    i.log_date DESC, 
    i.created_at DESC`;

  const issues = (await db.query(query).all(params)) as any[];

  // Summary statistics
  const totalIssues = issues.length;
  const openCount = issues.filter((i) => i.status === "open").length;
  const investigatingCount = issues.filter((i) => i.status === "investigating").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;
  const closedCount = issues.filter((i) => i.status === "closed").length;

  const severityCounts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };

  return c.json({
    issues,
    summary: {
      total: totalIssues,
      open: openCount,
      investigating: investigatingCount,
      resolved: resolvedCount,
      closed: closedCount,
      severity: severityCounts,
    },
  });
});

// GET /api/issue-logs/:id
router.get("/:id", async (c) => {
  const id = c.req.param("id");

  const issue = await db.query(`
    SELECT 
      i.*,
      m.name as reported_by_name,
      m.email as reported_by_email,
      m.role as reported_by_role,
      m.avatar_color as reported_by_avatar_color,
      t.title as task_title,
      t.status as task_status,
      p.name as project_name,
      p.code as project_code
    FROM issue_logs i
    LEFT JOIN members m ON m.id = i.reported_by_id
    LEFT JOIN tasks t ON t.id = i.task_id
    LEFT JOIN projects p ON p.id = i.project_id
    WHERE i.id = :id
  `).get({ id: id });

  if (!issue) {
    return c.json({ error: "Issue log tidak ditemukan" }, 404);
  }

  return c.json(issue);
});

// POST /api/issue-logs - Create new issue log
router.post("/", async (c) => {
  const body = await c.req.json();
  const id = "iss-" + crypto.randomUUID().slice(0, 8);
  const {
    project_id,
    task_id = null,
    log_date,
    problem,
    indication,
    root_cause,
    solution,
    status = "open",
    severity = "medium",
    reported_by_id,
  } = body;

  if (!project_id || !log_date || !problem || !indication || !root_cause || !solution || !reported_by_id) {
    return c.json({ 
      error: "Semua field: Proyek, Tanggal, Permasalahan, Indikasi, Akar Penyebab, Solusi, dan Pelapor wajib diisi" 
    }, 400);
  }

  try {
    await db.query(`
      INSERT INTO issue_logs (id, project_id, task_id, log_date, problem, indication, root_cause, solution, status, severity, reported_by_id)
      VALUES (:id, :project_id, :task_id, :log_date, :problem, :indication, :root_cause, :solution, :status, :severity, :reported_by_id)
    `).run({
      id: id,
      project_id: project_id,
      task_id: task_id || null,
      log_date: log_date,
      problem: problem,
      indication: indication,
      root_cause: root_cause,
      solution: solution,
      status: status,
      severity: severity,
      reported_by_id: reported_by_id,
    });

    const created = await db.query(`
      SELECT 
        i.*,
        m.name as reported_by_name,
        m.email as reported_by_email,
        m.role as reported_by_role,
        m.avatar_color as reported_by_avatar_color,
        t.title as task_title
      FROM issue_logs i
      LEFT JOIN members m ON m.id = i.reported_by_id
      LEFT JOIN tasks t ON t.id = i.task_id
      WHERE i.id = :id
    `).get({ id: id });

    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mencatat log permasalahan" }, 500);
  }
});

// PUT /api/issue-logs/:id - Update issue log
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const {
    task_id,
    log_date,
    problem,
    indication,
    root_cause,
    solution,
    status,
    severity,
    reported_by_id,
  } = body;

  try {
    await db.query(`
      UPDATE issue_logs
      SET 
        task_id = CASE WHEN :task_id_provided = 1 THEN :task_id ELSE task_id END,
        log_date = COALESCE(:log_date, log_date),
        problem = COALESCE(:problem, problem),
        indication = COALESCE(:indication, indication),
        root_cause = COALESCE(:root_cause, root_cause),
        solution = COALESCE(:solution, solution),
        status = COALESCE(:status, status),
        severity = COALESCE(:severity, severity),
        reported_by_id = COALESCE(:reported_by_id, reported_by_id),
        updated_at = NOW()
      WHERE id = :id
    `).run({
      id: id,
      task_id: task_id,
      task_id_provided: task_id !== undefined ? 1 : 0,
      log_date: log_date,
      problem: problem,
      indication: indication,
      root_cause: root_cause,
      solution: solution,
      status: status,
      severity: severity,
      reported_by_id: reported_by_id,
    });

    const updated = await db.query(`
      SELECT 
        i.*,
        m.name as reported_by_name,
        m.email as reported_by_email,
        m.role as reported_by_role,
        m.avatar_color as reported_by_avatar_color,
        t.title as task_title
      FROM issue_logs i
      LEFT JOIN members m ON m.id = i.reported_by_id
      LEFT JOIN tasks t ON t.id = i.task_id
      WHERE i.id = :id
    `).get({ id: id });

    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal memperbarui log permasalahan" }, 500);
  }
});

// DELETE /api/issue-logs/:id - Delete issue log
router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.query("DELETE FROM issue_logs WHERE id = :id").run({ id: id });
  return c.json({ success: true, message: "Log permasalahan berhasil dihapus" });
});

export default router;
