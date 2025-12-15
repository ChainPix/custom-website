import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "Cron Expression Generator ",
  description:
    "Build cron expressions with a simple UI. See the generated cron string and human-friendly schedule.",
  keywords: [
    "cron generator",
    "cron builder",
    "cron expression",
    "schedule cron",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/cron-generator`,
  },
  openGraph: {
    title: "Cron Expression Generator ",
    description: "Create cron expressions using pickers and see a readable summary.",
    url: `${siteUrl.replace(/\/$/, "")}/cron-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Expression Generator ",
    description: "Generate cron strings visually with human-readable descriptions.",
  },
};

export default function CronGeneratorPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Cron generation and next-run preview happen in your browser.",
        },
      },
      {
        "@type": "Question",
        name: "Do you support seconds?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Toggle the 6-field option to include seconds.",
        },
      },
      {
        "@type": "Question",
        name: "Can I see next run times?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool shows upcoming runs in local time or UTC.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <CronGeneratorClient />
    </>
  );
}
