import type { Metadata } from "next";
import { Suspense } from "react";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TextCaseClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/text-case`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Text Case Converter - camelCase, snake_case, kebab-case & More",
  description:
    "Convert text to camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case, sentence case, and more. Export JSON/CSV, copy code snippets, and keep data private with 100% in-browser processing.",
  keywords: [
    "text case converter",
    "camelcase",
    "pascal case",
    "snake case",
    "kebab case",
    "constant case",
    "title case",
    "sentence case",
    "studly caps",
    "dot case",
    "path case",
    "case converter online",
    "text transformer",
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
    title: "Text Case Converter - camelCase, snake_case, kebab-case & More",
    description:
      "Convert text between popular cases with advanced options, export formats, and privacy-first in-browser processing. Copy outputs or download structured formats.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Text Case Converter - Convert between camelCase, snake_case, and more",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Text Case Converter - camelCase, snake_case, kebab-case & More",
    description:
      "Convert text between common cases with exports and code snippets. Privacy-first, runs locally in your browser.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Text Case Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Text Case",
  },
};

export default function TextCasePage() {
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Text Case Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Text Transformation",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free text case converter with camel, pascal, snake, kebab, constant, title, sentence, dot, path, and studly cases. Includes export formats, code snippets, and privacy-first in-browser processing.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Convert between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, and more",
      "Export outputs as JSON or CSV",
      "Copy outputs as TypeScript objects, env vars, or YAML",
      "Preserve acronyms and handle numeric boundaries",
      "Per-line conversion and find/replace transforms",
      "Runs locally in your browser with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.4.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-29",
    author: {
      "@type": "Organization",
      name: "ToolStack",
      url: siteUrl,
    },
  };

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
        name: "Text Case",
        item: canonical,
      },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert Text Case Online",
    description: "Convert text to developer-friendly cases and export results instantly in your browser.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Text Case Converter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste your text",
        text: "Paste or type text into the input field. Toggle trim or per-line mode if needed.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose a case style",
        text: "Pick the target case like camelCase, snake_case, CONSTANT_CASE, or sentence case to preview the output.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Copy or export",
        text: "Copy the selected output, export JSON/CSV, or download code snippets for your workflow.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Case conversion runs entirely in your browser; no text is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which cases are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case, sentence case, dot.case, path/case, Train-Case, StudlyCaps, and more.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download results?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy individual cases, copy all outputs, or download a text file of all cases.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export results for code or spreadsheets?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Export outputs as JSON or CSV, or copy as TypeScript objects, env vars, or YAML keys.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Text Case Converter - Online Case Conversion Tool",
    description:
      "Convert text to common developer cases with privacy-first, in-browser processing. Export JSON/CSV or code snippets in seconds.",
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Suspense fallback={<div className="py-12 text-center text-sm text-slate-600">Loading text case tool...</div>}>
        <TextCaseClient />
      </Suspense>
    </>
  );
}
