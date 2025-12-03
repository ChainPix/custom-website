"use client";

import Link from "next/link";
import { useState } from "react";
import ipaddr from "ipaddr.js";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

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
  const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;

  const parseLocal = (value: string): LookupResult | null => {
    try {
      const addr = ipaddr.parse(value);
      const kind = addr.kind() === "ipv4" ? "ipv4" : "ipv6";
      return {
        ip: value,
        version: kind,
        isPrivate: addr.range() !== "unicast",
        cidr: addr.toNormalizedString(),
      };
    } catch {
      return null;
    }
  };

  const handleLookup = async () => {
    setError("");
    setResult(null);
    const parsed = parseLocal(ip.trim());
    if (!parsed) {
      setError("Invalid IP address.");
      return;
    }
    setResult(parsed);
    if (!token) return; // ASN lookup optional
    try {
      const res = await fetch(`https://ipinfo.io/${parsed.ip}/json?token=${token}`);
      if (!res.ok) {
        setError("ASN lookup failed. Check token or try again.");
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

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
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
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        <input
          type="text"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Enter IPv4 or IPv6"
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
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          Lookup
        </button>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Result</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!result}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <div className="p-4 text-sm leading-relaxed text-slate-100">
          {result ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">IP</dt>
                <dd className="font-semibold">{result.ip}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">Version</dt>
                <dd className="font-semibold uppercase">{result.version}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">Private</dt>
                <dd className="font-semibold">{result.isPrivate ? "Yes" : "No"}</dd>
              </div>
              {result.cidr ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">CIDR</dt>
                  <dd className="font-semibold">{result.cidr}</dd>
                </div>
              ) : null}
              {result.asn ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">ASN / Org</dt>
                  <dd className="font-semibold">{result.org || result.asn}</dd>
                </div>
              ) : null}
              {result.country ? (
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">Country</dt>
                  <dd className="font-semibold">{result.country}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-slate-300">Lookup results will appear here.</p>
          )}
        </div>
      </div>
    </main>
  );
}
