import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextDeduperClient from "./client";

export const metadata: Metadata = {
  title: "Text Deduper",
  description:
    "Remove duplicate lines with case-insensitive options. Trim whitespace, keep order, and copy cleaned text.",
  keywords: [
    "text dedupe",
    "remove duplicate lines",
    "deduplicate text",
    "case-insensitive dedupe",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/text-deduper`,
  },
  openGraph: {
    title: "Text Deduper",
    description: "Clean up duplicate lines with case/trim options. Copy the result instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/text-deduper`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Deduper",
    description: "Remove duplicate lines with case-insensitive and trim options.",
  },
};

export default function TextDeduperPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Deduplication runs in your browser; text is not sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "How are duplicates handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The first occurrence is kept; later duplicates are removed. Options include case-insensitive match, trimming, and keeping blank lines.",
        },
      },
      {
        "@type": "Question",
        name: "Can I sort or download?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can sort output, copy it, or download the deduped text.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <TextDeduperClient />
    </>
  );
}
