import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import SqlFormatterClient from "./client";

export const metadata: Metadata = {
  title: "SQL Formatter",
  description:
    "Format SQL queries for readability, compact layouts, or team presets. Adjust keyword case, indentation, and line spacing.",
  keywords: [
    "sql formatter",
    "format sql online",
    "sql beautifier",
    "sql pretty print",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/sql-formatter`,
  },
  openGraph: {
    title: "SQL Formatter",
    description: "Prettify SQL queries with dialect selection, presets, and formatting controls.",
    url: `${siteUrl.replace(/\/$/, "")}/sql-formatter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SQL Formatter",
    description: "Format SQL queries in-browser with presets, keyword casing, and spacing controls.",
  },
};

export default function SqlFormatterPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does formatting run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. SQL is formatted in your browser; no queries are sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which dialects are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Common dialects including SQL, MySQL, PostgreSQL, SQLite, and MariaDB.",
        },
      },
      {
        "@type": "Question",
        name: "Can I adjust formatting?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose a preset or customize keyword case, indent style, line spacing, comma style, and minify output.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <SqlFormatterClient />
    </>
  );
}
