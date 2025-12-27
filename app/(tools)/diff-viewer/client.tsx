"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  leftIndex?: number;
  rightIndex?: number;
};

function tokenizeWords(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

type InlineSegment = { text: string; same: boolean };

function lcsTable<T>(left: T[], right: T[]) {
  const table = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      if (left[i - 1] === right[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }
  return table;
}

function diffByLcs(left: string[], right: string[]) {
  const table = lcsTable(left, right);
  const leftSegs: InlineSegment[] = [];
  const rightSegs: InlineSegment[] = [];
  let i = left.length;
  let j = right.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      leftSegs.push({ text: left[i - 1], same: true });
      rightSegs.push({ text: right[j - 1], same: true });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      rightSegs.push({ text: right[j - 1], same: false });
      j -= 1;
    } else if (i > 0) {
      leftSegs.push({ text: left[i - 1], same: false });
      i -= 1;
    }
  }

  return { leftSegs: leftSegs.reverse(), rightSegs: rightSegs.reverse() };
}

function charDiffFallback(left: string, right: string) {
  return diffByLcs(left.split(""), right.split(""));
}

function diffWords(left: string, right: string) {
  const lTokens = tokenizeWords(left);
  const rTokens = tokenizeWords(right);
  const tokenLimit = 240;
  if (lTokens.length > tokenLimit || rTokens.length > tokenLimit) {
    return charDiffFallback(left, right);
  }
  return diffByLcs(lTokens, rTokens);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, query: string) {
  if (!query) {
    return text;
  }
  const pattern = new RegExp(escapeRegExp(query), "gi");
  const nodes: Array<string | JSX.Element> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    nodes.push(
      <span key={`${start}-${end}`} className="rounded bg-amber-200/20 px-0.5 text-amber-100 ring-1 ring-amber-300/30">
        {match[0]}
      </span>,
    );
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function buildPatchLines(line: DiffLine) {
  if (line.type === "change") {
    return [`- ${line.leftText ?? ""}`, `+ ${line.rightText ?? ""}`];
  }
  if (line.type === "add") {
    return [`+ ${line.rightText ?? ""}`];
  }
  if (line.type === "remove") {
    return [`- ${line.leftText ?? ""}`];
  }
  if (line.type === "same") {
    return [`  ${line.leftText ?? ""}`];
  }
  return [];
}

function buildPatchFromLines(lines: DiffLine[]) {
  return lines.flatMap((line) => buildPatchLines(line)).join("\n");
}

type WhitespaceOptions = {
  ignoreTrailingWhitespace: boolean;
  ignoreAllWhitespace: boolean;
  ignoreIndentation: boolean;
  normalizeLineEndings: boolean;
  useTabWidth: boolean;
  tabWidth: number;
};

function normalizeLineEndings(text: string, enabled: boolean) {
  if (!enabled) {
    return text;
  }
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeLineForCompare(line: string, options: WhitespaceOptions) {
  let value = line;
  if (options.useTabWidth) {
    value = value.replace(/\t/g, " ".repeat(options.tabWidth));
  }
  if (options.ignoreAllWhitespace) {
    return value.replace(/\s+/g, "");
  }
  if (options.ignoreIndentation) {
    value = value.replace(/^\s+/, "");
  }
  if (options.ignoreTrailingWhitespace) {
    value = value.replace(/\s+$/, "");
  }
  return value;
}

function myersDiffOps(leftCompare: string[], rightCompare: string[]): DiffOp[] {
  const n = leftCompare.length;
  const m = rightCompare.length;
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
      while (x < n && y < m && leftCompare[x] === rightCompare[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        trace.push(v.slice());
        return backtrackDiff(trace, leftCompare, rightCompare, offset);
      }
    }
    trace.push(v.slice());
  }

  return [];
}

function backtrackDiff(trace: number[][], leftCompare: string[], rightCompare: string[], offset: number): DiffOp[] {
  let x = leftCompare.length;
  let y = rightCompare.length;
  const ops: DiffOp[] = [];

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const v = trace[d - 1];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1;
    const prevX = v[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      ops.push({ type: "equal", leftIndex: x - 1, rightIndex: y - 1 });
      x -= 1;
      y -= 1;
    }

    if (x === prevX) {
      ops.push({ type: "insert", rightIndex: y - 1 });
      y -= 1;
    } else {
      ops.push({ type: "delete", leftIndex: x - 1 });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    ops.push({ type: "equal", leftIndex: x - 1, rightIndex: y - 1 });
    x -= 1;
    y -= 1;
  }

  while (x > 0) {
    ops.push({ type: "delete", leftIndex: x - 1 });
    x -= 1;
  }

  while (y > 0) {
    ops.push({ type: "insert", rightIndex: y - 1 });
    y -= 1;
  }

  return ops.reverse();
}

function diffLinesMyers(leftText: string, rightText: string, options: WhitespaceOptions): DiffLine[] {
  const leftNormalized = normalizeLineEndings(leftText, options.normalizeLineEndings);
  const rightNormalized = normalizeLineEndings(rightText, options.normalizeLineEndings);
  const leftLines = leftNormalized.split(/\r?\n/);
  const rightLines = rightNormalized.split(/\r?\n/);
  const leftCompare = leftLines.map((line) => normalizeLineForCompare(line, options));
  const rightCompare = rightLines.map((line) => normalizeLineForCompare(line, options));
  const ops = myersDiffOps(leftCompare, rightCompare);
  const result: DiffLine[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (let i = 0; i < ops.length; ) {
    const op = ops[i];
    if (op.type === "equal") {
      const leftTextValue = op.leftIndex !== undefined ? leftLines[op.leftIndex] : "";
      result.push({
        type: "same",
        leftText: leftTextValue,
        rightText: leftTextValue,
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
        const idx = ops[i].leftIndex ?? -1;
        deletes.push(leftLines[idx] ?? "");
      } else {
        const idx = ops[i].rightIndex ?? -1;
        inserts.push(rightLines[idx] ?? "");
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
  const [ignoreTrailingWhitespace, setIgnoreTrailingWhitespace] = useState(false);
  const [ignoreAllWhitespace, setIgnoreAllWhitespace] = useState(false);
  const [ignoreIndentation, setIgnoreIndentation] = useState(false);
  const [normalizeLineEndingsEnabled, setNormalizeLineEndingsEnabled] = useState(false);
  const [useTabWidth, setUseTabWidth] = useState(false);
  const [tabWidth, setTabWidth] = useState(4);
  const [inlineHighlight, setInlineHighlight] = useState(false);
  const [contextLines, setContextLines] = useState(3);
  const [viewMode, setViewMode] = useState<"unified" | "side-by-side">("unified");
  const [filterMode, setFilterMode] = useState<"all" | "changed" | "add" | "remove" | "change">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [changeIndex, setChangeIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  const whitespaceOptions = useMemo(
    () => ({
      ignoreTrailingWhitespace,
      ignoreAllWhitespace,
      ignoreIndentation,
      normalizeLineEndings: normalizeLineEndingsEnabled,
      useTabWidth,
      tabWidth,
    }),
    [
      ignoreTrailingWhitespace,
      ignoreAllWhitespace,
      ignoreIndentation,
      normalizeLineEndingsEnabled,
      useTabWidth,
      tabWidth,
    ],
  );

  const diffFull = useMemo(() => diffLinesMyers(left, right, whitespaceOptions), [left, right, whitespaceOptions]);
  const diff = useMemo(() => collapseDiffLines(diffFull, contextLines), [diffFull, contextLines]);
  const visibleLines = useMemo(() => {
    if (filterMode === "all") {
      return diff;
    }
    return diff.filter((line) => {
      if (line.type === "collapsed") {
        return false;
      }
      if (filterMode === "changed") {
        return line.type === "add" || line.type === "remove" || line.type === "change";
      }
      return line.type === filterMode;
    });
  }, [diff, filterMode]);

  const counts = useMemo(
    () => ({
      add: diffFull.filter((d) => d.type === "add").length,
      remove: diffFull.filter((d) => d.type === "remove").length,
      change: diffFull.filter((d) => d.type === "change").length,
      same: diffFull.filter((d) => d.type === "same").length,
    }),
    [diffFull],
  );

  const changeLineIndices = useMemo(
    () =>
      visibleLines
        .map((line, index) => ((line.type === "add" || line.type === "remove" || line.type === "change") ? index : -1))
        .filter((index) => index !== -1),
    [visibleLines],
  );

  const searchMatches = useMemo(() => {
    if (!searchQuery) {
      return [];
    }
    const query = searchQuery.toLowerCase();
    const matches: number[] = [];
    visibleLines.forEach((line, index) => {
      if (line.type === "collapsed") {
        return;
      }
      const leftValue = line.leftText ?? "";
      const rightValue = line.rightText ?? "";
      if (leftValue.toLowerCase().includes(query) || rightValue.toLowerCase().includes(query)) {
        matches.push(index);
      }
    });
    return matches;
  }, [visibleLines, searchQuery]);

  const searchMatchSet = useMemo(() => new Set(searchMatches), [searchMatches]);

  const selectedRange = useMemo(() => {
    if (selectedStart === null) {
      return null;
    }
    const endValue = selectedEnd ?? selectedStart;
    return {
      start: Math.min(selectedStart, endValue),
      end: Math.max(selectedStart, endValue),
    };
  }, [selectedStart, selectedEnd]);

  const selectionCount = useMemo(() => {
    if (!selectedRange) {
      return 0;
    }
    return selectedRange.end - selectedRange.start + 1;
  }, [selectedRange]);

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

  const unifiedLines = useMemo(() => visibleLines, [visibleLines]);

  const sideBySideLines = useMemo(() => visibleLines, [visibleLines]);

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

  const scrollToLine = useCallback((index: number) => {
    const element = lineRefs.current[index];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveLineIndex(index);
    }
  }, []);

  const handleCopyLine = async (line: DiffLine) => {
    if (line.type === "collapsed") {
      return;
    }
    const patch = buildPatchFromLines([line]);
    try {
      await navigator.clipboard.writeText(patch);
      setStatus("Copied line");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopySelection = async () => {
    if (!selectedRange) {
      setStatus("No selection");
      return;
    }
    const lines = visibleLines.slice(selectedRange.start, selectedRange.end + 1).filter((line) => line.type !== "collapsed");
    if (!lines.length) {
      setStatus("Selection is empty");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildPatchFromLines(lines));
      setStatus("Copied selection as patch");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleLineClick = (index: number, line: DiffLine, event: React.MouseEvent<HTMLDivElement>) => {
    if (line.type === "collapsed") {
      return;
    }
    if (selectionMode || event.shiftKey) {
      if (event.shiftKey && !selectionMode) {
        setSelectionMode(true);
      }
      if (selectedStart === null || (selectedStart !== null && selectedEnd !== null)) {
        setSelectedStart(index);
        setSelectedEnd(null);
      } else {
        setSelectedEnd(index);
      }
      setStatus("Selection updated");
      setActiveLineIndex(index);
      return;
    }
    setSelectedStart(null);
    setSelectedEnd(null);
    handleCopyLine(line);
  };

  const goToChange = useCallback(
    (direction: "next" | "prev") => {
      if (!changeLineIndices.length) {
        setStatus("No changes found");
        return;
      }
      setChangeIndex((prev) => {
        const step = direction === "next" ? 1 : -1;
        const nextIndex = (prev + step + changeLineIndices.length) % changeLineIndices.length;
        scrollToLine(changeLineIndices[nextIndex]);
        return nextIndex;
      });
    },
    [changeLineIndices, scrollToLine],
  );

  const goToMatch = useCallback(
    (direction: "next" | "prev") => {
      if (!searchMatches.length) {
        setStatus("No matches found");
        return;
      }
      setSearchIndex((prev) => {
        const step = direction === "next" ? 1 : -1;
        const nextIndex = (prev + step + searchMatches.length) % searchMatches.length;
        scrollToLine(searchMatches[nextIndex]);
        return nextIndex;
      });
    },
    [searchMatches, scrollToLine],
  );

  useEffect(() => {
    setSearchIndex(0);
    if (searchQuery && searchMatches.length) {
      scrollToLine(searchMatches[0]);
    }
  }, [searchQuery, searchMatches, scrollToLine]);

  useEffect(() => {
    setChangeIndex(0);
    setActiveLineIndex(null);
    setSelectedStart(null);
    setSelectedEnd(null);
  }, [filterMode, viewMode, diffFull]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable))
      ) {
        return;
      }
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        goToChange("next");
      }
      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        goToChange("prev");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToChange]);

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
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Whitespace</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={ignoreTrailingWhitespace}
              disabled={ignoreAllWhitespace}
              onChange={(e) => {
                setIgnoreTrailingWhitespace(e.target.checked);
                setStatus(e.target.checked ? "Ignoring trailing whitespace" : "Trailing whitespace included");
              }}
            />
            Ignore trailing whitespace
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={ignoreAllWhitespace}
              onChange={(e) => {
                setIgnoreAllWhitespace(e.target.checked);
                setStatus(e.target.checked ? "Ignoring all whitespace changes" : "Whitespace changes included");
              }}
            />
            Ignore all whitespace
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={ignoreIndentation}
              disabled={ignoreAllWhitespace}
              onChange={(e) => {
                setIgnoreIndentation(e.target.checked);
                setStatus(e.target.checked ? "Ignoring indentation changes" : "Indentation changes included");
              }}
            />
            Ignore indentation
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={normalizeLineEndingsEnabled}
              onChange={(e) => {
                setNormalizeLineEndingsEnabled(e.target.checked);
                setStatus(e.target.checked ? "Normalized line endings" : "Line endings preserved");
              }}
            />
            Normalize line endings
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={useTabWidth}
              onChange={(e) => {
                setUseTabWidth(e.target.checked);
                setStatus(e.target.checked ? `Treating tabs as ${tabWidth} spaces` : "Tabs preserved");
              }}
            />
            Tabs as
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              value={tabWidth}
              disabled={!useTabWidth}
              onChange={(e) => {
                const value = Number(e.target.value);
                setTabWidth(value);
                setStatus(`Treating tabs as ${value} spaces`);
              }}
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
            spaces
          </label>
        </div>
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

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToChange("prev")}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!changeLineIndices.length}
          >
            Previous change (p)
          </button>
          <button
            type="button"
            onClick={() => goToChange("next")}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!changeLineIndices.length}
          >
            Next change (n)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search diff"
            className="w-44 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-[var(--shadow-soft)] focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Search within diff"
          />
          <button
            type="button"
            onClick={() => goToMatch("prev")}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!searchMatches.length}
          >
            Prev match
          </button>
          <button
            type="button"
            onClick={() => goToMatch("next")}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!searchMatches.length}
          >
            Next match
          </button>
          <span className="text-xs text-slate-500">
            {searchMatches.length ? `${searchIndex + 1}/${searchMatches.length}` : "0/0"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Filter</span>
          <div className="flex overflow-hidden rounded-full ring-1 ring-slate-200">
            {[
              { value: "all", label: "All" },
              { value: "changed", label: "Changed" },
              { value: "add", label: "Add" },
              { value: "remove", label: "Remove" },
              { value: "change", label: "Modify" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFilterMode(option.value as typeof filterMode);
                  setStatus(`Filter: ${option.label}`);
                }}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  filterMode === option.value ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                }`}
                aria-pressed={filterMode === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectionMode((prev) => {
                const next = !prev;
                setStatus(next ? "Selection mode on" : "Selection mode off");
                return next;
              });
              setSelectedStart(null);
              setSelectedEnd(null);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${
              selectionMode ? "bg-slate-900 text-white" : "bg-white text-slate-700"
            }`}
            aria-pressed={selectionMode}
          >
            Select range
          </button>
          <button
            type="button"
            onClick={handleCopySelection}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!selectionCount}
          >
            Copy selection as patch
          </button>
          {selectionCount ? <span className="text-xs text-slate-500">{selectionCount} lines</span> : null}
        </div>
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

              const isSelected = selectedRange ? idx >= selectedRange.start && idx <= selectedRange.end : false;
              const isActive = activeLineIndex === idx;
              const isMatched = searchMatchSet.has(idx);

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
                  } ${isSelected ? "ring-1 ring-slate-400/50" : ""} ${
                    isActive ? "ring-2 ring-amber-300/50" : ""
                  } ${isMatched ? "shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]" : ""} cursor-pointer`}
                  ref={(el) => {
                    lineRefs.current[idx] = el;
                  }}
                  onClick={(event) => handleLineClick(idx, line, event)}
                >
                  <span className="mr-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    {line.type === "same" ? " " : line.type === "add" ? "+" : line.type === "remove" ? "-" : "~"}
                  </span>
                  <span className="mr-2 text-xs text-slate-300">
                    {line.leftLine ?? line.rightLine ?? idx + 1}
                  </span>
                {inlineHighlight && line.type === "change" && line.leftText && line.rightText ? (
                  (() => {
                    const { leftSegs, rightSegs } = diffWords(line.leftText, line.rightText);
                    return (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="inline-flex flex-wrap gap-0.5">
                          {leftSegs.map((seg, sIdx) => (
                            <span
                              key={`l-${sIdx}`}
                              className={
                                seg.same ? "" : "rounded bg-rose-200/20 px-0.5 text-rose-200 ring-1 ring-rose-300/30"
                              }
                            >
                              {renderHighlightedText(seg.text, searchQuery)}
                            </span>
                          ))}
                        </span>
                        <span className="text-xs uppercase tracking-[0.14em] text-slate-300">to</span>
                        <span className="inline-flex flex-wrap gap-0.5">
                          {rightSegs.map((seg, sIdx) => (
                            <span
                              key={`r-${sIdx}`}
                              className={
                                seg.same
                                  ? ""
                                  : "rounded bg-emerald-200/20 px-0.5 text-emerald-200 ring-1 ring-emerald-300/30"
                              }
                            >
                              {renderHighlightedText(seg.text, searchQuery)}
                            </span>
                          ))}
                        </span>
                      </span>
                    );
                  })()
                ) : (
                  <span>
                    {renderHighlightedText(
                      line.type === "add" ? line.rightText ?? "" : line.type === "remove" ? line.leftText ?? "" : line.leftText ?? "",
                      searchQuery,
                    )}
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

              const isSelected = selectedRange ? idx >= selectedRange.start && idx <= selectedRange.end : false;
              const isActive = activeLineIndex === idx;
              const isMatched = searchMatchSet.has(idx);
              const leftDisplay = line.type === "add" ? "" : line.leftText ?? "";
              const rightDisplay = line.type === "remove" ? "" : line.rightText ?? "";
              const leftNumber = line.type === "add" ? "" : line.leftLine ?? "";
              const rightNumber = line.type === "remove" ? "" : line.rightLine ?? "";

              return (
                <div
                  key={`${line.type}-${idx}`}
                  className={`grid grid-cols-2 gap-0 border-b border-slate-800 ${
                    isSelected ? "ring-1 ring-slate-400/50" : ""
                  } ${isActive ? "ring-2 ring-amber-300/50" : ""} ${
                    isMatched ? "shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]" : ""
                  } cursor-pointer`}
                  ref={(el) => {
                    lineRefs.current[idx] = el;
                  }}
                  onClick={(event) => handleLineClick(idx, line, event)}
                >
                  <div
                    className={`flex items-start gap-2 px-4 py-2 text-sm leading-relaxed ${
                      line.type === "remove" || line.type === "change" ? "bg-rose-900/30 text-rose-100" : "bg-transparent text-slate-100"
                    }`}
                  >
                    <span className="text-xs text-slate-400 w-10">{leftNumber}</span>
                    <span className="flex-1">
                      {inlineHighlight && line.type === "change" && line.leftText && line.rightText ? (
                        (() => {
                          const { leftSegs } = diffWords(line.leftText, line.rightText);
                          return leftSegs.map((seg, sIdx) => (
                            <span
                              key={sIdx}
                              className={
                                seg.same ? "" : "rounded bg-rose-200/20 px-0.5 text-rose-200 ring-1 ring-rose-300/30"
                              }
                            >
                              {renderHighlightedText(seg.text, searchQuery)}
                            </span>
                          ));
                        })()
                      ) : (
                        renderHighlightedText(leftDisplay, searchQuery)
                      )}
                    </span>
                  </div>
                  <div
                    className={`flex items-start gap-2 px-4 py-2 text-sm leading-relaxed ${
                      line.type === "add" || line.type === "change" ? "bg-emerald-900/30 text-emerald-100" : "bg-transparent text-slate-100"
                    }`}
                  >
                    <span className="text-xs text-slate-400 w-10 text-right">{rightNumber}</span>
                    <span className="flex-1 text-left">
                      {inlineHighlight && line.type === "change" && line.leftText && line.rightText ? (
                        (() => {
                          const { rightSegs } = diffWords(line.leftText, line.rightText);
                          return rightSegs.map((seg, sIdx) => (
                            <span
                              key={sIdx}
                              className={
                                seg.same
                                  ? ""
                                  : "rounded bg-emerald-200/20 px-0.5 text-emerald-200 ring-1 ring-emerald-300/30"
                              }
                            >
                              {renderHighlightedText(seg.text, searchQuery)}
                            </span>
                          ));
                        })()
                      ) : (
                        renderHighlightedText(rightDisplay, searchQuery)
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
          <li>Use the whitespace controls or view switcher (Unified/Side-by-side) to reduce noise.</li>
          <li>Enable inline highlight to see word-level changes inside changed lines.</li>
          <li>Copy the diff or download JSON for sharing or debugging.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Everything runs in your browser; text is not uploaded.</p>
          <p><strong>Large files?</strong> Inputs over ~200k characters or 10k lines will show a warning; consider trimming first.</p>
          <p><strong>Whitespace differences?</strong> Use the whitespace controls above to dampen spacing-only changes.</p>
        </div>
      </div>
    </main>
  );
}
