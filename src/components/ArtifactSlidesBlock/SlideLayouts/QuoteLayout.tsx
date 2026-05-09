"use client";

import {
  BodyItemRenderer,
  fs,
  isLightBackground,
  sp,
  SlideFrame,
} from "./_shared";
import type { LayoutProps } from "./TitleLayout";

export function QuoteLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
  const quoteIdx = slide.body.findIndex((b) => b.type === "quote");
  const quoteItem = quoteIdx >= 0 ? slide.body[quoteIdx] : null;
  const otherItems = slide.body.filter((_, i) => i !== quoteIdx);

  return (
    <SlideFrame slide={slide} scale={scale}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: sp(scale, 18),
          padding: `${sp(scale, 24)}px ${sp(scale, 36)}px`,
        }}
      >
        {slide.title && (
          <div
            style={{
              fontSize: fs(scale, 16),
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.6,
              color: light ? "#374151" : "rgba(255,255,255,0.85)",
            }}
          >
            {slide.title}
          </div>
        )}
        {quoteItem && (
          <div style={{ maxWidth: "85%" }}>
            <BodyItemRenderer
              item={quoteItem}
              scale={scale}
              theme={theme}
              light={light}
              isThumbnail={isThumbnail}
              hideCharts
            />
          </div>
        )}
        {otherItems.map((item, idx) => (
          <div key={idx} style={{ maxWidth: "85%" }}>
            <BodyItemRenderer
              item={item}
              scale={scale}
              theme={theme}
              light={light}
              isThumbnail={isThumbnail}
              hideCharts={isThumbnail}
            />
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}
