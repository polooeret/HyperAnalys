"use client";

import {
  BodyItemRenderer,
  fs,
  isLightBackground,
  sp,
  SlideFrame,
  SlideHeading,
  SlideSubtitle,
} from "./_shared";
import type { LayoutProps } from "./TitleLayout";

/**
 * Comparison layout: same as TwoCol but with a vertical divider and column
 * captions taken from the first body text item per side (if present).
 */
export function ComparisonLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
  const half = Math.ceil(slide.body.length / 2);
  const left = slide.body.slice(0, Math.max(half, 1));
  const right = slide.body.slice(Math.max(half, 1));
  return (
    <SlideFrame slide={slide} scale={scale}>
      <SlideHeading text={slide.title} scale={scale} light={light} />
      <SlideSubtitle text={slide.subtitle} scale={scale} light={light} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: sp(scale, 20),
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        <Side
          items={left}
          scale={scale}
          theme={theme}
          light={light}
          isThumbnail={isThumbnail}
          accent={theme.primaryColor}
        />
        <div
          style={{
            width: 1,
            background: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.25)",
          }}
        />
        <Side
          items={right.length > 0 ? right : left}
          scale={scale}
          theme={theme}
          light={light}
          isThumbnail={isThumbnail}
          accent={theme.accentColor}
        />
      </div>
    </SlideFrame>
  );
}

interface SideProps {
  items: LayoutProps["slide"]["body"];
  scale: number;
  theme: LayoutProps["theme"];
  light: boolean;
  isThumbnail?: boolean;
  accent: string;
}

function Side({ items, scale, theme, light, isThumbnail, accent }: SideProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(scale, 10),
        minWidth: 0,
        minHeight: 0,
        paddingTop: sp(scale, 4),
        borderTop: `${sp(scale, 3)}px solid ${accent}`,
        fontSize: fs(scale, 16),
      }}
    >
      {items.map((item, idx) => (
        <BodyItemRenderer
          key={idx}
          item={item}
          scale={scale}
          theme={theme}
          light={light}
          isThumbnail={isThumbnail}
          hideCharts={isThumbnail}
        />
      ))}
    </div>
  );
}
