import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MockDataClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/mock-data`;

export const metadata: Metadata = {
  title: "Mock Data Generator | ToolStack",
  description: "Generate realistic fake data in JSON, CSV, or SQL formats directly in your browser.",
  keywords: [
    "mock data generator",
    "fake data",
    "json mock",
    "csv mock",
    "sql insert generator",
    "test data",
  ],
  alternates: { canonical },
  openGraph: {
    title: "Mock Data Generator | ToolStack",
    description: "Create user and transaction sample data in JSON, CSV, or SQL locally.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mock Data Generator | ToolStack",
    description: "Generate realistic test data for prototyping and QA.",
  },
};

export default function MockDataPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Data is generated in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can export JSON, CSV, or SQL insert statements.",
        },
      },
      {
        "@type": "Question",
        name: "Can I control sample size?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose a preset schema and set a record count (capped to 500 for performance).",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <MockDataClient />
    </>
  );
}
