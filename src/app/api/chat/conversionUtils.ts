import type { Content, Part } from "@google-cloud/vertexai";

import type { ChatCompletionMessageParam } from "@/lib/openai-types";

/**
 * Decode a `data:<mime>;base64,<...>` URL into its mime + base64 payload.
 * Returns null if the input isn't a base64 data URL.
 */
function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;,]+);base64,(.*)$/i.exec(url);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/**
 * Convert a single OpenAI ChatCompletion message into a Vertex AI `Content`.
 * Tool / tool_call messages are flattened to text since Phase 1 does not use
 * function calling.
 */
function toVertexContent(message: ChatCompletionMessageParam): Content | null {
  if (message.role === "system" || message.role === "developer") {
    // System instructions are handled separately via `systemInstruction`.
    return null;
  }

  if (message.role === "tool") {
    return {
      role: "user",
      parts: [
        {
          text: `Tool result:\n${
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content)
          }`,
        },
      ],
    };
  }

  const role: "user" | "model" = message.role === "assistant" ? "model" : "user";

  if (typeof message.content === "string") {
    if (message.content.length === 0) return null;
    return { role, parts: [{ text: message.content }] };
  }

  if (!Array.isArray(message.content)) {
    return { role, parts: [{ text: "" }] };
  }

  const parts: Part[] = [];
  for (const part of message.content) {
    if (!part) continue;
    if (part.type === "text") {
      if (part.text) parts.push({ text: part.text });
      continue;
    }
    if (part.type === "image_url") {
      const url = typeof part.image_url === "string" ? part.image_url : part.image_url?.url;
      if (!url) continue;
      const decoded = parseDataUrl(url);
      if (decoded) {
        parts.push({ inlineData: { mimeType: decoded.mimeType, data: decoded.data } });
      } else {
        parts.push({ fileData: { mimeType: "image/jpeg", fileUri: url } });
      }
      continue;
    }
    // Anything else: stringify as a fallback so we don't drop context silently
    if ("text" in part && typeof (part as { text?: unknown }).text === "string") {
      parts.push({ text: (part as { text: string }).text });
    }
  }

  if (parts.length === 0) return null;
  return { role, parts };
}

export interface VertexConversionResult {
  contents: Content[];
  /** System messages collected from the OpenAI-format payload, joined with line breaks. */
  systemSuffix: string;
}

export function openAIToVertexMessages(
  messages: ChatCompletionMessageParam[],
): VertexConversionResult {
  const systemBlobs: string[] = [];
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "developer") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content
                .map((c: { text?: string }) =>
                  "text" in c ? c.text || "" : "",
                )
                .join("")
            : "";
      if (text.trim().length > 0) systemBlobs.push(text);
      continue;
    }
    const content = toVertexContent(msg);
    if (content) contents.push(content);
  }

  // Vertex AI requires the conversation to begin with a `user` content block.
  while (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  return { contents, systemSuffix: systemBlobs.join("\n\n") };
}

// ────────────────────────────────────────────────────────────────────────────
// Vertex AI streaming → OpenAI-compatible SSE chunks
// ────────────────────────────────────────────────────────────────────────────

interface VertexStreamPart {
  text?: string;
}

interface VertexStreamCandidate {
  content?: { parts?: VertexStreamPart[] };
  finishReason?: string;
}

interface VertexStreamChunk {
  candidates?: VertexStreamCandidate[];
}

interface VertexStream {
  stream: AsyncIterable<VertexStreamChunk>;
}

/**
 * Wrap a Vertex generateContentStream response into a ReadableStream of
 * OpenAI-format Server-Sent Events. The output is consumable by
 * `openAIAdapter()` from `@openuidev/react-headless`.
 */
export function vertexStreamToSSE(
  stream: VertexStream,
  options: { abortSignal?: AbortSignal } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let closed = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          /* already closed */
        }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const id = `chatcmpl-${cryptoRandom()}`;
      const created = Math.floor(Date.now() / 1000);
      const baseChunk = (delta: object, finishReason: string | null = null) => ({
        id,
        object: "chat.completion.chunk",
        created,
        model: process.env.VERTEX_MODEL || "gemini-2.5-pro",
        choices: [
          {
            index: 0,
            delta,
            finish_reason: finishReason,
          },
        ],
      });

      const sendDelta = (delta: object, finishReason: string | null = null) => {
        const payload = `data: ${JSON.stringify(baseChunk(delta, finishReason))}\n\n`;
        safeEnqueue(encoder.encode(payload));
      };

      try {
        // Initial role chunk
        sendDelta({ role: "assistant", content: "" });

        for await (const chunk of stream.stream) {
          if (options.abortSignal?.aborted) break;
          const parts = chunk.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (typeof part?.text === "string" && part.text.length > 0) {
              sendDelta({ content: part.text });
            }
          }
          const finish = chunk.candidates?.[0]?.finishReason;
          if (finish) {
            sendDelta({}, mapFinishReason(finish));
          }
        }

        safeEnqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Vertex stream error";
        console.error("[hyperanalyse] vertex stream error:", err);
        safeEnqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        safeClose();
      }
    },
    cancel() {
      closed = true;
    },
  });
}

function mapFinishReason(reason: string): string {
  switch (reason) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
      return "length";
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
      return "content_filter";
    default:
      return "stop";
  }
}

function cryptoRandom(): string {
  // crypto.randomUUID is available in modern Node and Edge runtimes
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
