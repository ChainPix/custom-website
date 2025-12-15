import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TimestampConverterClient from "./client";

export const metadata: Metadata = {
  title: "Timestamp Converter ",
  description:
    "Convert Unix timestamps to readable dates and back. Supports seconds or milliseconds with time zone context.",
  keywords: [
    "timestamp converter",
    "unix to date",
    "epoch converter",
    "date to timestamp",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/timestamp-converter`,
  },
  openGraph: {
    title: "Timestamp Converter ",
    description: "Convert Unix timestamps to human dates and back, including seconds or milliseconds.",
    url: `${siteUrl.replace(/\/$/, "")}/timestamp-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timestamp Converter ",
    description: "Quickly convert between epoch timestamps and readable date/time.",
  },
};

export default function TimestampConverterPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Timestamp conversions are performed in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use milliseconds?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Toggle the milliseconds option to convert ms-based timestamps.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download results?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy and download buttons are provided for dates and timestamps.",
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
      <TimestampConverterClient />
    </>
  );
}
