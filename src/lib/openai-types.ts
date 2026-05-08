/**
 * Minimal OpenAI Chat Completion message types — copies just enough surface
 * for HyperAnalyse to consume payloads from `openAIMessageFormat.toApi(...)`
 * without pulling the full `openai` SDK as a dependency.
 *
 * Source of truth: openai/resources/chat/completions in the official SDK.
 */

export interface ChatCompletionContentPartText {
  type: "text";
  text: string;
}

export interface ChatCompletionContentPartImage {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" } | string;
}

export type ChatCompletionContentPart =
  | ChatCompletionContentPartText
  | ChatCompletionContentPartImage;

export interface ChatCompletionSystemMessageParam {
  role: "system";
  content: string | Array<ChatCompletionContentPartText>;
  name?: string;
}

export interface ChatCompletionDeveloperMessageParam {
  role: "developer";
  content: string | Array<ChatCompletionContentPartText>;
  name?: string;
}

export interface ChatCompletionUserMessageParam {
  role: "user";
  content: string | Array<ChatCompletionContentPart>;
  name?: string;
}

export interface ChatCompletionAssistantMessageParam {
  role: "assistant";
  content?: string | Array<ChatCompletionContentPartText> | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ChatCompletionToolMessageParam {
  role: "tool";
  content: string | Array<ChatCompletionContentPartText>;
  tool_call_id: string;
}

export type ChatCompletionMessageParam =
  | ChatCompletionSystemMessageParam
  | ChatCompletionDeveloperMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam;
