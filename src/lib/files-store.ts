"use client";

import { create } from "zustand";

export interface UploadedFile {
  /** Server-assigned ID, e.g. "file-abc123". */
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Base64-encoded file body (kept in memory for re-sending to Vertex AI). */
  base64Data: string;
  /** Pre-extracted plain text for DOCX/XLSX/CSV/TXT/MD/JSON. */
  extractedText?: string;
  /** "PDF" / "Excel spreadsheet" / "Image (PNG)" — used for chips and panel labels. */
  label: string;
  category: "inline" | "extract" | "text";
  /** Whether this file is "in context" — included as inlineData in the next user message. */
  attached: boolean;
  createdAt: number;
}

interface FilesState {
  files: UploadedFile[];
  addFile: (file: Omit<UploadedFile, "attached">) => void;
  addFiles: (files: Array<Omit<UploadedFile, "attached">>) => void;
  removeFile: (id: string) => void;
  setAttached: (id: string, attached: boolean) => void;
  attachToMessage: (id: string) => void;
  /** All files currently attached to the next message. */
  getPendingFiles: () => UploadedFile[];
  /** Detach all currently attached files (called after a message is sent). */
  clearPending: () => void;
  reset: () => void;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: [],
  addFile: (file) =>
    set((state) => ({
      files: [...state.files, { ...file, attached: true }],
    })),
  addFiles: (files) =>
    set((state) => ({
      files: [...state.files, ...files.map((f) => ({ ...f, attached: true }))],
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),
  setAttached: (id, attached) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, attached } : f)),
    })),
  attachToMessage: (id) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, attached: true } : f)),
    })),
  getPendingFiles: () => get().files.filter((f) => f.attached),
  clearPending: () =>
    set((state) => ({
      files: state.files.map((f) => ({ ...f, attached: false })),
    })),
  reset: () => set({ files: [] }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
