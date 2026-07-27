"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared clipboard hook for tool pages.
 *
 * const { copied, error, copy } = useCopy();
 * <button onClick={() => copy(text)}>{copied ? "Copied!" : "Copy"}</button>
 *
 * `copied` resets automatically after `resetAfterMs` (default 2s).
 * Falls back to a hidden textarea + execCommand when the async Clipboard API
 * is unavailable (http, older browsers, permission denied).
 */
export function useCopy(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setError(null);

      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch {
        // fall through to the textarea fallback
      }

      if (!ok) {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          ok = document.execCommand("copy");
          document.body.removeChild(textarea);
        } catch {
          ok = false;
        }
      }

      if (ok) {
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), resetAfterMs);
      } else {
        setCopied(false);
        setError("Couldn't copy to clipboard.");
      }
      return ok;
    },
    [resetAfterMs]
  );

  return { copied, error, copy };
}
