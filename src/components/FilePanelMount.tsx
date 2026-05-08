"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { FilePanel } from "./FilePanel";

/**
 * Mounts the HyperAnalyse FilePanel inside the OpenUI Shell sidebar via a
 * React portal. We use a DOM lookup because `<FullScreen>` does not expose a
 * sidebar-children slot, but the rendered class names are stable contract.
 *
 * - Targets `.openui-shell-sidebar-content` (rendered by `<SidebarContent>`)
 * - Falls back to a floating bottom-left panel if the sidebar is not present
 *   (e.g. mobile collapsed state) so users can still see their attachments.
 */
export function FilePanelMount() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findTarget = () =>
      document.querySelector<HTMLElement>(".openui-shell-sidebar-content");

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const el = findTarget();
      if (el) {
        setTarget((prev) => (prev === el ? prev : el));
      }
    };

    tick();
    // Observe DOM mutations so the portal re-targets after responsive layout swaps.
    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  if (!target) return null;
  return createPortal(<FilePanel />, target);
}
