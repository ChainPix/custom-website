"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ResumeAnalyzerError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Resume analyzer error", error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-sm text-slate-600">We hit an error while preparing this tool.</p>
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        {error.message || "Unknown error"}
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
