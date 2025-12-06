import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidClient from "./client";

export const metadata: Metadata = {
  title: "UUID Generator | ToolStack",
  description:
    "Generate v4 UUIDs instantly. Copy one or many random UUIDs for APIs, testing, and development.",
  keywords: [
    "uuid generator",
    "uuid v4",
    "random uuid",
    "generate uuid online",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/uuid-generator`,
  },
  openGraph: {
    title: "UUID Generator | ToolStack",
    description: "Generate v4 UUIDs in your browser. Copy multiple IDs instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/uuid-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID Generator | ToolStack",
    description: "Instant v4 UUIDs with copy-ready output.",
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
          text: "Yes. UUIDs are generated in your browser using crypto.randomUUID(); nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I remove dashes or use uppercase?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Toggle uppercase and include dashes to match the format you need.",
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
