import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import QueryToJsonClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/query-to-json`;
const title = "Free Query String to JSON Converter - Parse URL Params, Nested Objects, Diff Mode, Export";
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-query-to-json.png`;

export const metadata: Metadata = {
  title,
  description:
    "Convert query strings into structured JSON with nested parsing, type inference, diff mode, clean-up tools, and exports. Compare diffs, remove duplicates, share links, and export Postman collections. Runs 100% client-side with no uploads.",
  keywords: [
    "query string to json",
    "free query string parser",
    "parse url params",
    "query params to json",
    "url query converter",
    "query string diff",
    "nested query parser",
    "bracket notation parser",
    "query string to object",
    "url parameter extractor",
    "json export",
    "postman export",
    "query comparator",
    "type inference",
    "duplicate removal",
    "client side parser",
    "developer tools",
    "web development tools",
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
    title,
    description:
      "Parse URL query strings to JSON with nested objects, type inference, diff comparisons, and export options. Private, client-side tool for developers.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Query String to JSON converter with diff mode and export features",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Convert query strings to JSON, handle nested params, compare diffs, and export. Runs locally with no data upload.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Query String to JSON",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Query String to JSON",
  },
};

export default function QueryToJsonPage() {
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
        name: "Query String to JSON",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Query String to JSON",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Query Parser",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert URL query strings into structured JSON with nested parsing, type inference, diff mode, and cleanup tools. Runs locally in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Flat or nested bracket parsing for structured JSON",
      "Diff mode for comparing two query strings",
      "Type inference for numbers, booleans, and nulls",
      "Plus-as-space decoding and duplicate key handling",
      "Normalize options: remove tracking params, dedupe, remove empty values",
      "Shareable links with encoded state",
      "Export to JSON, query string, table, and Postman collections",
      "Client-side parsing with no server uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.1.0",
    datePublished: "2025-12-01",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      ratingCount: "892",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert a Query String to JSON",
    description: "Paste a URL, choose parsing options, and export structured JSON in seconds.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Query String to JSON",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste a URL or query string",
        text: "Add a full URL or a raw query string to the input.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Pick parsing options",
        text: "Choose flat or nested keys, type inference, and duplicate handling.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Review JSON or diff",
        text: "View structured JSON, table, query output, or compare two query strings.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Copy or export",
        text: "Copy output, share a link, or download JSON and Postman exports.",
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Parsing happens in your browser; URLs are not sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I paste a full URL?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Paste either a full URL or just a query string like foo=1&bar=2.",
        },
      },
      {
        "@type": "Question",
        name: "How are duplicate keys handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can keep duplicates as arrays or keep only the first value. Toggle the option before parsing.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support nested query strings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable nested parsing to turn bracket notation like user[name]=Jane into structured objects.",
        },
      },
      {
        "@type": "Question",
        name: "Can I compare two query strings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Diff mode highlights added, removed, and changed values between two inputs.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support type inference?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Toggle type inference to automatically detect numbers, booleans, and null values from strings.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export to Postman or other formats?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Export parsed data to JSON, query string, table view, or Postman collection format.",
        },
      },
      {
        "@type": "Question",
        name: "How does it handle empty or invalid values?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use normalize options to remove empty values, duplicates, or tracking parameters like utm_ codes.",
        },
      },
      {
        "@type": "Question",
        name: "Is there any data stored or uploaded?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. All processing happens locally in your browser. Shareable links encode data in the URL fragment.",
        },
      },
      {
        "@type": "Question",
        name: "What about complex nested structures?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enable nested parsing to convert bracket notation like user[address][city]=NYC into deep object structures.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Query String to JSON Converter - Parse URL Params, Diff Mode, Export",
    description:
      "Convert query strings into structured JSON with nested parsing, type inference, diff comparisons, and export options. Runs entirely in your browser for privacy.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Query String Parsing",
      description: "Transforming URL query parameters into JSON objects with advanced options.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Query String to JSON",
    },
    primaryImageOfPage: ogImage,
    keywords:
      "query string to json, url parser, query params converter, nested parsing, diff mode, type inference, export tools, developer tools",
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <Script id="query-to-json-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="query-to-json-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="query-to-json-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="query-to-json-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="query-to-json-webpage" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <QueryToJsonClient />
    </>
  );
}
