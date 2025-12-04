import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UrlParserClient from "./client";

export const metadata: Metadata = {
  title: "URL Parser | ToolStack",
  description:
    "Parse URLs into protocol, host, path, query params, and hash. Validate URLs and copy components.",
  keywords: [
    "url parser",
    "parse url",
    "url components",
    "query params",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/url-parser`,
  },
  openGraph: {
    title: "URL Parser | ToolStack",
    description: "Break down URLs into components and query params in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/url-parser`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "URL Parser | ToolStack",
    description: "Inspect URL parts and query params instantly.",
  },
};

export default function UrlParserPage() {
  return <UrlParserClient />;
}
