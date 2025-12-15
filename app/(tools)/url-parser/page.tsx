import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UrlParserClient from "./client";

export const metadata: Metadata = {
  title: "URL Parser ",
  description:
    "Parse URLs into protocol, host, path, query params, and hash. Validate URLs and copy components.",
  keywords: [
    "url parser",
    "parse url",
    "url components",
    "query params",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/url-parser`,
  },
  openGraph: {
    title: "URL Parser ",
    description: "Break down URLs into components and query params in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/url-parser`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "URL Parser ",
    description: "Inspect URL parts and query params instantly.",
  },
};

export default function UrlParserPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All parsing happens in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What URL schemes are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Primarily http and https. Other schemes may parse but may not be fully supported.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download params?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy the query string, copy individual params, or download params as JSON or CSV.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <UrlParserClient />
    </>
  );
}
