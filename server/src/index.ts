import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { join } from "path";
import { initDatabase } from "./db/database";
import projectsRoute from "./routes/projects";
import membersRoute from "./routes/members";
import tasksRoute from "./routes/tasks";
import bomRoute from "./routes/bom";
import issueLogsRoute from "./routes/issueLogs";
import uploadsRoute from "./routes/uploads";
import attachmentsRoute from "./routes/attachments";
import authRoute from "./routes/auth";

// Initialize SQLite database and seed initial data
await initDatabase();

const app = new Hono();

// Middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

import { isSafeUploadPath } from "./utils/fileSecurity";

// Serve uploaded files securely (Path Traversal Protection & Security Headers)
const uploadsDir = join(import.meta.dir, "../uploads");

app.get("/uploads/*", async (c) => {
  const rawPath = c.req.path.replace(/^\/uploads\//, "");
  
  if (!isSafeUploadPath(rawPath, uploadsDir)) {
    return c.text("Forbidden: Invalid Path Traversal", 403);
  }

  const fullPath = join(uploadsDir, rawPath);
  const file = Bun.file(fullPath);

  if (await file.exists()) {
    const ext = rawPath.split(".").pop()?.toLowerCase() || "";
    const headers: Record<string, string> = {
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    // Sandboxing for SVG to prevent stored XSS attacks
    if (ext === "svg" || ext === "xml" || ext === "html") {
      headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
    }

    return new Response(file, { headers });
  }

  return c.text("File Not Found", 404);
});

// API Routes
app.route("/api/auth", authRoute);
app.route("/api/projects", projectsRoute);
app.route("/api/members", membersRoute);
app.route("/api/tasks", tasksRoute);
app.route("/api/bom", bomRoute);
app.route("/api/issue-logs", issueLogsRoute);
app.route("/api/upload", uploadsRoute);
app.route("/api/attachments", attachmentsRoute);

// Serve built frontend assets if dist exists
const clientDist = join(import.meta.dir, "../../client/dist");

app.get("*", async (c) => {
  const path = c.req.path === "/" ? "/index.html" : c.req.path;
  const filePath = join(clientDist, path);
  let file = Bun.file(filePath);
  
  if (await file.exists()) {
    return new Response(file);
  }

  // SPA fallback to index.html if file not found
  const indexHtml = Bun.file(join(clientDist, "index.html"));
  if (await indexHtml.exists()) {
    return new Response(indexHtml);
  }

  return c.json({
    status: "online",
    message: "Project Tracker API (Hono + Bun) is running 🚀",
  });
});

const PORT = Number(process.env.PORT) || 3001;

console.log(`🚀 Hono server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
