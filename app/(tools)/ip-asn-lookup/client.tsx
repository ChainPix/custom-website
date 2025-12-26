"use client";

import Link from "next/link";
import { useState } from "react";
import ipaddr from "ipaddr.js";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type LookupResult = {
  ip: string;
  version: "ipv4" | "ipv6";
  isPrivate: boolean;
  cidr?: string;
  asn?: string;
  org?: string;
  country?: string;
};

export default function IpAsnClient() {
  const [ip, setIp] = useState("8.8.8.8");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
  const MAX_LEN = 200;

  const samples: Record<string, string> = {
    ipv4: "8.8.8.8",
    ipv6: "2001:4860:4860::8888",
    private: "192.168.1.10",
  };

  const parseLocal = (value: string): LookupResult | null => {
    try {
      const addr = ipaddr.parse(value);
      const kind = addr.kind() === "ipv4" ? "ipv4" : "ipv6";
      const normalized = addr.toNormalizedString();
      return {
        ip: value,
        version: kind,
        isPrivate: addr.range() !== "unicast",
        cidr: normalized,
      };
    } catch {
      return null;
    }
  };

  const handleLookup = async () => {
    setError("");
    setResult(null);
    const trimmed = ip.trim();
    if (!trimmed) {
      setError("Enter an IP address to lookup.");
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError("Input too long; please provide a single IP address.");
      return;
    }
    const parsed = parseLocal(trimmed);
    if (!parsed) {
      setError("Invalid IP address. Provide a valid IPv4 or IPv6.");
      return;
    }
    setResult(parsed);
    if (!token) {
      setError("ASN lookup skipped (no IPInfo token configured). IP validation completed locally.");
      return; // ASN lookup optional
    }
    try {
      const res = await fetch(`https://ipinfo.io/${parsed.ip}/json?token=${token}`);
      if (!res.ok) {
        if (res.status === 429) {
          setError("ASN lookup rate-limited. Try again later.");
        } else if (res.status === 401) {
          setError("ASN lookup unauthorized. Check IPInfo token.");
        } else {
          setError("ASN lookup failed. Check token or try again.");
        }
        return;
      }
      const data = (await res.json()) as { org?: string; country?: string };
      setResult({
        ...parsed,
        asn: data.org?.split(" ")?.[0],
        org: data.org,
        country: data.country,
      });
    } catch (err) {
      console.error("Lookup error", err);
      setError("ASN lookup failed. Network or token issue.");
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyField = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1200);
    } catch (err) {
      console.error("Copy field failed", err);
    }
  };

  const handleDownload = (format: "json" | "csv") => {
    if (!result) return;
    const data =
      format === "json"
        ? JSON.stringify(result, null, 2)
        : (() => {
            const entries = Object.entries(result)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => `${k},"${String(v).replace(/"/g, '""')}"`);
            return `field,value\n${entries.join("\n")}`;
          })();
    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "json" ? "ip-lookup.json" : "ip-lookup.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {error || (result ? "Lookup complete" : "Awaiting input")}
        {copied ? "Copied JSON" : ""}
        {copiedField ? `Copied ${copiedField}` : ""}
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
              IP/ASN Lookup
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">IP / ASN Lookup</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate IPv4/IPv6, detect private ranges, and optionally fetch ASN details when an IPInfo
          token is configured.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIp("8.8.8.8");
              setResult(null);
              setError("");
              setCopied(false);
              setCopiedField(null);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            aria-label="Reset input to default sample"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          {Object.entries(samples).map(([key, value]) => (
            <button
              key={key}
              onClick={() => {
                setIp(value);
                setResult(null);
                setError("");
                setCopied(false);
                setCopiedField(null);
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label={`Load ${key} sample`}
            >
              Sample: {key}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Enter IPv4 or IPv6"
          aria-label="IP address input"
        />
        {error ? (
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">
            ASN lookup uses IPInfo if `NEXT_PUBLIC_IPINFO_TOKEN` is set.
          </p>
        )}
        <button
          onClick={handleLookup}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          aria-label="Run lookup"
        >
          Lookup
        </button>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="ip-asn-result"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p id="ip-asn-result" className="text-sm font-semibold">
            Result
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!result}
            aria-label="Copy result as JSON"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("json")}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!result}
              aria-label="Download result JSON"
            >
              <Download className="h-4 w-4" /> JSON
            </button>
            <button
              onClick={() => handleDownload("csv")}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!result}
              aria-label="Download result CSV"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>
        <div className="p-4 text-sm leading-relaxed text-slate-100">
          {result ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              {[
                { label: "IP", value: result.ip, key: "ip" },
                { label: "Version", value: result.version.toUpperCase(), key: "version" },
                { label: "Private", value: result.isPrivate ? "Yes" : "No", key: "private" },
                { label: "CIDR", value: result.cidr || "", key: "cidr" },
                { label: "ASN / Org", value: result.org || result.asn || "", key: "asn" },
                { label: "Country", value: result.country || "", key: "country" },
              ]
                .filter((item) => item.value !== "")
                .map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.label}</dt>
                      <dd className="font-semibold break-all">{item.value}</dd>
                    </div>
                    <button
                      onClick={() => handleCopyField(item.label, item.value)}
                      className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                      aria-label={`Copy ${item.label}`}
                    >
                      {copiedField === item.label ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-slate-300">Lookup results will appear here.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter an IPv4 or IPv6 address, or pick a sample (public v4, public v6, private).</li>
          <li>We validate locally, detect private ranges, and show CIDR. If an IPInfo token is set, we add ASN/org/country.</li>
          <li>Copy fields individually or download the full result as JSON/CSV.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. IP parsing is in-browser. ASN lookup calls IPInfo only when a token is provided.</p>
          <p><strong>Supported IPs?</strong> Valid IPv4 and IPv6. Private ranges are flagged.</p>
          <p><strong>Do I need a token?</strong> Only for ASN/org/country enrichment; validation works without it.</p>
        </div>
      </div>
    </main>
  );
}
