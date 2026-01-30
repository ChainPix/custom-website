import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonTableClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/json-table`;

export const metadata: Metadata = {
  title: "JSON Table Viewer - JSON to Table, CSV, TSV, NDJSON, Filters",
  description:
    "Turn JSON into a clean, sortable table with filters, group-by, and column stats. Export CSV/TSV/NDJSON, flatten nested data, and share links. Runs entirely in your browser with no uploads.",
  keywords: [
    "json table",
    "json viewer",
    "json to table",
    "json array viewer",
    "json table viewer",
    "json table generator",
    "json to csv",
    "json to tsv",
    "ndjson export",
    "json flatten",
    "jsonpath table",
    "json table filters",
    "json table group by",
    "client side json tool",
    "developer tools",
  ],
  alternates: {
    canonical,
  },
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
  openGraph: {
    title: "JSON Table Viewer - JSON to Table, CSV, TSV, NDJSON",
    description:
      "Preview JSON as a table, filter and group by columns, and export CSV/TSV/NDJSON. Local, private, and fast.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Table Viewer - JSON to Table, CSV, TSV, NDJSON",
    description: "Clean JSON tables with filters, stats, and exports. Runs locally in your browser.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JSON Table Viewer",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JSON Table Viewer",
  },
};

export default function JsonTablePage() {
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
        name: "JSON Table Viewer",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JSON Table Viewer",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "JSON Utilities",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert JSON arrays, objects, and nested data into a sortable, filterable table with exports and privacy-first processing.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Auto-wrap single objects and array-of-primitive support",
      "JSONPath selection for deep arrays",
      "Column filters, group-by counts, and stats",
      "Typed sorting with null/undefined badges",
      "Flatten table and export options",
      "CSV, TSV, JSON, and NDJSON exports",
      "Share links, file upload, drag-and-drop",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert JSON to a Table",
    description: "Turn JSON data into a sortable table and export it in common formats.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or load JSON",
        text: "Paste JSON, upload a .json file, or drop it into the editor.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose a source array",
        text: "Use JSONPath like $.items[*] when your array is nested.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Explore the table",
        text: "Sort columns, add filters, view stats, or group by a column.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Export or share",
        text: "Copy visible columns or download CSV/TSV/JSON/NDJSON, or share a link.",
        position: 4,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does the JSON Table Viewer run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Parsing and rendering happen in your browser; data is not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What JSON formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Arrays of objects, arrays of primitives, and single objects are supported. Use JSONPath to target nested arrays.",
        },
      },
      {
        "@type": "Question",
        name: "What exports are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Export JSON, CSV, TSV, or NDJSON. You can flatten nested data and export filtered rows only.",
        },
      },
      {
        "@type": "Question",
        name: "How are large inputs handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Large inputs are parsed in a Web Worker, table rows are virtualized, and a size limit prevents lockups.",
        },
      },
    ],
  };

  return (
    <>
      <JsonTableClient />
      <Script id="json-table-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="json-table-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="json-table-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="json-table-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
    </>
  );
}
