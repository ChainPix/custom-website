import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonFormatterClient from "./client";

export const metadata: Metadata = {
  title: "JSON Formatter | FastFormat Tools",
  description:
    "Free online JSON formatter to beautify or minify JSON instantly. Paste JSON, validate, and copy clean output with zero sign-up.",
  keywords: [
    "json formatter online",
    "json beautifier",
    "json minify",
    "format json",
    "free json formatter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-formatter`,
  },
  openGraph: {
    title: "JSON Formatter | FastFormat Tools",
    description:
      "Format or minify JSON instantly in your browser. Free online JSON beautifier with copy-ready output.",
    url: `${siteUrl.replace(/\/$/, "")}/json-formatter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Formatter | FastFormat Tools",
    description:
      "Free JSON formatter/minifier for clean, copyable JSON. Runs in-browser with no sign-up.",
  },
};

export default function JsonFormatterPage() {
  return <JsonFormatterClient />;
}
