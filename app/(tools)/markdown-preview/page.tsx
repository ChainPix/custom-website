import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownPreviewClient from "./client";

export const metadata: Metadata = {
  title: "Markdown Previewer | FastFormat Tools",
  description:
    "Live Markdown preview with rendered output and copy-ready HTML. Runs entirely in your browser.",
  keywords: [
    "markdown preview",
    "markdown viewer",
    "markdown to html",
    "render markdown",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/markdown-preview`,
  },
  openGraph: {
    title: "Markdown Previewer | FastFormat Tools",
    description: "Write Markdown and see the rendered output instantly with copy-ready HTML.",
    url: `${siteUrl.replace(/\/$/, "")}/markdown-preview`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown Previewer | FastFormat Tools",
    description: "Live Markdown rendering in your browser with HTML copy support.",
  },
};

export default function MarkdownPreviewPage() {
  return <MarkdownPreviewClient />;
}
