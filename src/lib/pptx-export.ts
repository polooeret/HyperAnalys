import "server-only";

import pptxgen from "pptxgenjs";

import type {
  BodyItem,
  Slide,
  SlideTheme,
} from "@/components/ArtifactSlidesBlock/schema";

// LAYOUT_WIDE = 13.333" × 7.5"
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN = 0.5;
const TITLE_TOP = 0.4;
const TITLE_HEIGHT = 0.85;
const BODY_TOP = TITLE_TOP + TITLE_HEIGHT + 0.15;
const BODY_AVAILABLE_HEIGHT = SLIDE_H - BODY_TOP - MARGIN;

interface BuildPptxArgs {
  slides: Slide[];
  title: string;
  theme: SlideTheme;
}

/**
 * Convert the structured slide JSON into a `.pptx` file using pptxgenjs's
 * native primitives. Returns a Node Buffer suitable for shipping over an
 * HTTP response.
 */
export async function buildPptxBuffer({
  slides,
  title,
  theme,
}: BuildPptxArgs): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  pptx.author = "HyperAnalyse";
  pptx.company = "HyperAnalyse";

  for (const slide of slides) {
    const pSlide = pptx.addSlide();
    const bg = backgroundForPptx(slide.background, theme);
    pSlide.background = bg.background;
    const lightBg = bg.isLight;

    if (slide.layout === "title") {
      writeTitleSlide(pSlide, slide, theme, lightBg);
    } else if (slide.layout === "closing") {
      writeClosingSlide(pSlide, slide, theme, lightBg);
    } else {
      writeStandardSlide(pSlide, slide, theme, lightBg);
    }

    if (slide.speakerNotes) {
      pSlide.addNotes(slide.speakerNotes);
    }
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  if (out instanceof Buffer) {
    return out;
  }
  if (out instanceof Uint8Array) {
    return Buffer.from(out);
  }
  if (typeof out === "string") {
    return Buffer.from(out);
  }
  if (out instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(out));
  }
  throw new Error("Unexpected pptxgenjs output type");
}

// ── Slide writers ─────────────────────────────────────────────────────────────

function writeTitleSlide(
  pSlide: pptxgen.Slide,
  slide: Slide,
  theme: SlideTheme,
  lightBg: boolean,
) {
  const titleColor = lightBg ? stripHash(theme.primaryColor) : "FFFFFF";
  const subtitleColor = lightBg ? "374151" : "FFFFFFCC";
  pSlide.addText(slide.title ?? "Untitled", {
    x: MARGIN,
    y: SLIDE_H / 2 - 1.2,
    w: SLIDE_W - MARGIN * 2,
    h: 1.2,
    fontSize: 48,
    bold: true,
    color: titleColor,
    align: "center",
    valign: "middle",
    fontFace: "Calibri",
  });
  if (slide.subtitle) {
    pSlide.addText(slide.subtitle, {
      x: MARGIN,
      y: SLIDE_H / 2 + 0.1,
      w: SLIDE_W - MARGIN * 2,
      h: 0.8,
      fontSize: 22,
      color: subtitleColor,
      align: "center",
      valign: "middle",
      fontFace: "Calibri",
    });
  }
}

function writeClosingSlide(
  pSlide: pptxgen.Slide,
  slide: Slide,
  theme: SlideTheme,
  lightBg: boolean,
) {
  const titleColor = lightBg ? stripHash(theme.primaryColor) : "FFFFFF";
  pSlide.addText("THANK YOU", {
    x: MARGIN,
    y: 2.4,
    w: SLIDE_W - MARGIN * 2,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: lightBg ? "6B7280" : "FFFFFFAA",
    charSpacing: 4,
    align: "center",
  });
  pSlide.addText(slide.title ?? "Questions?", {
    x: MARGIN,
    y: 2.9,
    w: SLIDE_W - MARGIN * 2,
    h: 1.4,
    fontSize: 44,
    bold: true,
    color: titleColor,
    align: "center",
  });
  if (slide.subtitle) {
    pSlide.addText(slide.subtitle, {
      x: MARGIN,
      y: 4.4,
      w: SLIDE_W - MARGIN * 2,
      h: 0.8,
      fontSize: 20,
      color: lightBg ? "374151" : "FFFFFFDD",
      align: "center",
    });
  }
  if (slide.body.length > 0) {
    let cursor = 5.4;
    for (const item of slide.body) {
      cursor = writeBodyItem(pSlide, item, theme, lightBg, cursor, true);
    }
  }
}

