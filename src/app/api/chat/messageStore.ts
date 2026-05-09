import type { StoredSlidesArtifact } from "@/components/ArtifactSlidesBlock/schema";

/**
 * In-memory artifact store, keyed by `artifactId`. Each record holds
 * a `Map<version, StoredSlidesArtifact>` plus pointer to the latest version.
 *
 * Phase 2 only — resets on server restart.
 */

interface ArtifactRecord {
  artifactId: string;
  type: "slides";
  versions: Map<string, StoredSlidesArtifact>;
  latestVersion: string;
  createdAt: number;
  updatedAt: number;
}

const store = new Map<string, ArtifactRecord>();

export function saveSlidesVersion(data: StoredSlidesArtifact): void {
  const now = Date.now();
  const existing = store.get(data.artifactId);
  if (existing) {
    existing.versions.set(data.version, data);
    existing.latestVersion = data.version;
    existing.updatedAt = now;
    return;
  }
  const record: ArtifactRecord = {
    artifactId: data.artifactId,
    type: "slides",
    versions: new Map([[data.version, data]]),
    latestVersion: data.version,
    createdAt: now,
    updatedAt: now,
  };
  store.set(data.artifactId, record);
}

export function getArtifact(
  artifactId: string,
  version?: string,
): StoredSlidesArtifact | null {
  const rec = store.get(artifactId);
  if (!rec) return null;
  const v = version ?? rec.latestVersion;
  return rec.versions.get(v) ?? null;
}

export function getLatestVersion(artifactId: string): string | null {
  const rec = store.get(artifactId);
  return rec ? rec.latestVersion : null;
}

export function listVersions(artifactId: string): string[] {
  const rec = store.get(artifactId);
  return rec ? Array.from(rec.versions.keys()) : [];
}
