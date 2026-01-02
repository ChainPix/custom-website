import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidClient from "./client";

export const metadata: Metadata = {
  title: "UUID Generator",
  description:
    "Generate v1, v4, v5, and v7 UUIDs instantly. Format, copy, or download UUIDs for APIs, testing, and databases.",
  keywords: [
    "uuid generator",
    "uuid v7",
    "uuid v4",
    "deterministic uuid",
    "uuid v5",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/uuid-generator`,
  },
  openGraph: {
    title: "UUID Generator",
    description: "Generate v1/v4/v5/v7 UUIDs in your browser. Copy, format, or download instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/uuid-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID Generator",
    description: "Instant v1/v4/v5/v7 UUIDs with format and copy-ready output.",
  },
};

export default function UuidPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are UUIDs generated locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. UUIDs are generated in your browser using the crypto API; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I customize the UUID format?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose uppercase/lowercase, keep or remove dashes, and pick an output separator like JSON or CSV.",
        },
      },
      {
        "@type": "Question",
        name: "How many UUIDs can I generate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can generate up to 50 UUIDs at once and copy or download them.",
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
      <UuidClient />
    </>
  );
}
