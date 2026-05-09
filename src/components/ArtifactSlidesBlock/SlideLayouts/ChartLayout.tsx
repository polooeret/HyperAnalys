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

/**
 * Chart-focused layout: title up top, the first chart-type body item gets the
 * majority of the slide, additional body items render below.
 */
export function ChartLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
  const chartIdx = slide.body.findIndex((b) => b.type === "chart");
  const chartItem = chartIdx >= 0 ? slide.body[chartIdx] : null;
  const otherItems = slide.body.filter((_, i) => i !== chartIdx);
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
        {chartItem && (
          <div
            style={{
              flex: otherItems.length > 0 ? 2 : 1,
              minHeight: 0,
              display: "flex",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <BodyItemRenderer
                item={chartItem}
                scale={scale}
                theme={theme}
                light={light}
                isThumbnail={isThumbnail}
                hideCharts={isThumbnail}
              />
            </div>
          </div>
        )}
        {otherItems.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: sp(scale, 8),
              flex: 1,
              minHeight: 0,
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
