import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Base64Client from "./client";

export const metadata: Metadata = {
  title: "Base64 Encoder & Decoder | ToolStack",
  description:
    "Encode or decode Base64 online. Paste text, convert instantly, and copy results—no limits or sign-up.",
  keywords: [
    "base64 encoder",
    "base64 decoder",
    "encode base64",
    "decode base64",
    "text to base64",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/base64-encoder`,
  },
  openGraph: {
    title: "Base64 Encoder & Decoder | ToolStack",
    description: "Free Base64 encode/decode tool with copy-ready output. Browser-based and fast.",
    url: `${siteUrl.replace(/\/$/, "")}/base64-encoder`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Base64 Encoder & Decoder | ToolStack",
    description: "Convert text to/from Base64 instantly with no sign-up.",
  },
};

export default function Base64Page() {
  return <Base64Client />;
}
