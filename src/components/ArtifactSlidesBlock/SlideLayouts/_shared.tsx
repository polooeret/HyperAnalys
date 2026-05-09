"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  TextCallout,
} from "@openuidev/react-ui";

import type { BodyItem, Slide, SlideTheme } from "../schema";

// ── Background helpers ───────────────────────────────────────────────────────

export function getBackgroundStyle(
  background: Slide["background"],
): CSSProperties {
  switch (background) {
    case "gradient-violet":
      return {
        background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
        color: "#ffffff",
      };
    case "gradient-cyan":
      return {
        background: "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)",
        color: "#ffffff",
      };
    case "dark":
      return { background: "#0b0b12", color: "#f5f5f7" };
    case "light":
      return { background: "#fafafa", color: "#0b0b12" };
    case "solid":
    default:
      return { background: "#ffffff", color: "#111827" };
  }
}

export function isLightBackground(background: Slide["background"]): boolean {
  return background === "solid" || background === "light";
}

// ── Scale helpers ────────────────────────────────────────────────────────────

export const fs = (scale: number, base: number): number => Math.max(base * scale, 6);
export const sp = (scale: number, base: number): number => Math.max(base * scale, 2);

// ── Slide frame ──────────────────────────────────────────────────────────────

interface SlideFrameProps {
  slide: Slide;
  scale: number;
  children: ReactNode;
  className?: string;
}

