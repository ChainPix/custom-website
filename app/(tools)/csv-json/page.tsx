import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CsvJsonClient from "./client";

export const metadata: Metadata = {
  title: "CSV ⇄ JSON Converter | ToolStack",
  description:
    "Convert CSV to JSON or JSON to CSV instantly in your browser. Validate, preview, and copy clean output.",
  keywords: [
    "csv to json",
    "json to csv",
    "convert csv",
    "convert json",
    "online converter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/csv-json`,
  },
  openGraph: {
    title: "CSV ⇄ JSON Converter | ToolStack",
    description: "Bidirectional CSV/JSON converter with validation and copy-ready output.",
    url: `${siteUrl.replace(/\/$/, "")}/csv-json`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSV ⇄ JSON Converter | ToolStack",
    description: "Convert CSV to JSON or JSON to CSV instantly. Runs in your browser.",
  },
};

export default function CsvJsonPage() {
  return <CsvJsonClient />;
}
