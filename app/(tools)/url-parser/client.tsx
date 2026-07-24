"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Clipboard,
  Check,
  Download,
  RefreshCcw,
  Plus,
  X,
  Edit2,
  Save,
  History,
  Search,
  AlertCircle,
  ExternalLink,
  FileCode2,
} from "lucide-react";

type Parsed = {
  url?: URL;
  error?: string;
  warnings?: string[];
};

type QueryParam = {
  key: string;
  value: string;
  rawKey: string;
  rawValue: string;
};

type HistoryItem = {
  url: string;
  timestamp: number;
};

type ValidationResult = {
  isValid: boolean;
  portValid: boolean;
  ipValid: boolean | null;
  idnDetected: boolean;
  subdomainInfo: {
    subdomain: string | null;
    domain: string;
    tld: string | null;
  } | null;
};

// Validation utilities
function isValidPort(port: string): boolean {
  if (!port) return true;
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 0 && portNum <= 65535;
}

function isValidIPv4(hostname: string): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

function isValidIPv6(hostname: string): boolean {
  // Simplified IPv6 validation
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Pattern.test(hostname);
}

function detectIDN(hostname: string): boolean {
  // Check if hostname contains punycode (xn--) or non-ASCII characters
  return hostname.includes("xn--") || /[^\x00-\x7F]/.test(hostname);
}

function extractSubdomain(hostname: string): {
  subdomain: string | null;
  domain: string;
  tld: string | null;
} {
  // Skip IP addresses
  if (isValidIPv4(hostname) || isValidIPv6(hostname)) {
    return { subdomain: null, domain: hostname, tld: null };
  }

  const parts = hostname.split(".");
  if (parts.length < 2) {
    return { subdomain: null, domain: hostname, tld: null };
  }

  const tld = parts[parts.length - 1];
  const domain = parts[parts.length - 2];
  const subdomain = parts.length > 2 ? parts.slice(0, -2).join(".") : null;

  return { subdomain, domain, tld };
}

function validateUrl(url: URL): ValidationResult {
  const hostname = url.hostname.replace(/^\[|\]$/g, ""); // Remove IPv6 brackets
  const portValid = isValidPort(url.port);
  let ipValid: boolean | null = null;

  if (hostname) {
    if (isValidIPv4(hostname)) {
      ipValid = true;
    } else if (isValidIPv6(url.hostname)) {
      ipValid = true;
    } else if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      ipValid = false; // Looks like IPv4 but invalid
    }
  }

  const idnDetected = detectIDN(hostname);
  const subdomainInfo = extractSubdomain(hostname);

  return {
    isValid: portValid,
    portValid,
    ipValid,
    idnDetected,
    subdomainInfo,
  };
}

