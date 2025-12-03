"use client";

import React from "react";
import Link from "next/link";

export type Tool = {
  slug: string;
  title: string;
  description: string;
};

function normalize(text: string) {
  return text.toLowerCase();
}

function matches(tool: Tool, term: string) {
  const haystack = `${tool.title} ${tool.description}`.toLowerCase();
  return haystack.includes(term);
}

export default function ToolGrid({ list }: { list: Tool[] }) {
  const [query, setQuery] = React.useState("");
  const term = normalize(query.trim());
  const filtered = term ? list.filter((tool) => matches(tool, term)) : list;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <input
          aria-label="Search tools"
          placeholder="Search tools (e.g. JSON, cron, UUID, color)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 pl-11 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none ring-offset-0 transition focus:border-slate-400 focus:shadow-[0_10px_35px_-25px_rgba(0,0,0,0.35)]"
        />
        <div className="pointer-events-none absolute left-3 top-2.5 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.65 6.65a7.5 7.5 0 0 0 9.98 9.98Z" />
          </svg>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-[var(--shadow-soft)]">
            No tools found. Try a different keyword.
          </div>
        ) : (
          filtered.map((tool) => (
            <Link
              key={tool.slug}
              href={tool.slug}
              className="flex flex-col gap-3 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">{tool.title}</h2>
                <span className="text-sm text-slate-500">Open</span>
              </div>
              <p className="text-sm text-slate-700">{tool.description}</p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
