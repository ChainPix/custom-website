import Editor from "@monaco-editor/react";
import { useMemo, useState } from "react";
import { diffJson } from "diff";
import { parseWithBetterError, sortObjectKeys } from "@/lib/json-utils";

type DiffPanelProps = {
  useJSON5: boolean;
  sortKeys: boolean;
};

type DiffState = {
  output: Array<{ value: string; added?: boolean; removed?: boolean }>;
  error: string;
  mergePatch: string;
};

const editorOptions = {
  fontSize: 13,
  minimap: { enabled: false },
  wordWrap: "on" as const,
  lineNumbers: "on" as const,
  scrollBeyondLastLine: false,
  tabSize: 2,
  insertSpaces: true,
  folding: true,
  matchBrackets: "always" as const,
  bracketPairColorization: { enabled: true },
};

const outputOptions = {
  ...editorOptions,
  readOnly: true,
  renderWhitespace: "boundary" as const,
};

const createMergePatch = (left: unknown, right: unknown): unknown => {
  if (Object.is(left, right)) return undefined;
  if (left === null || right === null) return right;
  if (Array.isArray(left) || Array.isArray(right)) return right;
  if (typeof left !== "object" || typeof right !== "object") return right;

  const leftObj = left as Record<string, unknown>;
  const rightObj = right as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]);

  keys.forEach((key) => {
    if (!(key in rightObj)) {
      patch[key] = null;
      return;
    }
    const childPatch = createMergePatch(leftObj[key], rightObj[key]);
    if (childPatch !== undefined) {
      patch[key] = childPatch;
    }
  });

  return patch;
};

export function DiffPanel({ useJSON5, sortKeys }: DiffPanelProps) {
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [diffState, setDiffState] = useState<DiffState>({ output: [], error: "", mergePatch: "" });
  const [showPatch, setShowPatch] = useState(false);

  const handleCompare = () => {
    const leftResult = parseWithBetterError(leftInput, useJSON5);
    if (leftResult.error) {
      setDiffState({ output: [], error: `Left JSON: ${leftResult.error}`, mergePatch: "" });
      return;
    }
    const rightResult = parseWithBetterError(rightInput, useJSON5);
    if (rightResult.error) {
      setDiffState({ output: [], error: `Right JSON: ${rightResult.error}`, mergePatch: "" });
      return;
    }

    const leftData = sortKeys ? sortObjectKeys(leftResult.parsed) : leftResult.parsed;
    const rightData = sortKeys ? sortObjectKeys(rightResult.parsed) : rightResult.parsed;
    const output = diffJson(leftData, rightData);
    const patch = createMergePatch(leftData, rightData);

    setDiffState({
      output,
      error: "",
      mergePatch: patch === undefined ? "{}" : JSON.stringify(patch, null, 2),
    });
  };

  const diffOutput = useMemo(() => {
    if (!diffState.output.length) return "Run compare to see differences.";
    return diffState.output;
  }, [diffState.output]);

  return (
    <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Diff mode</h3>
          <p className="text-xs text-slate-600">Paste JSON A and JSON B to compare changes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCompare}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Compare
          </button>
          <button
            onClick={() => setShowPatch((current) => !current)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {showPatch ? "Hide merge patch" : "Show merge patch"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[220px] overflow-hidden rounded-xl border border-slate-200">
          <Editor
            height="100%"
            language="json"
            theme="vs"
            value={leftInput}
            onChange={(value) => setLeftInput(value ?? "")}
            options={editorOptions}
          />
        </div>
        <div className="h-[220px] overflow-hidden rounded-xl border border-slate-200">
          <Editor
            height="100%"
            language="json"
            theme="vs"
            value={rightInput}
            onChange={(value) => setRightInput(value ?? "")}
            options={editorOptions}
          />
        </div>
      </div>

      {diffState.error ? (
        <p className="text-sm font-medium text-amber-600">{diffState.error}</p>
      ) : (
        <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs text-slate-100">
          {Array.isArray(diffOutput) ? (
            <pre className="whitespace-pre-wrap">
              {diffOutput.map((part, index) => (
                <span
                  key={`${part.value}-${index}`}
                  className={
                    part.added
                      ? "text-emerald-300"
                      : part.removed
                        ? "text-rose-300"
                        : "text-slate-100"
                  }
                >
                  {part.value}
                </span>
              ))}
            </pre>
          ) : (
            <p className="text-slate-400">{diffOutput}</p>
          )}
        </div>
      )}

      {showPatch && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Merge patch (RFC 7396)</p>
          <div className="h-[200px] overflow-hidden rounded-xl border border-slate-200">
            <Editor height="100%" language="json" theme="vs" value={diffState.mergePatch} options={outputOptions} />
          </div>
        </div>
      )}
    </section>
  );
}
