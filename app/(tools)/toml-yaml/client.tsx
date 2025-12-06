"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import yaml from "js-yaml";
import toml from "toml";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Sparkles, Upload } from "lucide-react";

type Mode = "toml-to-yaml" | "yaml-to-toml";

type SerializeOptions = {
  sortKeys: boolean;
};

type SerializableRecord = Record<string, unknown>;

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

const isPlainObject = (value: unknown): value is SerializableRecord =>
  Object.prototype.toString.call(value) === "[object Object]";

const serializePrimitive = (value: unknown, path: string): string => {
  if (value === null || value === undefined) {
    throw new Error(`Unsupported value at ${path || "root"}: null or undefined cannot be converted to TOML.`);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Unsupported number at ${path || "root"}: must be a finite value.`);
    }
    return String(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  throw new Error(`Unsupported value at ${path || "root"}: ${typeof value} cannot be converted to TOML.`);
};

const serializeArray = (arr: unknown[], path: string, options: SerializeOptions): string[] | string => {
  if (arr.some((item) => item === undefined || item === null)) {
    throw new Error(`Arrays cannot contain null or undefined values (${path || "root"}).`);
  }

  if (arr.every((item) => isPlainObject(item))) {
    const lines: string[] = [];
    arr.forEach((item, index) => {
      const tablePath = path ? `${path}` : path;
      lines.push(`[[${tablePath}]]`);
      lines.push(...serializeTable(item as SerializableRecord, tablePath, options));
      if (index !== arr.length - 1) {
        lines.push("");
      }
    });
    return lines;
  }

  if (arr.some((item) => isPlainObject(item))) {
    throw new Error(`Mixed arrays are not supported in TOML (${path || "root"}). Use separate objects or primitives.`);
  }

  const serializedItems = arr.map((item) => serializePrimitive(item, path));
  return `[${serializedItems.join(", ")}]`;
};

const serializeTable = (obj: SerializableRecord, path: string, options: SerializeOptions): string[] => {
  const lines: string[] = [];
  const nestedTables: Array<{ key: string; value: SerializableRecord }> = [];
  const tableArrays: Array<{ key: string; value: SerializableRecord[] }> = [];

  const entries = Object.entries(obj);
  const sortedEntries = options.sortKeys ? [...entries].sort(([a], [b]) => a.localeCompare(b)) : entries;

  sortedEntries.forEach(([key, value]) => {
    const fullPath = path ? `${path}.${key}` : key;

    if (Array.isArray(value)) {
      if (value.every((item) => isPlainObject(item))) {
        tableArrays.push({ key, value: value as SerializableRecord[] });
        return;
      }
      const serialized = serializeArray(value, fullPath, options);
      if (typeof serialized === "string") {
        lines.push(`${key} = ${serialized}`);
      } else {
        lines.push(...serialized);
      }
      return;
    }

    if (isPlainObject(value)) {
      nestedTables.push({ key, value });
      return;
    }

    lines.push(`${key} = ${serializePrimitive(value, fullPath)}`);
  });

  tableArrays.forEach(({ key, value }, index) => {
    value.forEach((item, itemIndex) => {
      const tablePath = path ? `${path}.${key}` : key;
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push(`[[${tablePath}]]`);
      lines.push(...serializeTable(item, tablePath, options));
      if (itemIndex !== value.length - 1 || index !== tableArrays.length - 1 || nestedTables.length > 0) {
        lines.push("");
      }
    });
  });

  nestedTables.forEach(({ key, value }, index) => {
    const tablePath = path ? `${path}.${key}` : key;
    lines.push(`[${tablePath}]`);
    lines.push(...serializeTable(value, tablePath, options));
    if (index !== nestedTables.length - 1) {
      lines.push("");
    }
  });

  return lines;
};

const convertToToml = (data: unknown, options: SerializeOptions): string => {
  if (!isPlainObject(data)) {
    throw new Error("TOML output requires an object at the root level.");
  }
  const lines = serializeTable(data, "", options);
  return lines.join("\n").trimEnd();
};

export default function TomlYamlClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("toml-to-yaml");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [yamlIndent, setYamlIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [autoConvert, setAutoConvert] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const autoConvertTimer = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState("Ready");
  const [isDragging, setIsDragging] = useState(false);

  const stats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const lines = input.split("\n").length;
    const chars = input.length;
    return { bytes, lines, chars };
  }, [input]);

  useEffect(() => {
    if (stats.bytes > MAX_SIZE_BYTES) {
      setWarning(`Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB.`);
    } else if (stats.bytes > 1024 * 1024) {
      setWarning(`Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB).`);
    } else {
      setWarning("");
    }
    setStatus("Ready");
  }, [stats.bytes]);

  useEffect(() => {
    if (!autoConvert) {
      return;
    }
    if (autoConvertTimer.current) {
      clearTimeout(autoConvertTimer.current);
    }
    autoConvertTimer.current = setTimeout(() => {
      if (!input.trim()) {
        setOutput("");
        setError("");
        return;
      }
      handleConvert();
    }, 250);
    return () => {
      if (autoConvertTimer.current) {
        clearTimeout(autoConvertTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, yamlIndent, sortKeys, autoConvert]);

  const getErrorMessage = (err: unknown, conversionMode: Mode): string => {
    if (err instanceof Error) {
      const { message } = err;
      if (conversionMode === "toml-to-yaml") {
        const tomlErr = err as Error & { line?: number; column?: number };
        if (typeof tomlErr.line === "number") {
          const colText = typeof tomlErr.column === "number" ? `, column ${tomlErr.column}` : "";
          return `Invalid TOML at line ${tomlErr.line}${colText}: ${message}`;
        }
        return `Invalid TOML: ${message}`;
      }
      const yamlErr = err as yaml.YAMLException & { mark?: { line: number; column: number } };
      if (yamlErr.mark && typeof yamlErr.mark.line === "number" && typeof yamlErr.mark.column === "number") {
        return `Invalid YAML at line ${yamlErr.mark.line + 1}, column ${yamlErr.mark.column + 1}: ${message}`;
      }
      return `Invalid YAML: ${message}`;
    }
    return `Invalid ${conversionMode === "toml-to-yaml" ? "TOML" : "YAML"} input.`;
  };

  const tryParseToml = (text: string) => {
    try {
      return { ok: true as const, value: toml.parse(text) };
    } catch (err) {
      return { ok: false as const, error: getErrorMessage(err, "toml-to-yaml") };
    }
  };

  const tryParseYaml = (text: string) => {
    try {
      return { ok: true as const, value: yaml.load(text) };
    } catch (err) {
      return { ok: false as const, error: getErrorMessage(err, "yaml-to-toml") };
    }
  };

  const sortObjectKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map((item) => sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
      return Object.keys(obj as Record<string, unknown>)
        .sort()
        .reduce((result: Record<string, unknown>, key) => {
          result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
          return result;
        }, {});
    }
    return obj;
  };

  const handleConvert = async () => {
    if (!input.trim()) {
      setError("");
      setOutput("");
      return;
    }

    setIsProcessing(true);
    setError("");

    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      if (mode === "toml-to-yaml") {
        const parsed = tryParseToml(input);
        if (!parsed.ok) {
          setError(parsed.error);
          setOutput("");
          setStatus("Error");
          return;
        }
        const dataToConvert = sortKeys ? sortObjectKeys(parsed.value) : parsed.value;
        try {
          setOutput(
            yaml.dump(dataToConvert, {
              indent: yamlIndent,
              lineWidth: -1,
              noRefs: true,
              sortKeys,
            })
          );
          setStatus("Completed");
        } catch (dumpErr) {
          setError("Unable to convert to YAML. Ensure TOML does not contain circular references.");
          setOutput("");
          setStatus("Error");
          return;
        }
      } else {
        const parsed = tryParseYaml(input);
        if (!parsed.ok) {
          setError(parsed.error);
          setOutput("");
          setStatus("Error");
          return;
        }
        if (!isPlainObject(parsed.value)) {
          setError("TOML output requires an object-like YAML document at the root.");
          setOutput("");
          setStatus("Error");
          return;
        }

        const dataToConvert = sortKeys ? (sortObjectKeys(parsed.value) as SerializableRecord) : (parsed.value as SerializableRecord);
        try {
          setOutput(convertToToml(dataToConvert, { sortKeys }));
          setStatus("Completed");
        } catch (serializeErr) {
          setError(getErrorMessage(serializeErr, "yaml-to-toml"));
          setOutput("");
          setStatus("Error");
          return;
        }
      }
    } catch (err) {
      console.error("Conversion error", err);
      setError(getErrorMessage(err, mode));
      setOutput("");
      setStatus("Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = [".toml", ".yaml", ".yml"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const validTypes = ["application/toml", "text/yaml", "application/x-yaml", "text/plain", "application/yaml"];

    if (!hasValidExt && !validTypes.includes(file.type)) {
      setError("Unsupported file type. Upload TOML, YAML, or YML files only.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB.`);
      return;
    }

    setIsUploading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      await new Promise((resolve) => setTimeout(resolve, 0));
      setInput(content);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
      setIsUploading(false);
    };
    reader.readAsText(file);

    event.target.value = '';
  };

  const handleDownload = () => {
    if (!output) return;

    try {
      const extension = mode === "toml-to-yaml" ? "yml" : "toml";
      const mimeType = mode === "toml-to-yaml" ? "text/yaml" : "text/plain";
      const blob = new Blob([output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download", err);
      setError("Unable to download file. Please try copying the output instead.");
    }
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setError("Unable to copy. Please select and copy manually.");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error || warning}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">TOML ⇄ YAML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert TOML to YAML or YAML to TOML with validation, sorting, and quick copy/download for config files.
        </p>
        <div className="text-xs text-slate-500" aria-live="polite">
          {autoConvert ? "Auto-convert enabled" : "Auto-convert disabled"}
        </div>
        <p className="text-xs text-slate-500">Runs entirely in your browser; files are not uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Direction</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Conversion direction"
            >
              <option value="toml-to-yaml">TOML → YAML</option>
              <option value="yaml-to-toml">YAML → TOML</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Convert between TOML and YAML"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Convert
              </>
            )}
          </button>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFileUpload({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>);
            }}
            className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${isUploading || isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isDragging ? 'ring-2 ring-slate-400 bg-slate-50' : ''}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Load or drop file
              </>
            )}
            <input
              type="file"
              accept=".toml,.yaml,.yml,text/yaml,text/plain"
              onChange={handleFileUpload}
              disabled={isUploading || isProcessing}
              className="hidden"
              aria-label="Upload file"
            />
          </label>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setError("");
            }}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Clear all fields"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="indent-size" className="text-xs font-medium text-slate-600">
              YAML Indent:
            </label>
            <select
              id="indent-size"
              value={yamlIndent}
              onChange={(e) => setYamlIndent(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Sort keys
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-convert
          </label>
        </div>

        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={mode === "toml-to-yaml" ? "Paste TOML here" : "Paste YAML here"}
          spellCheck={false}
          aria-label={`Input ${mode === "toml-to-yaml" ? "TOML" : "YAML"}`}
        />

        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines · {(stats.bytes / 1024).toFixed(2)}KB</span>
        </div>

        {warning && (
          <p className="text-sm font-medium text-blue-600">{warning}</p>
        )}
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">{error}</p>
        ) : !warning && (
          <p className="text-sm text-slate-600">
            Tip: Runs entirely in your browser—perfect for quick config tweaks.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="output-label">Output</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Download converted file"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre
          className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          aria-live="polite"
          aria-busy={isProcessing}
          role="region"
          aria-labelledby="output-label"
        >
          {isProcessing ? "Converting..." : output || "Converted output will appear here."}
        </pre>
      </div>

      <section className="space-y-2 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <strong>When to use TOML vs YAML?</strong> TOML suits tooling configs; YAML is common for CI/CD and infra. Convert based on the target system.
          </li>
          <li>
            <strong>Why did my array fail?</strong> TOML disallows mixed arrays and null/undefined entries. Keep arrays uniform.
          </li>
          <li>
            <strong>Privacy?</strong> Everything runs locally in your browser; no uploads.
          </li>
        </ul>
      </section>
    </main>
  );
}
