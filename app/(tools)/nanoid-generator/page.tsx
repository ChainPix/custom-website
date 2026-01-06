import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import NanoIdClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/nanoid-generator`;

export const metadata: Metadata = {
  title: "NanoID Generator - Secure URL-safe IDs with Entropy & Export Formats",
  description:
    "Generate NanoID-compatible IDs with unbiased randomness, entropy/collision estimates, custom alphabets, prefixes, and exports (TXT/CSV/JSON/NDJSON). Runs locally in your browser with no uploads.",
  keywords: [
    "nanoid generator",
    "secure id generator",
    "random id",
    "unique id generator",
    "url safe id",
    "entropy calculator",
    "collision probability",
    "json id export",
    "csv id export",
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
    title: "NanoID Generator - Unbiased IDs, Entropy Math, and Exports",
    description:
      "Generate NanoID-compatible IDs with custom alphabets, prefix/suffix formatting, entropy bits, collision estimates, and JSON/CSV exports. 100% client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NanoID Generator - Secure IDs with Entropy & Export",
    description:
      "Unbiased NanoID generation with entropy bits, collision math, and export formats. Runs locally in your browser.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "NanoID Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "NanoID Generator",
  },
};

export default function NanoIdGeneratorPage() {
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
        name: "NanoID Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NanoID Generator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "ID Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Generate NanoID-compatible IDs with unbiased randomness, custom alphabets, prefix/suffix formatting, entropy and collision estimates, and export formats. Client-side and privacy-first.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "NanoID-compatible unbiased generation with rejection sampling",
      "Custom alphabets with validation and ambiguous-character exclusion",
      "Prefix/suffix and grouped separator formatting",
      "Entropy bits and collision probability estimates",
      "Unique-only mode with attempts and collision reporting",
      "Export to TXT, CSV, JSON array, and NDJSON",
      "Per-ID copy and regenerate controls",
      "Shareable settings via URL parameters",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.4.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate NanoID-compatible IDs",
    description: "Create URL-safe IDs with custom alphabets, entropy estimates, and export formats.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose length and alphabet",
        text: "Set the ID length and pick a preset alphabet or enter a custom one. Enable ambiguous-character exclusion if needed.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Configure formatting and mode",
        text: "Add prefix/suffix or grouping separators, then choose NanoID compatible mode for unbiased output.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Generate and export",
        text: "Generate IDs, review entropy and collision estimates, then copy or export to TXT/CSV/JSON/NDJSON.",
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
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. NanoIDs are generated using Web Crypto directly in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Is the generator NanoID compatible?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. NanoID compatible mode uses the NanoID mask/step rejection sampling algorithm for unbiased output.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export IDs in JSON or CSV?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can export as TXT, CSV, JSON array, or newline-delimited JSON.",
        },
      },
    ],
  };

  return (
    <>
      <Script
        id="nanoid-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="nanoid-software-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script
        id="nanoid-howto-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Script
        id="nanoid-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <NanoIdClient />
    </>
  );
}
