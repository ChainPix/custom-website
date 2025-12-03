import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextDeduperClient from "./client";

export const metadata: Metadata = {
  title: "Text Deduper | FastFormat Tools",
  description:
    "Remove duplicate lines with case-insensitive options. Trim whitespace, keep order, and copy cleaned text.",
  keywords: [
    "text dedupe",
    "remove duplicate lines",
    "deduplicate text",
    "case-insensitive dedupe",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/text-deduper`,
  },
  openGraph: {
    title: "Text Deduper | FastFormat Tools",
    description: "Clean up duplicate lines with case/trim options. Copy the result instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/text-deduper`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Deduper | FastFormat Tools",
    description: "Remove duplicate lines with case-insensitive and trim options.",
  },
};

export default function TextDeduperPage() {
  return <TextDeduperClient />;
}
