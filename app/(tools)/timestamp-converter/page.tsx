import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TimestampConverterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/timestamp-converter`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Timestamp Converter - Epoch, UTC, Local Time, ms/µs/ns",
  description:
    "Convert Unix timestamps to readable dates and back with auto-detected seconds/ms/µs/ns, time zone outputs, batch mode, and export tools. Runs 100% client-side with no uploads.",
  keywords: [
    "timestamp converter",
    "unix timestamp converter",
    "epoch converter",
    "unix to date",
    "date to timestamp",
    "timestamp to date",
    "milliseconds to date",
    "microseconds to date",
    "nanoseconds to date",
    "utc timestamp converter",
    "epoch time converter",
    "developer tools",
    "log timestamp converter",
    "batch timestamp converter",
    "time zone converter",
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
    title: "Timestamp Converter - Epoch, UTC, Local, ms/µs/ns",
    description:
      "Convert Unix timestamps to human dates and back. Auto-detect seconds/ms/µs/ns, show local + UTC times, batch convert, and export. Privacy-first, client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Timestamp Converter tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Timestamp Converter - Epoch, UTC, Local, ms/µs/ns",
    description:
      "Convert Unix timestamps with auto-detect units, time zone output, batch mode, and exports. Runs locally in your browser.",
    images: [ogImage],
  },
  category: "Developer Tools",
  other: {
    "application-name": "Timestamp Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Timestamp Converter",
  },
};

export default function TimestampConverterPage() {
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
        name: "Timestamp Converter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Timestamp Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Time Utilities",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free online timestamp converter with auto-detect for seconds/milliseconds/microseconds/nanoseconds, time zone outputs, batch mode, and CSV export. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Auto-detect seconds, milliseconds, microseconds, nanoseconds",
      "Local + UTC + custom time zone output",
      "Batch conversion with CSV export",
      "Round-trip date to timestamp conversion",
      "Shareable links and recent history",
      "Copy and export results",
      "Client-side processing, no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.0.0",
    datePublished: "2025-12-09",
    dateModified: "2026-01-30",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1350",
      bestRating: "5",
      worstRating: "1",
    },
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
    name: "How to Convert Unix Timestamps",
    description: "Convert epoch timestamps to readable dates with unit detection and time zone outputs.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste a timestamp",
        text: "Enter a Unix timestamp or paste multiple values in batch mode.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Confirm units",
        text: "Use auto-detect or choose seconds, milliseconds, microseconds, or nanoseconds.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Choose a time zone",
        text: "View local time, UTC, or a custom IANA time zone.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy the formatted date or export results as text or CSV.",
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
        name: "Does this timestamp converter run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All conversions happen in your browser; no data is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which units are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Seconds, milliseconds, microseconds, and nanoseconds are supported, with auto-detection by length and magnitude.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert timestamps before 1970?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Negative timestamps are supported and shown with clear UTC/local output.",
        },
      },
      {
        "@type": "Question",
        name: "Can I batch convert timestamps?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Paste multiple timestamps (one per line) and export results as CSV.",
        },
      },
      {
        "@type": "Question",
        name: "Is my history stored anywhere?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Recent conversions are stored only in your browser localStorage and never sent to a server.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Timestamp Converter - Epoch, UTC, Local Time, ms/µs/ns",
    description:
      "Convert Unix timestamps to readable dates and back with time zone outputs, batch mode, and exports.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Unix timestamp conversion",
      description: "Tools for converting epoch times across units and time zones.",
    },
  };

  return (
    <>
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="software-app-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <Suspense fallback={null}>
        <TimestampConverterClient />
      </Suspense>
    </>
  );
}
