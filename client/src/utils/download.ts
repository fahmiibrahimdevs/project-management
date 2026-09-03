/**
 * Utility to generate secure download URLs with custom filenames
 */
export function getDownloadUrl(fileUrl: string, fileName?: string): string {
  if (!fileUrl) return "";
  const sep = fileUrl.includes("?") ? "&" : "?";
  const nameParam = fileName ? `&name=${encodeURIComponent(fileName)}` : "";
  return `${fileUrl}${sep}download=1${nameParam}`;
}

export function triggerDownload(fileUrl: string, fileName?: string): void {
  const url = getDownloadUrl(fileUrl, fileName);
  const link = document.createElement("a");
  link.href = url;
  if (fileName) {
    link.setAttribute("download", fileName);
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
