import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownHtmlClient from "./client";

export const metadata: Metadata = {
  title: "Markdown ⇄ HTML Converter | FastFormat Tools",
  description:
    "Convert Markdown to HTML or HTML to Markdown instantly. Sanitize output and copy clean markup.",
  keywords: [
    "markdown to html",
    "html to markdown",
    "convert markdown",
    "convert html",
    "online converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/markdown-html`,
  },
  openGraph: {
    title: "Markdown ⇄ HTML Converter | FastFormat Tools",
    description: "Bidirectional Markdown/HTML converter. Free, fast, and copy-ready.",
    url: `${siteUrl.replace(/\/$/, "")}/markdown-html`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown ⇄ HTML Converter | FastFormat Tools",
    description: "Convert Markdown to HTML or back to Markdown instantly in your browser.",
  },
};

export default function MarkdownHtmlPage() {
  return <MarkdownHtmlClient />;
}
