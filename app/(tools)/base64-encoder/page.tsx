import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
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
  const canonical = `${siteUrl.replace(/\/$/, "")}/base64-encoder`;
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When should I use Base64?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use Base64 to represent binary data as text (e.g., headers, tokens, small payloads, data URIs).",
        },
      },
      {
        "@type": "Question",
        name: "Is this tool private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs in your browser; no data is uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Why is decode failing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ensure the string is valid Base64 with proper padding (=) and allowed characters. Corrupt input cannot be decoded.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="ld-json-base64-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Base64Client />
    </>
  );
}
