import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonTableClient from "./client";

export const metadata: Metadata = {
  title: "JSON Table Viewer ",
  description:
    "Preview JSON arrays as a sortable table. Validate input, view columns, and copy formatted output.",
  keywords: [
    "json table",
    "json viewer",
    "json to table",
    "json array viewer",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-table`,
  },
  openGraph: {
    title: "JSON Table Viewer ",
    description: "Render JSON arrays into a clean table with validation and copy-ready JSON.",
    url: `${siteUrl.replace(/\/$/, "")}/json-table`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Table Viewer ",
    description: "Visualize JSON arrays in a sortable table. Free and in-browser.",
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
            text: "Yes. Parsing and rendering happen in your browser; data is not uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "What can I export?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can copy or download the parsed JSON and export the table as CSV.",
          },
        },
        {
          "@type": "Question",
          name: "Are large inputs supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Very large inputs may be truncated for performance; a warning is shown when input is big.",
          },
        },
      ],
    }),
  },
};

export default function JsonTablePage() {
  return <JsonTableClient />;
}
