import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonValidatorClient from "./client";

export const metadata: Metadata = {
  title: "JSON Validator & Linter ",
  description:
    "Validate and pretty-print JSON in your browser. Catch errors with line/column hints and copy clean output.",
  keywords: [
    "json validator",
    "json linter",
    "validate json online",
    "json formatter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-validator`,
  },
  openGraph: {
    title: "JSON Validator & Linter ",
    description: "Check JSON validity and format it with helpful error messages.",
    url: `${siteUrl.replace(/\/$/, "")}/json-validator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Validator & Linter ",
    description: "Validate and format JSON with line/column error hints. Runs in-browser.",
  },
};

export default function JsonValidatorPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. JSON validation runs in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can it format JSON?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Valid JSON is pretty-printed with indentation for readability.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support JSON5 or schemas?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JSON5 mode is available as a toggle. Schema validation is planned as a future enhancement.",
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
      <JsonValidatorClient />
    </>
  );
}
