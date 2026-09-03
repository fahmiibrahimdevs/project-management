import { normalize, resolve } from "path";

// Maximum upload file size: 100MB
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

// 🚫 Strictly forbidden extensions (executable, server-side scripts, system configs)
export const FORBIDDEN_EXTENSIONS = new Set([
  // Executables & binaries
  "exe", "dll", "so", "bin", "com", "bat", "cmd", "sh", "bash", "zsh", "msi", "msp", "vbs", "vbe",
  "ws", "wsf", "wsc", "wsh", "ps1", "ps1xml", "ps2", "ps2xml", "psc1", "psc2", "msh", "msh1", "msh2",
  "scf", "lnk", "inf", "reg", "scr", "cpl", "gadget", "hta", "jar", "war", "ear",
  // Server-side scripts
  "php", "phtml", "php3", "php4", "php5", "php7", "php8", "phps", "pht", "phar", "inc",
  "asp", "aspx", "axd", "ashx", "asmx", "aspq", "cgi", "pl", "py", "pyc", "pyo", "pyd",
  "rb", "rhtml", "jsp", "jspx", "jsw", "jsv", "jspf", "fcgi",
  // Web script execution / configs
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue", "htaccess", "htpasswd", "env", "config"
]);

// ✅ Explicitly permitted extensions (CAD, Adobe/Design, Documents, Spreadsheets, Archives, Images, Data)
export const ALLOWED_EXTENSIONS = new Set([
  // 1. CAD & 3D Engineering (AutoCAD, SolidWorks, Inventor, Fusion, Electronic CAD)
  "dwg", "dxf", "step", "stp", "iges", "igs", "stl", "obj", "blend", "sldprt", "sldasm", 
  "ipt", "iam", "3dm", "f3d", "fcstd", "gbr", "gerber", "kicad_pcb", "sch", "brd",
  // 2. Adobe & Creative Design (Photoshop, Illustrator, InDesign, XD, Figma, Vector)
  "psd", "psb", "ai", "eps", "indd", "xd", "fig", "cdr", "sketch", "svg",
  // 3. Images & Media
  "png", "jpg", "jpeg", "webp", "gif", "bmp", "ico", "tiff", "tif", "heic", "raw", "cr2", "nef",
  // 4. Documents & Specifications
  "pdf", "doc", "docx", "rtf", "odt", "txt", "md", "log", "ppt", "pptx", "odp",
  // 5. Spreadsheets & Tabular Data
  "xls", "xlsx", "csv", "tsv", "ods",
  // 6. Archives & Compressed Packages
  "zip", "rar", "7z", "tar", "gz", "bz2",
  // 7. Hardware & Firmware Data Specs
  "json", "xml", "yaml", "yml", "sql", "ino", "hex"
]);

/**
 * Categorize a file by extension and MIME type
 */
export function getFileCategory(ext: string, mime: string = ""): string {
  const e = ext.toLowerCase().replace(/^\./, "");
  
  // CAD & 3D
  if (["dwg", "dxf", "step", "stp", "iges", "igs", "stl", "obj", "blend", "sldprt", "sldasm", "ipt", "iam", "3dm", "f3d", "fcstd", "gbr", "gerber", "kicad_pcb", "sch", "brd"].includes(e)) {
    return "cad";
  }
  
  // Adobe & Design
  if (["psd", "psb", "ai", "eps", "indd", "xd", "fig", "cdr", "sketch"].includes(e)) {
    return "design";
  }
  
  // Standard Images
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff", "tif", "heic", "raw", "cr2", "nef"].includes(e) || mime.startsWith("image/")) {
    return "image";
  }
  
  // Documents
  if (["pdf", "doc", "docx", "rtf", "odt", "txt", "md", "log", "ppt", "pptx", "odp"].includes(e) || mime.includes("pdf") || mime.includes("word") || mime.includes("text") || mime.includes("officedocument")) {
    return "document";
  }
  
  // Spreadsheets
  if (["xlsx", "xls", "csv", "tsv", "ods"].includes(e) || mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) {
    return "spreadsheet";
  }
  
  // Archives
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(e) || mime.includes("zip") || mime.includes("compressed") || mime.includes("tar") || mime.includes("archive")) {
    return "archive";
  }
  
  return "other";
}

/**
 * Sanitize filename to prevent Path Traversal, Null Byte Injections, and Control Characters
 */
export function sanitizeFileName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return "file";

  // Remove directory traversals, backslashes, slashes, null bytes, and non-printable control characters
  let clean = rawName
    .replace(/[\x00-\x1f\x80-\x9f]/g, "") // Remove control characters
    .replace(/[\\\/]/g, "_")               // Replace path separators with underscore
    .replace(/\.\.+/g, ".")                // Replace multiple dots to prevent '..' traversal
    .replace(/[<>:"|?*]/g, "_")            // Strip Windows forbidden filename characters
    .trim();

  // Remove leading and trailing dots or spaces
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, "");

  if (!clean || clean.length === 0) {
    return `file-${Date.now()}`;
  }

  // Cap max length to 200 chars while preserving extension
  if (clean.length > 200) {
    const lastDot = clean.lastIndexOf(".");
    if (lastDot > 0) {
      const ext = clean.substring(lastDot);
      clean = clean.substring(0, 190) + ext;
    } else {
      clean = clean.substring(0, 200);
    }
  }

  return clean;
}

/**
 * Validate an uploaded file for security, size, and permitted extension
 */
export function validateUploadedFile(file: File): {
  isValid: boolean;
  error?: string;
  ext: string;
  safeDisplayName: string;
  category: string;
} {
  if (!file || !(file instanceof File)) {
    return { isValid: false, error: "File tidak valid atau tidak ditemukan", ext: "", safeDisplayName: "", category: "other" };
  }

  if (file.size <= 0) {
    return { isValid: false, error: `File "${file.name}" kosong (0 bytes)`, ext: "", safeDisplayName: "", category: "other" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { 
      isValid: false, 
      error: `File "${file.name}" melebihi batas maksimal 100MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`, 
      ext: "", 
      safeDisplayName: "", 
      category: "other" 
    };
  }

  const originalName = file.name || "unnamed";
  const lastDot = originalName.lastIndexOf(".");
  const ext = lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase().trim() : "";

  // 1. Check strict forbidden blacklist
  if (ext && FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Ekstensi file .${ext} dilarang demi keamanan sistem (eksekusi script/binari tidak diizinkan).`,
      ext,
      safeDisplayName: "",
      category: "other"
    };
  }

  // 2. Check allowed whitelist
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Ekstensi file .${ext} tidak didukung. Harap gunakan format dokumen, gambar, CAD (.dwg, .step), desain Adobe (.psd, .ai), spreadsheet, atau arsip.`,
      ext,
      safeDisplayName: "",
      category: "other"
    };
  }

  const safeDisplayName = sanitizeFileName(originalName);
  const category = getFileCategory(ext, file.type);

  return {
    isValid: true,
    ext,
    safeDisplayName,
    category
  };
}

/**
 * Validate and verify safe path within uploads directory (Path Traversal Protection)
 */
export function isSafeUploadPath(requestedPath: string, uploadsDir: string): boolean {
  try {
    const normalized = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const resolvedTarget = resolve(uploadsDir, normalized);
    const resolvedBase = resolve(uploadsDir);

    return resolvedTarget.startsWith(resolvedBase);
  } catch {
    return false;
  }
}
