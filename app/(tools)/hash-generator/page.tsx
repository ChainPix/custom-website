import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HashGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "Hash Generator | ToolStack",
  description:
    "Generate SHA-1 or SHA-256 hashes in your browser. Paste text, hash instantly, and copy the result.",
  keywords: [
    "hash generator",
    "sha256",
    "sha1",
    "compute hash",
    "online hash tool",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/hash-generator`,
  },
  openGraph: {
    title: "Hash Generator | ToolStack",
    description: "Compute SHA-1 or SHA-256 hashes instantly in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/hash-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hash Generator | ToolStack",
    description: "Hash text with SHA-1 or SHA-256. Free, fast, browser-based.",
  },
};

export default function HashGeneratorPage() {
  return <HashGeneratorClient />;
}
