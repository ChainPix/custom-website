import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronParserClient from "./client";

export const metadata: Metadata = {
  title: "Cron Parser",
  description:
    "Validate cron expressions and see the next run times. Supports standard 5-field crons in your browser.",
  keywords: [
    "cron parser",
    "cron expression",
    "cron generator",
    "next cron run",
    "cron schedule",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/cron-parser`,
  },
  openGraph: {
    title: "Cron Parser",
    description: "Parse 5-field cron expressions and view next run dates. Runs locally.",
    url: `${siteUrl.replace(/\/$/, "")}/cron-parser`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Parser",
    description: "Validate cron expressions and get the next run times instantly.",
  },
};

export default function CronParserPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Cron parsing and next-run calculations happen in your browser.",
        },
      },
      {
        "@type": "Question",
        name: "What formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vixie-style numeric cron: 5 fields (m h dom mon dow) with optional seconds, lists/ranges/steps. Day-of-month and day-of-week are treated as AND. No names or special tokens.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download the next runs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy and download buttons are provided for the generated run times.",
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
      <CronParserClient />
    </>
  );
}
