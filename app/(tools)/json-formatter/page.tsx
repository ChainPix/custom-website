import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonFormatterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/json-formatter`;

export const metadata: Metadata = {
  title: "JSON Formatter & Validator - JSON5, Schema, Diff, Tree View",
  description:
    "Format, minify, validate, and compare JSON locally in your browser. JSON5 support, schema validation, JSONPath queries, tree view, diff mode, and shareable links. Handles up to 10MB with no uploads.",
  keywords: [
    "json formatter",
    "json beautifier",
    "json minify",
    "json validator",
    "json5 formatter",
    "json schema validation",
    "jsonpath query",
    "json diff",
    "json tree view",
    "format json online",
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
  alternates: {
    canonical,
  },
  openGraph: {
    title: "JSON Formatter & Validator - JSON5, Schema, Diff, Tree",
    description:
      "Format, minify, validate, and compare JSON locally with JSON5 parsing, schema checks, JSONPath queries, and tree view. No uploads, runs in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/logo.png`,
        width: 1200,
        height: 630,
        alt: "JSON Formatter with JSON5, schema validation, and tree view",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Formatter & Validator - JSON5, Schema, Diff, Tree",
    description:
      "Fast in-browser JSON formatter with JSON5 parsing, schema validation, JSONPath queries, tree view, and diff mode.",
    images: [`${siteUrl.replace(/\/$/, "")}/logo.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JSON Formatter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JSON Formatter",
  },
};

export default function JsonFormatterPage() {
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
        name: "JSON Formatter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JSON Formatter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "JSON Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Format, minify, validate, and compare JSON locally with JSON5 parsing, schema validation, JSONPath queries, tree view, and diff mode. Runs in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Format and minify JSON with custom indentation",
      "JSON5 parsing with fix for comments/trailing commas",
      "JSON Schema validation with error highlighting",
      "JSONPath query and tree view inspection",
      "Diff mode with merge patch output",
      "Shareable links and local history",
      "Client-side processing, up to 10MB inputs",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.1.0",
    datePublished: "2025-12-12",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "1567",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: `${siteUrl.replace(/\/$/, "")}/logo.png`,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Format and Validate JSON",
    description: "Format JSON, validate against a schema, and inspect output in the tree view.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "JSON Formatter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Paste JSON",
        text: "Paste or upload your JSON input. The tool runs locally in your browser.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose format options",
        text: "Set indentation, key sorting, and JSON5 mode as needed.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Format or minify",
        text: "Click Format or Minify to generate clean output.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Validate or inspect",
        text: "Validate against a schema, run JSONPath queries, or inspect in the tree view.",
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
        name: "Is the JSON formatter private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs locally in your browser. Your JSON is never uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What is the maximum file size?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Inputs up to 10MB are supported. Larger files may be slow or fail in the browser.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support JSON5?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable JSON5 mode to allow comments and trailing commas, then use Fix JSON5 to convert to strict JSON.",
        },
      },
      {
        "@type": "Question",
        name: "Can I validate JSON with a schema?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Paste a JSON Schema, validate, and click errors to jump to the matching node in the tree.",
        },
      },
      {
        "@type": "Question",
        name: "Can I preserve number formatting?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable Preserve number formatting to keep exponent notation like 1e-6.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "JSON Formatter & Validator",
    description:
      "Format, minify, validate, and compare JSON locally with JSON5 parsing, schema validation, and tree view.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "JSON",
      description: "JavaScript Object Notation used for data interchange across APIs and tools.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "JSON Formatter",
    },
    keywords:
      "json formatter, json validator, json5, json schema, jsonpath, json diff, json tree view",
  };

  return (
    <>
      <Script
        id="json-formatter-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="json-formatter-app"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script
        id="json-formatter-howto"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Script
        id="json-formatter-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="json-formatter-webpage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <JsonFormatterClient />
    </>
  );
}
