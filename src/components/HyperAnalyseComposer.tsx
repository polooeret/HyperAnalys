"use client";

import { useThread } from "@openuidev/react-headless";
import type { ComposerProps } from "@openuidev/react-ui";
import clsx from "clsx";
import { ArrowUp, Loader2, Paperclip, Square, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { formatFileSize, useFilesStore, type UploadedFile } from "@/lib/files-store";
import type { UploadedFileResponse } from "@/app/api/upload/route";

const ACCEPT_FILES =
  ".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.webp";

interface UploadResponse {
  files?: UploadedFileResponse[];
  errors?: { name: string; error: string }[];
  error?: string;
}

async function uploadFiles(files: FileList | File[]): Promise<UploadResponse> {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("files", file));
  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });
  let body: UploadResponse;
  try {
    body = (await res.json()) as UploadResponse;
  } catch {
    body = { error: `Upload failed: HTTP ${res.status}` };
  }
  if (!res.ok && !body.error) {
    body.error = `Upload failed: HTTP ${res.status}`;
  }
  return body;
}

/**
 * Custom composer that:
 *  - mirrors the layout/keyboard behaviour of the default OpenUI Composer,
 *  - adds a paperclip button + drag-and-drop file uploads,
 *  - injects pending files into the next message as `binary` parts.
 */