function writeStandardSlide(
  pSlide: pptxgen.Slide,
  slide: Slide,
  theme: SlideTheme,
  lightBg: boolean,
) {
  if (slide.title) {
    pSlide.addText(slide.title, {
      x: MARGIN,
      y: TITLE_TOP,
      w: SLIDE_W - MARGIN * 2,
      h: TITLE_HEIGHT,
      fontSize: 30,
      bold: true,
      color: lightBg ? stripHash(theme.primaryColor) : "FFFFFF",
      fontFace: "Calibri",
    });
  }
  if (slide.subtitle) {
    pSlide.addText(slide.subtitle, {
      x: MARGIN,
      y: TITLE_TOP + TITLE_HEIGHT,
      w: SLIDE_W - MARGIN * 2,
      h: 0.4,
      fontSize: 16,
      color: lightBg ? "374151" : "FFFFFFCC",
      fontFace: "Calibri",
    });
  }
  let cursor = BODY_TOP;
  for (const item of slide.body) {
    cursor = writeBodyItem(pSlide, item, theme, lightBg, cursor, false);
  }
}

// ── Body item writers ─────────────────────────────────────────────────────────

function writeBodyItem(
  pSlide: pptxgen.Slide,
  item: BodyItem,
  theme: SlideTheme,
  lightBg: boolean,
  cursorY: number,
  centered: boolean,
): number {
  const x = MARGIN;
  const w = SLIDE_W - MARGIN * 2;
  const remaining = SLIDE_H - MARGIN - cursorY;
  if (remaining <= 0.3) return cursorY;

  switch (item.type) {
    case "text":
      return writeText(pSlide, item, lightBg, cursorY, x, w, remaining, centered);
    case "bullets":
      return writeBullets(pSlide, item, lightBg, cursorY, x, w, remaining);
    case "chart":
      return writeChart(pSlide, item, theme, cursorY, x, w, remaining);
    case "table":
      return writeTable(pSlide, item, lightBg, cursorY, x, w, remaining);
    case "image":
      return writeImage(pSlide, item, cursorY, x, w, remaining);
    case "quote":
      return writeQuote(pSlide, item, theme, lightBg, cursorY, x, w, remaining);
    case "callout":
      return writeCallout(pSlide, item, cursorY, x, w);
    case "kpi":
      return writeKpi(pSlide, item, theme, lightBg, cursorY, x, w);
    default:
      return cursorY;
  }
}

function writeText(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "text" }>,
  lightBg: boolean,
  y: number,
  x: number,
  w: number,
  remaining: number,
  centered: boolean,
): number {
  const sizeMap = {
    small: 12,
    default: 16,
    large: 22,
    "large-heavy": 26,
  } as const;
  const fontSize = sizeMap[item.size];
  const lineCount = wrapLineEstimate(item.text, w, fontSize);
  const h = clamp(0.35 + lineCount * (fontSize / 72) * 1.4, 0.4, remaining);
  pSlide.addText(item.text, {
    x,
    y,
    w,
    h,
    fontSize,
    bold: item.size === "large-heavy",
    color: lightBg ? "1F2937" : "FFFFFFEE",
    fontFace: "Calibri",
    align: centered ? "center" : "left",
    valign: "top",
  });
  return y + h + 0.1;
}

