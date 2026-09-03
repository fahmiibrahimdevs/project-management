import { Hono } from "hono";
import { db } from "../db/database";

const router = new Hono();

// GET /api/notifications - List notifications for current user with unread count
router.get("/", async (c) => {
  const userId = c.req.query("userId") || c.req.query("user_id");

  if (!userId) {
    return c.json({ unread_count: 0, notifications: [] });
  }

  // Get unread count
  const unreadRes = (await db.query(`
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = :userId AND is_read = 0
  `).get({ userId })) as { count: number } | null;

  const unreadCount = unreadRes?.count || 0;

  // Get notifications list
  const notifications = (await db.query(`
    SELECT 
      n.id,
      n.user_id,
      n.actor_id,
      n.project_id,
      n.task_id,
      n.type,
      n.title,
      n.message,
      n.is_read,
      n.created_at,
      m.name as actor_name,
      m.avatar_color as actor_avatar_color,
      m.role as actor_role,
      p.name as project_name,
      p.code as project_code,
      t.title as task_title
    FROM notifications n
    LEFT JOIN members m ON m.id = n.actor_id
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN tasks t ON t.id = n.task_id
    WHERE n.user_id = :userId
    ORDER BY n.created_at DESC
    LIMIT 60
  `).all({ userId })) as any[];

  return c.json({
    unread_count: unreadCount,
    notifications,
  });
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put("/:id/read", async (c) => {
  const id = c.req.param("id");
  await db.query("UPDATE notifications SET is_read = 1 WHERE id = :id").run({ id });
  return c.json({ success: true, id, is_read: 1 });
});

// PUT /api/notifications/read-all - Mark all notifications as read for a user
router.put("/read-all", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id || body.userId || c.req.query("userId") || c.req.query("user_id");

  if (!userId) {
    return c.json({ error: "User ID wajib disertakan" }, 400);
  }

  await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = :userId").run({ userId });
  return c.json({ success: true, user_id: userId });
});

// DELETE /api/notifications/:id - Delete a notification
router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.query("DELETE FROM notifications WHERE id = :id").run({ id });
  return c.json({ success: true, id });
});

export default router;
