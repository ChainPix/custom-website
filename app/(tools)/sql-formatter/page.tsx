import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import SqlFormatterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/sql-formatter`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Free SQL Formatter - Dialect-Aware Prettify, Minify, and Diff",
  description:
    "Format SQL with dialect-aware presets, keyword casing, line spacing, comma styles, and minify mode. Compare input/output diffs, export SQL/TXT, and keep data private in-browser.",
  keywords: [
    "sql formatter",
    "format sql online",
    "sql beautifier",
    "sql pretty print",
    "sql minify",
    "sql diff",
    "sql formatter presets",
    "sql formatter offline",
    "developer tools",
  ],
  authors: [{ name: "ToolStack Development Team" }],
  creator: "ToolStack",
  publisher: "ToolStack",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical },
  openGraph: {
    title: "Free SQL Formatter - Dialect-Aware Prettify, Minify, and Diff",
    description:
      "Prettify SQL with presets, keyword casing, diff view, and export options. Runs locally in your browser with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "SQL Formatter with presets, diff view, and exports",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free SQL Formatter - Dialect-Aware Prettify, Minify, and Diff",
    description:
      "Format SQL in-browser with presets, diff view, and export options. Private, client-side.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "SQL Formatter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "SQL Formatter",
  },
};

export default function SqlFormatterPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl.replace(/\/$/, ""),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tools",
        item: `${siteUrl.replace(/\/$/, "")}/#tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "SQL Formatter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SQL Formatter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "SQL Formatting Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "SQL formatter with dialect-aware presets, keyword casing, line spacing, comma styles, minify mode, diff view, and export options. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Dialect-aware formatting (SQL, MySQL, PostgreSQL, SQLite, MariaDB)",
      "Prettify and Minify modes with presets",
      "Keyword casing, comma style, and indent tabs/spaces",
      "Multi-statement formatter with splitter preview",
      "Diff view for input vs output",
      "Export SQL/TXT and copy Markdown code blocks",
      "Shareable links and local persistence",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-01-11",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1150",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Format SQL",
    description: "Format SQL queries, compare diffs, and export results in seconds.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "SQL Formatter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste SQL",
        text: "Paste your SQL or import a .sql file to load queries.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose options",
        text: "Pick a dialect, apply a preset, and choose Prettify or Minify mode.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Format and review",
        text: "Format the SQL and optionally compare the diff between input and output.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Export",
        text: "Copy output, export SQL/TXT, or copy as a Markdown code block.",
      },
    ],
  };

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
        name: "Can I format multiple statements?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable multi-statement formatting to split and format batches of SQL.",
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
      {
        "@type": "Question",
        name: "Can I compare the diff between input and output?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable diff view to see a side-by-side comparison of your original SQL and the formatted output.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "SQL Formatter",
    description:
      "Dialect-aware SQL formatting with presets, diff view, and export options. Private, in-browser tool.",
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <Script id="sql-formatter-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="sql-formatter-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="sql-formatter-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="sql-formatter-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="sql-formatter-webpage" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <SqlFormatterClient />
    </>
  );
}
