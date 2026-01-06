import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextSearchClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/text-search`;

export const metadata: Metadata = {
  title: "Text Search & Count - Regex, Multi-Tab, Export Matches",
  description:
    "Search text with regex or plain matching, multi-tab inputs, exports, replace workflows, and performance mode. Runs locally in your browser with no uploads.",
  keywords: [
    "text search",
    "find in text",
    "regex search",
    "count matches",
    "find and replace",
    "search logs",
    "multi file search",
    "text search tool",
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
    title: "Text Search & Count - Regex, Multi-Tab, Export Matches",
    description:
      "Search text with regex or plain options, view grouped results, and export matches. Runs locally in your browser with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Search & Count - Regex, Multi-Tab, Export Matches",
    description: "Search and replace text with regex, counts, and exports. Private, client-side.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Text Search",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Text Search",
  },
};

export default function TextSearchPage() {
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
        name: "Text Search",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Text Search & Count",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Text Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Search text with regex or plain matching, multi-tab inputs, match counts, replace workflows, and export options. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Plain and regex search with flags",
      "Multi-tab inputs and file uploads",
      "Grouped results with line/column metadata",
      "Replace current, all, or selection with undo",
      "Export matches as JSON, CSV, or TXT",
      "Performance mode for large inputs",
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
    name: "How to Search Text and Export Matches",
    description: "Search a text block or files, review matches, and export results.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste text or upload files",
        text: "Paste text into a tab or upload .txt/.log files to create multiple tabs.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Set search options",
        text: "Choose plain or regex mode, then toggle case sensitivity, whole word, or flags.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review matches",
        text: "Use the preview and snippets list to navigate matches and view counts.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Replace or export",
        text: "Replace matches or export results as JSON, CSV, or TXT.",
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
          text: "Yes. Searches and counts run entirely in your browser; no text is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use regex?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Switch to regex mode and use case-sensitive or whole-word toggles. Invalid patterns are safely handled.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export results?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy matches or download them as JSON, CSV, or TXT from the results toolbar.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Text Search & Count",
    url: canonical,
    description:
      "Search and replace text with regex or plain matching, export results, and keep everything local.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="text-search-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="text-search-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="text-search-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="text-search-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="text-search-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <Suspense fallback={null}>
        <TextSearchClient />
      </Suspense>
    </>
  );
}
