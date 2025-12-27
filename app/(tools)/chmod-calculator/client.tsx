"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Role = "user" | "group" | "other";
type PermKey = "r" | "w" | "x";
type ExplainTone = "light" | "dark";

type State = {
  user: Record<PermKey, boolean>;
  group: Record<PermKey, boolean>;
  other: Record<PermKey, boolean>;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
};

const defaultState: State = {
  user: { r: true, w: true, x: true },
  group: { r: true, w: false, x: true },
  other: { r: true, w: false, x: true },
  setuid: false,
  setgid: false,
  sticky: false,
};

const explainTone = {
  light: {
    digit: "cursor-help rounded px-0.5 underline decoration-dotted decoration-slate-400 underline-offset-2 text-slate-800",
    tooltip: "bg-slate-900 text-white",
    focus: "focus-visible:outline-slate-400",
  },
  dark: {
    digit: "cursor-help rounded px-0.5 underline decoration-dotted decoration-white/60 underline-offset-2 text-white",
    tooltip: "bg-white text-slate-900",
    focus: "focus-visible:outline-white/70",
  },
} as const;

const specialExplain = "4=setuid, 2=setgid, 1=sticky";

function explainPermDigit(digit: number) {
  const parts: string[] = [];
  if (digit & 4) parts.push("4(r)");
  if (digit & 2) parts.push("2(w)");
  if (digit & 1) parts.push("1(x)");
  if (parts.length === 0) return `${digit} = no permissions`;
  return `${digit} = ${parts.join(" + ")}`;
}

function stateToOctal(state: State) {
  const special =
    (state.setuid ? 4 : 0) +
    (state.setgid ? 2 : 0) +
    (state.sticky ? 1 : 0);
  const roles: Role[] = ["user", "group", "other"];
  const digits = roles.map((role) => {
    const r = state[role].r ? 4 : 0;
    const w = state[role].w ? 2 : 0;
    const x = state[role].x ? 1 : 0;
    return r + w + x;
  });
  const octal = `${special}${digits.join("")}`;
  return octal.replace(/^0+/, "") || "0";
}

function stateToSymbolic(state: State) {
  const parts: string[] = [];
  const roles: Role[] = ["user", "group", "other"];
  roles.forEach((role, idx) => {
    const r = state[role].r ? "r" : "-";
    const w = state[role].w ? "w" : "-";
    let x = state[role].x ? "x" : "-";
    if (idx === 0 && state.setuid) x = state[role].x ? "s" : "S";
    if (idx === 1 && state.setgid) x = state[role].x ? "s" : "S";
    if (idx === 2 && state.sticky) x = state[role].x ? "t" : "T";
    parts.push(`${r}${w}${x}`);
  });
  return parts.join("");
}

function octalToState(input: string): State | null {
  const clean = input.trim();
  const match = clean.match(/^[0-7]{3,4}$/);
  if (!match) return null;
  const padded = clean.length === 3 ? `0${clean}` : clean;
  const [s, u, g, o] = padded.split("").map((d) => parseInt(d, 10));
  const toPerms = (digit: number) => ({
    r: !!(digit & 4),
    w: !!(digit & 2),
    x: !!(digit & 1),
  });
  return {
    user: toPerms(u),
    group: toPerms(g),
    other: toPerms(o),
    setuid: !!(s & 4),
    setgid: !!(s & 2),
    sticky: !!(s & 1),
  };
}

