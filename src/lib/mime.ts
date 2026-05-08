/**
 * MIME type helpers for HyperAnalyse.
 *
 * Categorises an uploaded file into one of:
 *  - `inline`: passed to Gemini directly via `inlineData` (PDF, images, plain text)
 *  - `extract`: text needs to be extracted server-side first (DOCX, XLSX)
 *  - `text`: already plain text, decoded from base64 to UTF-8 (CSV, MD, TXT)
 *  - `unsupported`: rejected at the upload boundary
 *
 * Gemini 2.5 Pro on Vertex AI supports the following inline mime types:
 *   application/pdf, image/png, image/jpeg, image/webp, image/gif, image/heic, image/heif,
 *   text/plain, audio/* (subset), video/* (subset).
 *
 * DOCX and XLSX are not natively supported by Gemini, so we extract text first
 * (mammoth for DOCX, xlsx for XLSX) and pass the result as a text part labelled
 * with the original filename.
 */

export type FileCategory = "inline" | "extract" | "text" | "unsupported";

export interface AllowedMimeInfo {
  category: FileCategory;
  /** Mime type to send to Gemini when category === "inline". */
  inlineMimeType?: string;
  /** Pretty label for UI / system prompt context. */
  label: string;
}

const INLINE_MIME: Record<string, AllowedMimeInfo> = {
  "application/pdf": { category: "inline", inlineMimeType: "application/pdf", label: "PDF" },
  "image/png": { category: "inline", inlineMimeType: "image/png", label: "Image (PNG)" },
  "image/jpeg": { category: "inline", inlineMimeType: "image/jpeg", label: "Image (JPEG)" },
  "image/jpg": { category: "inline", inlineMimeType: "image/jpeg", label: "Image (JPEG)" },
  "image/webp": { category: "inline", inlineMimeType: "image/webp", label: "Image (WebP)" },
  "image/gif": { category: "inline", inlineMimeType: "image/gif", label: "Image (GIF)" },
};

const EXTRACT_MIME: Record<string, AllowedMimeInfo> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    category: "extract",
    label: "Word document",
  },
  "application/msword": { category: "extract", label: "Word document (legacy)" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    category: "extract",
    label: "Excel spreadsheet",
  },
  "application/vnd.ms-excel": { category: "extract", label: "Excel spreadsheet (legacy)" },
};

const TEXT_MIME: Record<string, AllowedMimeInfo> = {
  "text/plain": { category: "text", label: "Text" },
  "text/markdown": { category: "text", label: "Markdown" },
  "text/csv": { category: "text", label: "CSV" },
  "application/csv": { category: "text", label: "CSV" },
  "application/json": { category: "text", label: "JSON" },
};

const EXTENSION_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
};

export function normaliseMimeType(name: string, mimeType: string | undefined): string {
  const lower = (mimeType || "").toLowerCase();
  if (lower && (INLINE_MIME[lower] || EXTRACT_MIME[lower] || TEXT_MIME[lower])) return lower;

  const ext = name.toLowerCase().split(".").pop();
  if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];

  return lower || "application/octet-stream";
}

export function classifyMime(mimeType: string): AllowedMimeInfo {
  const lower = mimeType.toLowerCase();
  return (
    INLINE_MIME[lower] ||
    EXTRACT_MIME[lower] ||
    TEXT_MIME[lower] || {
      category: "unsupported",
      label: "Unsupported",
    }
  );
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
