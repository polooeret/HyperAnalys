import { existsSync, readFileSync } from "fs";
import { NextRequest } from "next/server";
import { join } from "path";
import type { ChatCompletionMessageParam } from "@/lib/openai-types";
import { getModel } from "@/lib/vertex-client";
import { HYPERANALYSE_SYSTEM_INSTRUCTION } from "./systemPrompt";
import { openAIToVertexMessages, vertexStreamToSSE } from "./conversionUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Eagerly load the generated component reference once at module init.
// `pnpm dev` and `pnpm build` always regenerate this file via `pnpm generate:prompt`.
const SYSTEM_PROMPT_PATH = join(process.cwd(), "src/generated/system-prompt.txt");
const generatedComponentPrompt = existsSync(SYSTEM_PROMPT_PATH)
  ? readFileSync(SYSTEM_PROMPT_PATH, "utf-8")
  : "";

const FULL_SYSTEM_INSTRUCTION = [
  HYPERANALYSE_SYSTEM_INSTRUCTION,
  generatedComponentPrompt ||
    "[OpenUI component reference not generated yet — run `pnpm generate:prompt`.]",
]
  .filter(Boolean)
  .join("\n\n");

export async function POST(req: NextRequest) {
  let payload: { messages: ChatCompletionMessageParam[] };
  try {
    payload = (await req.json()) as { messages: ChatCompletionMessageParam[] };
  } catch (err) {
    return jsonError(400, `Invalid JSON body: ${errorMessage(err)}`);
  }

  if (!Array.isArray(payload?.messages)) {
    return jsonError(400, "`messages` array is required");
  }

  const { contents, systemSuffix } = openAIToVertexMessages(payload.messages);

  if (contents.length === 0) {
    return jsonError(400, "No user message found in payload");
  }

  const systemInstruction = systemSuffix
    ? `${FULL_SYSTEM_INSTRUCTION}\n\n${systemSuffix}`
    : FULL_SYSTEM_INSTRUCTION;

  let model;
  try {
    model = getModel({ systemInstruction });
  } catch (err) {
    return jsonError(500, `Vertex AI client init failed: ${errorMessage(err)}`);
  }

  const abortController = new AbortController();
  const onClientAbort = () => abortController.abort();
  req.signal.addEventListener("abort", onClientAbort);

  let vertexStream;
  try {
    vertexStream = await model.generateContentStream({ contents });
  } catch (err) {
    req.signal.removeEventListener("abort", onClientAbort);
    return jsonError(500, `Vertex AI request failed: ${errorMessage(err)}`);
  }

  const stream = vertexStreamToSSE(vertexStream, { abortSignal: abortController.signal });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
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
