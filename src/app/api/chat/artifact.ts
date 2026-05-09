import { nanoid } from "nanoid";

import {
  StoredSlidesArtifactSchema,
  type StoredSlidesArtifact,
} from "@/components/ArtifactSlidesBlock/schema";
import { getVertexClient } from "@/lib/vertex-client";

import { getArtifact, saveSlidesVersion } from "./messageStore";

const SLIDES_GENERATION_INSTRUCTIONS = `You are a senior presentation designer. Output ONLY a JSON object with the shape { "slides": [...] }. No prose, no markdown fences.

Each slide MUST have:
- id: unique short string (e.g. "s1", "s2", ...)
- layout: one of "title" | "bullets" | "two-col" | "chart" | "image" | "quote" | "comparison" | "closing"
- title: short headline (omit on quote/title slides if unnecessary)
- subtitle: optional, only on layout="title" or "closing"
- body: array of body items (see below)
- speakerNotes: 1-2 sentence presenter note
- transition: one of "fade" | "slide-left" | "slide-up" | "zoom" | "flip"
- background: one of "solid" | "gradient-violet" | "gradient-cyan" | "dark" | "light"

Body item types (each item is { "type": "...", ...fields }):
- { "type": "text", "text": string, "size": "small" | "default" | "large" | "large-heavy" }
- { "type": "bullets", "items": string[] }                        // 3-6 short bullets
- { "type": "chart", "chartType": "bar" | "line" | "area" | "pie",
    "categoryKey": "label",
    "data": [{ "label": "Q1", "Revenue": 120, "Cost": 70 }, ...],
    "xAxisLabel"?: string, "yAxisLabel"?: string }                 // 4-8 rows; numeric series share keys across rows
- { "type": "table", "columns": [{ "label": "Region", "key": "region" }, ...],
    "rows":    [{ "region": "EMEA", "revenue": "$12M" }, ...] }     // ≤6 columns, ≤8 rows
- { "type": "image", "src": "https://picsum.photos/seed/KEYWORD/1600/900",
    "alt": string, "caption"?: string }                              // ALWAYS use picsum.photos seeded URLs — never invent
- { "type": "quote", "text": string, "attribution"?: string }
- { "type": "callout", "variant": "info" | "warning" | "success" | "danger" | "neutral",
    "title"?: string, "description": string }
- { "type": "kpi", "items": [{ "label": "Revenue", "value": "$1.4M", "delta"?: "+12%" }, ...] }   // 2-4 KPIs

Hard rules:
- First slide MUST be layout: "title" with background "gradient-violet".
- Last slide MUST be layout: "closing" with background "gradient-cyan".
- Vary layouts — never repeat the same layout 3 slides in a row.
- Use chart/comparison/kpi/table when there is comparable data; otherwise prefer bullets/quote/image.
- Vary transitions across slides.
- Use real, plausible numbers (not "lorem ipsum" placeholders).
- Keep bullet/quote/title text concise (no walls of prose).`;

const JSON_MODEL = process.env.VERTEX_MODEL || "gemini-2.5-pro";

interface JsonModelOptions {
  prompt: string;
}