export default function ChmodCalculatorClient() {
  const [state, setState] = useState<State>(defaultState);
  const [octalInput, setOctalInput] = useState("755");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [explainMode, setExplainMode] = useState(true);
  const [pathHint, setPathHint] = useState("");
  const [pathType, setPathType] = useState<"script" | "secrets" | "assets">("script");

  const octal = useMemo(() => stateToOctal(state), [state]);
  const symbolic = useMemo(() => stateToSymbolic(state), [state]);

  useEffect(() => {
    setOctalInput(octal);
  }, [octal]);

  const status = useMemo(() => {
    if (error) return error;
    return `Octal ${octal}, Symbolic ${symbolic}`;
  }, [error, octal, symbolic]);

  const securityHints = useMemo(() => {
    const hints: { title: string; detail: string }[] = [];
    const isWorldWritable = state.other.w;
    const isAllSeven =
      state.user.r &&
      state.user.w &&
      state.user.x &&
      state.group.r &&
      state.group.w &&
      state.group.x &&
      state.other.r &&
      state.other.w &&
      state.other.x &&
      !state.setuid &&
      !state.setgid &&
      !state.sticky;
    const hasWrite = state.user.w || state.group.w || state.other.w;

    if (isWorldWritable) {
      hints.push({
        title: "World-writable",
        detail: "Anyone can modify this file/dir. Avoid unless absolutely required.",
      });
    }
    if (isAllSeven) {
      hints.push({
        title: "777 on a file",
        detail: "Big red flag for files. Prefer 755 for executables or 644 for data.",
      });
    }
    if (state.setuid && hasWrite) {
      hints.push({
        title: "setuid + writable",
        detail: "Elevated execution with write access is risky. Lock ownership and scope.",
      });
    }

    return hints;
  }, [state]);

  const pathRecommendations = {
    script: { mode: "755", label: "Executable script", detail: "Owner can read/write/execute; others can read/execute." },
    secrets: { mode: "600", label: "Config file with secrets", detail: "Lock to owner only." },
    assets: { mode: "644", label: "Public web assets", detail: "Readable by all, writable by owner." },
  } as const;
  const activePathRec = pathRecommendations[pathType];

  const togglePerm = (role: Role, perm: PermKey) => {
    setState((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] },
    }));
  };

  const handleOctalInput = (value: string) => {
    setOctalInput(value);
    const next = octalToState(value);
    if (next) {
      setState(next);
      setError("");
    } else {
      setError("Enter a valid octal (e.g., 755 or 4755).");
    }
  };

  const handleCopy = async () => {
    const text = `chmod ${octal}  # ${symbolic}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const roles: Role[] = ["user", "group", "other"];
  const renderOctal = (tone: ExplainTone) => {
    const digits = octal.split("");
    const hasSpecial = digits.length === 4;
    const toneClasses = explainTone[tone];

    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`Octal ${octal}`}>
        {digits.map((digit, idx) => {
          const isSpecial = hasSpecial && idx === 0;
          const tooltip = isSpecial ? specialExplain : explainPermDigit(Number(digit));
          if (!explainMode) {
            return <span key={`${digit}-${idx}`}>{digit}</span>;
          }

          return (
            <span key={`${digit}-${idx}`} className="group relative inline-flex">
              <span
                tabIndex={0}
                className={`${toneClasses.digit} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${toneClasses.focus}`}
              >
                {digit}
              </span>
              <span
                className={`${toneClasses.tooltip} pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg px-2 py-1 text-xs opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100`}
              >
                {tooltip}
              </span>
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied" : ""}
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
              Chmod Calculator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Permission / chmod Calculator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Toggle read, write, execute, and special bits to see octal and symbolic representations. Runs locally in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Octal (e.g., 755 or 4755)
              <input
                value={octalInput}
                onChange={(e) => handleOctalInput(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Octal input"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setState(defaultState);
                  setError("");
                  setCopied(false);
                }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Reset permissions"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                aria-label="Copy chmod command"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy chmod"}
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={explainMode}
                onChange={() => setExplainMode((prev) => !prev)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Explain mode"
              />
              Explain mode
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
            <p className="text-sm font-semibold text-slate-900">Symbolic</p>
            <p className="font-mono text-base text-slate-800">{symbolic}</p>
            <p className="text-xs text-slate-600">
              Octal: <span className="font-mono text-sm text-slate-800">{renderOctal("light")}</span>
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((role) => (
              <div key={role} className="rounded-xl border border-slate-200 bg-white p-3 shadow-inner shadow-slate-200">
                <p className="mb-2 text-sm font-semibold capitalize text-slate-900">{role}</p>
                {(["r", "w", "x"] as PermKey[]).map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={state[role][perm]}
                      onChange={() => togglePerm(role, perm)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                      aria-label={`${role} ${perm}`}
                    />
                    {perm === "r" ? "Read" : perm === "w" ? "Write" : "Execute"}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.setuid}
                onChange={() => setState((prev) => ({ ...prev, setuid: !prev.setuid }))}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Setuid"
              />
              setuid
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.setgid}
                onChange={() => setState((prev) => ({ ...prev, setgid: !prev.setgid }))}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Setgid"
              />
              setgid
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={state.sticky}
                onChange={() => setState((prev) => ({ ...prev, sticky: !prev.sticky }))}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Sticky bit"
              />
              Sticky bit
            </label>
          </div>

          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}

          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">What does this mean?</p>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Security hints</span>
            </div>
            {securityHints.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No red flags for this selection.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {securityHints.map((hint) => (
                  <li key={hint.title} className="rounded-lg border border-rose-200 bg-rose-50/80 p-2 text-rose-900">
                    <p className="text-xs font-semibold uppercase tracking-wide">{hint.title}</p>
                    <p className="text-sm">{hint.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Path-aware helper</p>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Guidance only</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                File path (optional)
                <input
                  value={pathHint}
                  onChange={(e) => setPathHint(e.target.value)}
                  placeholder="/var/www/app/config.env"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label="File path input"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Usage
                <select
                  value={pathType}
                  onChange={(e) => setPathType(e.target.value as "script" | "secrets" | "assets")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label="Usage type"
                >
                  <option value="script">Executable script</option>
                  <option value="secrets">Config file with secrets</option>
                  <option value="assets">Public web assets</option>
                </select>
              </label>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended mode</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-lg text-slate-900">{activePathRec.mode}</span>
                <span className="text-sm text-slate-600">{activePathRec.label}</span>
              </p>
              <p className="text-xs text-slate-600">{activePathRec.detail}</p>
              {pathHint.trim() ? (
                <p className="mt-1 text-xs text-slate-500">Path noted: {pathHint.trim()}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              chmod cheat sheet
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4 text-sm leading-relaxed text-slate-100" role="region" aria-labelledby="output-heading">
            <p className="font-semibold">Current</p>
            <p className="font-mono text-base">chmod {renderOctal("dark")}</p>
            <p className="font-mono text-base">{symbolic}</p>
            <div className="h-px bg-white/10" />
            <p className="font-semibold">Common modes</p>
            <ul className="space-y-1">
              <li>644: rw-r--r-- (files)</li>
              <li>755: rwxr-xr-x (executables)</li>
              <li>700: rwx------ (private)</li>
              <li>775: rwxrwxr-x (shared)</li>
            </ul>
            <div className="h-px bg-white/10" />
            <p className="font-semibold">Special bits</p>
            <ul className="space-y-1">
              <li>setuid: user execute bit shown as s/S</li>
              <li>setgid: group execute bit shown as s/S</li>
              <li>sticky: other execute bit shown as t/T</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