function writeBullets(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "bullets" }>,
  lightBg: boolean,
  y: number,
  x: number,
  w: number,
  remaining: number,
): number {
  const fontSize = 18;
  const perLine = (fontSize / 72) * 1.5;
  const lineCount = item.items.reduce(
    (acc, line) => acc + wrapLineEstimate(line, w - 0.4, fontSize),
    0,
  );
  const h = clamp(0.3 + lineCount * perLine, 0.5, remaining);
  pSlide.addText(
    item.items.map((line) => ({ text: line, options: { bullet: true } })),
    {
      x,
      y,
      w,
      h,
      fontSize,
      color: lightBg ? "1F2937" : "FFFFFFEE",
      fontFace: "Calibri",
      paraSpaceAfter: 6,
    },
  );
  return y + h + 0.15;
}

function writeChart(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "chart" }>,
  theme: SlideTheme,
  y: number,
  x: number,
  w: number,
  remaining: number,
): number {
  const data = item.data ?? [];
  if (data.length === 0) return y;
  const categoryKey = item.categoryKey || "label";
  const labels = data.map((row) => String(row[categoryKey] ?? ""));
  const seriesKeys = collectSeriesKeys(data, categoryKey);
  if (seriesKeys.length === 0) return y;

  const chartData = seriesKeys.map((key) => ({
    name: key,
    labels,
    values: data.map((row) => Number(row[key] ?? 0)),
  }));

  const h = clamp(remaining * 0.95, 2.5, remaining);

  let chartType: pptxgen.ChartType;
  switch (item.chartType) {
    case "bar":
      chartType = pptxgen.ChartType.bar;
      break;
    case "line":
      chartType = pptxgen.ChartType.line;
      break;
    case "area":
      chartType = pptxgen.ChartType.area;
      break;
    case "pie":
      chartType = pptxgen.ChartType.pie;
      break;
    default:
      chartType = pptxgen.ChartType.bar;
  }

  if (item.chartType === "pie" && seriesKeys.length > 1) {
    // Pie can only show a single series. Take the first.
    pSlide.addChart(chartType, [chartData[0]], {
      x,
      y,
      w,
      h,
      chartColors: chartPalette(theme),
      showLegend: true,
      legendPos: "b",
      showValue: false,
      showPercent: true,
      dataLabelColor: "FFFFFF",
    });
  } else {
    pSlide.addChart(chartType, chartData, {
      x,
      y,
      w,
      h,
      chartColors: chartPalette(theme),
      showLegend: true,
      legendPos: "b",
      catAxisTitle: item.xAxisLabel,
      showCatAxisTitle: !!item.xAxisLabel,
      valAxisTitle: item.yAxisLabel,
      showValAxisTitle: !!item.yAxisLabel,
      barDir: item.chartType === "bar" ? "col" : undefined,
      catAxisLabelFontSize: 10,
      valAxisLabelFontSize: 10,
    });
  }
  return y + h + 0.2;
}

function writeTable(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "table" }>,
  lightBg: boolean,
  y: number,
  x: number,
  w: number,
  remaining: number,
): number {
  if (item.columns.length === 0) return y;
  const headerColor = lightBg ? "111827" : "FFFFFF";
  const headerFill = lightBg ? "F3F4F6" : "1F2937";
  const cellColor = lightBg ? "1F2937" : "FFFFFFEE";
  const rowHeight = 0.4;
  const headerRow: pptxgen.TableCell[] = item.columns.map((c) => ({
    text: c.label,
    options: {
      bold: true,
      color: headerColor,
      fill: { color: headerFill },
      fontSize: 13,
      align: "left",
      valign: "middle",
    },
  }));
  const bodyRows: pptxgen.TableCell[][] = item.rows.map((row) =>
    item.columns.map((c) => ({
      text: String(row[c.key] ?? ""),
      options: {
        color: cellColor,
        fontSize: 12,
        align: "left",
        valign: "middle",
      },
    })),
  );
  const totalRows = bodyRows.length + 1;
  const targetHeight = clamp(rowHeight * totalRows + 0.2, 0.6, remaining);
  pSlide.addTable([headerRow, ...bodyRows], {
    x,
    y,
    w,
    h: targetHeight,
    fontFace: "Calibri",
    border: {
      type: "solid",
      pt: 0.5,
      color: lightBg ? "E5E7EB" : "FFFFFF33",
    },
    autoPage: false,
  });
  return y + targetHeight + 0.2;
}

