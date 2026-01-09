import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Clipboard, Download, FileJson2, Loader2, Wand2 } from "lucide-react";
import { TreeView } from "../TreeView";
import type { TreeNode } from "@/lib/json-utils";

type EditorStats = {
  bytes: number;
  lines: number;
  chars: number;
};

type ErrorLocation = { line: number; column: number } | null;

type EditorsProps = {
  input: string;
  output: string;
  error: string;
  errorLocation: ErrorLocation;
  warning: string;
  stats: EditorStats;
  isProcessing: boolean;
  copied: boolean;
  treeNodes: TreeNode[];
  selectedPath: string;
  controls: ReactNode;
  onInputChange: (value: string) => void;
  onPasteValue: (value: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onNodeClick: (path: string[], value: unknown) => void;
};

export function Editors({
  input,
  output,
  error,
  errorLocation,
  warning,
  stats,
  isProcessing,
  copied,
  treeNodes,
  selectedPath,
  controls,
  onInputChange,
  onPasteValue,
  onCopy,
  onDownload,
  onNodeClick,
}: EditorsProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "tree">("formatted");
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const inputEditorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const pasteHandlerRef = useRef(onPasteValue);

  useEffect(() => {
    pasteHandlerRef.current = onPasteValue;
  }, [onPasteValue]);

  const editorOptions = useMemo(
    () => ({
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
    }),
    []
  );

  const outputOptions = useMemo(
    () => ({
      ...editorOptions,
      readOnly: true,
      renderWhitespace: "boundary" as const,
    }),
    [editorOptions]
  );

  useEffect(() => {
    const editor = inputEditorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    if (!error || !errorLocation) {
      monaco.editor.setModelMarkers(model, "json-formatter", []);
      return;
    }

    monaco.editor.setModelMarkers(model, "json-formatter", [
      {
        severity: monaco.MarkerSeverity.Error,
        message: error,
        startLineNumber: errorLocation.line,
        startColumn: errorLocation.column,
        endLineNumber: errorLocation.line,
        endColumn: errorLocation.column + 1,
      },
    ]);
  }, [error, errorLocation]);

  const handleInputMount = (
    editor: import("monaco-editor").editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor")
  ) => {
    inputEditorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidPaste(() => {
      pasteHandlerRef.current(editor.getValue());
    });
  };

  const handleJumpToError = () => {
    if (!errorLocation) return;
    const editor = inputEditorRef.current;
    if (!editor) return;
    editor.revealPositionInCenter({ lineNumber: errorLocation.line, column: errorLocation.column });
    editor.setPosition({ lineNumber: errorLocation.line, column: errorLocation.column });
    editor.focus();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        {controls}
        <div className="h-[280px] overflow-hidden rounded-xl border border-slate-200 shadow-inner shadow-slate-200">
          <Editor
            height="100%"
            language="json"
            theme="vs"
            value={input}
            onChange={(value) => onInputChange(value ?? "")}
            onMount={handleInputMount}
            options={editorOptions}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            {stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines ·{" "}
            {(stats.bytes / 1024).toFixed(2)} KB
          </span>
        </div>

        {warning && <p className="text-sm font-medium text-blue-600">{warning}</p>}
        {error ? (
          errorLocation ? (
            <button
              type="button"
              onClick={handleJumpToError}
              className="text-left text-sm font-medium text-amber-600 transition hover:text-amber-500"
            >
              {error} (jump to line {errorLocation.line}, column {errorLocation.column})
            </button>
          ) : (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          )
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
                    viewMode === "tree" ? "bg-white/20 text-white" : "text-slate-400 hover:bg-white/10"
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
            <div className="relative flex-1">
              <Editor
                height="100%"
                language="json"
                theme="vs-dark"
                value={output}
                options={outputOptions}
              />
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
