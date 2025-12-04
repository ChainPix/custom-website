import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonTableClient from "./client";

export const metadata: Metadata = {
  title: "JSON Table Viewer | ToolStack",
  description:
    "Preview JSON arrays as a sortable table. Validate input, view columns, and copy formatted output.",
  keywords: [
    "json table",
    "json viewer",
    "json to table",
    "json array viewer",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-table`,
  },
  openGraph: {
    title: "JSON Table Viewer | ToolStack",
    description: "Render JSON arrays into a clean table with validation and copy-ready JSON.",
    url: `${siteUrl.replace(/\/$/, "")}/json-table`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Table Viewer | ToolStack",
    description: "Visualize JSON arrays in a sortable table. Free and in-browser.",
  },
};

export default function JsonTablePage() {
  return <JsonTableClient />;
}
