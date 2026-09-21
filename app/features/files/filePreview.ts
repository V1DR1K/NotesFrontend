import type { FileItem } from "../../lib/api/types";

export type FilePreviewKind = "image" | "pdf" | "audio" | "video" | "text" | null;

const unsafeTextMimeTypes = new Set(["text/html", "application/xhtml+xml", "application/javascript", "text/javascript"]);
const textMimeTypes = new Set(["application/json", "application/xml", "application/csv"]);
const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);
const textExtensions = new Set(["txt", "csv", "json", "xml", "md", "markdown", "log", "yaml", "yml"]);
const audioExtensions = new Set(["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac"]);
const videoExtensions = new Set(["mp4", "webm", "ogv", "mov", "m4v"]);

function normalizedMimeType(file: FileItem) {
  return (file.mimeType ?? "").split(";", 1)[0].trim().toLowerCase();
}

function extensionOf(file: FileItem) {
  const extension = file.extension || file.name.split(".").pop() || "";
  return extension.replace(/^\./, "").toLowerCase();
}

export function getFilePreviewKind(file: FileItem): FilePreviewKind {
  const mimeType = normalizedMimeType(file);
  const extension = extensionOf(file);

  if (mimeType === "application/pdf" || extension === "pdf") return "pdf";
  if (mimeType.startsWith("image/") || imageExtensions.has(extension)) return "image";
  if (mimeType.startsWith("audio/") || audioExtensions.has(extension)) return "audio";
  if (mimeType.startsWith("video/") || videoExtensions.has(extension)) return "video";
  if (!unsafeTextMimeTypes.has(mimeType) && (mimeType.startsWith("text/") || textMimeTypes.has(mimeType) || textExtensions.has(extension))) return "text";
  return null;
}

export function isImageFile(file: FileItem) {
  return getFilePreviewKind(file) === "image";
}
