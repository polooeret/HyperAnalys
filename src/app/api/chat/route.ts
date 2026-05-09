import { existsSync, readFileSync } from "fs";
import { NextRequest } from "next/server";
import { join } from "path";

import type { ChatCompletionMessageParam } from "@/lib/openai-types";
import { getModel, getVertexClient, VERTEX_MODEL_ID } from "@/lib/vertex-client";

import {
  buildSlidesErrorLang,
  buildSlidesResponseLang,
  handleCreatePresentation,
  handleEditPresentation,
} from "./artifact";
import {
  openAIToVertexMessages,
  streamLangAsSSE,
  vertexStreamToSSE,
} from "./conversionUtils";
import { HYPERANALYSE_SYSTEM_INSTRUCTION } from "./systemPrompt";
import { slidesTools } from "./tools";

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

interface FunctionCallShape {
  name: string;
  args?: unknown;
}

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

  const abortController = new AbortController();
  const onClientAbort = () => abortController.abort();
  req.signal.addEventListener("abort", onClientAbort);

  // ── Step 1: tool-aware non-streaming round-trip ─────────────────────────────
  // Function calling is finicky over Vertex's streaming API, so we do a single
  // non-streaming generateContent first. If a function call comes back we
  // dispatch to the local handler; otherwise we fall through to the existing
  // streaming path so plain chat keeps streaming token-by-token.

  let toolModel;
  try {
    const client = getVertexClient();
    toolModel = client.getGenerativeModel({
      model: VERTEX_MODEL_ID,
      generationConfig: {
        temperature: Number(process.env.VERTEX_TEMPERATURE ?? 0.7),
        maxOutputTokens: Number(process.env.VERTEX_MAX_TOKENS ?? 8192),
      },
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }],
      },
      tools: [slidesTools],
    });
  } catch (err) {
    req.signal.removeEventListener("abort", onClientAbort);
    return jsonError(500, `Vertex AI client init failed: ${errorMessage(err)}`);
  }

  let functionCall: FunctionCallShape | null = null;
  try {
    const result = await toolModel.generateContent({ contents });
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const fc = (part as { functionCall?: FunctionCallShape }).functionCall;
      if (fc && typeof fc.name === "string") {
        functionCall = fc;
        break;
      }
    }
  } catch (err) {
    // If the tool-aware call fails, fall back to streaming chat below.
    console.warn(
      "[hyperanalyse] tool-aware generateContent failed:",
      errorMessage(err),
    );
  }

  if (functionCall) {
    const lang = await dispatchSlidesFunctionCall(functionCall);
    const stream = streamLangAsSSE(lang);
    req.signal.removeEventListener("abort", onClientAbort);
    return sseResponse(stream);
  }

  // ── Step 2: fallback — plain streaming chat ────────────────────────────────
  let model;
  try {
    model = getModel({ systemInstruction });
  } catch (err) {
    req.signal.removeEventListener("abort", onClientAbort);
    return jsonError(500, `Vertex AI client init failed: ${errorMessage(err)}`);
  }

  let vertexStream;
  try {
    vertexStream = await model.generateContentStream({ contents });
  } catch (err) {
    req.signal.removeEventListener("abort", onClientAbort);
    return jsonError(500, `Vertex AI request failed: ${errorMessage(err)}`);
  }

  const stream = vertexStreamToSSE(vertexStream, {
    abortSignal: abortController.signal,
  });
  return sseResponse(stream);
}

async function dispatchSlidesFunctionCall(
  call: FunctionCallShape,
): Promise<string> {
  const args = (call.args ?? {}) as Record<string, unknown>;
  const tentativeTitle =
    typeof args.title === "string" && args.title.trim().length > 0
      ? args.title.trim()
      : "Presentation";

  try {
    if (call.name === "create_presentation") {
      const result = await handleCreatePresentation({
        title: typeof args.title === "string" ? args.title : tentativeTitle,
        instructions:
          typeof args.instructions === "string" ? args.instructions : "",
        slideCount:
          typeof args.slideCount === "number" ? args.slideCount : undefined,
      });
      return buildSlidesResponseLang({
        title: result.title,
        artifactId: result.artifactId,
        version: result.version,
        slidesCount: result.slidesCount,
        followUps: [
          "Add a slide on competitor positioning",
          "Make the conclusion more persuasive",
          "Switch the theme to dark mode",
          "Export this as PPTX",
        ],
      });
    }
    if (call.name === "edit_presentation") {
      const result = await handleEditPresentation({
        artifactId:
          typeof args.artifactId === "string" ? args.artifactId : "",
        version: typeof args.version === "string" ? args.version : undefined,
        instructions:
          typeof args.instructions === "string" ? args.instructions : "",
      });
      return buildSlidesResponseLang({
        title: result.title,
        artifactId: result.artifactId,
        version: result.version,
        slidesCount: result.slidesCount,
        intro: `Updated "${result.title}" — ${result.slidesCount} slides total. Open the panel to review.`,
        followUps: [
          "Refine slide 3",
          "Add a closing call-to-action",
          "Make every slide more concise",
          "Export this as PPTX",
        ],
      });
    }
    return buildSlidesErrorLang({
      title: "Unsupported tool",
      message: `The model called an unknown tool: ${call.name}`,
    });
  } catch (err) {
    console.error("[hyperanalyse] slides tool dispatch failed:", err);
    return buildSlidesErrorLang({
      title: tentativeTitle,
      message: errorMessage(err),
    });
  }
}

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
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
