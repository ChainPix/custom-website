import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextSearchClient from "./client";

export const metadata: Metadata = {
  title: "Text Search & Count | ToolStack",
  description:
    "Search text with options for case sensitivity, whole words, or regex. View match counts and snippets.",
  keywords: [
    "text search",
    "find in text",
    "regex search",
    "count matches",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/text-search`,
  },
  openGraph: {
    title: "Text Search & Count | ToolStack",
    description: "Search text with regex or plain options and see match counts/snippets.",
    url: `${siteUrl.replace(/\/$/, "")}/text-search`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Search & Count | ToolStack",
    description: "Search and count matches in text with regex/whole-word options.",
  },
};

export default function TextSearchPage() {
  return <TextSearchClient />;
}
