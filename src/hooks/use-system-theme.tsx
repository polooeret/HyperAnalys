"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MEDIA_QUERY = "(prefers-color-scheme: light)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MEDIA_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getClientMode(): ThemeMode {
  return window.matchMedia(MEDIA_QUERY).matches ? "light" : "dark";
}

function getServerMode(): ThemeMode {
  // HyperAnalyse defaults to dark on the server / first paint to match the brand aesthetic.
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore<ThemeMode>(subscribe, getClientMode, getServerMode);

  useEffect(() => {
    document.body.setAttribute("data-theme", mode);
  }, [mode]);

  return <ThemeContext.Provider value={{ mode }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeMode {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx.mode;
}
