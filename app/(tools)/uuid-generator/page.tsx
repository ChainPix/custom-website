import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/uuid-generator`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "UUID Generator - v1/v4/v5/v7 with Format & Bulk Output",
  description:
    "Generate v1, v4, v5, and v7 UUIDs instantly. Format output, copy per UUID or batch, and download in TXT/CSV/JSON/SQL. Runs locally in your browser.",
  keywords: [
    "uuid generator",
    "uuid v7",
    "uuid v4",
    "uuid v5",
    "deterministic uuid",
    "uuid namespace",
    "bulk uuid",
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
    title: "UUID Generator - v1/v4/v5/v7 with Format & Bulk Output",
    description: "Generate UUIDs locally with format options, per-row copy, and batch download.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "UUID Generator with format options and batch output",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID Generator - v1/v4/v5/v7 with Format & Bulk Output",
    description: "Generate UUIDs in-browser with copy, download, and format options.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "UUID Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "UUID Generator",
  },
};

export default function UuidPage() {
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
        name: "UUID Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "UUID Generator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "UUID Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Generate v1, v4, v5, and v7 UUIDs locally in your browser. Format output, copy per UUID, and download in TXT/CSV/JSON/SQL.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "v1, v4, v5, and v7 UUID generation",
      "Namespace + name deterministic v5 and bulk mode",
      "Format options: uppercase/lowercase, with or without dashes",
      "Output separators: newline, comma, JSON array, CSV, SQL insert",
      "Per-UUID copy, copy-all, and download output",
      "Shareable query-param links",
      "Runs locally with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate UUIDs",
    description: "Create UUIDs, format them, and export them in seconds.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "UUID Generator",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose a UUID version",
        text: "Pick v4 for random IDs, v7 for sortable IDs, or v5 for deterministic namespaces.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Set count and format",
        text: "Choose how many UUIDs to generate and select casing, dashes, and output separator.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Generate and copy",
        text: "Generate UUIDs, copy a single row or the entire batch, or download output.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are UUIDs generated locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. UUIDs are generated in your browser using the crypto API; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I customize the UUID format and output?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose uppercase/lowercase, keep or remove dashes, and pick output separators like JSON, CSV, or SQL.",
        },
      },
      {
        "@type": "Question",
        name: "When should I use v7?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use v7 when you want time-ordered UUIDs that index well in databases while staying globally unique.",
        },
      },
      {
        "@type": "Question",
        name: "How many UUIDs can I generate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can generate up to 50 UUIDs at once and copy or download them.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "UUID Generator",
    description:
      "Generate v1/v4/v5/v7 UUIDs with format options and batch exports. Private, in-browser tool.",
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
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <Suspense fallback={null}>
        <UuidClient />
      </Suspense>
    </>
  );
}
