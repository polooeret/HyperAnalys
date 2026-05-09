import { NextRequest } from "next/server";

import { getArtifact } from "@/app/api/chat/messageStore";
import { buildPptxBuffer } from "@/lib/pptx-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExportBody {
  artifactId?: string;
  version?: string;
}

export async function POST(req: NextRequest) {
  let body: ExportBody;
  try {
    body = (await req.json()) as ExportBody;
  } catch (err) {
    return jsonError(400, `Invalid JSON body: ${errorMessage(err)}`);
  }
  const { artifactId, version } = body;
  if (!artifactId) {
    return jsonError(400, "artifactId is required");
  }
  const stored = getArtifact(artifactId, version);
  if (!stored) {
    return jsonError(404, `Artifact ${artifactId} not found`);
  }
  let buffer: Buffer;
  try {
    buffer = await buildPptxBuffer({
      slides: stored.slides,
      title: stored.title,
      theme: stored.theme,
    });
  } catch (err) {
    console.error("[hyperanalyse] pptx export failed:", err);
    return jsonError(500, `Export failed: ${errorMessage(err)}`);
  }
  // Convert Node Buffer → Uint8Array so the Response body is a portable
  // BodyInit and content length is known.
  const fileName = sanitiseFileName(stored.title || "presentation");
  const body8 = new Uint8Array(buffer);
  return new Response(body8, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fileName}.pptx"; filename*=UTF-8''${encodeURIComponent(fileName)}.pptx`,
      "Content-Length": String(body8.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

function sanitiseFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "presentation";
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
