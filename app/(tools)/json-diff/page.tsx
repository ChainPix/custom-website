import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonDiffClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/json-diff`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "JSON Diff Tool - Compare JSON Objects or Arrays Online",
  description:
    "Compare two JSON objects or arrays with a tree diff, side-by-side viewer, and JSON Patch output. Filter, ignore rules, and export reports locally in your browser.",
  keywords: [
    "json diff",
    "compare json",
    "json compare online",
    "diff json objects",
    "json patch generator",
    "json merge tool",
    "json array diff",
    "json diff by key",
    "json tree diff",
    "json compare tool",
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
    title: "JSON Diff Tool - Compare JSON Objects or Arrays Online",
    description:
      "Tree-based JSON diff with side-by-side values, key-aware array matching, JSON Patch output, and exportable reports. Runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "JSON Diff Tool with tree view and side-by-side comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Diff Tool - Compare JSON Objects or Arrays Online",
    description:
      "Compare JSON with a tree diff, key-aware array matching, JSON Patch output, and exportable reports. Client-side and private.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JSON Diff",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JSON Diff",
  },
};

export default function JsonDiffPage() {
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
        name: "JSON Diff",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JSON Diff Tool",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Data Comparison Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Compare JSON objects or arrays with a tree diff, side-by-side viewer, and JSON Patch export. Includes key-aware array matching, ignore rules, and exportable reports. Runs locally in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Tree diff explorer with expand/collapse",
      "Side-by-side JSON value viewer",
      "Array diff by index, set, or key",
      "Ignore rules (paths, keys, nulls, empty values)",
      "JSON Patch (RFC 6902) export",
      "Merge mode with accept/reject selections",
      "Export diff reports (JSON, Markdown, CSV)",
      "Client-side processing with no uploads",
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
    name: "How to Compare Two JSON Files",
    description: "Paste or upload JSON, review the tree diff, and export patches or reports.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Add JSON inputs",
        text: "Paste or upload the left and right JSON inputs.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Tune diff settings",
        text: "Choose array diff mode, apply ignore rules, and filter results.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Export results",
        text: "Copy the diff, generate JSON Patch, or export a merged JSON output.",
        position: 3,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does JSON Diff run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All diffing happens in your browser and nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I compare arrays?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can compare arrays by index, as sets, or by key when items are objects.",
        },
      },
      {
        "@type": "Question",
        name: "What export formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can export the diff as JSON, Markdown, CSV, or JSON Patch (RFC 6902).",
        },
      },
      {
        "@type": "Question",
        name: "How do I merge changes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use merge mode to accept or reject individual changes, then export the merged JSON.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="json-diff-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="json-diff-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="json-diff-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="json-diff-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <JsonDiffClient />
    </>
  );
}
