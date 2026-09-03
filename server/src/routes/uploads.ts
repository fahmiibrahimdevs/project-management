import { Hono } from "hono";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const router = new Hono();

const uploadsDir = join(import.meta.dir, "../../uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/upload - Handle file upload
router.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No valid file uploaded" }, 400);
    }

    const ext = file.name.split(".").pop() || "dat";
    const uniqueFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filePath = join(uploadsDir, uniqueFileName);

    const arrayBuffer = await file.arrayBuffer();
    await Bun.write(filePath, arrayBuffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    return c.json({
      file_name: file.name,
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type || ext,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to upload file" }, 500);
  }
});

export default router;
