"use client";

import {
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileType2,
  Files,
  Trash2,
  X,
} from "lucide-react";
import { useFilesStore, formatFileSize, type UploadedFile } from "@/lib/files-store";

const ICON_BY_MIME: Record<string, React.ReactNode> = {
  "application/pdf": <FileType size={14} />,
  "image/png": <FileImage size={14} />,
  "image/jpeg": <FileImage size={14} />,
  "image/jpg": <FileImage size={14} />,
  "image/gif": <FileImage size={14} />,
  "image/webp": <FileImage size={14} />,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (
    <FileType2 size={14} />
  ),
  "application/msword": <FileType2 size={14} />,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (
    <FileSpreadsheet size={14} />
  ),
  "application/vnd.ms-excel": <FileSpreadsheet size={14} />,
  "text/csv": <FileSpreadsheet size={14} />,
  "application/csv": <FileSpreadsheet size={14} />,
  "text/plain": <FileText size={14} />,
  "text/markdown": <FileText size={14} />,
  "application/json": <FileText size={14} />,
};

function fileIcon(mimeType: string): React.ReactNode {
  return ICON_BY_MIME[mimeType] ?? <FileText size={14} />;
}

function truncate(name: string, max = 22): string {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  const base = name.slice(0, Math.max(1, max - ext.length - 1));
  return `${base}…${ext}`;
}

function FileRow({ file }: { file: UploadedFile }) {
  const removeFile = useFilesStore((s) => s.removeFile);
  const setAttached = useFilesStore((s) => s.setAttached);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
        border: file.attached
          ? "1px solid rgba(139, 92, 246, 0.45)"
          : "1px solid rgba(127,127,127,0.15)",
        background: file.attached ? "rgba(139, 92, 246, 0.08)" : "transparent",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: file.attached
            ? "var(--hyperanalyse-gradient)"
            : "rgba(127,127,127,0.18)",
          color: file.attached ? "white" : undefined,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-hidden
      >
        {fileIcon(file.mimeType)}
      </span>
      <button
        type="button"
        onClick={() => setAttached(file.id, !file.attached)}
        title={file.attached ? "Detach from next message" : "Attach to next message"}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={file.name}
        >
          {truncate(file.name)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--openui-color-text-secondary, rgba(0,0,0,0.55))",
            display: "flex",
            gap: 6,
          }}
        >
          <span>{file.label}</span>
          <span>·</span>
          <span>{formatFileSize(file.size)}</span>
          {file.attached && (
            <>
              <span>·</span>
              <span style={{ color: "var(--hyperanalyse-primary)" }}>in context</span>
            </>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={() => removeFile(file.id)}
        aria-label={`Remove ${file.name}`}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--openui-color-text-secondary, rgba(0,0,0,0.55))",
          cursor: "pointer",
          padding: 4,
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Sidebar section listing every file uploaded this session. Rendered inside
 * the OpenUI Shell.SidebarContent slot.
 */
export function FilePanel() {
  const files = useFilesStore((s) => s.files);
  const reset = useFilesStore((s) => s.reset);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--openui-color-text-secondary, rgba(0,0,0,0.55))",
          padding: "0 4px",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Files size={12} />
          Files
          {files.length > 0 && (
            <span
              style={{
                fontSize: 10,
                background: "var(--hyperanalyse-gradient)",
                color: "white",
                padding: "1px 6px",
                borderRadius: 999,
              }}
            >
              {files.length}
            </span>
          )}
        </span>
        {files.length > 0 && (
          <button
            type="button"
            onClick={reset}
            title="Clear all files"
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 2,
            }}
            aria-label="Clear all files"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {files.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: "var(--openui-color-text-secondary, rgba(0,0,0,0.45))",
            padding: "8px 4px 4px",
            lineHeight: 1.4,
          }}
        >
          No files yet. Drop a PDF, DOCX, XLSX, CSV, TXT, or image onto the
          chat to ground HyperAnalyse in your data.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
