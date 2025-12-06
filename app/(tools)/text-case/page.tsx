import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextCaseClient from "./client";

export const metadata: Metadata = {
  title: "Text Case Converter | ToolStack",
  description:
    "Convert text to camelCase, snake_case, kebab-case, Title Case, upper, or lower instantly. Copy-ready output.",
  keywords: [
    "text case converter",
    "camelcase",
    "snake case",
    "kebab case",
    "title case",
    "uppercase lowercase",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/text-case`,
  },
  openGraph: {
    title: "Text Case Converter | ToolStack",
    description: "Convert text between common cases in your browser. Free and fast.",
    url: `${siteUrl.replace(/\/$/, "")}/text-case`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Case Converter | ToolStack",
    description: "Camel, snake, kebab, title, upper, lower—convert text instantly.",
  },
};

export default function TextCasePage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Case conversion runs entirely in your browser; no text is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which cases are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "camelCase, PascalCase, snake_case, kebab-case, Title Case, UPPERCASE, lowercase, sentence case, and capitalized words.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download results?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy individual cases, copy all outputs, or download a text file of all cases.",
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
      <TextCaseClient />
    </>
  );
}
