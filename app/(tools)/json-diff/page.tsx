import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonDiffClient from "./client";

export const metadata: Metadata = {
  title: "JSON Diff | ToolStack",
  description:
    "Compare two JSON objects and see structured differences. Highlight added, removed, and changed values.",
  keywords: [
    "json diff",
    "compare json",
    "json compare online",
    "diff json objects",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-diff`,
  },
  openGraph: {
    title: "JSON Diff | ToolStack",
    description: "Structured diff for JSON with added/removed/changed highlights.",
    url: `${siteUrl.replace(/\/$/, "")}/json-diff`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Diff | ToolStack",
    description: "Compare two JSON objects and see changes in-browser.",
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
            text: "Yes. The JSON diff runs entirely in your browser; data is not sent to a server.",
          },
        },
        {
          "@type": "Question",
          name: "What can I compare?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Two JSON objects (non-array). The tool highlights added, removed, changed, and unchanged paths.",
          },
        },
        {
          "@type": "Question",
          name: "Can I adjust the diff?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can swap sides, pretty-print inputs, filter by path, ignore case/nulls/array order, and copy/download the diff.",
          },
        },
      ],
    }),
  },
};

export default function JsonDiffPage() {
  return <JsonDiffClient />;
}
