import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import QueryToJsonClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/query-to-json`;

export const metadata: Metadata = {
  title: "Query String to JSON | ToolStack",
  description: "Parse URL query parameters into structured JSON. Decode, sort, and copy/download the result in your browser.",
  keywords: [
    "query string to json",
    "parse url params",
    "query params to json",
    "url parser",
    "developer tools",
  ],
  alternates: { canonical },
  openGraph: {
    title: "Query String to JSON | ToolStack",
    description: "Convert URL parameters into clean JSON locally.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Query String to JSON | ToolStack",
    description: "Decode query parameters into JSON in your browser.",
  },
};

export default function QueryToJsonPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Parsing happens in your browser; URLs are not sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I paste a full URL?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Paste either a full URL or just a query string like foo=1&bar=2.",
        },
      },
      {
        "@type": "Question",
        name: "How are duplicate keys handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can keep duplicates as arrays or keep only the first value. Toggle the option before parsing.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <QueryToJsonClient />
    </>
  );
}
