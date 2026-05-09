"use client";

import { useEffect, useRef, useState } from "react";

import type { StoredSlidesArtifact } from "./schema";

interface CacheEntry {
  promise?: Promise<StoredSlidesArtifact>;
  data?: StoredSlidesArtifact;
  error?: string;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(artifactId: string, version: string): string {
  return `${artifactId}:${version}`;
}

interface FetchSlidesResult {
  artifact: StoredSlidesArtifact;
}

async function fetchArtifact(
  artifactId: string,
  version: string,
  signal?: AbortSignal,
): Promise<StoredSlidesArtifact> {
  const key = cacheKey(artifactId, version);
  const existing = cache.get(key);
  if (existing?.data) return existing.data;
  if (existing?.promise) return existing.promise;

  const promise = (async () => {
    const res = await fetch(
      `/api/artifact/${encodeURIComponent(artifactId)}?version=${encodeURIComponent(version)}`,
      { signal, cache: "no-store" },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed: ${res.status}`);
    }
    const body = (await res.json()) as FetchSlidesResult;
    if (!body?.artifact) {
      throw new Error("Artifact response was empty");
    }
    cache.set(key, { data: body.artifact });
    return body.artifact;
  })().catch((err) => {
    cache.set(key, {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });

  cache.set(key, { promise });
  return promise;
}

export interface UseSlidesArtifactState {
  data: StoredSlidesArtifact | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetches `/api/artifact/[artifactId]?version=...` and returns
 * `{ data, isLoading, error }`. Results are cached by `${artifactId}:${version}`
 * so repeated mounts (e.g. opening the artifact panel) don't re-fetch.
 */
export function useSlidesArtifact(
  artifactId: string,
  version: string,
): UseSlidesArtifactState {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<StoredSlidesArtifact | null>(() => {
    const key = cacheKey(artifactId, version);
    return cache.get(key)?.data ?? null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const key = cacheKey(artifactId, version);
    return !cache.get(key)?.data;
  });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!artifactId || !version) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    const key = cacheKey(artifactId, version);
    const cached = cache.get(key);
    if (cached?.data) {
      setData(cached.data);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    cancelRef.current?.abort();
    cancelRef.current = controller;
    fetchArtifact(artifactId, version, controller.signal)
      .then((artifact) => {
        if (controller.signal.aborted) return;
        setData(artifact);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [artifactId, version, tick]);

  return {
    data,
    isLoading,
    error,
    reload: () => {
      cache.delete(cacheKey(artifactId, version));
      setTick((t) => t + 1);
    },
  };
}
