import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CurlToFetchClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/curl-to-fetch`;

export const metadata: Metadata = {
  title: "cURL to Fetch Converter | ToolStack",
  description: "Convert cURL commands into JavaScript fetch requests. Clean, fast, and private in your browser.",
  keywords: [
    "curl to fetch",
    "curl converter",
    "curl to javascript",
    "fetch api",
    "http client",
    "api testing",
  ],
  alternates: { canonical },
  openGraph: {
    title: "cURL to Fetch Converter | ToolStack",
    description: "Transform cURL commands into modern fetch snippets without leaving the browser.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "cURL to Fetch Converter | ToolStack",
    description: "Paste a cURL command and get a fetch snippet instantly.",
  },
};

export default function CurlToFetchPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Parsing happens in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What is converted?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool extracts URL, method, headers, and body from common cURL flags (-X/--request, -H/--header, -d/--data). Unsupported flags are ignored safely.",
        },
      },
      {
        "@type": "Question",
        name: "Is JSON body handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Bodies are passed through as-is. If you need JSON, keep Content-Type: application/json and the body will be set on fetch.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <CurlToFetchClient />
    </>
  );
}
