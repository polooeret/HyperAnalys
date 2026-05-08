import { VertexAI } from "@google-cloud/vertexai";
import { readFileSync } from "fs";
import { resolve } from "path";

interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  [key: string]: unknown;
}

let cachedCredentials: ServiceAccountCredentials | null = null;
let vertexClient: VertexAI | null = null;

function loadCredentials(): ServiceAccountCredentials {
  if (cachedCredentials) return cachedCredentials;

  // Priority 1: Base64-encoded JSON env var (good for serverless)
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64 && b64.trim().length > 0) {
    try {
      cachedCredentials = JSON.parse(
        Buffer.from(b64, "base64").toString("utf-8"),
      ) as ServiceAccountCredentials;
      return cachedCredentials;
    } catch (err) {
      throw new Error(
        `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // Priority 2: Filesystem path
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path && path.trim().length > 0) {
    const resolved = path.startsWith("/") ? path : resolve(process.cwd(), path);
    try {
      cachedCredentials = JSON.parse(
        readFileSync(resolved, "utf-8"),
      ) as ServiceAccountCredentials;
      return cachedCredentials;
    } catch (err) {
      throw new Error(
        `Failed to read service account JSON at ${resolved}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  throw new Error(
    "Missing Vertex AI credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path " +
      "or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 to a base64-encoded JSON string.",
  );
}

export function getVertexClient(): VertexAI {
  if (vertexClient) return vertexClient;
  const creds = loadCredentials();
  const project = process.env.GCP_PROJECT_ID || creds.project_id;
  if (!project) {
    throw new Error(
      "Missing GCP project. Set GCP_PROJECT_ID or include `project_id` in the service-account JSON.",
    );
  }
  vertexClient = new VertexAI({
    project,
    location: process.env.GCP_LOCATION || "us-central1",
    googleAuthOptions: { credentials: creds as Record<string, unknown> },
  });
  return vertexClient;
}

export interface VertexModelOptions {
  systemInstruction?: string;
}

export function getModel(options: VertexModelOptions = {}) {
  const client = getVertexClient();
  return client.getGenerativeModel({
    model: process.env.VERTEX_MODEL || "gemini-2.5-pro",
    generationConfig: {
      temperature: Number(process.env.VERTEX_TEMPERATURE ?? 0.7),
      maxOutputTokens: Number(process.env.VERTEX_MAX_TOKENS ?? 8192),
    },
    ...(options.systemInstruction
      ? {
          systemInstruction: {
            role: "system",
            parts: [{ text: options.systemInstruction }],
          },
        }
      : {}),
  });
}

export const VERTEX_MODEL_ID = process.env.VERTEX_MODEL || "gemini-2.5-pro";
