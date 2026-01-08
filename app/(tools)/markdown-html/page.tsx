import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownHtmlClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/markdown-html`;

export const metadata: Metadata = {
  title: "Markdown to HTML Converter & HTML to Markdown | Private, Fast, In-Browser",
  description:
    "Convert Markdown to HTML or HTML to Markdown in seconds. Runs locally in your browser with sanitized preview by default, formatting options, and no server uploads.",
  keywords: [
    "markdown to html",
    "html to markdown",
    "markdown converter",
    "html converter",
    "markdown html converter",
    "convert markdown online",
    "convert html to markdown",
    "markdown to html with preview",
    "sanitize html preview",
    "gfm markdown converter",
    "markdown tables",
    "markdown formatter",
    "html formatter",
    "minify html",
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
    title: "Markdown to HTML & HTML to Markdown Converter",
    description:
      "Bidirectional Markdown/HTML conversion with sanitized preview, formatting, and local-only processing. Fast, private, and copy-ready.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown ⇄ HTML Converter (Local-Only)",
    description:
      "Convert Markdown and HTML locally in your browser. Sanitized preview by default, formatting options, and no uploads.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Markdown ⇄ HTML Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Markdown ⇄ HTML",
  },
};

export default function MarkdownHtmlPage() {
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
        name: "Markdown ⇄ HTML Converter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Markdown ⇄ HTML Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Markdown Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert Markdown to HTML or HTML to Markdown with sanitized preview, formatting, minify toggle, and local-only processing. No uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Bidirectional Markdown ⇄ HTML conversion",
      "Sanitized preview enabled by default",
      "Raw preview toggle for trusted input",
      "Format HTML or Markdown output",
      "Optional HTML minify output",
      "GFM tables, line breaks, heading IDs",
      "HTML→Markdown controls for links, images, and styles",
      "Large-input worker mode with progress",
      "Local-only processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.3.0",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert Markdown and HTML",
    description: "Convert Markdown to HTML or HTML to Markdown with sanitized preview and formatting options.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose a direction",
        text: "Pick Markdown → HTML or HTML → Markdown from the direction selector.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Paste your content",
        text: "Paste Markdown or HTML in the input box. The tool can auto-detect HTML and switch modes.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review output and preview",
        text: "Review the output and use sanitized preview by default. Enable raw preview only for trusted input.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy, download, or format",
        text: "Format HTML or Markdown, minify HTML if needed, then copy or download the result.",
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
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Markdown and HTML conversion happens in your browser; nothing is uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert both Markdown to HTML and HTML to Markdown?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Use the direction selector to switch between Markdown → HTML and HTML → Markdown.",
        },
      },
      {
        "@type": "Question",
        name: "Is the HTML preview sanitized?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Sanitized preview is enabled by default, with an optional raw preview toggle for trusted input.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support GFM tables and formatting?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable GFM tables, line breaks, and heading IDs for Markdown → HTML, plus formatting and minify options.",
        },
      },
      {
        "@type": "Question",
        name: "Can I keep or remove links, images, and inline styles?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. HTML → Markdown options let you preserve or strip links/images and decide whether inline styles are kept.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Markdown to HTML Converter",
    description:
      "Free Markdown to HTML and HTML to Markdown converter with sanitized preview, formatting controls, and local-only processing.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "Markdown Conversion",
      description: "Converting between Markdown and HTML for clean, portable content.",
    },
    keywords:
      "markdown to html, html to markdown, markdown converter, html converter, sanitized preview, local-only conversion",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <MarkdownHtmlClient />
    </>
  );
}
