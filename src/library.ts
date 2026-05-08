import type { ComponentGroup, PromptOptions } from "@openuidev/react-lang";
import { createLibrary } from "@openuidev/react-lang";
import {
  openuiChatComponentGroups,
  openuiChatLibrary,
  openuiChatPromptOptions,
} from "@openuidev/react-ui/genui-lib";

// ── Component Groups — extend chat groups (Phase 1 has no custom components) ──

const hyperAnalyseComponentGroups: ComponentGroup[] = openuiChatComponentGroups;

// ── Library — all chat components (charts, tables, sections, follow-ups, etc.) ──

export const hyperAnalyseLibrary = createLibrary({
  root: "Card",
  componentGroups: hyperAnalyseComponentGroups,
  components: Object.values(openuiChatLibrary.components),
});

// ── Prompt Options — append HyperAnalyse-specific rules + examples ──

export const hyperAnalysePromptOptions: PromptOptions = {
  additionalRules: [
    ...(openuiChatPromptOptions.additionalRules ?? []),
    "Always respond with structured UI components instead of plain text paragraphs.",
    "For data, prefer charts/tables over lists when there are 3+ data points.",
    "For multi-step explanations, use Steps + SectionBlock to keep responses scannable.",
    "Use Card + CardHeader as the entry point of every response with a short title and subtitle that summarises the answer.",
    "Group related content under SectionBlock with descriptive triggers — never dump everything as a flat list.",
    "Include a FollowUpBlock at the end of every response with 3-4 relevant follow-up suggestions that drill into the next analytical step.",
    "When the user attaches a file, cite the filename in the CardHeader subtitle and reference specific data points (rows, sections, page numbers, image elements) in the visual output.",
    "Numeric comparisons should always become BarChart, LineChart, or Table — never prose.",
    "Use TextCallout (variant=info) for definitions and TextCallout (variant=warning) for caveats about the data.",
  ],
  examples: [
    ...(openuiChatPromptOptions.examples ?? []),
    `Example — Sales dashboard from a CSV upload:

root = Card([header, kpis, trend, breakdown, followUps])
header = CardHeader("Q3 sales — \\"sales-2024-q3.csv\\"", "Revenue, units, and top regions at a glance")
kpis = SectionBlock([kpiSec])
kpiSec = SectionItem("kpis", "Headline metrics", [kpiTable])
kpiTable = Table([Col("Metric", metricLabels), Col("Value", metricValues), Col("vs Q2", deltas)])
metricLabels = ["Revenue", "Units sold", "Avg deal size", "Top region"]
metricValues = ["$1.42M", "8,210", "$173", "EMEA"]
deltas = ["+12%", "+8%", "+4%", "—"]
trend = LineChart(["Jul", "Aug", "Sep"], [trendSeries], "linear", "Month", "Revenue ($k)")
trendSeries = Series("Revenue", [430, 470, 520])
breakdown = BarChart(regions, [regionSeries], "grouped", "Region", "Revenue ($k)")
regions = ["EMEA", "AMER", "APAC", "LATAM"]
regionSeries = Series("Revenue", [560, 480, 280, 100])
followUps = FollowUpBlock([fu1, fu2, fu3])
fu1 = FollowUpItem("Compare Q3 against Q3 last year")
fu2 = FollowUpItem("Show top 5 customers driving EMEA revenue")
fu3 = FollowUpItem("Forecast Q4 by region")`,
  ],
};

// ── CLI exports — `pnpm generate:prompt` looks for `library` and `promptOptions` ──

export {
  hyperAnalyseLibrary as library,
  hyperAnalysePromptOptions as promptOptions,
};
