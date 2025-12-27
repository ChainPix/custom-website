"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";

type DiffLine = {
  type: "same" | "add" | "remove" | "change" | "collapsed";
  leftText?: string;
  rightText?: string;
  leftLine?: number;
  rightLine?: number;
  collapsedCount?: number;
};

type DiffOp = {
  type: "equal" | "insert" | "delete";
  line: string;
};

function tokenizeWords(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

function diffWords(left: string, right: string) {
  const lTokens = tokenizeWords(left);
  const rTokens = tokenizeWords(right);
  const max = Math.max(lTokens.length, rTokens.length);
  const segments: Array<{ text: string; same: boolean }> = [];
  for (let i = 0; i < max; i += 1) {
    const l = lTokens[i] ?? "";
    const r = rTokens[i] ?? "";
    if (l === r) {
      segments.push({ text: l, same: true });
    } else {
      if (l) segments.push({ text: l, same: false });
      if (r && r !== l) segments.push({ text: r, same: false });
    }
  }
  return segments;
}

function myersDiffOps(leftLines: string[], rightLines: string[]): DiffOp[] {
  const n = leftLines.length;
  const m = rightLines.length;
  const max = n + m;
  const offset = max;
  const v = new Array(2 * max + 1).fill(0);
  const trace: number[][] = [];

  for (let d = 0; d <= max; d += 1) {
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && leftLines[x] === rightLines[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice());
        return backtrackDiff(trace, leftLines, rightLines, offset);
      }
    }
    trace.push(v.slice());
  }

  return [];
}

function backtrackDiff(trace: number[][], leftLines: string[], rightLines: string[], offset: number): DiffOp[] {
  let x = leftLines.length;
  let y = rightLines.length;
  const ops: DiffOp[] = [];

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const v = trace[d - 1];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1;
    const prevX = v[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      ops.push({ type: "equal", line: leftLines[x - 1] });
      x -= 1;
      y -= 1;
    }

    if (x === prevX) {
      ops.push({ type: "insert", line: rightLines[y - 1] });
      y -= 1;
    } else {
      ops.push({ type: "delete", line: leftLines[x - 1] });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    ops.push({ type: "equal", line: leftLines[x - 1] });
    x -= 1;
    y -= 1;
  }

  while (x > 0) {
    ops.push({ type: "delete", line: leftLines[x - 1] });
    x -= 1;
  }

  while (y > 0) {
    ops.push({ type: "insert", line: rightLines[y - 1] });
    y -= 1;
  }

  return ops.reverse();
}

