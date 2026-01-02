import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import RegexExtractorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/regex-extractor`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-regex-extractor.png`;

export const metadata: Metadata = {
  title: "Regex Extractor - Capture Groups, Replace & Split Tool",
  description:
    "Extract regex matches and capture groups, replace text, or split input in a fast in-browser workbench. Supports named groups, export to JSON/CSV, and safe RE2 mode for large inputs.",
  keywords: [
    "regex extractor",
    "regex capture groups",
    "regex replace",
    "regex split",
    "named capture groups",
    "regex tester",
    "regex workbench",
    "extract matches",
    "regex tool",
    "developer tools",
    "client side regex",
    "safe regex engine",
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
    title: "Regex Extractor - Capture Groups, Replace & Split Tool",
    description:
      "Extract matches and capture groups, run replace or split, and export results to JSON/CSV. Runs fully in-browser with optional safe RE2 engine.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Regex Extractor tool with capture groups and replace/split modes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Extractor - Capture Groups, Replace & Split Tool",
    description:
      "Extract regex matches, replace text, and split input in a fast, private regex workbench. Named groups, JSON/CSV export, safe RE2 mode.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Regex Extractor",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Regex Extractor",
  },
};

export default function RegexExtractorPage() {
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
        name: "Regex Extractor",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Regex Extractor",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Regex Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Regex workbench for extracting matches and capture groups, replacing text, or splitting input. Supports named groups, CSV/JSON export, and a safe RE2 engine mode for large inputs.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Extract mode with match table and named groups",
      "Replace and split modes with preview output",
      "Safe RE2 engine toggle for large inputs",
      "Copy/download results as JSON or CSV",
      "Match highlighting with click-to-jump",
      "Filter, sort, unique, and pagination controls",
      "Shareable URLs and saved presets",
      "All processing in-browser with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-27",
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
    name: "How to Extract Regex Matches",
    description: "Paste a regex and text to extract matches, capture groups, or generate replace/split output.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Enter a regex pattern",
        text: "Paste or type your regex pattern and choose flags. Global matching is always enabled.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose a mode",
        text: "Pick Extract to see matches, Replace to generate output, or Split to break text into segments.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review results",
        text: "Inspect the results table or output preview. Click a row to jump to a highlight in the source text.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy results, download JSON/CSV, or share a URL with your pattern and text.",
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
          text: "Yes. Regex extraction runs entirely in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What outputs can I export?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Extracted matches can be copied or downloaded as JSON or CSV. Replace and split outputs can be copied directly.",
        },
      },
      {
        "@type": "Question",
        name: "What is safe mode?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Safe mode uses the RE2 regex engine to avoid catastrophic backtracking on large inputs. Some advanced regex features may not be supported.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Regex Extractor - Capture Groups, Replace & Split Tool",
    description:
      "Extract regex matches and capture groups, replace text, or split input in a fast in-browser workbench with safe mode.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Regular Expressions",
    },
  };

  return (
    <>
      <Script id="regex-extractor-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="regex-extractor-software-app" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="regex-extractor-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="regex-extractor-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="regex-extractor-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <RegexExtractorClient />
    </>
  );
}
