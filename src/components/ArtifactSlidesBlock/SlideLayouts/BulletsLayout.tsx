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

export function BulletsLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
  return (
    <SlideFrame slide={slide} scale={scale}>
      <SlideHeading text={slide.title} scale={scale} light={light} />
      <SlideSubtitle text={slide.subtitle} scale={scale} light={light} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: sp(scale, 12),
          minHeight: 0,
        }}
      >
        {slide.body.map((item, idx) => (
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
    </SlideFrame>
  );
}
