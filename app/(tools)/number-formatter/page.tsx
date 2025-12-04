import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import NumberFormatterClient from "./client";

export const metadata: Metadata = {
  title: "Number Formatter | ToolStack",
  description:
    "Format numbers with locale, currency, and decimal control. Copy formatted output instantly.",
  keywords: [
    "number formatter",
    "format currency",
    "locale number",
    "decimal places",
    "number grouping",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/number-formatter`,
  },
  openGraph: {
    title: "Number Formatter | ToolStack",
    description: "Format numbers for any locale or currency with controlled decimals.",
    url: `${siteUrl.replace(/\/$/, "")}/number-formatter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Number Formatter | ToolStack",
    description: "Format numbers and currencies quickly in your browser.",
  },
};

export default function NumberFormatterPage() {
  return <NumberFormatterClient />;
}