async function generateSlidesJson({ prompt }: JsonModelOptions): Promise<unknown> {
  const client = getVertexClient();
  const model = client.getGenerativeModel({
    model: JSON_MODEL,
    generationConfig: {
      temperature: Number(process.env.VERTEX_TEMPERATURE ?? 0.7),
      maxOutputTokens: Number(process.env.VERTEX_MAX_TOKENS ?? 16384),
      responseMimeType: "application/json",
    },
    systemInstruction: {
      role: "system",
      parts: [{ text: SLIDES_GENERATION_INSTRUCTIONS }],
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const raw =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Slide generator returned invalid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export interface SlidesGenerationResult {
  artifactId: string;
  version: string;
  slidesCount: number;
  title: string;
}

export async function handleCreatePresentation(args: {
  title: string;
  instructions: string;
  slideCount?: number;
}): Promise<SlidesGenerationResult> {
  const artifactId = nanoid(10);
  const version = nanoid(8);
  const target =
    typeof args.slideCount === "number" && args.slideCount > 0
      ? Math.min(20, Math.max(3, Math.round(args.slideCount)))
      : 8;

  const prompt = `Generate exactly ${target} slides for a presentation titled "${args.title}".

Instructions:
${args.instructions}

Return only { "slides": [...] }. The first slide MUST be layout "title" and the last MUST be layout "closing".`;

  const parsed = await generateSlidesJson({ prompt });
  const stored = StoredSlidesArtifactSchema.parse({
    artifactId,
    version,
    title: args.title,
    theme: {},
    slides: extractSlides(parsed),
  });
  saveSlidesVersion(stored);
  return {
    artifactId,
    version,
    slidesCount: stored.slides.length,
    title: stored.title,
  };
}

export async function handleEditPresentation(args: {
  artifactId: string;
  version?: string;
  instructions: string;
}): Promise<SlidesGenerationResult> {
  const existing = getArtifact(args.artifactId, args.version);
  if (!existing) {
    throw new Error(`Artifact ${args.artifactId} not found`);
  }
  const newVersion = nanoid(8);

  const prompt = `Here is the current presentation as JSON:
${JSON.stringify({ title: existing.title, slides: existing.slides })}

Apply this edit: ${args.instructions}

Return the COMPLETE updated { "slides": [...] } object — keep unchanged slides identical (same id and content), and only modify or add what is asked. Preserve the title slide first and closing slide last.`;

  const parsed = await generateSlidesJson({ prompt });
  const stored = StoredSlidesArtifactSchema.parse({
    artifactId: args.artifactId,
    version: newVersion,
    title: existing.title,
    subtitle: existing.subtitle,
    theme: existing.theme,
    slides: extractSlides(parsed) ?? existing.slides,
  });
  saveSlidesVersion(stored);
  return {
    artifactId: args.artifactId,
    version: newVersion,
    slidesCount: stored.slides.length,
    title: stored.title,
  };
}

function extractSlides(parsed: unknown): StoredSlidesArtifact["slides"] {
  if (parsed && typeof parsed === "object" && "slides" in parsed) {
    const slides = (parsed as { slides: unknown }).slides;
    if (Array.isArray(slides)) {
      return slides as StoredSlidesArtifact["slides"];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed as StoredSlidesArtifact["slides"];
  }
  return [];
}

// ── OpenUI Lang response builder ───────────────────────────────────────────────

export interface SlidesResponseLangArgs {
  title: string;
  artifactId: string;
  version: string;
  slidesCount: number;
  followUps: string[];
  intro?: string;
}

/**
 * Build the OpenUI Lang response that wraps the artifact for in-chat display.
 * Renderer expectations:
 *   root = Card([header, intro, deck, followUps])
 *   deck = ArtifactSlidesBlock(artifactId, version, title)
 */
export function buildSlidesResponseLang(args: SlidesResponseLangArgs): string {
  const intro =
    args.intro ??
    `Here is your presentation: "${args.title}" (${args.slidesCount} slide${
      args.slidesCount === 1 ? "" : "s"
    }). Click "View Presentation" to open the deck.`;
  const followUps =
    args.followUps.length > 0
      ? args.followUps.slice(0, 4)
      : [
          "Add a slide about competitor positioning",
          "Make the deck more concise",
          "Switch the theme to dark mode",
          "Export this as PPTX",
        ];

  const followUpLines = followUps
    .map((text, i) => `fu${i + 1} = FollowUpItem("${escapeLang(text)}")`)
    .join("\n");
  const followUpRefs = followUps.map((_, i) => `fu${i + 1}`).join(", ");

  return [
    `root = Card([header, intro, deck, followUps])`,
    `header = CardHeader("${escapeLang(args.title)}", "${escapeLang(
      `${args.slidesCount}-slide presentation generated by HyperAnalyse`,
    )}")`,
    `intro = TextContent("${escapeLang(intro)}", "default")`,
    `deck = ArtifactSlidesBlock("${escapeLang(args.artifactId)}", "${escapeLang(args.version)}", "${escapeLang(args.title)}")`,
    `followUps = FollowUpBlock([${followUpRefs}])`,
    followUpLines,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build a friendly error Card (still valid OpenUI Lang) so the route can keep
 * streaming when slide generation fails mid-flight.
 */
export function buildSlidesErrorLang(args: {
  title: string;
  message: string;
}): string {
  const safeMsg = args.message.length > 240
    ? `${args.message.slice(0, 240)}…`
    : args.message;
  return [
    `root = Card([header, callout, followUps])`,
    `header = CardHeader("${escapeLang(args.title)}", "We couldn't generate the slides")`,
    `callout = TextCallout("warning", "Slide generation failed", "${escapeLang(safeMsg)}")`,
    `followUps = FollowUpBlock([fu1, fu2])`,
    `fu1 = FollowUpItem("Try again with a simpler topic")`,
    `fu2 = FollowUpItem("Generate a 5-slide overview instead")`,
  ].join("\n");
}

function escapeLang(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}
