import { Code2, GitCompare, Loader2, Search, Shield, Sparkles, Upload } from "lucide-react";

type ToolbarProps = {
  isProcessing: boolean;
  isUploading: boolean;
  showEscapeTools: boolean;
  showSchemaValidator: boolean;
  showQueryPanel: boolean;
  showDiffPanel: boolean;
  onFormat: () => void;
  onMinify: () => void;
  onClear: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleEscapeTools: () => void;
  onToggleSchemaValidator: () => void;
  onToggleQueryPanel: () => void;
  onToggleDiffPanel: () => void;
};

export function Toolbar({
  isProcessing,
  isUploading,
  showEscapeTools,
  showSchemaValidator,
  showQueryPanel,
  showDiffPanel,
  onFormat,
  onMinify,
  onClear,
  onUpload,
  onToggleEscapeTools,
  onToggleSchemaValidator,
  onToggleQueryPanel,
  onToggleDiffPanel,
}: ToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onFormat}
          disabled={isProcessing || isUploading}
          className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Format JSON"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Formatting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Format
            </>
          )}
        </button>
        <button
          onClick={onMinify}
          disabled={isProcessing || isUploading}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Minify JSON"
        >
          {isProcessing ? "Minifying..." : "Minify"}
        </button>
        <label
          className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${
            isUploading || isProcessing ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Load File
            </>
          )}
          <input
            type="file"
            accept=".json,application/json,text/plain"
            onChange={onUpload}
            disabled={isUploading || isProcessing}
            className="hidden"
            aria-label="Upload JSON file"
          />
        </label>
        <button
          onClick={onClear}
          disabled={isProcessing || isUploading}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Clear input"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <button
          onClick={onToggleEscapeTools}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
            showEscapeTools
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          Escape Tools
        </button>
        <button
          onClick={onToggleSchemaValidator}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
            showSchemaValidator
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Schema Validator
        </button>
        <button
          onClick={onToggleQueryPanel}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
            showQueryPanel
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          JSONPath Query
        </button>
        <button
          onClick={onToggleDiffPanel}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
            showDiffPanel
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
          }`}
        >
          <GitCompare className="h-3.5 w-3.5" />
          Diff Mode
        </button>
      </div>
    </div>
  );
}
