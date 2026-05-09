"use client";

import type { Slide, SlideTheme } from "../schema";
import {
  fs,
  isLightBackground,
  SlideFrame,
} from "./_shared";

export interface LayoutProps {
  slide: Slide;
  theme: SlideTheme;
  scale?: number;
  /** When true, hide expensive children (e.g. live charts replaced by stylised
   * placeholders). Used by very small thumbnails. */
  isThumbnail?: boolean;
}

export function TitleLayout({ slide, scale = 1, isThumbnail }: LayoutProps) {
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
          gap: fs(scale, 12),
          padding: fs(scale, 24),
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: fs(scale, isThumbnail ? 36 : 56),
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: light ? "#0f172a" : "#ffffff",
          }}
        >
          {slide.title ?? "Untitled"}
        </h1>
        {slide.subtitle && (
          <div
            style={{
              fontSize: fs(scale, isThumbnail ? 18 : 24),
              fontWeight: 500,
              maxWidth: "70%",
              opacity: light ? 0.8 : 0.9,
              color: light ? "#374151" : "rgba(255,255,255,0.92)",
              lineHeight: 1.35,
            }}
          >
            {slide.subtitle}
          </div>
        )}
      </div>
    </SlideFrame>
  );
}
