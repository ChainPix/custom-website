import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
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
  const canonical = `${siteUrl.replace(/\/$/, "")}/url-encoder`;
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When should I encode a URL?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Encode URLs when placing them in query parameters, form data, or webhooks to avoid breaking characters.",
        },
      },
      {
        "@type": "Question",
        name: "Is this tool safe?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs in your browser; no data is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Why is my decode failing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ensure the string is properly percent-encoded (e.g., spaces as %20). Malformed encodings cannot be decoded.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="ld-json-url-encoder-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <UrlEncoderClient />
    </>
  );
}
