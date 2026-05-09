"use client";

import {
  BodyItemRenderer,
  fs,
  isLightBackground,
  sp,
  SlideFrame,
} from "./_shared";
import type { LayoutProps } from "./TitleLayout";

export function ClosingLayout({
  slide,
  theme,
  scale = 1,
  isThumbnail,
}: LayoutProps) {
  const light = isLightBackground(slide.background);
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
          padding: fs(scale, 24),
        }}
      >
        <div
          style={{
            fontSize: fs(scale, isThumbnail ? 16 : 20),
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            opacity: light ? 0.6 : 0.7,
          }}
        >
          Thank you
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: fs(scale, isThumbnail ? 32 : 48),
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: light ? "#0f172a" : "#ffffff",
          }}
        >
          {slide.title ?? "Questions?"}
        </h2>
        {slide.subtitle && (
          <div
            style={{
              fontSize: fs(scale, isThumbnail ? 16 : 20),
              fontWeight: 500,
              maxWidth: "70%",
              opacity: 0.85,
              lineHeight: 1.4,
            }}
          >
            {slide.subtitle}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: sp(scale, 10),
            width: "min(85%, 720px)",
            marginTop: sp(scale, 8),
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
      </div>
    </SlideFrame>
  );
}
