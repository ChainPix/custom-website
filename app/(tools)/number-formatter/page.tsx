import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import NumberFormatterClient from "./client";

export const metadata: Metadata = {
  title: "Number Formatter ",
  description:
    "Format numbers with locale, currency, and decimal control. Copy formatted output instantly.",
  keywords: [
    "number formatter",
    "format currency",
    "locale number",
    "decimal places",
    "number grouping",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/number-formatter`,
  },
  openGraph: {
    title: "Number Formatter ",
    description: "Format numbers for any locale or currency with controlled decimals.",
    url: `${siteUrl.replace(/\/$/, "")}/number-formatter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Number Formatter ",
    description: "Format numbers and currencies quickly in your browser.",
  },
};

export default function NumberFormatterPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Formatting runs in your browser; no numbers are uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Decimal and currency using Intl.NumberFormat with grouping, notation, rounding, and fraction controls.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export the result?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy the formatted number or download it as a text file.",
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
      <NumberFormatterClient />
    </>
  );
}
