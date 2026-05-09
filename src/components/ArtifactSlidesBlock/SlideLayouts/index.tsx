"use client";

import type { Slide, SlideTheme } from "../schema";
import { BulletsLayout } from "./BulletsLayout";
import { ChartLayout } from "./ChartLayout";
import { ClosingLayout } from "./ClosingLayout";
import { ComparisonLayout } from "./ComparisonLayout";
import { ImageLayout } from "./ImageLayout";
import { QuoteLayout } from "./QuoteLayout";
import { TitleLayout } from "./TitleLayout";
import { TwoColLayout } from "./TwoColLayout";

export {
  BulletsLayout,
  ChartLayout,
  ClosingLayout,
  ComparisonLayout,
  ImageLayout,
  QuoteLayout,
  TitleLayout,
  TwoColLayout,
};

export interface SlideRendererProps {
  slide: Slide;
  theme: SlideTheme;
  scale?: number;
  isThumbnail?: boolean;
}

export function SlideRenderer(props: SlideRendererProps) {
  switch (props.slide.layout) {
    case "title":
      return <TitleLayout {...props} />;
    case "bullets":
      return <BulletsLayout {...props} />;
    case "two-col":
      return <TwoColLayout {...props} />;
    case "chart":
      return <ChartLayout {...props} />;
    case "image":
      return <ImageLayout {...props} />;
    case "quote":
      return <QuoteLayout {...props} />;
    case "comparison":
      return <ComparisonLayout {...props} />;
    case "closing":
      return <ClosingLayout {...props} />;
    default:
      return <BulletsLayout {...props} />;
  }
}
