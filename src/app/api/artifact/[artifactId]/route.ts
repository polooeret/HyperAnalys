import { NextRequest } from "next/server";

import { getArtifact, listVersions } from "@/app/api/chat/messageStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ artifactId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  const { artifactId } = await ctx.params;
  if (!artifactId) {
    return jsonError(400, "artifactId is required");
  }
  const url = new URL(req.url);
  const version = url.searchParams.get("version") ?? undefined;
  const artifact = getArtifact(artifactId, version);
  if (!artifact) {
    return jsonError(404, `Artifact ${artifactId} not found`, {
      versions: listVersions(artifactId),
    });
  }
  return new Response(
    JSON.stringify({
      artifact,
      versions: listVersions(artifactId),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

function jsonError(
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
