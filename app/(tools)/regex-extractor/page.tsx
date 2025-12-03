import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import RegexExtractorClient from "./client";

export const metadata: Metadata = {
  title: "Regex Extractor | FastFormat Tools",
  description:
    "Extract regex capture groups from text and view results in a table. Supports global matches with flags.",
  keywords: [
    "regex extractor",
    "regex capture groups",
    "extract matches",
    "regex tool",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/regex-extractor`,
  },
  openGraph: {
    title: "Regex Extractor | FastFormat Tools",
    description: "Run regex and extract capture groups into a table. Free and in-browser.",
    url: `${siteUrl.replace(/\/$/, "")}/regex-extractor`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Extractor | FastFormat Tools",
    description: "Extract regex matches and capture groups from text instantly.",
  },
};

export default function RegexExtractorPage() {
  return <RegexExtractorClient />;
}
