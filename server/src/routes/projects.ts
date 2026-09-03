import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// GET /api/projects - List all projects with aggregated summary stats
router.get("/", async (c) => {
  const projects = await db.query(`
    SELECT 
      p.*,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status != 'backlog' AND t.id IS NOT NULL THEN 1 ELSE 0 END) as active_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'backlog' THEN 1 ELSE 0 END) as backlog_tasks,
      (SELECT COUNT(*) FROM task_acceptance_criteria tac JOIN tasks tk ON tk.id = tac.task_id WHERE tk.project_id = p.id) as total_criteria,
      (SELECT COUNT(*) FROM task_acceptance_criteria tac JOIN tasks tk ON tk.id = tac.task_id WHERE tk.project_id = p.id AND tac.is_completed = 1) as completed_criteria,
      (SELECT COALESCE(SUM(total_price), 0) FROM bill_of_materials WHERE project_id = p.id) as total_bom_cost,
      (SELECT COUNT(*) FROM issue_logs WHERE project_id = p.id AND status != 'closed') as open_issues_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY 
      CASE p.status 
        WHEN 'active' THEN 1 
        WHEN 'planning' THEN 2 
        WHEN 'on_hold' THEN 3 
        WHEN 'completed' THEN 4 
        ELSE 5 
      END, 
      p.created_at DESC
  `).all() as any[];

  // Fetch all project members in one efficient query
  const allProjectMembers = await db.query(`
    SELECT pm.project_id, m.id, m.name, m.email, m.role, m.job_title, m.avatar_color, pm.project_role
    FROM project_members pm
    JOIN members m ON m.id = pm.member_id
    WHERE m.is_active = 1
    ORDER BY 
      CASE m.role 
        WHEN 'owner' THEN 1 
        WHEN 'pm' THEN 2 
        WHEN 'karyawan' THEN 3 
        WHEN 'magang' THEN 4 
        ELSE 5 
      END,
      m.name ASC
  `).all() as any[];

  // Map members to projects
  const membersByProject: Record<string, any[]> = {};
  for (const pm of allProjectMembers) {
    if (!membersByProject[pm.project_id]) {
      membersByProject[pm.project_id] = [];
    }
    membersByProject[pm.project_id].push(pm);
  }

  for (const p of projects) {
    p.members = membersByProject[p.id] || [];
    p.member_count = p.members.length;
  }

  return c.json(projects);
});

// GET /api/projects/:id - Single project
router.get("/:id", async (c) => {
  const id = c.req.param("id");
  const project = await db.query(`
    SELECT 
      p.*,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status != 'backlog' AND t.id IS NOT NULL THEN 1 ELSE 0 END) as active_tasks,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'backlog' THEN 1 ELSE 0 END) as backlog_tasks,
      (SELECT COUNT(*) FROM task_acceptance_criteria tac JOIN tasks tk ON tk.id = tac.task_id WHERE tk.project_id = p.id) as total_criteria,
      (SELECT COUNT(*) FROM task_acceptance_criteria tac JOIN tasks tk ON tk.id = tac.task_id WHERE tk.project_id = p.id AND tac.is_completed = 1) as completed_criteria,
      (SELECT COALESCE(SUM(total_price), 0) FROM bill_of_materials WHERE project_id = p.id) as total_bom_cost,
      (SELECT COUNT(*) FROM issue_logs WHERE project_id = p.id AND status != 'closed') as open_issues_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id = :id
    GROUP BY p.id
  `).get({ id: id }) as any;

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Get project members
  let members = await db.query(`
    SELECT m.id, m.name, m.email, m.role, m.job_title, m.avatar_color, pm.project_role
    FROM project_members pm
    JOIN members m ON m.id = pm.member_id
    WHERE pm.project_id = :id AND m.is_active = 1
    ORDER BY 
      CASE m.role 
        WHEN 'owner' THEN 1 
        WHEN 'pm' THEN 2 
        WHEN 'karyawan' THEN 3 
        WHEN 'magang' THEN 4 
        ELSE 5 
      END,
      m.name ASC
  `).all({ id: id }) as any[];

  if (members.length === 0) {
    members = await db.query(`
      SELECT id, name, email, role, job_title, avatar_color, 'Member' as project_role
      FROM members 
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
    `).all() as any[];
  }

  project.members = members;

  return c.json(project);
});

