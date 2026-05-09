"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Presentation } from "lucide-react";
import { useEffect, useState } from "react";

import { SlideRenderer } from "./SlideLayouts";
import type { StoredSlidesArtifact } from "./schema";
import { useSlidesArtifact } from "./useSlidesArtifact";

export interface InlinePreviewProps {
  artifactId: string;
  version: string;
  title: string;
  open: () => void;
  isActive: boolean;
}

const PREVIEW_THUMB_W = 264;
const PREVIEW_THUMB_H = Math.round((PREVIEW_THUMB_W * 9) / 16);
const THUMB_SCALE = PREVIEW_THUMB_W / 1280; // canvas baseline ≈ 1280px wide

export function InlinePreview({
  artifactId,
  version,
  title,
  open,
  isActive,
}: InlinePreviewProps) {
  const { data, isLoading, error, reload } = useSlidesArtifact(artifactId, version);

  return (
    <div
      style={{
        width: "min(100%, 320px)",
        borderRadius: 14,
        padding: 1,
        background:
          "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(6,182,212,0.55))",
        boxShadow: "0 6px 22px rgba(15,23,42,0.12)",
      }}
    >
      <div
        style={{
          background: "var(--openui-color-surface, #ffffff)",
          borderRadius: 13,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <Header title={title} />
        <PreviewBody
          data={data}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
        />
        <Footer
          slidesCount={data?.slides.length ?? 0}
          isActive={isActive}
          onOpen={open}
          isLoading={isLoading}
          isError={Boolean(error)}
        />
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--hyperanalyse-gradient)",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <Presentation size={14} />
      </span>
      <span
        style={{
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "-0.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={title}
      >
        {title}
      </span>
    </div>
  );
}

interface PreviewBodyProps {
  data: StoredSlidesArtifact | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function PreviewBody({ data, isLoading, error, onRetry }: PreviewBodyProps) {
  if (isLoading && !data) {
    return <SkeletonStrip />;
  }
  if (error) {
    return (
      <div
        style={{
          width: "100%",
          height: PREVIEW_THUMB_H,
          borderRadius: 10,
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "#b91c1c",
          fontSize: 12,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <span>Couldn&apos;t load preview.</span>
        <button
          type="button"
          onClick={onRetry}
          style={{
            border: "1px solid rgba(239,68,68,0.5)",
            background: "transparent",
            color: "#b91c1c",
            borderRadius: 6,
            padding: "2px 8px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!data || data.slides.length === 0) {
    return <SkeletonStrip />;
  }
  return <ThumbnailCarousel data={data} />;
}

function SkeletonStrip() {
  return (
    <div
      style={{
        width: "100%",
        height: PREVIEW_THUMB_H,
        borderRadius: 10,
        background:
          "linear-gradient(110deg, rgba(0,0,0,0.04) 8%, rgba(0,0,0,0.08) 18%, rgba(0,0,0,0.04) 33%)",
        backgroundSize: "200% 100%",
        animation: "hyperanalyse-skeleton-shine 1.4s linear infinite",
      }}
    />
  );
}

function ThumbnailCarousel({ data }: { data: StoredSlidesArtifact }) {
  const slides = data.slides.slice(0, Math.min(3, data.slides.length));
  const [hovered, setHovered] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!hovered || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [hovered, slides.length]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setIndex(0);
      }}
      style={{
        position: "relative",
        width: "100%",
        height: PREVIEW_THUMB_H,
        borderRadius: 10,
        overflow: "hidden",
        background: "rgba(0,0,0,0.04)",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slides[index]?.id ?? index}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ScaledSlide slide={slides[index]} theme={data.theme} />
        </motion.div>
      </AnimatePresence>
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 0,
          right: 0,
          display: "flex",
          gap: 4,
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {slides.map((_, i) => (
          <span
            key={i}
            style={{
              width: 14,
              height: 3,
              borderRadius: 999,
              background:
                i === index ? "rgba(139,92,246,0.95)" : "rgba(255,255,255,0.6)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ScaledSlide({
  slide,
  theme,
}: {
  slide: StoredSlidesArtifact["slides"][number];
  theme: StoredSlidesArtifact["theme"];
}) {
  // Render the layout at full canvas size, then visually scale down so layout
  // calculations are stable.
  return (
    <div
      style={{
        width: PREVIEW_THUMB_W,
        height: PREVIEW_THUMB_H,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 1280,
          height: 720,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <SlideRenderer slide={slide} theme={theme} scale={1} isThumbnail />
      </div>
    </div>
  );
}

interface FooterProps {
  slidesCount: number;
  isActive: boolean;
  onOpen: () => void;
  isLoading: boolean;
  isError: boolean;
}

function Footer({ slidesCount, isActive, onOpen, isLoading, isError }: FooterProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: "var(--openui-color-text-secondary, rgba(0,0,0,0.6))",
          border: "1px solid rgba(127,127,127,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        {isLoading && slidesCount === 0
          ? "Loading…"
          : `${slidesCount} slide${slidesCount === 1 ? "" : "s"}`}
      </span>
      <button
        type="button"
        onClick={onOpen}
        disabled={isError}
        style={{
          background: isActive
            ? "transparent"
            : "var(--hyperanalyse-gradient, linear-gradient(135deg, #8b5cf6, #06b6d4))",
          color: isActive ? "var(--hyperanalyse-primary, #8b5cf6)" : "#fff",
          border: isActive ? "1px solid rgba(139,92,246,0.4)" : "none",
          borderRadius: 999,
          padding: "6px 12px",
          fontWeight: 600,
          fontSize: 12,
          cursor: isError ? "not-allowed" : "pointer",
          opacity: isError ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {isActive ? "✓ Viewing" : "View Presentation →"}
      </button>
    </div>
  );
}
