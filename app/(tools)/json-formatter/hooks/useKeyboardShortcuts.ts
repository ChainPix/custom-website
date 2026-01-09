import { useEffect, useRef } from "react";

type ShortcutOptions = {
  onFormat: () => void;
  onMinify: () => void;
  onClear: () => void;
  onCopy: () => void;
  canCopy: boolean;
};

export function useKeyboardShortcuts({
  onFormat,
  onMinify,
  onClear,
  onCopy,
  canCopy,
}: ShortcutOptions) {
  const formatRef = useRef(onFormat);
  const minifyRef = useRef(onMinify);
  const clearRef = useRef(onClear);
  const copyRef = useRef(onCopy);
  const canCopyRef = useRef(canCopy);

  useEffect(() => {
    formatRef.current = onFormat;
    minifyRef.current = onMinify;
    clearRef.current = onClear;
    copyRef.current = onCopy;
    canCopyRef.current = canCopy;
  }, [canCopy, onClear, onCopy, onFormat, onMinify]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === "enter") {
        event.preventDefault();
        formatRef.current();
      } else if (key === "m") {
        event.preventDefault();
        minifyRef.current();
      } else if (key === "k") {
        event.preventDefault();
        clearRef.current();
      } else if (key === "c" && canCopyRef.current) {
        event.preventDefault();
        copyRef.current();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