// POST /api/projects - Create new project
router.post("/", async (c) => {
  const body = await c.req.json();
  const id = "prj-" + crypto.randomUUID().slice(0, 8);
  const { name, code, description, status = "planning", start_date, end_date, member_ids = [] } = body;

  if (!name || !code) {
    return c.json({ error: "Nama dan Kode Proyek wajib diisi" }, 400);
  }

  try {
    await db.query(`
      INSERT INTO projects (id, name, code, description, status, start_date, end_date)
      VALUES (:id, :name, :code, :description, :status, :start_date, :end_date)
    `).run({
      id: id,
      name: name,
      code: code,
      description: description || "",
      status: status,
      start_date: start_date || null,
      end_date: end_date || null,
    });

    // Add members if provided, otherwise default to all active members
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      for (const mId of member_ids) {
        if (mId) {
          await db.query(`
            INSERT INTO project_members (project_id, member_id, project_role)
            VALUES (:project_id, :member_id, 'Member')
          `).run({ project_id: id, member_id: mId });
        }
      }
    } else {
      // Default: allocate all active members to the new project
      const activeMembers = await db.query("SELECT id FROM members WHERE is_active = 1").all() as any[];
      for (const m of activeMembers) {
        await db.query(`
          INSERT INTO project_members (project_id, member_id, project_role)
          VALUES (:project_id, :member_id, 'Member')
        `).run({ project_id: id, member_id: m.id });
      }
    }

    const created = await db.query("SELECT * FROM projects WHERE id = :id").get({ id: id }) as any;
    created.members = await db.query(`
      SELECT m.id, m.name, m.email, m.role, m.job_title, m.avatar_color, pm.project_role
      FROM project_members pm
      JOIN members m ON m.id = pm.member_id
      WHERE pm.project_id = :id AND m.is_active = 1
    `).all({ id: id });
    created.member_count = created.members.length;

    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal membuat project" }, 500);
  }
});

// PUT /api/projects/:id - Update project
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, code, description, status, start_date, end_date, member_ids } = body;

  try {
    await db.query(`
      UPDATE projects 
      SET 
        name = COALESCE(:name, name),
        code = COALESCE(:code, code),
        description = COALESCE(:description, description),
        status = COALESCE(:status, status),
        start_date = COALESCE(:start_date, start_date),
        end_date = COALESCE(:end_date, end_date),
        updated_at = NOW()
      WHERE id = :id
    `).run({
      id: id,
      name: name,
      code: code,
      description: description,
      status: status,
      start_date: start_date,
      end_date: end_date,
    });

    // Update project members if provided
    if (Array.isArray(member_ids)) {
      await db.query("DELETE FROM project_members WHERE project_id = :id").run({ id: id });
      for (const mId of member_ids) {
        if (mId) {
          await db.query(`
            INSERT INTO project_members (project_id, member_id, project_role)
            VALUES (:project_id, :member_id, 'Member')
          `).run({ project_id: id, member_id: mId });
        }
      }
    }

    const updated = await db.query("SELECT * FROM projects WHERE id = :id").get({ id: id }) as any;
    if (updated) {
      updated.members = await db.query(`
        SELECT m.id, m.name, m.email, m.role, m.job_title, m.avatar_color, pm.project_role
        FROM project_members pm
        JOIN members m ON m.id = pm.member_id
        WHERE pm.project_id = :id AND m.is_active = 1
      `).all({ id: id });
      updated.member_count = updated.members.length;
    }
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mengupdate project" }, 500);
  }
});

// DELETE /api/projects/:id - Delete project
router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.query("DELETE FROM projects WHERE id = :id").run({ id: id });
  return c.json({ success: true, message: "Project berhasil dihapus" });
});

export default router;
