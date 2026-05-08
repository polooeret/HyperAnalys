import { NextRequest } from "next/server";
import { nanoid } from "nanoid";

import { extractText, clampText } from "@/lib/extract-text";
import { classifyMime, MAX_UPLOAD_BYTES, normaliseMimeType } from "@/lib/mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface UploadedFileResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: "inline" | "extract" | "text";
  /** Base64 file body — used for `inlineData` parts in chat messages. */
  base64Data: string;
  /** Pre-extracted text (DOCX/XLSX/CSV/TXT/MD/JSON). */
  extractedText?: string;
  /** Human-readable label (e.g. "PDF", "Excel spreadsheet"). */
  label: string;
  createdAt: number;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json(400, { error: "Expected multipart/form-data" });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return json(400, { error: `Failed to parse form data: ${msg(err)}` });
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return json(400, { error: "No files attached. Use the `files` field." });
  }

  const out: UploadedFileResponse[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    if (file.size === 0) {
      errors.push({ name: file.name, error: "File is empty" });
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push({
        name: file.name,
        error: `File exceeds ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)} MB limit`,
      });
      continue;
    }

    const mimeType = normaliseMimeType(file.name, file.type);
    const info = classifyMime(mimeType);
    if (info.category === "unsupported") {
      errors.push({
        name: file.name,
        error: `Unsupported type "${mimeType}". Allowed: PDF, DOCX, XLSX, CSV, TXT, MD, PNG, JPG, GIF, WebP.`,
      });
      continue;
    }

    let base64Data: string;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString("base64");
    } catch (err) {
      errors.push({ name: file.name, error: `Failed to read file: ${msg(err)}` });
      continue;
    }

    let extractedText: string | undefined;
    if (info.category === "extract" || info.category === "text") {
      try {
        const text = await extractText({
          filename: file.name,
          mimeType,
          base64: base64Data,
        });
        if (text != null) extractedText = clampText(text);
      } catch (err) {
        errors.push({
          name: file.name,
          error: `Failed to extract text: ${msg(err)}`,
        });
        continue;
      }
    }

    out.push({
      id: `file-${nanoid(10)}`,
      name: file.name,
      mimeType,
      size: file.size,
      category: info.category,
      base64Data,
      extractedText,
      label: info.label,
      createdAt: Date.now(),
    });
  }

  if (out.length === 0) {
    return json(400, { error: "No files accepted", details: errors });
  }

  return json(200, { files: out, errors });
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
