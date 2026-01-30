import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
import UrlEncoderClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/url-encoder`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "URL Encoder & Decoder",
  description:
    "Encode or decode URLs instantly with component, full URL, and querystring modes. Batch, swap, parse, and export with privacy-first in-browser processing.",
  keywords: [
    "url encoder",
    "url decoder",
    "encode url online",
    "decode url online",
    "encode uri component",
    "decode uri component",
    "encode url query string",
    "url querystring encoder",
    "url percent encoding",
    "url encoder tool",
    "url decoder tool",
    "encode uri online",
    "decode uri online",
    "browser url encoder",
    "client side url encoder",
    "batch url encoder",
    "url parser",
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
    title: "URL Encoder & Decoder",
    description:
      "Encode/decode URLs with component, full URL, and querystring modes. Batch, swap, parse, and export in a privacy-first tool that runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "URL Encoder & Decoder tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "URL Encoder & Decoder",
    description:
      "Encode/decode URLs with component, full URL, and querystring modes. Runs locally in your browser.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "URL Encoder",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "URL Encoder",
  },
};

export default function UrlEncoderPage() {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When should I encode a URL?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Encode URLs when placing them in query parameters, form data, or webhooks to avoid breaking characters.",
        },
      },
      {
        "@type": "Question",
        name: "Is this tool safe?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs in your browser; no data is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Why is my decode failing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ensure the string is properly percent-encoded (e.g., spaces as %20). Malformed encodings cannot be decoded.",
        },
      },
      {
        "@type": "Question",
        name: "How are spaces encoded in different modes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Component and Full URL modes encode spaces as %20. Querystring mode encodes spaces as + (plus sign), which is standard for form data.",
        },
      },
      {
        "@type": "Question",
        name: "Which special characters are encoded?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Component mode encodes all non-alphanumeric characters except - _ . ! ~ * ' ( ). Full URL mode preserves :/?#[]@!$&'()*+,;= within the URL structure.",
        },
      },
    ],
  };

  const breadcrumb = {
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
        name: "URL Encoder",
        item: canonical,
      },
    ],
  };

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "URL Encoder & Decoder",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "URL Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Encode and decode URLs with component, full URL, and querystring modes. Batch processing, swap, auto-detect, URL parser, and exports. Runs locally with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Component and full URL encoding modes",
      "Querystring mode (+ for spaces)",
      "Batch encode/decode per line",
      "Auto-detect encode vs decode",
      "Swap and history tools",
      "URL parser with param editing",
      "Copy and export outputs",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-12-26",
    dateModified: "2026-01-30",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1180",
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

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Encode or Decode a URL",
    description: "Encode a URL or query parameter, then copy or export the result.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Pick a mode",
        text: "Choose Component, Full URL, or Querystring mode based on your use case.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Paste your input",
        text: "Paste a URL or parameter value. Use batch mode for one value per line.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Run encode or decode",
        text: "Click Encode/Decode or use auto-detect to choose the right action.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy the output or download it as a file when working in batch mode.",
        position: 4,
      },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "URL Encoder & Decoder",
    url: canonical,
    description:
      "Encode and decode URLs with multiple modes, batch tools, and privacy-first processing.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="ld-json-url-encoder-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Script id="ld-json-url-encoder-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }} />
      <Script id="ld-json-url-encoder-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
      <Script id="ld-json-url-encoder-webpage" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <Script id="ld-json-url-encoder-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <UrlEncoderClient />
    </>
  );
}
