import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextDeduperClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/text-deduper`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Text Deduper - Remove Duplicate Lines with Matching Modes",
  description:
    "Remove duplicate lines with matching modes, keep rules, frequency analytics, and export formats. Works locally in your browser with optional worker mode and file uploads.",
  keywords: [
    "text deduper",
    "remove duplicate lines",
    "deduplicate text",
    "case-insensitive dedupe",
    "text cleanup",
    "line deduper",
    "unique lines",
    "duplicate finder",
    "frequency table",
    "text normalization",
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
    title: "Text Deduper - Remove Duplicate Lines with Matching Modes",
    description:
      "Clean up duplicate lines with matching modes, keep rules, frequency analytics, and export formats. Runs locally with optional worker mode.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Text Deduper with matching modes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Deduper - Remove Duplicate Lines",
    description:
      "Deduplicate lines with matching modes, keep rules, frequency analytics, and exports. Private, client-side processing.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Text Deduper",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Text Deduper",
  },
};

export default function TextDeduperPage() {
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
        name: "Text Deduper",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Text Deduper",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Text Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Remove duplicate lines with matching modes (whitespace, Unicode, diacritics, URL/email normalization), keep rules, frequency analytics, and export formats. Runs locally with optional worker mode and file uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Matching modes: exact, whitespace, Unicode NFKC, diacritics, punctuation, URL/email normalization",
      "Keep rules: first, last, shortest, longest, prefer non-empty",
      "Frequency table with duplicates/uniques filters",
      "Export formats: plain, CSV, JSON array, quoted list, numbered lines",
      "Copy/download deduped output and removed lines",
      "Optional worker mode for huge inputs",
      "Drag-and-drop .txt/.csv file support",
      "Client-side processing with privacy-friendly UX",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-01-12",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      ratingCount: "680",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Deduplicate Lines of Text",
    description: "Remove duplicate lines, review frequency analytics, and export the cleaned result.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Text Deduper",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or upload text",
        text: "Paste text into the input panel or drag-and-drop a .txt/.csv file.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose matching and keep rules",
        text: "Select a matching mode and choose whether to keep first, last, shortest, longest, or non-empty lines.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review analytics",
        text: "Inspect the frequency table and removed-line counts to verify deduplication.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Export results",
        text: "Copy or download the deduped output and optionally the removed lines.",
        position: 4,
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Text Deduper",
    url: canonical,
    description:
      "Deduplicate lines with matching modes, keep rules, analytics, and exports. Runs locally in your browser for privacy.",
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
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
          text: "Yes. Deduplication runs entirely in your browser; text is not sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "How are duplicates handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Choose how to keep duplicates: first, last (most recent), shortest, longest, or prefer non-empty lines. Matching modes let you normalize whitespace, Unicode, URLs, or emails.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export results or removed lines?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy or download the deduped output in multiple formats and export removed lines as a separate file.",
        },
      },
      {
        "@type": "Question",
        name: "Does it handle huge inputs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Enable Huge input mode to process large files with a web worker and streaming so the UI stays responsive.",
        },
      },
      {
        "@type": "Question",
        name: "Can I see which lines were removed?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool shows removed-line counts and lets you export the removed lines as a separate file for review.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="text-deduper-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="text-deduper-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="text-deduper-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="text-deduper-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="text-deduper-webpage" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <TextDeduperClient />
    </>
  );
}
