"use client";

import { useCopy } from "@/lib/use-copy";

type CopyButtonProps = {
  /** The text to copy, or a function producing it at click time. */
  value: string | (() => string);
  /** Button label. Defaults to "Copy". */
  label?: string;
  /** Label shown briefly after a successful copy. Defaults to "Copied!". */
  copiedLabel?: string;
  /** Disable the button (e.g. when there is no output yet). */
  disabled?: boolean;
  /** Extra classes appended to the default styling. */
  className?: string;
};

/**
 * Shared copy-to-clipboard button for tool pages, styled to match the
 * existing slate button convention. Announces the copied state politely
 * for screen readers.
 */
export default function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied!",
  disabled = false,
  className = "",
}: CopyButtonProps) {
  const { copied, error, copy } = useCopy();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => copy(typeof value === "function" ? value() : value)}
      aria-live="polite"
      className={`rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {error ? "Copy failed" : copied ? copiedLabel : label}
    </button>
  );
}
