import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonDiffClient from "./client";

export const metadata: Metadata = {
  title: "JSON Diff",
  description:
    "Compare two JSON objects or arrays and see structured differences with added, removed, and changed values.",
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
    title: "JSON Diff",
    description: "Structured diff for JSON objects or arrays with added/removed/changed highlights.",
    url: `${siteUrl.replace(/\/$/, "")}/json-diff`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Diff",
    description: "Compare two JSON objects or arrays and see changes in-browser.",
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
            text: "Two JSON objects or arrays. The tool highlights added, removed, changed, and unchanged paths.",
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
