import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import SqlFormatterClient from "./client";

export const metadata: Metadata = {
  title: "SQL Formatter | ToolStack",
  description:
    "Format SQL queries for readability or compact output. Supports common dialect options and copy-ready results.",
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
    title: "SQL Formatter | ToolStack",
    description: "Prettify SQL queries with dialect selection. Copy clean, readable SQL.",
    url: `${siteUrl.replace(/\/$/, "")}/sql-formatter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SQL Formatter | ToolStack",
    description: "Format SQL queries in-browser with dialect choices.",
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
          text: "Yes. You can change indent size, toggle compact mode, wrap lines, and download formatted SQL.",
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
