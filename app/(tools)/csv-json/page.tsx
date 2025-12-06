import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CsvJsonClient from "./client";

export const metadata: Metadata = {
  title: "CSV ⇄ JSON Converter | ToolStack",
  description:
    "Convert CSV to JSON or JSON to CSV instantly in your browser. Validate, preview, and copy clean output.",
  keywords: [
    "csv to json",
    "json to csv",
    "convert csv",
    "convert json",
    "online converter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/csv-json`,
  },
  openGraph: {
    title: "CSV ⇄ JSON Converter | ToolStack",
    description: "Bidirectional CSV/JSON converter with validation and copy-ready output.",
    url: `${siteUrl.replace(/\/$/, "")}/csv-json`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSV ⇄ JSON Converter | ToolStack",
    description: "Convert CSV to JSON or JSON to CSV instantly. Runs in your browser.",
  },
};

export default function CsvJsonPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CSV and JSON conversion runs in your browser; files are not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I change delimiters and headers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose comma, semicolon, tab, or pipe, and toggle whether the first row is a header.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a size limit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool warns on very large inputs and enforces a 20,000-row soft limit for reliable performance.",
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
      <CsvJsonClient />
    </>
  );
}
