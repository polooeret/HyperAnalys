"use client";

import { openAIAdapter, openAIMessageFormat } from "@openuidev/react-headless";
import { FullScreen } from "@openuidev/react-ui";

import { FilePanelMount } from "@/components/FilePanelMount";
import { HyperAnalyseComposer } from "@/components/HyperAnalyseComposer";
import { HyperAnalyseWelcome } from "@/components/HyperAnalyseWelcome";
import { useTheme } from "@/hooks/use-system-theme";
import { hyperAnalyseLibrary } from "@/library";

const STARTERS = [
  {
    displayText: "Build a sales dashboard",
    prompt:
      "Build me a Q3 sales dashboard with KPIs, regional breakdown, and a trend line. Use sample data.",
  },
  {
    displayText: "Analyze this CSV file",
    prompt:
      "Analyze the CSV file I attached and surface the most important patterns, segments, and outliers.",
  },
  {
    displayText: "Create a project KPI board",
    prompt:
      "Generate a project KPI board for an engineering team with delivery, quality, and velocity metrics. Use sample data.",
  },
  {
    displayText: "Summarize my uploaded PDF",
    prompt:
      "Summarize the PDF I attached. Surface the executive summary, key findings, and any numerical comparisons as charts.",
  },
];

export default function HyperAnalysePage() {
  const mode = useTheme();

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      style={{ height: "100vh", width: "100vw" }}
    >
      <FullScreen
        agentName="HyperAnalyse"
        logoUrl="/logo.svg"
        theme={{ mode }}
        componentLibrary={hyperAnalyseLibrary}
        composer={HyperAnalyseComposer}
        streamProtocol={openAIAdapter()}
        messageFormat={openAIMessageFormat}
        processMessage={async ({ messages, abortController }) => {
          return fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: openAIMessageFormat.toApi(messages),
            }),
            signal: abortController.signal,
          });
        }}
        welcomeMessage={HyperAnalyseWelcome}
        conversationStarters={{
          variant: "short",
          options: STARTERS,
        }}
      />
      <FilePanelMount />
    </div>
  );
}
