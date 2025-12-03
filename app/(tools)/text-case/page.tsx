import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextCaseClient from "./client";

export const metadata: Metadata = {
  title: "Text Case Converter | FastFormat Tools",
  description:
    "Convert text to camelCase, snake_case, kebab-case, Title Case, upper, or lower instantly. Copy-ready output.",
  keywords: [
    "text case converter",
    "camelcase",
    "snake case",
    "kebab case",
    "title case",
    "uppercase lowercase",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/text-case`,
  },
  openGraph: {
    title: "Text Case Converter | FastFormat Tools",
    description: "Convert text between common cases in your browser. Free and fast.",
    url: `${siteUrl.replace(/\/$/, "")}/text-case`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Case Converter | FastFormat Tools",
    description: "Camel, snake, kebab, title, upper, lower—convert text instantly.",
  },
};

export default function TextCasePage() {
  return <TextCaseClient />;
}
