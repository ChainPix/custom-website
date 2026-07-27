"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Grid3x3 } from "lucide-react";

import type { Tool, ToolCategory } from "@/lib/tools";

export type { Tool, ToolCategory };

function normalize(text: string) {
  return text.toLowerCase();
}

function matches(tool: Tool, term: string) {
  const haystack = `${tool.title} ${tool.description}`.toLowerCase();
  return haystack.includes(term);
}

// LocalStorage keys
const SCROLL_POSITION_KEY = "toolstack_scroll_position";
const RECENT_TOOLS_KEY = "toolstack_recent_tools";
const MAX_RECENT_TOOLS = 6;

export default function ToolGrid({ categories }: { categories: ToolCategory[] }) {
  const [query, setQuery] = useState("");
  const [recentTools, setRecentTools] = useState<Tool[]>([]);
  const [viewMode, setViewMode] = useState<"categories" | "all">("categories");
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const term = normalize(query.trim());

  // Flatten all tools for search
  const allTools = categories.flatMap((cat) => cat.tools);

  // Filter tools based on search
  const filteredCategories = term
    ? categories
        .map((cat) => ({
          ...cat,
          tools: cat.tools.filter((tool) => matches(tool, term)),
        }))
        .filter((cat) => cat.tools.length > 0)
    : categories;

  // Load recent tools and scroll position on mount
  useEffect(() => {
    try {
      // Load recent tools
      const stored = localStorage.getItem(RECENT_TOOLS_KEY);
      if (stored) {
        const recentSlugs = JSON.parse(stored) as string[];
        const tools = recentSlugs
          .map((slug) => allTools.find((t) => t.slug === slug))
          .filter((t): t is Tool => t !== undefined)
          .slice(0, MAX_RECENT_TOOLS);
        setRecentTools(tools);
      }

      // Restore scroll position
      const scrollPos = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (scrollPos && containerRef.current) {
        const pos = parseInt(scrollPos, 10);
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo({ top: pos, behavior: "instant" as ScrollBehavior });
        }, 0);
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
      }
    } catch (err) {
      console.error("Failed to load from localStorage", err);
    }
  }, []);

  // Save scroll position before navigation
  const handleToolClick = (slug: string) => {
    try {
      // Save scroll position
      sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());

      // Update recent tools
      const stored = localStorage.getItem(RECENT_TOOLS_KEY);
      const existing = stored ? (JSON.parse(stored) as string[]) : [];
      const updated = [slug, ...existing.filter((s) => s !== slug)].slice(0, MAX_RECENT_TOOLS);
      localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save to localStorage", err);
    }
  };

  const clearRecentTools = () => {
    try {
      localStorage.removeItem(RECENT_TOOLS_KEY);
      setRecentTools([]);
    } catch (err) {
      console.error("Failed to clear recent tools", err);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* Search Input */}
      <div className="relative">
        <input
          aria-label="Search tools"
          placeholder="Search tools (e.g. JSON, cron, UUID, color)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 pl-11 text-sm text-slate-900 shadow-[var(--shadow-soft)] outline-none ring-offset-0 transition focus:border-slate-400 focus:shadow-[0_10px_35px_-25px_rgba(0,0,0,0.35)]"
        />
        <div className="pointer-events-none absolute left-3 top-2.5 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.65 6.65a7.5 7.5 0 0 0 9.98 9.98Z"
            />
          </svg>
        </div>
      </div>

      {/* View Mode Toggle */}
      {!term && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("categories")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "categories"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              By Category
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              All Tools ({allTools.length})
            </button>
          </div>

          {recentTools.length > 0 && (
            <button
              onClick={clearRecentTools}
              className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-500"
            >
              Clear recent
            </button>
          )}
        </div>
      )}

      {/* Recently Used Tools */}
      {!term && recentTools.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">Recently Used</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {recentTools.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentTools.map((tool) => (
              <Link
                key={tool.slug}
                href={tool.slug}
                onClick={() => handleToolClick(tool.slug)}
                className="flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-blue-50 to-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-blue-100 transition hover:-translate-y-1 hover:shadow-[0_14px_40px_-20px_rgba(37,99,235,0.35)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{tool.title}</h3>
                  <span className="text-xs text-blue-600">Open</span>
                </div>
                <p className="text-xs text-slate-600">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Tools View */}
      {viewMode === "all" && !term && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            All Tools <span className="font-normal text-slate-600">({allTools.length})</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {allTools.map((tool) => (
              <Link
                key={tool.slug}
                href={tool.slug}
                onClick={() => handleToolClick(tool.slug)}
                className="flex flex-col gap-3 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">{tool.title}</h3>
                  <span className="text-sm text-slate-500">Open</span>
                </div>
                <p className="text-sm text-slate-700">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categorized View */}
      {viewMode === "categories" && (
        <div className="space-y-10">
          {filteredCategories.map((category) => (
            <section key={category.name} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">{category.name}</h2>
                <p className="text-sm text-slate-600">{category.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {category.tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={tool.slug}
                    onClick={() => handleToolClick(tool.slug)}
                    className="flex flex-col gap-3 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-slate-900">{tool.title}</h3>
                      <span className="text-sm text-slate-500">Open</span>
                    </div>
                    <p className="text-sm text-slate-700">{tool.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* No Results */}
      {term && filteredCategories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-[var(--shadow-soft)]">
          No tools found for "{query}". Try a different keyword.
        </div>
      )}
    </div>
  );
}
