import { z } from "zod";

// ── Slide-level enums ─────────────────────────────────────────────────────────

export const SlideLayoutEnum = z.enum([
  "title",
  "bullets",
  "two-col",
  "chart",
  "image",
  "quote",
  "comparison",
  "closing",
]);
export type SlideLayout = z.infer<typeof SlideLayoutEnum>;

export const SlideTransitionEnum = z.enum([
  "fade",
  "slide-left",
  "slide-up",
  "zoom",
  "flip",
]);
export type SlideTransition = z.infer<typeof SlideTransitionEnum>;

export const SlideBackgroundEnum = z.enum([
  "solid",
  "gradient-violet",
  "gradient-cyan",
  "dark",
  "light",
]);
export type SlideBackground = z.infer<typeof SlideBackgroundEnum>;

// ── Body items ────────────────────────────────────────────────────────────────

const TextSizeEnum = z.enum(["small", "default", "large", "large-heavy"]);

const ChartTypeEnum = z.enum(["bar", "line", "area", "pie"]);

const RowValueSchema = z.union([z.string(), z.number()]);

export const TextBodyItem = z.object({
  type: z.literal("text"),
  text: z.string(),
  size: TextSizeEnum.default("default"),
});

export const BulletsBodyItem = z.object({
  type: z.literal("bullets"),
  items: z.array(z.string()),
});

export const ChartBodyItem = z.object({
  type: z.literal("chart"),
  chartType: ChartTypeEnum,
  categoryKey: z.string().default("label"),
  data: z.array(z.record(z.string(), RowValueSchema)),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
});

export const TableBodyItem = z.object({
  type: z.literal("table"),
  columns: z.array(z.object({ label: z.string(), key: z.string() })),
  rows: z.array(z.record(z.string(), RowValueSchema)),
});

export const ImageBodyItem = z.object({
  type: z.literal("image"),
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

export const QuoteBodyItem = z.object({
  type: z.literal("quote"),
  text: z.string(),
  attribution: z.string().optional(),
});

export const CalloutBodyItem = z.object({
  type: z.literal("callout"),
  variant: z
    .enum(["info", "warning", "success", "danger", "neutral"])
    .default("info"),
  title: z.string().optional(),
  description: z.string(),
});

export const KpiBodyItem = z.object({
  type: z.literal("kpi"),
  items: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      delta: z.string().optional(),
    }),
  ),
});

export const BodyItem = z.discriminatedUnion("type", [
  TextBodyItem,
  BulletsBodyItem,
  ChartBodyItem,
  TableBodyItem,
  ImageBodyItem,
  QuoteBodyItem,
  CalloutBodyItem,
  KpiBodyItem,
]);
export type BodyItem = z.infer<typeof BodyItem>;

// ── Slide ─────────────────────────────────────────────────────────────────────

export const SlideSchema = z.object({
  id: z.string(),
  layout: SlideLayoutEnum,
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.array(BodyItem).default([]),
  speakerNotes: z.string().optional(),
  transition: SlideTransitionEnum.default("slide-left"),
  background: SlideBackgroundEnum.default("solid"),
});
export type Slide = z.infer<typeof SlideSchema>;

// ── Theme ─────────────────────────────────────────────────────────────────────

export const SlideThemeSchema = z.object({
  primaryColor: z.string().default("#8b5cf6"),
  accentColor: z.string().default("#06b6d4"),
  fontFamily: z.string().default("system-ui"),
});
export type SlideTheme = z.infer<typeof SlideThemeSchema>;

// ── In-chat block (only IDs — full data fetched from /api/artifact/[id]) ─────

export const ArtifactSlidesBlockSchema = z.object({
  artifactId: z.string(),
  version: z.string(),
  title: z.string(),
});
export type ArtifactSlidesBlockProps = z.infer<typeof ArtifactSlidesBlockSchema>;

// ── Server-side payload ───────────────────────────────────────────────────────

export const StoredSlidesArtifactSchema = z.object({
  artifactId: z.string(),
  version: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  theme: SlideThemeSchema.default({
    primaryColor: "#8b5cf6",
    accentColor: "#06b6d4",
    fontFamily: "system-ui",
  }),
  slides: z.array(SlideSchema),
});
export type StoredSlidesArtifact = z.infer<typeof StoredSlidesArtifactSchema>;
