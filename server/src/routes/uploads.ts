import { Hono } from "hono";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { validateUploadedFile } from "../utils/fileSecurity";

const router = new Hono();

const uploadsDir = join(import.meta.dir, "../../uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/upload - Handle file upload securely
router.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "Tidak ada berkas yang valid untuk diunggah" }, 400);
    }

    const validation = validateUploadedFile(file);
    if (!validation.isValid) {
      return c.json({ error: validation.error || "File ditolak oleh kebijakan keamanan sistem" }, 400);
    }

    const ext = validation.ext;
    const uniqueFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 12)}${ext ? "." + ext : ""}`;
    const filePath = join(uploadsDir, uniqueFileName);

    const arrayBuffer = await file.arrayBuffer();
    await Bun.write(filePath, arrayBuffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    return c.json({
      file_name: validation.safeDisplayName,
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type || ext,
      category: validation.category,
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mengunggah berkas" }, 500);
  }
});

export default router;
