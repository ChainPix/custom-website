import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import RegexExtractorClient from "./client";

export const metadata: Metadata = {
  title: "Regex Extractor | ToolStack",
  description:
    "Extract regex capture groups from text and view results in a table. Supports global matches with flags.",
  keywords: [
    "regex extractor",
    "regex capture groups",
    "extract matches",
    "regex tool",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/regex-extractor`,
  },
  openGraph: {
    title: "Regex Extractor | ToolStack",
    description: "Run regex and extract capture groups into a table. Free and in-browser.",
    url: `${siteUrl.replace(/\/$/, "")}/regex-extractor`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Extractor | ToolStack",
    description: "Extract regex matches and capture groups from text instantly.",
  },
  other: {
    "script:type:application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does this run locally?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Regex extraction runs entirely in your browser; nothing is uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "What do I get?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Matches with capture groups, shown in a table. You can copy or download the results as JSON or CSV.",
          },
        },
        {
          "@type": "Question",
          name: "Any limits?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Large inputs are truncated for safety, and matches are capped to keep the tool responsive.",
          },
        },
      ],
    }),
  },
};

export default function RegexExtractorPage() {
  return <RegexExtractorClient />;
}
