import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import DiffViewerClient from "./client";

export const metadata: Metadata = {
  title: "Diff Viewer | ToolStack",
  description:
    "Compare two text snippets and see differences highlighted line by line. Simple browser-based diff.",
  keywords: [
    "diff viewer",
    "text diff",
    "compare text",
    "line diff",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/diff-viewer`,
  },
  openGraph: {
    title: "Diff Viewer | ToolStack",
    description: "Highlight additions and removals between two texts instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/diff-viewer`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diff Viewer | ToolStack",
    description: "Side-by-side text diff with inline highlights. Runs in-browser.",
  },
};

export default function DiffViewerPage() {
  return <DiffViewerClient />;
}