function parseUrl(value: string, allowRelative: boolean = false): Parsed {
  try {
    let urlToParse = value;

    // Try to handle relative URLs if allowed
    if (allowRelative && !value.match(/^[a-z]+:\/\//i)) {
      urlToParse = `https://example.com${value.startsWith("/") ? "" : "/"}${value}`;
    }

    const url = new URL(urlToParse);
    const validation = validateUrl(url);
    const warnings: string[] = [];

    if (!validation.portValid) {
      warnings.push("Port number is invalid (must be 0-65535)");
    }
    if (validation.ipValid === false) {
      warnings.push("Hostname appears to be a malformed IP address");
    }
    if (validation.idnDetected) {
      warnings.push("Internationalized Domain Name (IDN) detected - shown as punycode");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      warnings.push("Non-http/https scheme detected");
    }

    return { url, warnings: warnings.length > 0 ? warnings : undefined };
  } catch {
    return { error: "Invalid URL" };
  }
}

export default function UrlParserClient() {
  const [input, setInput] = useState("https://example.com/path?foo=bar&count=2#hash");
  const [copied, setCopied] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [showDecoded, setShowDecoded] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [paramSearch, setParamSearch] = useState("");
  const [editingParams, setEditingParams] = useState(false);
  const [editedParams, setEditedParams] = useState<Array<{ key: string; value: string }>>([]);
  const [allowRelative, setAllowRelative] = useState(false);
  const MAX_LEN = 10000; // Increased from 5000
  const MAX_HISTORY = 10;

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("url-parser-history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }, []);

  // Save to history
  const saveToHistory = (url: string) => {
    if (!url || url.length > MAX_LEN) return;

    const newHistory = [
      { url, timestamp: Date.now() },
      ...history.filter((h) => h.url !== url),
    ].slice(0, MAX_HISTORY);

    setHistory(newHistory);
    try {
      localStorage.setItem("url-parser-history", JSON.stringify(newHistory));
    } catch (err) {
      console.error("Failed to save history", err);
    }
  };

  const parsed = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setWarning("Enter a URL to parse.");
      return { error: "No URL provided" };
    }
    if (trimmed.length > MAX_LEN) {
      setWarning(`URL is very long (>${MAX_LEN} chars); parsing skipped.`);
      return { error: "URL too long" };
    }
    const result = parseUrl(trimmed, allowRelative);

    if (result.url) {
      if (result.warnings && result.warnings.length > 0) {
        setWarning(result.warnings.join(". "));
      } else {
        setWarning("");
      }
      // Save to history
      saveToHistory(trimmed);
    } else {
      setWarning("Invalid URL. Use an absolute URL starting with http(s)://");
    }
    return result;
  }, [input, allowRelative]);

  const params = useMemo(() => {
    if (!parsed.url) return [];
    const entries: QueryParam[] = [];
    parsed.url.searchParams.forEach((value, key) =>
      entries.push({
        key,
        value,
        rawKey: encodeURIComponent(key),
        rawValue: encodeURIComponent(value),
      }),
    );
    return entries;
  }, [parsed]);

  // Filtered params based on search
  const filteredParams = useMemo(() => {
    if (!paramSearch) return params;
    const search = paramSearch.toLowerCase();
    return params.filter(
      (p) => p.key.toLowerCase().includes(search) || p.value.toLowerCase().includes(search),
    );
  }, [params, paramSearch]);

  // Initialize edited params when entering edit mode
  useEffect(() => {
    if (editingParams) {
      setEditedParams(params.map((p) => ({ key: p.key, value: p.value })));
    }
  }, [editingParams, params]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const downloadParams = (format: "json" | "csv") => {
    if (!params.length) return;
    const data =
      format === "json"
        ? JSON.stringify(
            params.map((p) => ({
              key: showDecoded ? p.key : p.rawKey,
              value: showDecoded ? p.value : p.rawValue,
            })),
            null,
            2,
          )
        : (() => {
            const header = "key,value";
            const rows = params.map((p) => {
              const key = showDecoded ? p.key : p.rawKey;
              const val = showDecoded ? p.value : p.rawValue;
              const safe = String(val).replace(/"/g, '""');
              return `"${key}","${safe}"`;
            });
            return [header, ...rows].join("\n");
          })();
    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "json" ? "params.json" : "params.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllComponents = () => {
    if (!parsed.url) return;

    const validation = validateUrl(parsed.url);
    const allData = {
      url: parsed.url.href,
      components: {
        origin: parsed.url.origin,
        protocol: parsed.url.protocol,
        username: parsed.url.username || null,
        password: parsed.url.password || null,
        hostname: parsed.url.hostname,
        port: parsed.url.port || null,
        pathname: parsed.url.pathname,
        search: parsed.url.search,
        hash: parsed.url.hash,
      },
      subdomain: validation.subdomainInfo,
      queryParameters: params.map((p) => ({
        key: p.key,
        value: p.value,
      })),
      validation: {
        portValid: validation.portValid,
        ipAddress: validation.ipValid,
        idnDetected: validation.idnDetected,
      },
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "url-components.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const regenerateUrl = () => {
    if (!parsed.url) return;

    try {
      const newUrl = new URL(parsed.url.href);
      newUrl.search = "";

      editedParams.forEach((param) => {
        if (param.key) {
          newUrl.searchParams.append(param.key, param.value);
        }
      });

      setInput(newUrl.href);
      setEditingParams(false);
    } catch (err) {
      console.error("Failed to regenerate URL", err);
    }
  };

  const addParam = () => {
    setEditedParams([...editedParams, { key: "", value: "" }]);
  };

  const removeParam = (index: number) => {
    setEditedParams(editedParams.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: "key" | "value", value: string) => {
    const updated = [...editedParams];
    updated[index][field] = value;
    setEditedParams(updated);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("url-parser-history");
  };

  const validation = parsed.url ? validateUrl(parsed.url) : null;

  const samples: Record<string, string> = {
    basic: "https://example.com/path?foo=bar&count=2#hash",
    auth: "https://user:pass@sub.domain.com:8080/api/v1/resource?token=abc123#section",
    port: "http://localhost:3000/dashboard?view=stats&sort=desc",
    multi: "https://shop.com/products?category=books&category=fiction&q=best%20sellers&ref=nav",
    idn: "https://münchen.de/path?key=value",
    ipv4: "http://192.168.1.1:8080/admin?token=abc",
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {warning || (parsed.url ? "Parsed successfully" : "Waiting for a valid URL")}
        {copied ? `Copied ${copied}` : ""}
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
              URL Parser
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Free Online URL Parser & Decoder
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-slate-700">
          Parse and decode URLs instantly in your browser. Extract{" "}
          <strong className="font-semibold text-slate-900">protocol</strong>,{" "}
          <strong className="font-semibold text-slate-900">hostname</strong>,{" "}
          <strong className="font-semibold text-slate-900">path</strong>,{" "}
          <strong className="font-semibold text-slate-900">query parameters</strong>, and{" "}
          <strong className="font-semibold text-slate-900">fragments</strong>. Export to JSON or CSV.{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            100% Private
          </span>{" "}
          – All processing happens locally; no data is sent to servers.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setInput("https://example.com/path?foo=bar&count=2#hash");
              setCopied(null);
              setWarning("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          {Object.entries(samples).map(([key, value]) => (
            <button
              key={key}
              onClick={() => {
                setInput(value);
                setCopied(null);
                setWarning("");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            title="View history"
          >
            <History className="h-4 w-4" />
            History ({history.length})
          </button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Recent URLs</p>
              <button
                onClick={clearHistory}
                className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(item.url)}
                  className="block w-full truncate rounded-lg bg-white px-3 py-2 text-left text-xs text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  {item.url}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="https://example.com/path?foo=bar#hash"
          aria-label="URL input"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={allowRelative}
              onChange={(e) => setAllowRelative(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Allow relative URLs
          </label>
        </div>

        <div className="text-sm">
          {parsed.error ? (
            <p className="font-medium text-amber-600">{warning || parsed.error}</p>
          ) : (
            <>
              <p className="text-slate-600">URL is valid. Parsed details below.</p>
              {parsed.warnings && parsed.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {parsed.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-600">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {parsed.url && validation ? (
        <>
          <article className="grid gap-4 lg:grid-cols-2" role="region" aria-label="Parsed URL details">
            <section
              className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
              aria-labelledby="url-components-heading"
            >
              <div className="flex items-center justify-between">
                <h2 id="url-components-heading" className="text-sm font-semibold text-slate-900">
                  URL Components
                </h2>
                <button
                  onClick={downloadAllComponents}
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  title="Download all components as JSON"
                >
                  <FileCode2 className="h-4 w-4" />
                  Export All
                </button>
              </div>

              {[
                { label: "Origin", value: parsed.url.origin, key: "origin" },
                { label: "Protocol", value: parsed.url.protocol, key: "protocol", color: "text-blue-600" },
                { label: "Username", value: parsed.url.username || "(none)", key: "username" },
                { label: "Password", value: parsed.url.password ? "•••" : "(none)", key: "password" },
                { label: "Hostname", value: parsed.url.hostname, key: "hostname", color: "text-green-600" },
                { label: "Port", value: parsed.url.port || "(none)", key: "port", warning: !validation.portValid },
                { label: "Pathname", value: parsed.url.pathname || "/", key: "pathname", color: "text-purple-600" },
                { label: "Fragment", value: parsed.url.hash || "(none)", key: "hash", color: "text-orange-600" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className={`text-sm font-semibold break-all ${item.color || "text-slate-900"} ${item.warning ? "text-red-600" : ""}`}>
                      {item.value}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.value, item.key)}
                    className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    aria-label={`Copy ${item.label.toLowerCase()}`}
                  >
                    {copied === item.key ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  </button>
                </div>
              ))}

              {validation.subdomainInfo && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Domain Breakdown
                  </p>
                  <div className="space-y-1 text-xs">
                    {validation.subdomainInfo.subdomain && (
                      <div>
                        <span className="font-medium text-slate-700">Subdomain:</span>{" "}
                        <span className="text-slate-900">{validation.subdomainInfo.subdomain}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-700">Domain:</span>{" "}
                      <span className="text-slate-900">{validation.subdomainInfo.domain}</span>
                    </div>
                    {validation.subdomainInfo.tld && (
                      <div>
                        <span className="font-medium text-slate-700">TLD:</span>{" "}
                        <span className="text-slate-900">{validation.subdomainInfo.tld}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section
              className="space-y-2 rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
              aria-labelledby="query-params-heading"
            >
              <h2 id="query-params-heading" className="sr-only">
                Query Parameters
              </h2>
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-semibold">Query Params</p>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showDecoded}
                    onChange={(e) => setShowDecoded(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 text-slate-900"
                    aria-label="Toggle decoded view"
                  />
                  Decoded
                </label>
                <button
                  onClick={() => setEditingParams(!editingParams)}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
                  disabled={!params.length}
                >
                  {editingParams ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  {editingParams ? "Save" : "Edit"}
                </button>
                <button
                  onClick={() => handleCopy(params.map((p) => `${showDecoded ? p.key : p.rawKey}=${showDecoded ? p.value : p.rawValue}`).join("&"), "query")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!params.length}
                >
                  {copied === "query" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  Copy
                </button>
                <button
                  onClick={() => downloadParams("json")}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!params.length}
                >
                  <Download className="h-4 w-4" /> JSON
                </button>
                <button
                  onClick={() => downloadParams("csv")}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!params.length}
                >
                  <Download className="h-4 w-4" /> CSV
                </button>
              </div>

              {params.length > 3 && (
                <div className="px-4 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={paramSearch}
                      onChange={(e) => setParamSearch(e.target.value)}
                      placeholder="Search params..."
                      className="w-full rounded-lg bg-slate-800 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                </div>
              )}

              {editingParams ? (
                <div className="max-h-[300px] space-y-2 overflow-auto px-4 pb-4">
                  {editedParams.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => updateParam(idx, "key", e.target.value)}
                        placeholder="key"
                        className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => updateParam(idx, "value", e.target.value)}
                        placeholder="value"
                        className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      <button
                        onClick={() => removeParam(idx)}
                        className="rounded-full bg-red-500/20 p-2 text-red-300 transition hover:bg-red-500/30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      onClick={addParam}
                      className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/20"
                    >
                      <Plus className="h-4 w-4" />
                      Add Parameter
                    </button>
                    <button
                      onClick={regenerateUrl}
                      className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Regenerate URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-auto divide-y divide-slate-800">
                  {filteredParams.length ? (
                    filteredParams.map((p, idx) => {
                      const key = showDecoded ? p.key : p.rawKey;
                      const val = showDecoded ? p.value : p.rawValue;
                      return (
                        <div key={`${p.key}-${idx}`} className="px-4 py-3 text-sm leading-relaxed text-slate-100">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-semibold break-all">{key}</span>
                              <span className="text-slate-300">: {val || "(empty)"}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(`${key}=${val}`, `param-${idx}`)}
                              className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium transition hover:bg-white/20"
                            >
                              {copied === `param-${idx}` ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : params.length ? (
                    <div className="px-4 py-3 text-sm text-slate-300">No params match your search.</div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-300">No query params.</div>
                  )}
                </div>
              )}
            </section>
          </article>

          {/* Related Tools Section */}
          <section className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Related URL Tools</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/url-encoder"
                className="group flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-blue-600">URL Encoder</p>
                  <p className="text-xs text-slate-600">Encode/decode URL components</p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-slate-400" />
              </Link>

              <div className="group flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 opacity-60">
                <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">URL Builder</p>
                  <p className="text-xs text-slate-600">Coming soon - Build URLs visually</p>
                </div>
              </div>

              <div className="group flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 opacity-60">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">URL Comparison</p>
                  <p className="text-xs text-slate-600">Coming soon - Compare two URLs</p>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* SEO-Rich Content Section */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">What is a URL Parser?</h2>
          <p className="text-base leading-relaxed text-slate-700">
            A <strong>URL parser</strong> (Uniform Resource Locator parser) is a developer tool that breaks down web
            addresses into their individual components. This free online URL decoder helps you understand the structure
            of any URL by extracting the <strong>protocol</strong> (http/https), <strong>hostname</strong> (domain
            name), <strong>port number</strong>, <strong>path</strong>, <strong>query string parameters</strong>, and{" "}
            <strong>URL fragments</strong> (hash).
          </p>
          <p className="text-base leading-relaxed text-slate-700">
            Our browser-based URL parser is essential for developers debugging API endpoints, analyzing tracking URLs,
            inspecting OAuth redirect URLs, and testing deep links. Unlike other tools that send your data to servers,
            this tool runs entirely in your browser using JavaScript's native URL API, ensuring complete privacy and
            security.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Key Features</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Real-time URL parsing as you type",
              "Decode URL-encoded characters automatically",
              "Edit query parameters and regenerate URLs",
              "Parse history with localStorage",
              "Search and filter query parameters",
              "Export to JSON/CSV (params or all components)",
              "Subdomain extraction and analysis",
              "Port validation (0-65535 range)",
              "IP address detection and validation",
              "IDN (Internationalized Domain Name) support",
              "Relative URL parsing option",
              "100% client-side processing – no server uploads",
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Common Use Cases</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">API Development</h3>
              <p className="text-sm text-slate-700">
                Debug REST API endpoints, validate request URLs, and inspect query parameters during development and
                testing.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">Analytics & Marketing</h3>
              <p className="text-sm text-slate-700">
                Extract UTM parameters and tracking codes from campaign URLs to analyze marketing performance.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">OAuth & Authentication</h3>
              <p className="text-sm text-slate-700">
                Parse OAuth redirect URLs to extract authorization codes, access tokens, and state parameters.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">Mobile Deep Links</h3>
              <p className="text-sm text-slate-700">
                Analyze custom URL schemes and deep links for mobile applications to understand routing parameters.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Understanding URL Components</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <code className="block overflow-x-auto text-sm text-slate-800">
                https://user:pass@api.example.com:8080/v1/users?status=active&sort=name#results
              </code>
            </div>
            <dl className="grid gap-3 text-sm">
              {[
                {
                  term: "Protocol",
                  definition: "https: — The communication protocol (http, https, ftp, etc.)",
                },
                {
                  term: "Username",
                  definition: "user — Optional authentication username",
                },
                {
                  term: "Password",
                  definition: "pass — Optional authentication password",
                },
                {
                  term: "Hostname",
                  definition: "api.example.com — The domain name or IP address",
                },
                {
                  term: "Port",
                  definition: "8080 — The port number (defaults to 80 for http, 443 for https)",
                },
                {
                  term: "Path",
                  definition: "/v1/users — The resource path on the server",
                },
                {
                  term: "Query String",
                  definition: "?status=active&sort=name — Key-value pairs for filtering/parameters",
                },
                {
                  term: "Fragment/Hash",
                  definition: "#results — Client-side anchor for navigation within the page",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <dt className="min-w-[120px] font-semibold text-slate-900">{item.term}:</dt>
                  <dd className="text-slate-700">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Why Use Our URL Parser?</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 ring-1 ring-blue-200">
              <h3 className="font-semibold text-blue-900">🔒 Privacy First</h3>
              <p className="text-sm text-blue-800">
                All processing happens locally in your browser. Your URLs never leave your device and are never sent to
                any server.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-200">
              <h3 className="font-semibold text-emerald-900">⚡ Lightning Fast</h3>
              <p className="text-sm text-emerald-800">
                Real-time parsing with instant results as you type. No waiting, no loading delays, just immediate
                feedback.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 ring-1 ring-purple-200">
              <h3 className="font-semibold text-purple-900">💯 Completely Free</h3>
              <p className="text-sm text-purple-800">
                No sign-up required, no limitations, no ads. Parse unlimited URLs without any restrictions or payments.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Frequently Asked Questions</h2>
          <details className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 marker:text-slate-400">
              How does URL encoding/decoding work?
            </summary>
            <p className="mt-2 text-sm text-slate-700">
              URL encoding converts special characters into a format that can be transmitted over the internet. For
              example, spaces become %20, and & becomes %26. Our tool automatically decodes these characters so you can
              see both the human-readable (decoded) and URL-safe (encoded) versions using the toggle switch.
            </p>
          </details>
          <details className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 marker:text-slate-400">
              Can I edit query parameters and regenerate the URL?
            </summary>
            <p className="mt-2 text-sm text-slate-700">
              Yes! Click the "Edit" button in the Query Params section to enter edit mode. You can add new parameters,
              remove existing ones, or modify values. When you're done, click "Regenerate URL" to create a new URL with
              your changes.
            </p>
          </details>
          <details className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 marker:text-slate-400">
              What's the difference between a path and a query string?
            </summary>
            <p className="mt-2 text-sm text-slate-700">
              The <strong>path</strong> (e.g., /api/v1/users) specifies the resource location on the server, while the{" "}
              <strong>query string</strong> (e.g., ?status=active&sort=name) passes parameters to filter or modify that
              resource. Paths are part of the URL structure, whereas query strings are optional key-value pairs that
              start after the ? character.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
