import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownPreviewClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/markdown-preview`;

export const metadata: Metadata = {
  title: "Markdown Previewer - Live Markdown to HTML with Sanitization",
  description:
    "Preview Markdown instantly with HTML output, strict sanitization, syntax highlighting, Mermaid diagrams, and exports. Runs entirely in your browser with no uploads.",
  keywords: [
    "markdown preview",
    "markdown previewer",
    "markdown to html",
    "markdown viewer",
    "render markdown",
    "markdown editor",
    "live markdown preview",
    "markdown sanitizer",
    "dompurify markdown",
    "markdown to html converter",
    "github markdown preview",
    "gfm preview",
    "mermaid markdown",
    "markdown export html",
    "markdown export pdf",
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
    title: "Markdown Previewer - Live Markdown to HTML with Sanitization",
    description:
      "Preview Markdown with HTML source, strict sanitization, syntax highlighting, Mermaid diagrams, and export options. Private and client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown Previewer - Live Markdown to HTML",
    description:
      "Preview Markdown with HTML source, sanitization, highlighting, Mermaid, and exports. Runs locally in your browser.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Markdown Previewer",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Markdown Previewer",
  },
};

export default function MarkdownPreviewPage() {
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
        name: "Markdown Previewer",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Markdown Previewer",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Markdown Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Live markdown previewer with strict sanitization, HTML source view, syntax highlighting, Mermaid diagrams, exports, and share links. Runs entirely in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Live Markdown preview with HTML output",
      "DOMPurify sanitization with strict allowlist",
      "HTML source and Markdown source panels",
      "Syntax highlighting with GFM + footnotes",
      "Mermaid diagram rendering (opt-in)",
      "Export HTML, Markdown, and print-ready PDF",
      "Copy rich text and full HTML document",
      "Shareable links and local draft saving",
      "Find/replace, line numbers, and editor shortcuts",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.0.0",
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
    name: "How to Preview Markdown",
    description: "Preview Markdown, review HTML output, and export files in seconds.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or type Markdown",
        text: "Enter Markdown in the editor or drop a .md file to load it.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Review preview and HTML source",
        text: "Switch between Preview, HTML, and Markdown panels to review the output.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Optional: Enable Mermaid",
        text: "Turn on Mermaid rendering to preview diagram code blocks.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy HTML/Markdown or download HTML, Markdown, or PDF output.",
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
        name: "Does this Markdown previewer run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs in your browser and no content is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Is the HTML sanitized?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Sanitization is enabled by default using DOMPurify with a strict allowlist.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export HTML or PDF?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Export a full HTML document, copy HTML, or print to PDF using built-in print styles.",
        },
      },
      {
        "@type": "Question",
        name: "Are drafts saved?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Drafts are stored locally in your browser.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Markdown Previewer - Live Markdown to HTML with Sanitization",
    description:
      "Preview Markdown instantly with HTML source, sanitization, highlighting, Mermaid diagrams, and exports. Private, client-side tool.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="markdown-preview-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="markdown-preview-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="markdown-preview-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="markdown-preview-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="markdown-preview-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <MarkdownPreviewClient />
    </>
  );
}
