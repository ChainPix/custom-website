import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonValidatorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/json-validator`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-json-validator.png`;

export const metadata: Metadata = {
  title: "JSON Validator & Linter - Format, Schema Validate, JSONPath (Local)",
  description:
    "Validate JSON locally with line/column hints, JSON5 support, schema checks, JSONPath queries, and redaction before share. Pretty-print, diff, and export clean JSON with zero uploads.",
  keywords: [
    "json validator",
    "json linter",
    "validate json online",
    "json formatter",
    "json schema validation",
    "jsonpath query",
    "json5 validator",
    "json duplicate keys",
    "redact secrets",
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
    title: "JSON Validator & Linter - Schema, JSONPath, JSON5 (Local)",
    description: "Validate JSON with line/column hints, JSON5 parsing, schema checks, and JSONPath queries. Client-side only.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "JSON Validator with schema checks, JSONPath, and local processing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Validator & Linter - Local, Fast, and Private",
    description: "Validate and format JSON with line/column hints, JSON5 parsing, schema validation, and JSONPath queries.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JSON Validator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JSON Validator",
  },
};

export default function JsonValidatorPage() {
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
        name: "JSON Validator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JSON Validator & Linter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "JSON Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Validate JSON with line/column hints, JSON5 parsing, schema validation, JSONPath queries, and redaction before export. Runs 100% locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Fast JSON validation with line/column hints",
      "JSON5 parsing toggle with strict JSON output",
      "Schema validation (AJV) and error paths",
      "JSONPath querying and match preview",
      "Duplicate key detection",
      "Redact secrets before copy/download/share",
      "Shareable local links and diff view",
      "File upload, drag-and-drop, clipboard paste",
      "Client-side processing with zero uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.0.0",
    datePublished: "2025-12-01",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1500",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Validate JSON Locally",
    description: "Validate JSON, review errors, and export formatted output with our local JSON validator.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or upload JSON",
        text: "Paste JSON into the input, drop a file, or use the clipboard paste button.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Validate and inspect errors",
        text: "Run validation (auto or manual) to see line/column hints when available.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Optional schema or JSONPath checks",
        text: "Paste a JSON Schema to validate structure or run JSONPath queries to extract values.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Export safely",
        text: "Copy or download formatted JSON with optional secret redaction enabled.",
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
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. JSON validation and formatting run in your browser; no data is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can it format JSON?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Valid JSON is pretty-printed with indentation for readability.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support JSON5 or JSON Schema validation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JSON5 mode is available as a toggle (output is normalized to strict JSON). JSON Schema validation is available in the Developer tools panel.",
        },
      },
      {
        "@type": "Question",
        name: "Can it redact secrets before sharing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable the Redact secrets toggle to mask sensitive keys (passwords, tokens, API keys) before copy, download, or share.",
        },
      },
      {
        "@type": "Question",
        name: "How do share links work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Share links encode the JSON into the URL fragment, so no server storage is involved.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="software-app-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <JsonValidatorClient />
    </>
  );
}
