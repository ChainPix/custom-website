import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonDiffClient from "./client";

export const metadata: Metadata = {
  title: "JSON Diff | ToolStack",
  description:
    "Compare two JSON objects and see structured differences. Highlight added, removed, and changed values.",
  keywords: [
    "json diff",
    "compare json",
    "json compare online",
    "diff json objects",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-diff`,
  },
  openGraph: {
    title: "JSON Diff | ToolStack",
    description: "Structured diff for JSON with added/removed/changed highlights.",
    url: `${siteUrl.replace(/\/$/, "")}/json-diff`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Diff | ToolStack",
    description: "Compare two JSON objects and see changes in-browser.",
  },
};

export default function JsonDiffPage() {
  return <JsonDiffClient />;
}
