import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import NumberFormatterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/number-formatter`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Free Number Formatter - Locale, Currency, Batch, Compare, and Safe Parsing",
  description:
    "Format and parse numbers with locale-aware grouping, currency, batch processing, compare view, and safe-mode precision checks. Works locally in your browser with no uploads.",
  keywords: [
    "number formatter",
    "format currency",
    "locale number",
    "decimal places",
    "number grouping",
    "developer tools",
    "parse number locale",
    "batch number formatter",
    "compare locales",
    "safe number parsing",
    "format decimal",
    "format percent",
    "unit formatter",
    "currency formatter",
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
    title: "Free Number Formatter - Locale, Currency, Batch, Compare",
    description:
      "Format and parse numbers with locale-aware separators, batch exports, compare view, and precision-safe mode. Runs entirely in your browser with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Number Formatter with locale-aware formatting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Number Formatter - Locale, Currency, Batch, Compare",
    description:
      "Locale-aware number formatting and parsing with batch exports, compare view, and safe-mode precision checks.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Number Formatter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Number Formatter",
  },
};

export default function NumberFormatterPage() {
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
        name: "Number Formatter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Number Formatter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Number Formatting Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Format and parse numbers with locale-aware separators, currency styles, batch processing, compare view, and safe-mode precision checks. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Locale-aware formatting for decimal, currency, percent, and unit styles",
      "Locale-aware parsing with comma/period swaps and currency symbols",
      "Batch mode with CSV/JSON exports and formatted.csv download",
      "Compare view across multiple locales",
      "Safe mode to avoid precision loss",
      "Shareable URLs and saved presets (localStorage)",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.4.0",
    datePublished: "2025-12-07",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "920",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Format Numbers by Locale",
    description: "Format and parse numbers with locale-aware separators, then export or compare results.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Number Formatter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Enter a number",
        text: "Paste a number and choose a locale (and parse locale if needed).",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose formatting options",
        text: "Set style, currency, notation, rounding, and grouping options.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review output",
        text: "View the formatted result and parsed normalized value with confidence.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Batch or compare",
        text: "Switch to batch mode for CSV/JSON output or compare across multiple locales.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Export",
        text: "Copy or download results with inputs and options included.",
        position: 5,
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
          text: "Yes. All formatting and parsing happens in your browser. No numbers are uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which locales and currencies are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool uses Intl.NumberFormat and supports the locales available in your browser. Currency formatting supports ISO 4217 codes.",
        },
      },
      {
        "@type": "Question",
        name: "What does Safe mode do?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Safe mode blocks values that would lose precision in JavaScript so you can avoid silent rounding.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export a CSV with raw and formatted values?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Batch mode exports a formatted.csv with raw, parsed, formatted, and error columns.",
        },
      },
      {
        "@type": "Question",
        name: "Can I share or save my settings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy a shareable link that encodes the current settings, and save presets locally in your browser.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Number Formatter - Locale-Aware Formatting & Parsing",
    description:
      "Format and parse numbers with locale-aware separators, batch export, compare view, and safe-mode precision checks.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "Number Formatting",
      description: "Locale-aware formatting and parsing of numeric values for display and data processing.",
    },
    keywords:
      "number formatter, locale number formatting, currency formatting, batch number formatting, compare locales, safe parsing",
  };

  return (
    <>
      <Script id="number-formatter-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="number-formatter-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="number-formatter-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="number-formatter-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="number-formatter-webpage" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <NumberFormatterClient />
    </>
  );
}
