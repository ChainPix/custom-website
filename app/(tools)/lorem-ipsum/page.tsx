import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import LoremIpsumClient from "./client";

export const metadata: Metadata = {
  title: "Lorem Ipsum & Mock Data Generator | FastFormat Tools",
  description:
    "Generate lorem ipsum text, sentences, or mock data snippets for quick prototyping. Copy instantly.",
  keywords: [
    "lorem ipsum generator",
    "mock data generator",
    "placeholder text",
    "dummy text",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/lorem-ipsum`,
  },
  openGraph: {
    title: "Lorem Ipsum & Mock Data Generator | FastFormat Tools",
    description: "Create lorem ipsum paragraphs or mock snippets on the fly. Free and fast.",
    url: `${siteUrl.replace(/\/$/, "")}/lorem-ipsum`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lorem Ipsum & Mock Data Generator | FastFormat Tools",
    description: "Generate placeholder text or mock snippets for prototyping.",
  },
};

export default function LoremIpsumPage() {
  return <LoremIpsumClient />;
}
