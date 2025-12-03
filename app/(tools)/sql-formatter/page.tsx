import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import SqlFormatterClient from "./client";

export const metadata: Metadata = {
  title: "SQL Formatter | FastFormat Tools",
  description:
    "Format SQL queries for readability or compact output. Supports common dialect options and copy-ready results.",
  keywords: [
    "sql formatter",
    "format sql online",
    "sql beautifier",
    "sql pretty print",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/sql-formatter`,
  },
  openGraph: {
    title: "SQL Formatter | FastFormat Tools",
    description: "Prettify SQL queries with dialect selection. Copy clean, readable SQL.",
    url: `${siteUrl.replace(/\/$/, "")}/sql-formatter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SQL Formatter | FastFormat Tools",
    description: "Format SQL queries in-browser with dialect choices.",
  },
};

export default function SqlFormatterPage() {
  return <SqlFormatterClient />;
}
