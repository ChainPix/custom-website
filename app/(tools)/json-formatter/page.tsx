import type { Metadata } from "next";
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
    canonical: "/json-formatter",
  },
};

export default function JsonFormatterPage() {
  return <JsonFormatterClient />;
}
