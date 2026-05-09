"use client";

import {
  BodyItemRenderer,
  isLightBackground,
  sp,
  SlideFrame,
  SlideHeading,
  SlideSubtitle,
} from "./_shared";
import type { LayoutProps } from "./TitleLayout";

export function TwoColLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
  // Split body items in half — first half left, second half right.
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
          gridTemplateColumns: "1fr 1fr",
          gap: sp(scale, 24),
          minHeight: 0,
        }}
      >
        <Column
          items={left}
          scale={scale}
          theme={theme}
          light={light}
          isThumbnail={isThumbnail}
        />
        <Column
          items={right.length > 0 ? right : left}
          scale={scale}
          theme={theme}
          light={light}
          isThumbnail={isThumbnail}
        />
      </div>
    </SlideFrame>
  );
}

interface ColumnProps {
  items: LayoutProps["slide"]["body"];
  scale: number;
  theme: LayoutProps["theme"];
  light: boolean;
  isThumbnail?: boolean;
}

function Column({ items, scale, theme, light, isThumbnail }: ColumnProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sp(scale, 10),
        minWidth: 0,
        minHeight: 0,
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