function writeImage(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "image" }>,
  y: number,
  x: number,
  w: number,
  remaining: number,
): number {
  const h = clamp(remaining * 0.85, 1.5, remaining);
  try {
    const imgProps = item.src.startsWith("data:")
      ? { data: item.src }
      : { path: item.src };
    pSlide.addImage({
      ...imgProps,
      x,
      y,
      w,
      h,
      altText: item.alt,
      sizing: { type: "cover", w, h },
    });
  } catch (err) {
    console.warn("[hyperanalyse] failed to embed image:", err);
    pSlide.addText(item.alt || "(image unavailable)", {
      x,
      y,
      w,
      h: 0.6,
      fontSize: 14,
      color: "9CA3AF",
      italic: true,
      align: "center",
    });
    return y + 0.7;
  }
  if (item.caption) {
    const captionH = 0.35;
    pSlide.addText(item.caption, {
      x,
      y: y + h,
      w,
      h: captionH,
      fontSize: 11,
      color: "6B7280",
      italic: true,
    });
    return y + h + captionH + 0.1;
  }
  return y + h + 0.15;
}

function writeQuote(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "quote" }>,
  theme: SlideTheme,
  lightBg: boolean,
  y: number,
  x: number,
  w: number,
  remaining: number,
): number {
  const h = clamp(remaining * 0.7, 1.4, remaining);
  pSlide.addShape(pptxgen.ShapeType.rect, {
    x,
    y,
    w: 0.06,
    h,
    fill: { color: stripHash(theme.primaryColor) },
    line: { color: stripHash(theme.primaryColor) },
  });
  pSlide.addText(`“${item.text}”`, {
    x: x + 0.25,
    y,
    w: w - 0.25,
    h: h - 0.5,
    fontSize: 22,
    italic: true,
    color: lightBg ? "1F2937" : "FFFFFFEE",
    fontFace: "Calibri",
    valign: "top",
  });
  if (item.attribution) {
    pSlide.addText(`— ${item.attribution}`, {
      x: x + 0.25,
      y: y + h - 0.5,
      w: w - 0.25,
      h: 0.45,
      fontSize: 14,
      bold: true,
      color: lightBg ? "374151" : "FFFFFFCC",
      fontFace: "Calibri",
    });
  }
  return y + h + 0.2;
}

function writeCallout(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "callout" }>,
  y: number,
  x: number,
  w: number,
): number {
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    info: { bg: "EFF6FF", fg: "1E3A8A", border: "BFDBFE" },
    warning: { bg: "FEF3C7", fg: "78350F", border: "FCD34D" },
    success: { bg: "DCFCE7", fg: "065F46", border: "86EFAC" },
    danger: { bg: "FEE2E2", fg: "7F1D1D", border: "FCA5A5" },
    neutral: { bg: "F3F4F6", fg: "1F2937", border: "D1D5DB" },
  };
  const c = palette[item.variant] ?? palette.info;
  const h = 0.9;
  pSlide.addShape(pptxgen.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: c.bg },
    line: { color: c.border, width: 0.75 },
    rectRadius: 0.08,
  });
  const titlePart: pptxgen.TextProps[] = item.title
    ? [
        {
          text: `${item.title}\n`,
          options: { bold: true, fontSize: 14, color: c.fg },
        },
        {
          text: item.description,
          options: { fontSize: 12, color: c.fg },
        },
      ]
    : [
        {
          text: item.description,
          options: { bold: true, fontSize: 13, color: c.fg },
        },
      ];
  pSlide.addText(titlePart, {
    x: x + 0.2,
    y: y + 0.05,
    w: w - 0.4,
    h: h - 0.1,
    fontFace: "Calibri",
    valign: "middle",
  });
  return y + h + 0.15;
}

