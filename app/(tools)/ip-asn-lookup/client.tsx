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

      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Free IP Address & ASN Lookup Tool
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-slate-700">
          Validate and analyze <strong className="font-semibold text-slate-900">IPv4</strong> and{" "}
          <strong className="font-semibold text-slate-900">IPv6 addresses</strong> instantly. Detect{" "}
          <strong className="font-semibold text-slate-900">private ranges</strong> (RFC1918), lookup{" "}
          <strong className="font-semibold text-slate-900">ASN</strong> (Autonomous System Numbers), and identify{" "}
          <strong className="font-semibold text-slate-900">organization ownership</strong>.{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            100% Private
          </span>{" "}
          – IP validation happens locally; ASN lookups are optional.
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

      {/* SEO-Rich Content Section: What is IP/ASN Lookup */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">What is IP/ASN Lookup?</h2>
          <div className="space-y-3 text-slate-700 leading-relaxed">
            <p>
              An <strong className="font-semibold text-slate-900">IP/ASN Lookup tool</strong> is a specialized utility that validates and analyzes IP addresses while providing detailed network ownership information. Our free online tool validates both <strong className="font-semibold text-slate-900">IPv4</strong> and <strong className="font-semibold text-slate-900">IPv6 addresses</strong>, detects <strong className="font-semibold text-slate-900">private IP ranges</strong> (RFC1918, loopback, link-local), and optionally enriches results with <strong className="font-semibold text-slate-900">ASN (Autonomous System Number)</strong> data including organization ownership and country information.
            </p>
            <p>
              Unlike server-based tools, our IP validator performs <strong className="font-semibold text-slate-900">100% client-side parsing</strong> using the ipaddr.js library, ensuring your IP addresses never leave your browser during validation. ASN lookup is completely optional and only makes external API calls to IPInfo when you have a token configured. This privacy-first architecture makes our tool ideal for security-conscious users, network administrators, and developers who need to validate IPs without exposing sensitive infrastructure information.
            </p>
            <p>
              Whether you&apos;re troubleshooting network connectivity, analyzing server logs, implementing IP-based access control, or conducting security audits, our IP/ASN Lookup tool provides instant validation with detailed breakdown of IP components, CIDR notation, private range detection, and comprehensive network ownership data. The tool supports all standard IPv4 formats (dotted decimal) and IPv6 formats (compressed and expanded notation), automatically normalizing addresses to standard CIDR format for consistency.
            </p>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: Key Features */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Key Features of Our IP/ASN Lookup Tool</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">IPv4 & IPv6 Support</h3>
            </div>
            <p className="text-sm text-slate-600">
              Validate both IPv4 (32-bit) and IPv6 (128-bit) addresses with automatic format detection and normalization.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Private Range Detection</h3>
            </div>
            <p className="text-sm text-slate-600">
              Automatically identifies RFC1918 private addresses, loopback, link-local, and other reserved ranges.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">ASN Lookup</h3>
            </div>
            <p className="text-sm text-slate-600">
              Retrieve Autonomous System Numbers, organization names, ISP information, and country data.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">CIDR Notation</h3>
            </div>
            <p className="text-sm text-slate-600">
              Display normalized IP addresses in standard CIDR format for consistency and clarity.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">100% Client-Side Parsing</h3>
            </div>
            <p className="text-sm text-slate-600">
              IP validation happens entirely in your browser using ipaddr.js—no server uploads required.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200">
                <Check className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Export & Copy</h3>
            </div>
            <p className="text-sm text-slate-600">
              Copy individual fields or download complete results as JSON or CSV for further analysis.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 ring-1 ring-blue-200">
                <Check className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="font-semibold text-slate-900">No Rate Limits</h3>
            </div>
            <p className="text-sm text-slate-600">
              Validate unlimited IP addresses without restrictions—basic parsing works offline.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 ring-1 ring-blue-200">
                <Check className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Privacy-First Design</h3>
            </div>
            <p className="text-sm text-slate-600">
              Your IP addresses are never logged or stored. ASN lookups are optional and user-controlled.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 ring-1 ring-blue-200">
                <Check className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Sample IPs Included</h3>
            </div>
            <p className="text-sm text-slate-600">
              Quick-start samples for IPv4, IPv6, and private addresses to test functionality instantly.
            </p>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: Common Use Cases */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Common Use Cases for IP/ASN Lookup</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-emerald-50 to-white p-5 ring-1 ring-emerald-100">
            <h3 className="text-lg font-semibold text-emerald-900">Network Security & Analysis</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span>Identify suspicious IP addresses in server logs and security events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span>Validate IP addresses before adding to firewall rules or blacklists</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span>Determine network ownership and ASN for threat intelligence analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">•</span>
                <span>Detect private IP leakage in public-facing configurations</span>
              </li>
            </ul>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-blue-50 to-white p-5 ring-1 ring-blue-100">
            <h3 className="text-lg font-semibold text-blue-900">Server & Infrastructure Management</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Verify DNS resolution results and reverse DNS lookups</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Troubleshoot network connectivity and routing issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Document server IPs with ASN and organization information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Validate IP address assignments in multi-cloud environments</span>
              </li>
            </ul>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-purple-50 to-white p-5 ring-1 ring-purple-100">
            <h3 className="text-lg font-semibold text-purple-900">API Development & Testing</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Implement IP-based rate limiting and access control</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Validate user-submitted IP addresses in forms and APIs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Test geolocation features with known country-specific IPs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span>Debug webhook origins and API request sources</span>
              </li>
            </ul>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-amber-50 to-white p-5 ring-1 ring-amber-100">
            <h3 className="text-lg font-semibold text-amber-900">Debugging & Diagnostics</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Analyze application logs to identify request origins</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Verify CDN and proxy IP addresses in X-Forwarded-For headers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Understand IPv6 address allocation and subnetting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Validate network configuration during infrastructure changes</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: Understanding IP Addresses */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Understanding IP Addresses: IPv4 vs IPv6</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">IPv4</div>
              <h3 className="text-lg font-semibold text-slate-900">Internet Protocol version 4</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <strong className="font-semibold text-slate-900">Format:</strong> 32-bit addresses represented as four decimal octets (0-255) separated by dots.
              </p>
              <p>
                <strong className="font-semibold text-slate-900">Example:</strong> <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-900">192.168.1.1</code>, <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-900">8.8.8.8</code>
              </p>
              <p>
                <strong className="font-semibold text-slate-900">Address Space:</strong> Approximately 4.3 billion addresses (2³² = 4,294,967,296)
              </p>
              <p>
                <strong className="font-semibold text-slate-900">Private Ranges (RFC1918):</strong>
              </p>
              <ul className="ml-4 space-y-1">
                <li>• <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">10.0.0.0/8</code> (10.0.0.0 – 10.255.255.255)</li>
                <li>• <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">172.16.0.0/12</code> (172.16.0.0 – 172.31.255.255)</li>
                <li>• <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">192.168.0.0/16</code> (192.168.0.0 – 192.168.255.255)</li>
              </ul>
              <p>
                <strong className="font-semibold text-slate-900">Status:</strong> Address exhaustion reached in 2011. NAT (Network Address Translation) extends usability.
              </p>
            </div>
          </div>
          <div className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">IPv6</div>
              <h3 className="text-lg font-semibold text-slate-900">Internet Protocol version 6</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <strong className="font-semibold text-slate-900">Format:</strong> 128-bit addresses represented as eight groups of four hexadecimal digits separated by colons.
              </p>
              <p>
                <strong className="font-semibold text-slate-900">Example:</strong> <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-900">2001:4860:4860::8888</code>
              </p>
              <p>
                <strong className="font-semibold text-slate-900">Address Space:</strong> Approximately 340 undecillion addresses (2¹²⁸ ≈ 3.4 × 10³⁸)
              </p>
              <p>
                <strong className="font-semibold text-slate-900">Private Ranges:</strong>
              </p>
              <ul className="ml-4 space-y-1">
                <li>• <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">fc00::/7</code> (Unique Local Addresses)</li>
                <li>• <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">fe80::/10</code> (Link-Local Addresses)</li>
                <li>• <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">::1/128</code> (Loopback)</li>
              </ul>
              <p>
                <strong className="font-semibold text-slate-900">Status:</strong> Designed to solve IPv4 exhaustion. Adoption growing steadily worldwide.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-blue-50 p-5 ring-1 ring-blue-100">
          <p className="text-sm text-slate-700">
            <strong className="font-semibold text-blue-900">Note on Compressed Notation:</strong> IPv6 addresses can omit leading zeros in each group and replace consecutive groups of zeros with <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900">::</code> (can only be used once). For example, <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900">2001:0db8:0000:0000:0000:0000:0000:0001</code> becomes <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-900">2001:db8::1</code>. Our tool automatically normalizes these formats.
          </p>
        </div>
      </section>

      {/* SEO-Rich Content Section: What is ASN */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">What is an ASN (Autonomous System Number)?</h2>
        <div className="space-y-4 text-slate-700 leading-relaxed">
          <p>
            An <strong className="font-semibold text-slate-900">Autonomous System Number (ASN)</strong> is a unique identifier assigned to an autonomous system (AS) on the internet. An autonomous system is a collection of IP networks and routers under the control of a single organization that presents a common routing policy to the internet. ASNs are essential for <strong className="font-semibold text-slate-900">Border Gateway Protocol (BGP)</strong> routing, which enables different networks to exchange routing information and direct traffic across the internet.
          </p>
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white p-5 ring-1 ring-emerald-100">
            <h3 className="mb-3 text-lg font-semibold text-emerald-900">ASN Examples & Common Organizations</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">AS15169 - Google LLC</p>
                <p className="text-slate-600">Google&apos;s primary ASN, routing traffic for Google Search, YouTube, Gmail, and other services.</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">AS13335 - Cloudflare</p>
                <p className="text-slate-600">Cloudflare&apos;s global CDN and DDoS protection network spanning 300+ cities.</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">AS16509 - Amazon.com</p>
                <p className="text-slate-600">Amazon Web Services (AWS) infrastructure powering millions of applications.</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">AS8075 - Microsoft</p>
                <p className="text-slate-600">Microsoft&apos;s Azure cloud platform and enterprise services network.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Why ASN Lookup Matters</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                <span><strong className="font-semibold text-slate-900">Network Identification:</strong> Determine which organization owns and operates an IP address</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                <span><strong className="font-semibold text-slate-900">Security Analysis:</strong> Identify the origin of suspicious traffic, attacks, or abuse</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                <span><strong className="font-semibold text-slate-900">Routing Intelligence:</strong> Understand network paths and peering relationships</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600">✓</span>
                <span><strong className="font-semibold text-slate-900">Compliance & Auditing:</strong> Verify cloud provider infrastructure and data residency</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-slate-600">
            Our IP/ASN Lookup tool retrieves ASN information via the IPInfo API when configured, providing organization names, country data, and network ownership details to help you understand who controls an IP address and where it&apos;s located geographically.
          </p>
        </div>
      </section>

      {/* SEO-Rich Content Section: Why Use Our Tool */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-700">
        <h2 className="text-2xl font-semibold">Why Use Our IP/ASN Lookup Tool?</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-5 ring-1 ring-emerald-400/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-400/20 p-2">
                <Check className="h-6 w-6 text-emerald-300" />
              </div>
              <h3 className="text-lg font-semibold">Privacy-First Architecture</h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              Unlike many IP lookup tools that log and track every query, our tool performs validation <strong className="font-semibold text-white">100% locally in your browser</strong>. Your IP addresses are never sent to our servers for basic validation. ASN enrichment is completely optional and user-controlled, ensuring you maintain full control over your data. Perfect for security-conscious organizations validating internal infrastructure IPs.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-5 ring-1 ring-blue-400/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-400/20 p-2">
                <RefreshCcw className="h-6 w-6 text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold">No Limits, Always Free</h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              No registration, no rate limits, no hidden costs. Validate <strong className="font-semibold text-white">unlimited IP addresses</strong> without restrictions. Whether you&apos;re analyzing 10 IPs or 10,000, our tool remains fast and responsive. Basic IP validation works completely offline, and ASN lookup uses your own IPInfo token (free tier: 50,000 requests/month), giving you full control over usage and costs.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-5 ring-1 ring-purple-400/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-400/20 p-2">
                <Download className="h-6 w-6 text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold">Developer-Friendly Output</h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              Export results as <strong className="font-semibold text-white">JSON or CSV</strong> for integration with your workflows. Copy individual fields with one click, or download complete datasets for bulk analysis. Results include all essential information: IP version, private range detection, CIDR notation, ASN details, organization name, and country—formatted consistently for easy parsing and automation.
            </p>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: FAQ */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>Is this IP lookup tool completely free?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              Yes, our IP/ASN Lookup tool is 100% free with no limitations on basic IP validation. You can validate unlimited IPv4 and IPv6 addresses without any subscription or payment. ASN enrichment (organization, country data) requires an IPInfo token, but IPInfo offers a generous free tier with 50,000 requests per month, which is sufficient for most use cases.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>Does this tool send my IP addresses to your servers?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              No, basic IP validation happens <strong className="font-semibold text-slate-900">100% locally in your browser</strong> using the ipaddr.js library. Your IP addresses are never sent to our servers during validation. ASN lookups are optional and make direct API calls from your browser to IPInfo (not through our servers) only when you have configured a token and clicked the Lookup button.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>What IP address formats are supported?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              The tool supports all standard IPv4 formats (dotted decimal notation like 192.168.1.1) and IPv6 formats including expanded notation (2001:0db8:0000:0000:0000:0000:0000:0001), compressed notation (2001:db8::1), and mixed formats. IPv6 addresses are automatically normalized to standard CIDR format for consistency.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>How does private IP detection work?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              Our tool uses ipaddr.js to detect all reserved and private IP ranges including RFC1918 private addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback addresses (127.0.0.0/8, ::1/128), link-local addresses (169.254.0.0/16, fe80::/10), multicast, and other IETF-reserved ranges. Private IPs are flagged immediately during validation.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>Do I need an IPInfo token for basic IP validation?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              No, an IPInfo token is only required if you want ASN enrichment data (Autonomous System Number, organization name, ISP, country). Without a token, the tool still validates IP addresses, detects private ranges, shows IP version (IPv4/IPv6), and displays normalized CIDR format—all locally in your browser without any API calls.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>Can I lookup multiple IP addresses at once?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              Currently, the tool validates one IP address at a time for optimal user experience and performance. Bulk IP lookup functionality with CSV input/output is planned for a future version (v1.3) based on user feedback. For now, you can validate IPs sequentially and export each result as JSON or CSV for aggregation.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>What is the difference between IPv4 and IPv6?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              IPv4 uses 32-bit addresses (4 octets like 192.168.1.1) supporting approximately 4.3 billion addresses, while IPv6 uses 128-bit addresses (8 groups of hexadecimal digits like 2001:4860:4860::8888) supporting 340 undecillion addresses. IPv6 was designed to solve IPv4 address exhaustion and includes built-in security features. Our tool validates and normalizes both formats.
            </p>
          </details>
          <details className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
              <span>How accurate is the ASN and geolocation data?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              ASN data from IPInfo is highly accurate (99%+) as it&apos;s sourced directly from Regional Internet Registries (RIRs) and BGP routing tables. Organization names and ASN assignments are authoritative. Country-level geolocation is typically 95-99% accurate. However, IP addresses can be reassigned, and some organizations use anycast routing where the same IP serves multiple geographic locations.
            </p>
          </details>
        </div>
      </section>

      {/* SEO-Rich Content Section: How to Use */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">How to Use the IP/ASN Lookup Tool</h2>
        <ol className="space-y-4">
          <li className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 ring-2 ring-emerald-200">1</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900">Enter an IP address</h3>
              <p className="text-sm text-slate-700">
                Type or paste any IPv4 address (e.g., 8.8.8.8, 192.168.1.1) or IPv6 address (e.g., 2001:4860:4860::8888) into the input field. You can also click one of the sample buttons to quickly load example IPs: public IPv4, public IPv6, or private address.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 ring-2 ring-emerald-200">2</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900">Click the Lookup button</h3>
              <p className="text-sm text-slate-700">
                Click &quot;Lookup&quot; to validate the IP address. The tool will immediately parse the IP locally in your browser, detect its version (IPv4/IPv6), identify if it&apos;s a private range, and show the normalized CIDR format. If you have an IPInfo token configured via <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_IPINFO_TOKEN</code>, the tool will also fetch ASN data.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 ring-2 ring-emerald-200">3</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900">Review the results</h3>
              <p className="text-sm text-slate-700">
                The results panel displays all available information: IP address, version (IPv4/IPv6), private range status (Yes/No), normalized CIDR notation, and optional ASN enrichment data (ASN number, organization name, country). Each field is clearly labeled for easy interpretation.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 ring-2 ring-emerald-200">4</div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900">Copy or export data</h3>
              <p className="text-sm text-slate-700">
                Click the copy button next to any field to copy its value to your clipboard. Use &quot;Copy JSON&quot; to copy the entire result as formatted JSON, or click the download buttons to save results as JSON or CSV files for further analysis, documentation, or integration with other tools.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}