export function HyperAnalyseComposer(props: ComposerProps) {
  const { onSend: _onSend, onCancel, isRunning, isLoadingMessages } = props;
  void _onSend; // we send manually via processMessage so we can attach binary parts.

  const [textContent, setTextContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processMessage = useThread((s) => s.processMessage);
  const files = useFilesStore((s) => s.files);
  const addFiles = useFilesStore((s) => s.addFiles);
  const setAttached = useFilesStore((s) => s.setAttached);
  const clearPending = useFilesStore((s) => s.clearPending);

  const pendingFiles = files.filter((f) => f.attached);

  // Auto-grow textarea
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "0px";
    input.style.height = `${Math.max(input.scrollHeight, 24)}px`;
  }, [textContent]);

  // Window-level drag detection so the entire chat surface acts as a dropzone.
  useEffect(() => {
    let depth = 0;
    const onDragEnter = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      depth += 1;
      setIsDragging(true);
    };
    const onDragLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };
    const onDrop = () => {
      depth = 0;
      setIsDragging(false);
    };
    const onDragOver = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  // Surface the dragging state to the parent shell via a data attribute.
  useEffect(() => {
    document.body.dataset.hyperanalyseDropping = isDragging ? "true" : "false";
  }, [isDragging]);

  const handleSelectedFiles = useCallback(
    async (selected: FileList | File[]) => {
      if (!selected || ("length" in selected && selected.length === 0)) return;
      setUploadError(null);
      setIsUploading(true);
      try {
        const body = await uploadFiles(selected);
        if (body.error) {
          setUploadError(body.error);
        }
        if (Array.isArray(body.errors) && body.errors.length > 0) {
          setUploadError(
            (prev) =>
              [
                prev,
                body.errors!
                  .map((e) => `${e.name}: ${e.error}`)
                  .join("; "),
              ]
                .filter(Boolean)
                .join(" — "),
          );
        }
        if (Array.isArray(body.files) && body.files.length > 0) {
          addFiles(
            body.files.map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              size: f.size,
              base64Data: f.base64Data,
              extractedText: f.extractedText,
              category: f.category,
              label: f.label,
              createdAt: f.createdAt,
            })),
          );
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [addFiles],
  );

  const onPickFiles = () => {
    fileInputRef.current?.click();
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list && list.length > 0) {
      void handleSelectedFiles(list);
    }
    // reset so picking the same file again still triggers `change`.
    e.target.value = "";
  };

  const onComposerDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length > 0) {
      void handleSelectedFiles(dropped);
    }
  };

  const handleSubmit = () => {
    if (isRunning || isLoadingMessages) return;
    const trimmed = textContent.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    void sendMessage(trimmed, pendingFiles);
    setTextContent("");
  };

  const sendMessage = async (text: string, attachments: UploadedFile[]) => {
    const parts: Array<
      | { type: "text"; text: string }
      | {
          type: "binary";
          mimeType: string;
          data: string;
          filename: string;
          id?: string;
        }
    > = [];

    // Surface extracted text up-front so even multimodal failures still ground the response.
    const extractedSummaries = attachments
      .filter((a) => a.extractedText)
      .map(
        (a) =>
          `### Extracted from ${a.name} (${a.label}, ${formatFileSize(a.size)})\n${a.extractedText}`,
      );

    const userText = [
      text,
      attachments.length > 0
        ? `\n\nAttached files: ${attachments.map((a) => `\`${a.name}\``).join(", ")}.`
        : "",
      extractedSummaries.length > 0 ? `\n\n${extractedSummaries.join("\n\n")}` : "",
    ]
      .filter(Boolean)
      .join("");

    if (userText.trim().length > 0) {
      parts.push({ type: "text", text: userText });
    }

    for (const att of attachments) {
      // Inline-supported files (PDF, images) get sent as binary so Gemini can
      // ingest them natively. Extract/text files are already inlined above.
      if (att.category === "inline") {
        parts.push({
          type: "binary",
          mimeType: att.mimeType,
          data: att.base64Data,
          filename: att.name,
          id: att.id,
        });
      }
    }

    if (parts.length === 0) {
      // Should not happen — guard against empty submissions.
      return;
    }

    clearPending();
    await processMessage({ role: "user", content: parts });
  };

  return (
    <div
      className={clsx(
        "openui-shell-thread-composer",
        "hyperanalyse-dropzone",
        "hyperanalyse-composer",
      )}
      data-dropping={isDragging ? "true" : "false"}
      onDrop={onComposerDrop}
      onDragOver={(e) => {
        if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
      }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a, [role='button'], input")) {
          inputRef.current?.focus();
        }
      }}
    >
      {(pendingFiles.length > 0 || isUploading || uploadError) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 10px 0",
          }}
        >
          {pendingFiles.map((file) => (
            <span
              key={file.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px 4px 10px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(6, 182, 212, 0.18))",
                border: "1px solid rgba(139, 92, 246, 0.35)",
                fontSize: 12,
                lineHeight: 1.2,
                maxWidth: 240,
              }}
              title={file.name}
            >
              <span
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
              >
                {file.name}
              </span>
              <span
                style={{ color: "var(--openui-color-text-secondary, rgba(0,0,0,0.55))" }}
              >
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => setAttached(file.id, false)}
                aria-label={`Detach ${file.name} from next message`}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  padding: 0,
                  marginLeft: 2,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {isUploading && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                color: "var(--openui-color-text-secondary, rgba(0,0,0,0.55))",
              }}
            >
              <Loader2 size={12} className="animate-spin" /> Uploading…
            </span>
          )}
          {uploadError && (
            <span
              style={{
                width: "100%",
                fontSize: 12,
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {uploadError}
              <button
                type="button"
                onClick={() => setUploadError(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: 2,
                }}
                aria-label="Dismiss error"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="openui-shell-thread-composer__input-wrapper">
        <textarea
          ref={inputRef}
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          className="openui-shell-thread-composer__input"
          placeholder="Ask HyperAnalyse — or drop files to chat over them…"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="openui-shell-thread-composer__action-bar">
          <button
            type="button"
            onClick={onPickFiles}
            disabled={isUploading}
            aria-label="Attach files"
            title="Attach files (PDF, DOCX, XLSX, CSV, TXT, MD, images)"
            style={{
              background: "transparent",
              border: "1px solid rgba(127,127,127,0.25)",
              color: "inherit",
              borderRadius: 999,
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isUploading ? "wait" : "pointer",
              marginRight: 6,
              opacity: isUploading ? 0.6 : 1,
            }}
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Paperclip size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={isRunning ? onCancel : handleSubmit}
            aria-label={isRunning ? "Cancel message" : "Send message"}
            disabled={
              !isRunning && !textContent.trim() && pendingFiles.length === 0
            }
            className="openui-shell-thread-composer__submit-button"
            style={{
              background:
                isRunning || (!textContent.trim() && pendingFiles.length === 0)
                  ? undefined
                  : "var(--hyperanalyse-gradient)",
              color: "white",
              border: "none",
              borderRadius: 999,
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {isRunning ? (
              <Square size={14} fill="currentColor" />
            ) : (
              <ArrowUp size={14} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_FILES}
            onChange={onFileInput}
            style={{ display: "none" }}
          />
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--openui-color-text-secondary, rgba(0,0,0,0.5))",
          padding: "4px 12px 8px",
        }}
      >
        Drop or attach files (PDF, DOCX, XLSX, CSV, TXT, MD, PNG/JPG) — up to 20 MB each.
      </div>
    </div>
  );
}
