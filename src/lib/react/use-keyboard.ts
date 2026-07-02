"use client";

import { useEffect } from "react";

/**
 * Bind a global key handler via a short `useEffect`.
 * Does not prevent any default — call `e.preventDefault()` inside `handler`.
 *
 * @example
 *   useKeyPress("Escape", close);          // fires on Escape
 *   useKeyPress("ArrowRight", next, true); // only when focus is NOT in an input
 */
export function useKeyPress(
  key: string,
  handler: (e: KeyboardEvent) => void,
  ignoreIfTyping = false,
): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (ignoreIfTyping) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
          return;
        }
      }
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, handler, ignoreIfTyping]);
}
