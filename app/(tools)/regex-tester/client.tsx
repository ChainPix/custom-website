"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const flagOptions = [
  { key: "i", label: "Ignore case (i)" },
  { key: "g", label: "Global (g)" },
  { key: "m", label: "Multiline (m)" },
  { key: "s", label: "Dotall (s)" },
  { key: "y", label: "Sticky (y)" },
] as const;

export default function RegexTesterClient() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [escapeInput, setEscapeInput] = useState(false);
  const [patternError, setPatternError] = useState("");
  const [autoRun, setAutoRun] = useState(true);
  const [runVersion, setRunVersion] = useState(0);

  const regex = useMemo(() => {
    if (!pattern) {
      setPatternError("");
      return null;
    }
    const source = escapeInput ? pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : pattern;
    try {
      setPatternError("");
      return new RegExp(source, flags.join(""));
    } catch (err) {
      setPatternError("Invalid regex pattern.");
      return null;
    }
  }, [pattern, flags, escapeInput]);

  const matches = useMemo(() => {
    if (!autoRun && runVersion === 0) return [];
    if (!regex) return [];
    if (!text) return [];
    regex.lastIndex = 0;
    const collectAll = flags.includes("g");
    const list: Array<{
      match: string;
      index: number;
      groups: string[];
      namedGroups: Record<string, string | undefined>;
      zeroLength: boolean;
    }> = [];
    const pushMatch = (m: RegExpExecArray) => {
      const matchText = m[0] ?? "";
      list.push({
        match: matchText,
        index: m.index ?? 0,
        groups: m.slice(1),
        namedGroups: m.groups ?? {},
        zeroLength: matchText.length === 0,
      });
    };
    if (!collectAll) {
      const single = regex.exec(text);
      if (single) pushMatch(single);
      return list;
    }
    let next = regex.exec(text);
    while (next) {
      pushMatch(next);
      if (next[0] === "") {
        if (regex.lastIndex >= text.length) break;
        regex.lastIndex += 1;
      }
      next = regex.exec(text);
    }
    return list;
  }, [regex, text, autoRun, runVersion, flags]);

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(matches.map((m) => m.match).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied matches");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  useEffect(() => {
    const chars = text.length;
    const lines = text ? text.split("\n").length : 0;
    if (chars > 50000) {
      setWarning(`Large input (${chars.toLocaleString()} chars, ${lines.toLocaleString()} lines). Matching may be slow.`);
    } else {
      setWarning("");
    }
  }, [text]);

  const highlightSegments = useMemo(() => {
    if (!text || !matches.length) return [{ key: "all", content: text, highlight: false }];
    const segs: Array<{ key: string; content: string; highlight: boolean; zeroLength?: boolean }> = [];
    let cursor = 0;
    matches.forEach((m, idx) => {
      const start = m.index ?? 0;
      const end = start + m.match.length;
      if (start > cursor) {
        segs.push({ key: `plain-${idx}`, content: text.slice(cursor, start), highlight: false });
      }
      if (end === start) {
        segs.push({ key: `hit-${idx}`, content: "|", highlight: true, zeroLength: true });
      } else {
        segs.push({ key: `hit-${idx}`, content: text.slice(start, end), highlight: true });
      }
      cursor = end;
    });
    if (cursor < text.length) {
      segs.push({ key: "tail", content: text.slice(cursor), highlight: false });
    }
    return segs;
  }, [text, matches]);

  const totalCaptureGroups = useMemo(
    () => matches.reduce((sum, m) => sum + m.groups.length, 0),
    [matches],
  );

  const totalNamedGroups = useMemo(
    () => matches.reduce((sum, m) => sum + Object.keys(m.namedGroups).length, 0),
    [matches],
  );

  const hasZeroLengthMatches = useMemo(() => matches.some((m) => m.zeroLength), [matches]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(matches, null, 2));
      setStatus("Copied JSON");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(matches, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "regex-matches.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const runMatches = () => {
    setRunVersion((v) => v + 1);
    setStatus("Ran test");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {patternError}
      </div>
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
              Regex Tester
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Regex Tester</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Test regular expressions with flags and see matches instantly. Runs in your browser.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={pattern}
            onChange={(event) => {
              setPattern(event.target.value);
              if (autoRun) setRunVersion((v) => v + 1);
            }}
            className="flex-1 min-w-[240px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Enter regex pattern e.g. \\w+"
            aria-label="Regex pattern"
          />
          <div className="flex flex-wrap gap-2">
            {flagOptions.map((flag) => (
              <label
                key={flag.key}
                className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-slate-900"
                  checked={flags.includes(flag.key)}
                  onChange={() => toggleFlag(flag.key)}
                />
                {flag.label}
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              setPattern("");
              setFlags(["g"]);
              setText("");
              setRunVersion(0);
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={() => {
              setPattern("\\b[A-Za-z]{4}\\b");
              setText("This test text finds four letter words like test, code, and more.");
              setRunVersion((v) => v + 1);
              setStatus("Loaded sample");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Sample pattern/text
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={escapeInput}
              onChange={(e) => setEscapeInput(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Escape input as literal
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => {
                setAutoRun(e.target.checked);
                if (e.target.checked) setRunVersion((v) => v + 1);
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-run
          </label>
          <button
            type="button"
            onClick={runMatches}
            disabled={autoRun}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Run regex manually"
          >
            Run
          </button>
          {warning && (
            <span className="font-medium text-amber-600" role="alert">
              {warning}
            </span>
          )}
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (autoRun) setRunVersion((v) => v + 1);
          }}
          placeholder="Paste test text here"
          aria-label="Test text"
        />
        {patternError ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {patternError}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Matches: {matches.length}
            {matches.length ? (
              <>
                {" "}
                · Capture groups: {totalCaptureGroups}
                {" · "}Named groups: {totalNamedGroups}
              </>
            ) : (
              " (none)"
            )}
          </p>
        )}
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-label="Regex matches"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Matches</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Copy all matches"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy all"}
            </button>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Copy matches as JSON"
            >
              JSON
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Download matches as JSON"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      <div className="bg-slate-800/70 px-4 py-3 text-xs text-slate-300">
        <p className="font-semibold text-slate-100">Highlighted text</p>
        {hasZeroLengthMatches ? (
          <p className="mt-1 text-[11px] text-slate-400">Zero-length matches are shown as a highlighted | marker.</p>
        ) : null}
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left font-mono text-[12px] leading-relaxed">
          {highlightSegments.map((seg) => (
            <span
                key={seg.key}
                className={
                  seg.highlight
                    ? `rounded bg-emerald-600/60 px-0.5 text-white${seg.zeroLength ? " ring-1 ring-emerald-200" : ""}`
                    : ""
                }
              >
                {seg.content}
              </span>
            ))}
          </div>
        </div>
        <div className="max-h-[260px] overflow-auto divide-y divide-slate-800">
          {matches.length ? (
            matches.map((m, idx) => (
              <div key={`${m.index}-${idx}`} className="px-4 py-3 text-sm leading-relaxed">
                <p className="font-semibold text-emerald-300">
                  {m.match === "" ? "'' (zero-length)" : m.match}
                </p>
                <p className="text-xs text-slate-400">Index: {m.index}</p>
                {m.groups.length ? (
                  <div className="mt-1 space-y-1 text-xs text-slate-200">
                    {m.groups.map((g, gi) => (
                      <p key={`${idx}-g-${gi}`}>
                        Group {gi + 1}: <span className="font-mono text-emerald-200">{g || "''"}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
                {Object.keys(m.namedGroups).length ? (
                  <div className="mt-2 space-y-1 text-xs text-slate-200">
                    <p className="font-semibold text-slate-100">Named groups</p>
                    {Object.entries(m.namedGroups).map(([name, value]) => (
                      <p key={`${idx}-ng-${name}`}>
                        {name}: <span className="font-mono text-emerald-200">{value || "''"}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-300">No matches yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a regex pattern and toggle flags (i/g/m/s) as needed.</li>
          <li>Paste your test text; matches highlight in the preview and list below.</li>
          <li>Use `Escape input` to treat the pattern as literal text.</li>
          <li>Copy or download matches as JSON for quick debugging.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes, everything happens in your browser; no data is sent to a server.</p>
          <p>
            <strong>Why do I see no matches?</strong> Make sure your pattern is valid and flags are set correctly; use the sample
            button to verify the workflow.
          </p>
          <p><strong>Can I test large text?</strong> Yes, but inputs over ~50k chars will show a warning to avoid slow runs.</p>
        </div>
      </div>
    </main>
  );
}
