import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HashGeneratorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/hash-generator`;

export const metadata: Metadata = {
  title: "Hash Generator - SHA-256, SHA-512 & HMAC",
  description:
    "Generate SHA-256, SHA-512, or legacy SHA-1 hashes (plus HMAC) instantly in your browser. Batch hash, compare outputs, and export securely with 100% client-side processing.",
  keywords: [
    "hash generator",
    "sha256 hash",
    "sha512 hash",
    "sha1 hash",
    "hmac generator",
    "hmac sha256",
    "text hash tool",
    "online hash tool",
    "batch hash",
    "hash compare",
    "base64 hash",
    "base64url hash",
    "developer tools",
    "browser hash tool",
    "client-side hashing",
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
    title: "Hash Generator - SHA-256, SHA-512 & HMAC",
    description:
      "Hash text with SHA-256, SHA-512, or legacy SHA-1 and HMAC in your browser. Batch hashing and compare mode included. 100% private.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/logo.png`,
        width: 1200,
        height: 630,
        alt: "Hash Generator with SHA-256, SHA-512, and HMAC support",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hash Generator - SHA-256, SHA-512 & HMAC",
    description: "Hash text and HMAC locally with SHA-256, SHA-512, or legacy SHA-1. Batch and compare included.",
    images: [`${siteUrl.replace(/\/$/, "")}/logo.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Hash Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Hash Generator",
  },
};

export default function HashGeneratorPage() {
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
        name: "Hash Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hash Generator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Hashing Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free hash generator for SHA-256, SHA-512, and legacy SHA-1 with optional HMAC. Includes batch hashing, compare mode, and multiple output formats. Runs entirely in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "SHA-256, SHA-512, and legacy SHA-1 hashing",
      "HMAC mode with local-only secret",
      "Hex, Base64, and Base64URL outputs",
      "Batch hashing (one hash per line)",
      "Compare output against expected hash",
      "Prefix, suffix, and salt helpers",
      "Copy hash or verification command",
      "Client-side processing (no uploads)",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-01-05",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "745",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: `${siteUrl.replace(/\/$/, "")}/logo.png`,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate a Hash",
    description: "Create a SHA hash or HMAC in your browser and copy the result.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Enter your input",
        text: "Paste the text you want to hash. Optional: enable batch mode for one hash per line.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose algorithm and format",
        text: "Select SHA-256, SHA-512, or legacy SHA-1, then choose hex, Base64, or Base64URL output.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Optional HMAC",
        text: "Switch to HMAC mode and enter a secret key if needed.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Generate and copy",
        text: "Generate the hash, compare it against an expected value, then copy or download the output.",
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
        name: "Is hashing done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Hashing uses Web Crypto in your browser; no data is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which algorithms are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can hash with SHA-256 and SHA-512, with SHA-1 available for legacy checks only. Results can be copied or downloaded.",
        },
      },
      {
        "@type": "Question",
        name: "What output formats are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Hex, Base64, and Base64URL. Hex output can be lower or uppercase.",
        },
      },
      {
        "@type": "Question",
        name: "Is there an input size limit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Keep input under 100,000 characters for best performance.",
        },
      },
      {
        "@type": "Question",
        name: "Is HMAC secret data stored?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Secrets stay in your browser session and are never uploaded.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hash Generator - SHA-256, SHA-512 & HMAC",
    description:
      "Hash text with SHA-256, SHA-512, or legacy SHA-1 and HMAC. Batch hashing, compare mode, and multiple output formats, all local to your browser.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Cryptographic Hash Functions",
      description: "Generate cryptographic hashes and HMACs for verification workflows.",
    },
    keywords: "hash generator, sha256, sha512, hmac, base64, batch hashing",
  };

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="software-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script
        id="webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <HashGeneratorClient />
    </>
  );
}