function diffLinesMyers(leftText: string, rightText: string): DiffLine[] {
  const leftLines = leftText.split(/\r?\n/);
  const rightLines = rightText.split(/\r?\n/);
  const ops = myersDiffOps(leftLines, rightLines);
  const result: DiffLine[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (let i = 0; i < ops.length; ) {
    const op = ops[i];
    if (op.type === "equal") {
      result.push({
        type: "same",
        leftText: op.line,
        rightText: op.line,
        leftLine,
        rightLine,
      });
      leftLine += 1;
      rightLine += 1;
      i += 1;
      continue;
    }

    const deletes: string[] = [];
    const inserts: string[] = [];
    while (i < ops.length && ops[i].type !== "equal") {
      if (ops[i].type === "delete") {
        deletes.push(ops[i].line);
      } else {
        inserts.push(ops[i].line);
      }
      i += 1;
    }

    const blockSize = Math.max(deletes.length, inserts.length);
    for (let j = 0; j < blockSize; j += 1) {
      const leftValue = deletes[j];
      const rightValue = inserts[j];
      if (leftValue !== undefined && rightValue !== undefined) {
        result.push({
          type: "change",
          leftText: leftValue,
          rightText: rightValue,
          leftLine,
          rightLine,
        });
        leftLine += 1;
        rightLine += 1;
      } else if (leftValue !== undefined) {
        result.push({ type: "remove", leftText: leftValue, leftLine });
        leftLine += 1;
      } else if (rightValue !== undefined) {
        result.push({ type: "add", rightText: rightValue, rightLine });
        rightLine += 1;
      }
    }
  }

  return result;
}

function collapseDiffLines(lines: DiffLine[], contextLines: number): DiffLine[] {
  if (contextLines < 0) {
    return lines;
  }

  const changeIndices = lines
    .map((line, index) => (line.type === "same" ? -1 : index))
    .filter((index) => index !== -1);

  if (!changeIndices.length) {
    return lines;
  }

  const keep = lines.map((line) => line.type !== "same");
  for (const idx of changeIndices) {
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(lines.length - 1, idx + contextLines);
    for (let i = start; i <= end; i += 1) {
      keep[i] = true;
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  while (i < lines.length) {
    if (keep[i]) {
      result.push(lines[i]);
      i += 1;
      continue;
    }

    let count = 0;
    while (i < lines.length && !keep[i]) {
      count += 1;
      i += 1;
    }

    result.push({ type: "collapsed", collapsedCount: count });
  }

  return result;
}

export default function DiffViewerClient() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [inlineHighlight, setInlineHighlight] = useState(false);
  const [contextLines, setContextLines] = useState(3);
  const [viewMode, setViewMode] = useState<"unified" | "side-by-side">("unified");

  useEffect(() => {
    const totalChars = left.length + right.length;
    const totalLines = left.split(/\r?\n/).length + right.split(/\r?\n/).length;
    if (!left && !right) {
      setWarning("Both inputs are empty. Paste text to see a diff.");
    } else if (totalChars > 200_000 || totalLines > 10_000) {
      setWarning("Large input detected (>200k chars or >10k lines). Rendering may be slow.");
    } else {
      setWarning("");
    }
  }, [left, right]);

  const normalizedLeft = useMemo(() => (ignoreWhitespace ? left.trim() : left), [left, ignoreWhitespace]);
  const normalizedRight = useMemo(() => (ignoreWhitespace ? right.trim() : right), [right, ignoreWhitespace]);

  const diffFull = useMemo(() => diffLinesMyers(normalizedLeft, normalizedRight), [normalizedLeft, normalizedRight]);
  const diff = useMemo(() => collapseDiffLines(diffFull, contextLines), [diffFull, contextLines]);

  const counts = useMemo(
    () => ({
      add: diffFull.filter((d) => d.type === "add").length,
      remove: diffFull.filter((d) => d.type === "remove").length,
      change: diffFull.filter((d) => d.type === "change").length,
      same: diffFull.filter((d) => d.type === "same").length,
    }),
    [diffFull],
  );

  const handleSwap = () => {
    setLeft(right);
    setRight(left);
    setStatus("Swapped inputs");
  };

  const handleSample = () => {
    setLeft(`{
  "name": "Old API",
  "version": 1,
  "fields": ["a", "b"]
}`);
    setRight(`{
  "name": "New API",
  "version": 2,
  "fields": ["a", "b", "c"]
}`);
    setStatus("Loaded sample");
  };

  const unifiedLines = useMemo(() => diff, [diff]);

  const sideBySideLines = useMemo(() => diff, [diff]);

  const copyAsText = async () => {
    const lines = diffFull.map((d) => {
      const prefix = d.type === "add" ? "+" : d.type === "remove" ? "-" : d.type === "change" ? "~" : " ";
      const text = d.type === "add" ? d.rightText ?? "" : d.type === "remove" ? d.leftText ?? "" : `${d.leftText ?? ""}`;
      return `${prefix} ${text}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus("Copied diff");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const downloadJson = () => {
    const payload = diffFull.map((d) => ({
      type: d.type,
      leftLine: d.leftLine,
      rightLine: d.rightLine,
      leftText: d.leftText,
      rightText: d.rightText,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diff.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded diff JSON");
  };

  return (
    <main className="space-y-8">
            {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-slate-600" itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" itemProp="item" className="underline underline-offset-4 transition hover:text-slate-900">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="font-medium text-slate-900">
              Diff Viewer
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Diff Viewer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Compare two text snippets and see what changed. Additions and removals are highlighted.
        </p>
      </header>

      <div className="sr-only" aria-live="polite">
        {status} {warning}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
          role="region"
          aria-labelledby="original-label"
        >
          <div className="flex items-center justify-between">
            <p id="original-label" className="text-sm font-semibold text-slate-900">
              Original
            </p>
            <button
              onClick={() => {
                setLeft("");
                setStatus("Cleared original");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear original text"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            placeholder="Paste original text"
            aria-label="Original text"
          />
        </div>

        <div
          className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
          role="region"
          aria-labelledby="changed-label"
        >
          <div className="flex items-center justify-between">
            <p id="changed-label" className="text-sm font-semibold text-slate-900">
              Changed
            </p>
            <button
              onClick={() => {
                setRight("");
                setStatus("Cleared changed");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear changed text"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            placeholder="Paste changed text"
            aria-label="Changed text"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            checked={ignoreWhitespace}
            onChange={(e) => {
              setIgnoreWhitespace(e.target.checked);
              setStatus(e.target.checked ? "Ignoring surrounding whitespace" : "Using exact whitespace");
            }}
          />
          Trim/ignore leading and trailing whitespace
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            checked={inlineHighlight}
            onChange={(e) => {
              setInlineHighlight(e.target.checked);
              setStatus(e.target.checked ? "Inline highlight on" : "Inline highlight off");
            }}
          />
          Inline word highlight
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">View</span>
          <div className="flex overflow-hidden rounded-full ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => {
                setViewMode("unified");
                setStatus("Unified view");
              }}
              className={`px-3 py-1.5 text-xs font-semibold ${
                viewMode === "unified" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
              }`}
              aria-pressed={viewMode === "unified"}
            >
              Unified
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("side-by-side");
                setStatus("Side-by-side view");
              }}
              className={`px-3 py-1.5 text-xs font-semibold ${
                viewMode === "side-by-side" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
              }`}
              aria-pressed={viewMode === "side-by-side"}
            >
              Side-by-side
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Context</span>
          <div className="flex overflow-hidden rounded-full ring-1 ring-slate-200">
            {[0, 3, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setContextLines(value);
                  setStatus(`Context lines: ${value}`);
                }}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  contextLines === value ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                }`}
                aria-pressed={contextLines === value}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>Add: {counts.add}</span>
          <span>Remove: {counts.remove}</span>
          <span>Change: {counts.change}</span>
          <span>Same: {counts.same}</span>
        </div>
        {warning ? (
          <span className="font-medium text-amber-700" role="alert">
            {warning}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <button
          type="button"
          onClick={handleSample}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          aria-label="Load sample input"
        >
          Sample input
        </button>
        <button
          type="button"
          onClick={handleSwap}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          aria-label="Swap original and changed text"
        >
          Swap ↔
        </button>
        <button
          type="button"
          onClick={copyAsText}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!diffFull.length}
          aria-label="Copy diff as text"
        >
          Copy diff
        </button>
        <button
          type="button"
          onClick={downloadJson}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!diffFull.length}
          aria-label="Download diff as JSON"
        >
          <Download className="h-4 w-4" />
          Download JSON
        </button>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-label="Diff output"
      >
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold" role="heading" aria-level={2}>
          Diff
        </div>
        {viewMode === "unified" ? (
          <div className="max-h-[320px] overflow-auto divide-y divide-slate-800">
            {unifiedLines.map((line, idx) => {
              if (line.type === "collapsed") {
                return (
                  <div
                    key={`collapsed-${idx}`}
                    className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 bg-slate-800/70"
                  >
                    ... {line.collapsedCount ?? 0} unchanged lines ...
                  </div>
                );
              }

              return (
                <div
                  key={`${line.type}-${idx}`}
                  className={`px-4 py-2 text-sm leading-relaxed ${
                    line.type === "same"
                      ? "bg-transparent text-slate-100"
                      : line.type === "add"
                        ? "bg-emerald-900/40 text-emerald-100"
                        : line.type === "remove"
                          ? "bg-rose-900/40 text-rose-100"
                          : "bg-indigo-900/40 text-indigo-100"
                  }`}
                >
                  <span className="mr-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    {line.type === "same" ? " " : line.type === "add" ? "+" : line.type === "remove" ? "-" : "~"}
                  </span>
                  <span className="mr-2 text-xs text-slate-300">
                    {line.leftLine ?? line.rightLine ?? idx + 1}
                  </span>
                  {inlineHighlight && line.type === "change" && line.leftText && line.rightText ? (
                    <span className="inline-flex flex-wrap gap-0.5">
                      {diffWords(line.leftText, line.rightText).map((seg, sIdx) => (
                        <span
                          key={sIdx}
                          className={seg.same ? "" : "rounded bg-slate-100/20 px-0.5 text-amber-100"}
                        >
                          {seg.text}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span>
                      {line.type === "add" ? line.rightText : line.type === "remove" ? line.leftText : line.leftText}
                    </span>
                  )}
                </div>
              );
            })}
            {!unifiedLines.length ? (
              <div className="px-4 py-3 text-sm text-slate-300">Diff will appear here.</div>
            ) : null}
          </div>
        ) : (
          <div className="max-h-[360px] overflow-auto divide-y divide-slate-800">
            <div className="grid grid-cols-2 gap-0 border-b border-slate-800 bg-slate-800/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
              <span>Original</span>
              <span>Changed</span>
            </div>
            {sideBySideLines.map((line, idx) => {
              if (line.type === "collapsed") {
                return (
                  <div key={`collapsed-${idx}`} className="grid grid-cols-2 gap-0 border-b border-slate-800">
                    <div className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 bg-slate-800/70">
                      ... {line.collapsedCount ?? 0} unchanged lines ...
                    </div>
                    <div className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 bg-slate-800/70">
                      ... {line.collapsedCount ?? 0} unchanged lines ...
                    </div>
                  </div>
                );
              }

              return (
                <div key={`${line.type}-${idx}`} className="grid grid-cols-2 gap-0 border-b border-slate-800">
                  <div
                    className={`flex items-start gap-2 px-4 py-2 text-sm leading-relaxed ${
                      line.type === "remove" || line.type === "change" ? "bg-rose-900/30 text-rose-100" : "bg-transparent text-slate-100"
                    }`}
                  >
                    <span className="text-xs text-slate-400 w-10">{line.leftLine ?? ""}</span>
                    <span className="flex-1">
                      {inlineHighlight && line.type === "change" && line.leftText && line.rightText ? (
                        diffWords(line.leftText, line.rightText).map((seg, sIdx) => (
                          <span
                            key={sIdx}
                            className={seg.same ? "" : "rounded bg-slate-100/20 px-0.5 text-amber-100"}
                          >
                            {seg.text}
                          </span>
                        ))
                      ) : (
                        line.leftText ?? ""
                      )}
                    </span>
                  </div>
                  <div
                    className={`flex items-start gap-2 px-4 py-2 text-sm leading-relaxed ${
                      line.type === "add" || line.type === "change" ? "bg-emerald-900/30 text-emerald-100" : "bg-transparent text-slate-100"
                    }`}
                  >
                    <span className="text-xs text-slate-400 w-10 text-right">{line.rightLine ?? ""}</span>
                    <span className="flex-1 text-left">
                      {inlineHighlight && line.type === "change" && line.leftText && line.rightText ? (
                        diffWords(line.leftText, line.rightText).map((seg, sIdx) => (
                          <span
                            key={sIdx}
                            className={seg.same ? "" : "rounded bg-slate-100/20 px-0.5 text-amber-100"}
                          >
                            {seg.text}
                          </span>
                        ))
                      ) : (
                        line.rightText ?? ""
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
            {!sideBySideLines.length ? (
              <div className="px-4 py-3 text-sm text-slate-300">Diff will appear here.</div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste or type your original text on the left and the changed text on the right.</li>
          <li>Use the whitespace toggle or view switcher (Unified/Side-by-side) to reduce noise.</li>
          <li>Enable inline highlight to see word-level changes inside changed lines.</li>
          <li>Copy the diff or download JSON for sharing or debugging.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Everything runs in your browser; text is not uploaded.</p>
          <p><strong>Large files?</strong> Inputs over ~200k characters or 10k lines will show a warning; consider trimming first.</p>
          <p><strong>Whitespace differences?</strong> Toggle “Trim/ignore whitespace” to dampen spacing-only changes.</p>
        </div>
      </div>
    </main>
  );
}
