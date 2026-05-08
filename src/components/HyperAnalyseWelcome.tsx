"use client";

import { Sparkles } from "lucide-react";

/**
 * HyperAnalyse-branded welcome card. Rendered inside the OpenUI WelcomeScreen
 * shell when the conversation is empty.
 */
export function HyperAnalyseWelcome() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        textAlign: "center",
        padding: "24px 16px",
      }}
    >
      <span className="hyperanalyse-welcome-logo">
        <Sparkles size={20} />
      </span>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
        Welcome to{" "}
        <span className="hyperanalyse-welcome-title">HyperAnalyse</span>
      </div>
      <div
        style={{
          maxWidth: 560,
          color: "var(--openui-color-text-secondary, rgba(0,0,0,0.6))",
          fontSize: 15,
          lineHeight: 1.5,
        }}
      >
        A generative UI workspace powered by OpenUI Lang + Google Vertex AI.
        Drop a file or pick a starter — HyperAnalyse will respond with charts,
        dashboards, and tables instead of walls of text.
      </div>
    </div>
  );
}
