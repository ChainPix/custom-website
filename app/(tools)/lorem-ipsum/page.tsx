import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import LoremIpsumClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/lorem-ipsum`;

export const metadata: Metadata = {
  title: "Lorem Ipsum & Mock Data Generator - Paragraphs, Templates, JSON, CSV",
  description:
    "Generate lorem ipsum text or realistic mock data for prototypes. Create paragraphs, sentences, bullets, and templates, or export JSON/CSV/SQL/TypeScript. Runs 100% client-side with no uploads.",
  keywords: [
    "lorem ipsum generator",
    "mock data generator",
    "placeholder text",
    "dummy text",
    "sample text generator",
    "lorem ipsum paragraphs",
    "lorem ipsum sentences",
    "lorem ipsum bullets",
    "lorem ipsum headlines",
    "design mock text",
    "wireframe filler text",
    "blog post lorem ipsum",
    "product landing copy",
    "error message generator",
    "random text generator",
    "random seed generator",
    "json mock data",
    "csv mock data",
    "sql insert generator",
    "typescript mock data",
    "fake data generator",
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
    title: "Lorem Ipsum & Mock Data Generator - Templates and Exports",
    description:
      "Create placeholder text, headings, and bullet lists or generate mock records with JSON/CSV/SQL/TypeScript outputs. Private, client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lorem Ipsum & Mock Data Generator",
    description: "Generate placeholder text or mock data with exports. Runs locally in your browser.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Lorem Ipsum & Mock Data Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Lorem Ipsum",
  },
};

export default function LoremIpsumPage() {
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
        name: "Lorem Ipsum & Mock Data",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lorem Ipsum & Mock Data Generator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Text and Data Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Generate lorem ipsum paragraphs, sentences, bullets, and templates or create realistic mock data with JSON, CSV, SQL, and TypeScript exports. Client-side and privacy-first.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Paragraph, sentence, bullet, and headline formats",
      "Templates for wireframes, blog posts, product pages, and error messages",
      "Mock data records: names, emails, addresses, phones, UUIDs, timestamps, prices, countries, URLs",
      "Export to JSON, CSV, SQL INSERT, and TypeScript samples",
      "Markdown and HTML exports with rich-text copy",
      "Seeded generation and shareable links",
      "History and favorites stored locally",
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
    name: "How to Generate Lorem Ipsum or Mock Data",
    description: "Generate placeholder text or mock data with presets, then copy or export.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose a mode or template",
        text: "Select Lorem Ipsum or Mock data, or pick a template like blog, wireframe, or product landing.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Adjust settings",
        text: "Set paragraph length, sentence range, or output format (JSON/CSV/SQL/TypeScript).",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Generate and preview",
        text: "Regenerate until the output looks right. Switch between Plain, Markdown, and HTML previews.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy as plain text, Markdown, HTML, or download the file in your selected format.",
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
          text: "Yes. Everything runs in your browser and no data is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which output formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Lorem output supports text, Markdown, and HTML. Mock data exports support JSON, CSV, SQL INSERT, and TypeScript samples.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use a seed for deterministic output?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enter a seed to reproduce the same output or leave it blank for random generation.",
        },
      },
      {
        "@type": "Question",
        name: "What kind of mock data is generated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Records include names, emails, addresses, phones, UUIDs, timestamps, prices, countries, and URLs.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lorem Ipsum & Mock Data Generator",
    description:
      "Generate placeholder text or mock data with templates, exports, and shareable presets.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: [
      {
        "@type": "Thing",
        name: "Lorem ipsum placeholder text",
      },
      {
        "@type": "Thing",
        name: "Mock data generation",
      },
    ],
    keywords: "lorem ipsum, mock data, placeholder text, templates, JSON, CSV, SQL",
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
      <LoremIpsumClient />
    </>
  );
}
