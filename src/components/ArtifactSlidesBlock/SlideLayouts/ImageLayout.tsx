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

export function ImageLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
  const imageIdx = slide.body.findIndex((b) => b.type === "image");
  const imageItem = imageIdx >= 0 ? slide.body[imageIdx] : null;
  const otherItems = slide.body.filter((_, i) => i !== imageIdx);

  return (
    <SlideFrame slide={slide} scale={scale}>
      <SlideHeading text={slide.title} scale={scale} light={light} />
      <SlideSubtitle text={slide.subtitle} scale={scale} light={light} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: imageItem && otherItems.length > 0 ? "1.4fr 1fr" : "1fr",
          gap: sp(scale, 20),
          minHeight: 0,
        }}
      >
        {imageItem && (
          <BodyItemRenderer
            item={imageItem}
            scale={scale}
            theme={theme}
            light={light}
            isThumbnail={isThumbnail}
            hideCharts={isThumbnail}
          />
        )}
        {otherItems.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: sp(scale, 10),
              minWidth: 0,
              fontSize: fs(scale, 16),
            }}
          >
            {otherItems.map((item, idx) => (
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
        )}
      </div>
    </SlideFrame>
  );
}