function writeKpi(
  pSlide: pptxgen.Slide,
  item: Extract<BodyItem, { type: "kpi" }>,
  theme: SlideTheme,
  lightBg: boolean,
  y: number,
  x: number,
  w: number,
): number {
  const items = item.items.slice(0, 4);
  if (items.length === 0) return y;
  const gap = 0.2;
  const colW = (w - gap * (items.length - 1)) / items.length;
  const h = 1.4;
  for (let i = 0; i < items.length; i += 1) {
    const kpi = items[i];
    const cx = x + i * (colW + gap);
    const tile = lightBg
      ? { fill: "F5F3FF", border: "C4B5FD", text: stripHash(theme.primaryColor) }
      : { fill: "FFFFFF22", border: "FFFFFF44", text: "FFFFFF" };
    pSlide.addShape(pptxgen.ShapeType.roundRect, {
      x: cx,
      y,
      w: colW,
      h,
      fill: { color: tile.fill },
      line: { color: tile.border, width: 0.75 },
      rectRadius: 0.1,
    });
    pSlide.addText(kpi.label.toUpperCase(), {
      x: cx + 0.15,
      y: y + 0.1,
      w: colW - 0.3,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: lightBg ? "6B7280" : "FFFFFFAA",
      charSpacing: 2,
    });
    pSlide.addText(kpi.value, {
      x: cx + 0.15,
      y: y + 0.4,
      w: colW - 0.3,
      h: 0.6,
      fontSize: 26,
      bold: true,
      color: tile.text,
    });
    if (kpi.delta) {
      const isNeg = kpi.delta.trim().startsWith("-");
      pSlide.addText(kpi.delta, {
        x: cx + 0.15,
        y: y + 1.0,
        w: colW - 0.3,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: isNeg ? "DC2626" : lightBg ? "16A34A" : "BBF7D0",
      });
    }
  }
  return y + h + 0.2;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function backgroundForPptx(
  background: Slide["background"],
  theme: SlideTheme,
): { background: { color?: string; fill?: string }; isLight: boolean } {
  switch (background) {
    case "gradient-violet":
      return {
        background: { color: stripHash(theme.primaryColor) },
        isLight: false,
      };
    case "gradient-cyan":
      return {
        background: { color: stripHash(theme.accentColor) },
        isLight: false,
      };
    case "dark":
      return { background: { color: "0B0B12" }, isLight: false };
    case "light":
      return { background: { color: "FAFAFA" }, isLight: true };
    case "solid":
    default:
      return { background: { color: "FFFFFF" }, isLight: true };
  }
}

function chartPalette(theme: SlideTheme): string[] {
  return [
    stripHash(theme.primaryColor),
    stripHash(theme.accentColor),
    "A855F7",
    "0EA5E9",
    "F97316",
    "10B981",
  ];
}

function stripHash(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

function collectSeriesKeys(
  rows: Array<Record<string, string | number>>,
  categoryKey: string,
): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (k === categoryKey) continue;
      if (typeof row[k] === "number") keys.add(k);
    }
  }
  return Array.from(keys);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function wrapLineEstimate(text: string, widthInches: number, fontSize: number): number {
  // Approximate characters per inch by font size (Calibri-ish): ~12 chars per inch at 16pt.
  const baselineCharsPerInch = 16 / fontSize * 12;
  const charsPerLine = Math.max(20, widthInches * baselineCharsPerInch);
  const explicitLines = text.split(/\r?\n/).length;
  const wrapped = Math.ceil(text.length / charsPerLine);
  return Math.max(1, Math.max(explicitLines, wrapped));
}

// Suppress unused-warning noise for BODY_AVAILABLE_HEIGHT (kept for future).
void BODY_AVAILABLE_HEIGHT;
