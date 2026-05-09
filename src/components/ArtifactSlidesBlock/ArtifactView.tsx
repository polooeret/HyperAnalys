"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SlideRenderer } from "./SlideLayouts";
import type { Slide, SlideTransition, StoredSlidesArtifact } from "./schema";
import { useSlidesArtifact } from "./useSlidesArtifact";

export interface ArtifactViewProps {
  artifactId: string;
  version: string;
  title: string;
}

const SLIDE_CANVAS_W = 1280;

// Transition variants applied to the active slide.
const transitionVariants: Record<SlideTransition, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-left": {
    initial: { x: 80, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 },
  },
  "slide-up": {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -50, opacity: 0 },
  },
  zoom: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
  },
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 },
  },
};

export function ArtifactView({
  artifactId,
  version,
  title,
}: ArtifactViewProps) {
  const { data, isLoading, error, reload } = useSlidesArtifact(artifactId, version);
  const [index, setIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the LLM-provided title as a fallback while the artifact is still
  // loading so the toolbar and export filename are never blank.
  const displayTitle = data?.title || title;

  const slides = data?.slides ?? [];
  const total = slides.length;
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const currentSlide = total > 0 ? slides[safeIndex] : null;

  const next = useCallback(() => {
    setIndex((i) => (total > 0 ? Math.min(i + 1, total - 1) : 0));
  }, [total]);
  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);
  const first = useCallback(() => setIndex(0), []);
  const last = useCallback(() => {
    setIndex(Math.max(0, total - 1));
  }, [total]);

  const togglePresent = useCallback(async () => {
    if (typeof document === "undefined") return;
    const target = containerRef.current ?? document.documentElement;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
      setIsPresenting(false);
      return;
    }
    try {
      await target.requestFullscreen();
      setIsPresenting(true);
    } catch (err) {
      console.warn("Couldn't enter fullscreen:", err);
    }
  }, []);

  // Keep `isPresenting` in sync with the actual fullscreen state (so users can
  // press Esc and our UI catches up).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => {
      setIsPresenting(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ": // Space
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          first();
          break;
        case "End":
          e.preventDefault();
          last();
          break;
        case "Escape":
          if (document.fullscreenElement) {
            void document.exitFullscreen();
            setIsPresenting(false);
          }
          break;
        case "f":
        case "F":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            void togglePresent();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, first, last, togglePresent]);

  const handleExport = useCallback(async () => {
    if (!data) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId, version }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Export failed: HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayTitle || "presentation"}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [data, artifactId, version]);

  if (isLoading && !data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 360,
          color: "var(--openui-color-text-secondary, rgba(0,0,0,0.6))",
          fontSize: 14,
          gap: 8,
        }}
      >
        <Loader2 size={16} className="animate-spin" /> Loading slides…
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ fontWeight: 700, color: "#b91c1c" }}>
          Couldn&apos;t load presentation
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>{error}</div>
        <button
          type="button"
          onClick={reload}
          style={{
            border: "1px solid rgba(127,127,127,0.3)",
            background: "transparent",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
          }}
        >
          <RotateCcw size={13} /> Retry
        </button>
      </div>
    );
  }
  if (!data || !currentSlide) {
    return (
      <div style={{ padding: 24, fontSize: 14 }}>
        This presentation has no slides yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-presenting={isPresenting ? "true" : "false"}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 480,
        background: isPresenting ? "#000" : "transparent",
      }}
    >
      {!isPresenting && (
        <Toolbar
          title={displayTitle}
          slidesCount={total}
          activeIndex={safeIndex}
          isExporting={isExporting}
          exportError={exportError}
          onPresent={togglePresent}
          onExport={handleExport}
          onClearError={() => setExportError(null)}
        />
      )}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isPresenting ? 0 : 24,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <SlideStage
          slide={currentSlide}
          theme={data.theme}
          isPresenting={isPresenting}
        />
        <NavButton
          direction="prev"
          disabled={safeIndex === 0}
          onClick={prev}
          isPresenting={isPresenting}
        />
        <NavButton
          direction="next"
          disabled={safeIndex >= total - 1}
          onClick={next}
          isPresenting={isPresenting}
        />
      </div>
      {!isPresenting && (
        <ThumbnailStrip
          slides={slides}
          activeIndex={safeIndex}
          theme={data.theme}
          onSelect={setIndex}
        />
      )}
      {isPresenting && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 24,
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            pointerEvents: "none",
          }}
        >
          {safeIndex + 1} / {total} · Esc to exit
        </div>
      )}
    </div>
  );
}

interface ToolbarProps {
  title: string;
  slidesCount: number;
  activeIndex: number;
  isExporting: boolean;
  exportError: string | null;
  onPresent: () => void;
  onExport: () => void;
  onClearError: () => void;
}