export function SlideFrame({ slide, scale, children, className }: SlideFrameProps) {
  const bgStyle = getBackgroundStyle(slide.background);
  return (
    <div
      className={`hyperanalyse-slide-frame ${className ?? ""}`.trim()}
      style={{
        ...bgStyle,
        width: "100%",
        aspectRatio: "16 / 9",
        position: "relative",
        overflow: "hidden",
        borderRadius: sp(scale, 12),
        padding: sp(scale, 36),
        display: "flex",
        flexDirection: "column",
        gap: sp(scale, 12),
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

// ── Slide title ──────────────────────────────────────────────────────────────

interface SlideHeadingProps {
  text?: string;
  scale: number;
  light: boolean;
  size?: "h1" | "h2" | "h3";
}

export function SlideHeading({ text, scale, light, size = "h2" }: SlideHeadingProps) {
  if (!text) return null;
  const baseSize = size === "h1" ? 56 : size === "h3" ? 24 : 32;
  return (
    <h2
      style={{
        margin: 0,
        fontSize: fs(scale, baseSize),
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        color: light ? "#111827" : "#ffffff",
      }}
    >
      {text}
    </h2>
  );
}

interface SlideSubtitleProps {
  text?: string;
  scale: number;
  light: boolean;
}

export function SlideSubtitle({ text, scale, light }: SlideSubtitleProps) {
  if (!text) return null;
  return (
    <div
      style={{
        margin: 0,
        fontSize: fs(scale, 18),
        fontWeight: 500,
        lineHeight: 1.3,
        color: light ? "#374151" : "rgba(255,255,255,0.85)",
      }}
    >
      {text}
    </div>
  );
}

// ── Body item renderer ───────────────────────────────────────────────────────

interface BodyItemRendererProps {
  item: BodyItem;
  scale: number;
  theme: SlideTheme;
  light: boolean;
  isThumbnail?: boolean;
  hideCharts?: boolean;
}

export function BodyItemRenderer({
  item,
  scale,
  theme,
  light,
  isThumbnail = false,
  hideCharts = false,
}: BodyItemRendererProps) {
  switch (item.type) {
    case "text":
      return <TextItem item={item} scale={scale} light={light} />;
    case "bullets":
      return (
        <BulletsItem item={item} scale={scale} light={light} />
      );
    case "chart":
      if (hideCharts) {
        return (
          <ChartPlaceholder item={item} scale={scale} light={light} theme={theme} />
        );
      }
      return (
        <ChartItem
          item={item}
          scale={scale}
          theme={theme}
          isThumbnail={isThumbnail}
        />
      );
    case "table":
      return <TableItem item={item} scale={scale} light={light} />;
    case "image":
      return <ImageItem item={item} scale={scale} />;
    case "quote":
      return <QuoteItem item={item} scale={scale} light={light} />;
    case "callout":
      return <CalloutItem item={item} scale={scale} />;
    case "kpi":
      return <KpiItem item={item} scale={scale} theme={theme} light={light} />;
    default:
      return null;
  }
}

// ── Individual body item components ──────────────────────────────────────────

function TextItem({
  item,
  scale,
  light,
}: {
  item: Extract<BodyItem, { type: "text" }>;
  scale: number;
  light: boolean;
}) {
  const sizeMap: Record<string, number> = {
    small: 14,
    default: 18,
    large: 24,
    "large-heavy": 28,
  };
  const size = sizeMap[item.size] ?? 18;
  const weight = item.size === "large-heavy" ? 700 : 500;
  return (
    <div
      style={{
        fontSize: fs(scale, size),
        fontWeight: weight,
        lineHeight: 1.45,
        color: light ? "#1f2937" : "rgba(255,255,255,0.92)",
      }}
    >
      {item.text}
    </div>
  );
}

function BulletsItem({
  item,
  scale,
  light,
}: {
  item: Extract<BodyItem, { type: "bullets" }>;
  scale: number;
  light: boolean;
}) {
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: sp(scale, 24),
        display: "flex",
        flexDirection: "column",
        gap: sp(scale, 8),
        listStyleType: "disc",
        color: light ? "#1f2937" : "rgba(255,255,255,0.92)",
      }}
    >
      {item.items.map((b, idx) => (
        <li
          key={idx}
          style={{
            fontSize: fs(scale, 18),
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {b}
        </li>
      ))}
    </ul>
  );
}

function ChartItem({
  item,
  scale,
  theme,
  isThumbnail,
}: {
  item: Extract<BodyItem, { type: "chart" }>;
  scale: number;
  theme: SlideTheme;
  isThumbnail: boolean;
}) {
  const palette = [theme.primaryColor, theme.accentColor, "#a855f7", "#0ea5e9"];
  const data = item.data ?? [];
  const sharedProps = {
    data: data,
    categoryKey: item.categoryKey ?? "label",
    customPalette: palette,
    isAnimationActive: !isThumbnail,
    legend: !isThumbnail,
    grid: !isThumbnail,
    height: Math.max(120, Math.round(280 * scale)),
    xAxisLabel: item.xAxisLabel,
    yAxisLabel: item.yAxisLabel,
    showYAxis: !isThumbnail,
  } as const;

  if (data.length === 0) {
    return null;
  }

  switch (item.chartType) {
    case "bar":
      return <BarChart {...sharedProps} />;
    case "line":
      return <LineChart {...sharedProps} />;
    case "area":
      return <AreaChart {...sharedProps} />;
    case "pie": {
      const dataKey = pickDataKey(item);
      if (!dataKey) return null;
      return (
        <PieChart
          data={data}
          categoryKey={item.categoryKey ?? "label"}
          dataKey={dataKey}
          customPalette={palette}
          isAnimationActive={!isThumbnail}
          legend={!isThumbnail}
          variant="donut"
          height={Math.max(120, Math.round(260 * scale))}
        />
      );
    }
    default:
      return null;
  }
}

function pickDataKey(item: Extract<BodyItem, { type: "chart" }>): string | null {
  const categoryKey = item.categoryKey ?? "label";
  for (const row of item.data ?? []) {
    for (const k of Object.keys(row)) {
      if (k === categoryKey) continue;
      if (typeof row[k] === "number") return k;
    }
  }
  return null;
}

function ChartPlaceholder({
  item,
  scale,
  light,
  theme,
}: {
  item: Extract<BodyItem, { type: "chart" }>;
  scale: number;
  light: boolean;
  theme: SlideTheme;
}) {
  // Lightweight stylised placeholder used in thumbnails so we never spin up
  // recharts inside a 0.15-scale preview.
  const data = item.data ?? [];
  const dataKey = pickDataKey(item);
  const numbers = dataKey
    ? data
        .map((row) => Number(row[dataKey]))
        .filter((n) => Number.isFinite(n))
    : [];
  const max = numbers.length > 0 ? Math.max(...numbers) : 1;
  return (
    <div
      style={{
        flex: 1,
        minHeight: Math.max(40, 200 * scale),
        display: "flex",
        alignItems: "flex-end",
        gap: sp(scale, 4),
        padding: sp(scale, 8),
        borderRadius: sp(scale, 6),
        background: light ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)",
      }}
    >
      {(numbers.length > 0 ? numbers : [1, 2, 3, 4]).map((n, idx) => (
        <div
          key={idx}
          style={{
            flex: 1,
            height: `${Math.max(8, (n / max) * 100)}%`,
            background:
              idx % 2 === 0 ? theme.primaryColor : theme.accentColor,
            borderRadius: sp(scale, 2),
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

function TableItem({
  item,
  scale,
  light,
}: {
  item: Extract<BodyItem, { type: "table" }>;
  scale: number;
  light: boolean;
}) {
  const headerBg = light ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.12)";
  const borderColor = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.18)";
  const text = light ? "#1f2937" : "rgba(255,255,255,0.92)";
  return (
    <div
      style={{ overflow: "hidden", borderRadius: sp(scale, 8), border: `1px solid ${borderColor}` }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: fs(scale, 14),
          color: text,
        }}
      >
        <thead style={{ background: headerBg }}>
          <tr>
            {item.columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: "left",
                  padding: `${sp(scale, 8)}px ${sp(scale, 12)}px`,
                  fontWeight: 700,
                  borderBottom: `1px solid ${borderColor}`,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {item.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {item.columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: `${sp(scale, 6)}px ${sp(scale, 12)}px`,
                    borderTop: rowIdx === 0 ? "none" : `1px solid ${borderColor}`,
                  }}
                >
                  {String(row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImageItem({
  item,
  scale,
}: {
  item: Extract<BodyItem, { type: "image" }>;
  scale: number;
}) {
  return (
    <figure
      style={{
        margin: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: sp(scale, 6),
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: sp(scale, 8),
          overflow: "hidden",
          background: "rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.src}
          alt={item.alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {item.caption && (
        <figcaption
          style={{
            fontSize: fs(scale, 12),
            opacity: 0.7,
            margin: 0,
          }}
        >
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}

function QuoteItem({
  item,
  scale,
  light,
}: {
  item: Extract<BodyItem, { type: "quote" }>;
  scale: number;
  light: boolean;
}) {
  return (
    <blockquote
      style={{
        margin: 0,
        padding: `${sp(scale, 8)}px 0`,
        borderLeft: `${sp(scale, 4)}px solid ${
          light ? "#8b5cf6" : "rgba(255,255,255,0.6)"
        }`,
        paddingLeft: sp(scale, 16),
        fontSize: fs(scale, 26),
        fontStyle: "italic",
        fontWeight: 500,
        lineHeight: 1.35,
        color: light ? "#1f2937" : "rgba(255,255,255,0.95)",
      }}
    >
      {`“${item.text}”`}
      {item.attribution && (
        <footer
          style={{
            marginTop: sp(scale, 8),
            fontSize: fs(scale, 14),
            fontStyle: "normal",
            fontWeight: 600,
            opacity: 0.75,
          }}
        >
          — {item.attribution}
        </footer>
      )}
    </blockquote>
  );
}

function CalloutItem({
  item,
  scale,
}: {
  item: Extract<BodyItem, { type: "callout" }>;
  scale: number;
}) {
  return (
    <div style={{ fontSize: fs(scale, 14) }}>
      <TextCallout
        variant={item.variant}
        title={item.title}
        description={item.description}
      />
    </div>
  );
}

function KpiItem({
  item,
  scale,
  theme,
  light,
}: {
  item: Extract<BodyItem, { type: "kpi" }>;
  scale: number;
  theme: SlideTheme;
  light: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(item.items.length, 4)}, minmax(0, 1fr))`,
        gap: sp(scale, 12),
      }}
    >
      {item.items.map((kpi, idx) => (
        <div
          key={idx}
          style={{
            padding: sp(scale, 14),
            borderRadius: sp(scale, 10),
            background: light ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.10)",
            border: `1px solid ${
              light ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.18)"
            }`,
            display: "flex",
            flexDirection: "column",
            gap: sp(scale, 4),
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: fs(scale, 12),
              fontWeight: 600,
              opacity: 0.65,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {kpi.label}
          </div>
          <div
            style={{
              fontSize: fs(scale, 28),
              fontWeight: 700,
              color: light ? theme.primaryColor : "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            {kpi.value}
          </div>
          {kpi.delta && (
            <div
              style={{
                fontSize: fs(scale, 12),
                fontWeight: 600,
                color: kpi.delta.trim().startsWith("-")
                  ? "#ef4444"
                  : light
                    ? "#16a34a"
                    : "#86efac",
              }}
            >
              {kpi.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
