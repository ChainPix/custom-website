import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronTesterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/cron-tester`;

export const metadata: Metadata = {
  title: "Cron Expression Tester ",
  description: "Validate cron expressions and view upcoming run times. Supports 5 or 6 field cron with UTC/local toggle.",
  keywords: ["cron tester", "cron validator", "next run time", "cron expression", "scheduler"],
  alternates: { canonical },
  openGraph: {
    title: "Cron Expression Tester ",
    description: "Validate cron strings and preview the next run times in your browser.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Expression Tester ",
    description: "Check cron syntax and next run times quickly.",
  },
};

export default function CronTesterPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do you support 6-field cron?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable the seconds toggle to use 6-field cron (s m h dom mon dow).",
        },
      },
      {
        "@type": "Question",
        name: "Is the computation local?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Parsing and next-run calculation happen in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which timezone is used?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "By default we use your local timezone; you can toggle UTC.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <CronTesterClient />
    </>
  );
}
