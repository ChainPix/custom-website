import { useEffect } from "react";

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
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === "enter") {
        event.preventDefault();
        onFormat();
      } else if (key === "m") {
        event.preventDefault();
        onMinify();
      } else if (key === "k") {
        event.preventDefault();
        onClear();
      } else if (key === "c" && canCopy) {
        event.preventDefault();
        onCopy();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canCopy, onClear, onCopy, onFormat, onMinify]);
}
