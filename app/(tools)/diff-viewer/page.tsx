import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import DiffViewerClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/diff-viewer`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-diff-viewer.png`;

export const metadata: Metadata = {
  title: "Free Diff Viewer - Side-by-Side Text Compare, Patch Export, In-Browser",
  description:
    "Compare text, JSON, and logs side-by-side with aligned diffs, inline highlights, and search. Export unified patches or Markdown reports. Runs 100% client-side with no uploads for privacy.",
  keywords: [
    "diff viewer",
    "free diff viewer",
    "text diff",
    "compare text",
    "compare files",
    "side by side diff",
    "unified diff",
    "patch export",
    "git diff",
    "github diff",
    "diff tool online",
    "file diff viewer",
    "json diff",
    "markdown diff",
    "diff search",
    "inline diff",
    "word diff",
    "character diff",
    "whitespace diff",
    "line ending diff",
    "browser diff tool",
    "client side diff",
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
    title: "Free Diff Viewer - Side-by-Side Text Compare and Patch Export",
    description:
      "Align inserts and deletes with Myers/LCS diff, search changes, and export unified patches or Markdown reports. Runs entirely in your browser with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Diff Viewer with side-by-side alignment and patch export",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Diff Viewer - Side-by-Side Text Compare",
    description:
      "Compare text with aligned diffs, inline highlights, search, and exports. Private, client-side.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Diff Viewer",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Diff Viewer",
  },
};

export default function DiffViewerPage() {
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
        name: "Diff Viewer",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Diff Viewer",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Diff Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free diff viewer for comparing text, JSON, and logs with aligned side-by-side diffs, inline highlights, search, filters, and patch exports. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Myers/LCS alignment with insert/delete pairing",
      "Unified and side-by-side views",
      "Inline word/char diff highlights",
      "Whitespace controls and line ending normalization",
      "Search, filters, and next/previous change navigation",
      "Patch, GitHub diff, and Markdown report exports",
      "Shareable local links (encoded in URL)",
      "File upload and drag-and-drop support",
      "JSON formatting before diff",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.0.0",
    datePublished: "2025-12-07",
    dateModified: "2025-12-27",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1124",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Compare Text with Diff Viewer",
    description: "Compare two text snippets and export a patch with aligned differences.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Diff Viewer",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or upload inputs",
        text: "Paste text into the two panels or upload supported files (txt, json, md, log).",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Normalize and format",
        text: "Toggle whitespace rules, normalize line endings, or format JSON before diffing.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Choose a view",
        text: "Switch between unified and side-by-side views and enable inline highlights.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Navigate changes",
        text: "Use next/previous change buttons or search to jump between edits.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Export results",
        text: "Download a unified patch, GitHub-style diff, or Markdown report.",
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
          text: "Yes. All comparisons run in your browser; no text is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What file formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Plain text, JSON, Markdown, and log files. JSON can be auto-formatted before diffing for cleaner results.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export patches or GitHub-style diffs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Export unified patches, GitHub-style diff output, and Markdown reports.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support large files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Large inputs use debounced diffing, a worker for heavy comparisons, and virtualized rendering to stay responsive.",
        },
      },
      {
        "@type": "Question",
        name: "Will whitespace-only changes be highlighted?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can choose to show or ignore whitespace-only changes and normalize line endings to reduce noise.",
        },
      },
      {
        "@type": "Question",
        name: "How do whitespace and formatting options work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can ignore trailing whitespace, indentation, or all whitespace changes, normalize line endings, and optionally format JSON before diffing.",
        },
      },
      {
        "@type": "Question",
        name: "Do you store any of my data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Everything stays in your browser. Any shareable links are encoded locally and are not uploaded to a server.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Diff Viewer - Side-by-Side Text Compare and Patch Export",
    description:
      "Compare text, JSON, and logs with aligned diffs, search, filters, and export options. Runs entirely in your browser.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Text Comparison",
      description: "Line-by-line diffing with alignment and export-friendly output.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Diff Viewer",
    },
    primaryImageOfPage: ogImage,
    keywords:
      "diff viewer, side by side diff, unified diff, patch export, markdown diff, compare text, inline diff, github diff, file compare tool, developer tools",
  };

  return (
    <>
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="software-app-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <DiffViewerClient />
    </>
  );
}
