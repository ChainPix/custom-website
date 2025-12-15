import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextSearchClient from "./client";

export const metadata: Metadata = {
  title: "Text Search & Count ",
  description:
    "Search text with options for case sensitivity, whole words, or regex. View match counts and snippets.",
  keywords: [
    "text search",
    "find in text",
    "regex search",
    "count matches",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/text-search`,
  },
  openGraph: {
    title: "Text Search & Count ",
    description: "Search text with regex or plain options and see match counts/snippets.",
    url: `${siteUrl.replace(/\/$/, "")}/text-search`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Search & Count ",
    description: "Search and count matches in text with regex/whole-word options.",
  },
};

export default function TextSearchPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Searches and counts run entirely in your browser; no text is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use regex?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Switch to regex mode and use case-sensitive or whole-word toggles. Invalid patterns are safely handled.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export results?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy matches or download them as JSON from the results toolbar.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <TextSearchClient />
    </>
  );
}
