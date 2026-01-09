import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Clipboard, Download, FileJson2, Loader2, Wand2 } from "lucide-react";
import { TreeView } from "../TreeView";
import type { TreeNode } from "@/lib/json-utils";

type EditorStats = {
  bytes: number;
  lines: number;
  chars: number;
};

type EditorsProps = {
  input: string;
  output: string;
  error: string;
  warning: string;
  stats: EditorStats;
  isProcessing: boolean;
  copied: boolean;
  treeNodes: TreeNode[];
  selectedPath: string;
  controls: ReactNode;
  onInputChange: (value: string) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onCopy: () => void;
  onDownload: () => void;
  onNodeClick: (path: string[], value: unknown) => void;
};

export function Editors({
  input,
  output,
  error,
  warning,
  stats,
  isProcessing,
  copied,
  treeNodes,
  selectedPath,
  controls,
  onInputChange,
  onPaste,
  onCopy,
  onDownload,
  onNodeClick,
}: EditorsProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "tree">("formatted");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const formattedLines = useMemo(() => output.split("\n"), [output]);
  const matchIndices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return formattedLines.reduce<number[]>((matches, line, index) => {
      if (line.toLowerCase().includes(term)) matches.push(index);
      return matches;
    }, []);
  }, [formattedLines, searchTerm]);
  const matchSet = useMemo(() => new Set(matchIndices), [matchIndices]);

  useEffect(() => {
    if (!matchIndices.length) {
      setActiveMatchIndex(0);
      return;
    }
    const clampedIndex = Math.min(activeMatchIndex, matchIndices.length - 1);
    if (clampedIndex !== activeMatchIndex) {
      setActiveMatchIndex(clampedIndex);
    }
  }, [activeMatchIndex, matchIndices]);

  useEffect(() => {
    if (!matchIndices.length) return;
    const lineIndex = matchIndices[activeMatchIndex] ?? matchIndices[0];
    const lineEl = lineRefs.current.get(lineIndex);
    if (lineEl) {
      lineEl.scrollIntoView({ block: "center" });
    }
  }, [activeMatchIndex, matchIndices]);

  const hasMatches = matchIndices.length > 0;
  const activeLine = hasMatches ? matchIndices[activeMatchIndex] : null;
  const matchLabel = hasMatches ? `${activeMatchIndex + 1}/${matchIndices.length}` : "0/0";

  const handleNextMatch = () => {
    if (!hasMatches) return;
    setActiveMatchIndex((current) => (current + 1) % matchIndices.length);
  };

  const handlePrevMatch = () => {
    if (!hasMatches) return;
    setActiveMatchIndex((current) => (current - 1 + matchIndices.length) % matchIndices.length);
  };

  const renderJsonLine = (line: string) => {
    const tokens: Array<{ value: string; type: "string" | "number" | "boolean" | "null" | "punct" }> = [];
    const regex = /"(?:\\.|[^"\\])*"|\\btrue\\b|\\bfalse\\b|\\bnull\\b|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > cursor) {
        tokens.push({ value: line.slice(cursor, match.index), type: "punct" });
      }
      const value = match[0];
      let type: "string" | "number" | "boolean" | "null";
      if (value.startsWith("\"")) {
        type = "string";
      } else if (value === "true" || value === "false") {
        type = "boolean";
      } else if (value === "null") {
        type = "null";
      } else {
        type = "number";
      }
      tokens.push({ value, type });
      cursor = match.index + value.length;
    }
    if (cursor < line.length) {
      tokens.push({ value: line.slice(cursor), type: "punct" });
    }

    return tokens.map((token, index) => {
      const className =
        token.type === "string"
          ? "text-emerald-300"
          : token.type === "number"
            ? "text-sky-300"
            : token.type === "boolean"
              ? "text-violet-300"
              : token.type === "null"
                ? "text-slate-400"
                : "text-slate-100";
      return (
        <span key={`${token.type}-${index}`} className={className}>
          {token.value}
        </span>
      );
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        {controls}
        <textarea
          className="h-[280px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          spellCheck={false}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onPaste={onPaste}
          placeholder='Paste JSON here e.g. {"hello":"world"}'
          aria-label="JSON input"
        />

        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            {stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines ·{" "}
            {(stats.bytes / 1024).toFixed(2)} KB
          </span>
        </div>

        {warning && <p className="text-sm font-medium text-blue-600">{warning}</p>}
        {error ? (
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : !warning ? (
          <p className="text-sm text-slate-600">Tip: clean API responses, configs, and logs.</p>
        ) : null}
      </div>

      <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Output</p>
            {output && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode("formatted")}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                    viewMode === "formatted"
                      ? "bg-white/20 text-white"
                      : "text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <FileJson2 className="h-3.5 w-3.5" />
                  Text
                </button>
                <button
                  onClick={() => setViewMode("tree")}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                    viewMode === "tree"
                      ? "bg-white/20 text-white"
                      : "text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Tree
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Download formatted JSON"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={onCopy}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Copy formatted JSON to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
        {output && viewMode === "formatted" && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Search</span>
              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setActiveMatchIndex(0);
                }}
                placeholder="Find in output"
                className="w-40 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{matchLabel}</span>
              <button
                onClick={handlePrevMatch}
                disabled={!hasMatches}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={handleNextMatch}
                disabled={!hasMatches}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selectedPath && (
          <div className="border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Path:</span> {selectedPath}
          </div>
        )}

        {isProcessing ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : output ? (
          viewMode === "formatted" ? (
            <div className="flex-1 overflow-auto">
              <div className="min-w-max px-2 py-4 text-sm leading-relaxed">
                {formattedLines.map((line, index) => {
                  const isMatch = matchSet.has(index);
                  const isActive = activeLine === index;
                  return (
                    <div
                      key={`line-${index}`}
                      ref={(element) => {
                        if (element) {
                          lineRefs.current.set(index, element);
                        } else {
                          lineRefs.current.delete(index);
                        }
                      }}
                      className={`flex gap-4 px-2 ${isActive ? "bg-white/10" : isMatch ? "bg-white/5" : ""}`}
                    >
                      <span className="w-8 select-none text-right text-xs text-slate-500">
                        {index + 1}
                      </span>
                      <span className="whitespace-pre">{renderJsonLine(line)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              <TreeView nodes={treeNodes} onNodeClick={onNodeClick} />
            </div>
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Formatted JSON will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
