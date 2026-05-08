import * as XLSX from "xlsx";
import mammoth from "mammoth";

import { classifyMime, normaliseMimeType } from "./mime";

/**
 * Extract textual content from binary file uploads that Gemini cannot ingest
 * natively (DOCX, XLSX). For text-friendly formats (CSV/TXT/MD/JSON) we just
 * decode UTF-8 from base64.
 *
 * Returns `null` when extraction is not applicable (PDF/images stay binary).
 */
export async function extractText(args: {
  filename: string;
  mimeType: string;
  base64: string;
}): Promise<string | null> {
  const mime = normaliseMimeType(args.filename, args.mimeType);
  const info = classifyMime(mime);

  if (info.category === "text") {
    return Buffer.from(args.base64, "base64").toString("utf-8");
  }

  if (info.category !== "extract") {
    return null;
  }

  const buffer = Buffer.from(args.base64, "base64");

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel"
  ) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheets: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim().length === 0) continue;
      sheets.push(`### Sheet: ${sheetName}\n${csv}`);
    }
    return sheets.join("\n\n");
  }

  return null;
}

/** Truncate extremely large extracted text to keep request payload sane. */
export function clampText(text: string, maxChars = 200_000): string {
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) +
    `\n\n[…truncated ${text.length - maxChars} characters of extracted text]`
  );
}