function Toolbar({
  title,
  slidesCount,
  activeIndex,
  isExporting,
  exportError,
  onPresent,
  onExport,
  onClearError,
}: ToolbarProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 18px",
        borderBottom: "1px solid var(--openui-color-border, rgba(0,0,0,0.08))",
        background: "var(--openui-color-surface, #ffffff)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          flex: 1,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--hyperanalyse-gradient)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          HA
        </span>
        <div style={{ minWidth: 0 }}>
          <div
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
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--openui-color-text-secondary, rgba(0,0,0,0.6))",
            }}
          >
            Slide {activeIndex + 1} of {slidesCount}
          </div>
        </div>
      </div>
      {exportError && (
        <button
          type="button"
          onClick={onClearError}
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#b91c1c",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
          title="Dismiss"
        >
          {exportError}
        </button>
      )}
      <button
        type="button"
        onClick={onPresent}
        style={toolbarButton}
        title="Present (F)"
      >
        <Play size={13} /> Present
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={isExporting}
        style={{
          ...toolbarButton,
          background: isExporting
            ? "rgba(127,127,127,0.2)"
            : "var(--hyperanalyse-gradient)",
          color: "#fff",
          border: "none",
          opacity: isExporting ? 0.7 : 1,
          cursor: isExporting ? "wait" : "pointer",
        }}
      >
        {isExporting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        {isExporting ? "Exporting…" : "Export PPTX"}
      </button>
    </div>
  );
}

const toolbarButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(127,127,127,0.3)",
  background: "transparent",
  color: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

interface SlideStageProps {
  slide: Slide;
  theme: StoredSlidesArtifact["theme"];
  isPresenting: boolean;
}

function SlideStage({ slide, theme, isPresenting }: SlideStageProps) {
  const variants = transitionVariants[slide.transition] ?? transitionVariants.fade;
  return (
    <div
      style={{
        position: "relative",
        width: isPresenting ? "min(100vw, 1920px)" : "min(100%, 1280px)",
        maxHeight: "100%",
        aspectRatio: "16 / 9",
        perspective: 1400,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
          }}
        >
          <StaggeredSlide slide={slide} theme={theme} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StaggeredSlide({
  slide,
  theme,
}: {
  slide: Slide;
  theme: StoredSlidesArtifact["theme"];
}) {
  // We render the layout once at canvas size and let CSS scale it via aspect
  // ratio. The staggered children effect would require tearing each layout
  // apart; we cover it by slightly delaying the parent fade-in so children
  // appear sequentially via their own layout ordering.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.08 },
      }}
      style={{
        width: "100%",
        height: "100%",
        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
        borderRadius: 12,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <SlideRenderer slide={slide} theme={theme} scale={1} />
    </motion.div>
  );
}

interface NavButtonProps {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  isPresenting: boolean;
}

function NavButton({ direction, disabled, onClick, isPresenting }: NavButtonProps) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "Previous slide" : "Next slide"}
      style={{
        position: "absolute",
        top: "50%",
        [isPrev ? "left" : "right"]: isPresenting ? 16 : 28,
        transform: "translateY(-50%)",
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "1px solid rgba(127,127,127,0.3)",
        background: isPresenting
          ? "rgba(0,0,0,0.4)"
          : "var(--openui-color-surface, #ffffff)",
        color: isPresenting ? "#fff" : "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
        transition: "transform 120ms ease",
      }}
    >
      {isPrev ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}

interface ThumbnailStripProps {
  slides: Slide[];
  activeIndex: number;
  theme: StoredSlidesArtifact["theme"];
  onSelect: (i: number) => void;
}

const STRIP_THUMB_W = 168;
const STRIP_THUMB_H = Math.round((STRIP_THUMB_W * 9) / 16);
const STRIP_SCALE = STRIP_THUMB_W / SLIDE_CANVAS_W;

function ThumbnailStrip({
  slides,
  activeIndex,
  theme,
  onSelect,
}: ThumbnailStripProps) {
  return (
    <div
      className="hyperanalyse-thumb-strip"
      style={{
        display: "flex",
        gap: 8,
        padding: "10px 16px 14px",
        overflowX: "auto",
        borderTop: "1px solid var(--openui-color-border, rgba(0,0,0,0.08))",
        background:
          "linear-gradient(180deg, rgba(127,127,127,0.04), rgba(127,127,127,0))",
        flexShrink: 0,
      }}
    >
      {slides.map((slide, idx) => {
        const isActive = idx === activeIndex;
        return (
          <button
            key={slide.id ?? idx}
            type="button"
            onClick={() => onSelect(idx)}
            aria-label={`Jump to slide ${idx + 1}`}
            style={{
              position: "relative",
              flexShrink: 0,
              width: STRIP_THUMB_W,
              height: STRIP_THUMB_H,
              borderRadius: 8,
              overflow: "hidden",
              border: isActive
                ? "2px solid #8b5cf6"
                : "1px solid rgba(127,127,127,0.25)",
              boxShadow: isActive
                ? "0 0 0 2px rgba(139,92,246,0.25)"
                : undefined,
              padding: 0,
              background: "rgba(0,0,0,0.04)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: SLIDE_CANVAS_W,
                height: 720,
                transform: `scale(${STRIP_SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <SlideRenderer slide={slide} theme={theme} scale={1} isThumbnail />
            </div>
            <span
              style={{
                position: "absolute",
                left: 6,
                bottom: 6,
                padding: "2px 6px",
                borderRadius: 6,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {idx + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

