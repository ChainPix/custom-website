import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UrlEncoderClient from "./client";

export const metadata: Metadata = {
  title: "URL Encoder & Decoder | ToolStack",
  description:
    "Encode or decode URLs instantly. Safe URI encoding for links, query params, and webhooks with copy-ready output.",
  keywords: [
    "url encoder",
    "url decoder",
    "encode url online",
    "decode url online",
    "uri component",
    "web tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/url-encoder`,
  },
  openGraph: {
    title: "URL Encoder & Decoder | ToolStack",
    description: "Instant URL encode/decode for links and query params. Free and browser-based.",
    url: `${siteUrl.replace(/\/$/, "")}/url-encoder`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "URL Encoder & Decoder | ToolStack",
    description: "Encode or decode URLs instantly with copy-ready output.",
  },
};

export default function UrlEncoderPage() {
  return <UrlEncoderClient />;
}
