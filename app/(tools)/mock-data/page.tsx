import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MockDataClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/mock-data`;

export const metadata: Metadata = {
  title: "Free Mock Data Generator - JSON, CSV, SQL, Schema Builder",
  description:
    "Generate realistic mock data with custom schemas, seeded output, and relational presets. Export JSON, CSV, SQL, JSON Schema, TypeScript, or OpenAPI examples. Copy Jest fixtures, Playwright mocks, and GitHub-ready snippets. 100% client-side, no uploads.",
  keywords: [
    "mock data generator",
    "fake data generator",
    "test data generator",
    "json mock data",
    "csv mock data",
    "sql insert generator",
    "seeded data generator",
    "schema builder",
    "relational mock data",
    "openapi example generator",
    "json schema generator",
    "typescript interface generator",
    "prisma seed generator",
    "mongodb insertmany",
    "client side mock data",
    "privacy first data generator",
    "batch mock data",
    "jest fixture",
    "playwright mock",
    "github example",
    "api mock data",
    "test fixtures",
    "data seeding",
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
    title: "Free Mock Data Generator with Schema Builder and Seeded Output",
    description:
      "Build custom schemas, generate seeded data, and export JSON/CSV/SQL or JSON Schema/TypeScript/OpenAPI. Copy Jest fixtures, Playwright mocks, and docs-ready snippets. Runs locally in your browser with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og-mock-data.png`,
        width: 1200,
        height: 630,
        alt: "Mock Data Generator with Schema Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Mock Data Generator - Schema Builder, Seeded Output",
    description:
      "Generate realistic mock data with custom schemas, relational presets, and seeded output. Export JSON/CSV/SQL and schema formats. Copy Jest/Playwright snippets. No uploads.",
    images: [`${siteUrl.replace(/\/$/, "")}/og-mock-data.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Mock Data Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Mock Data",
  },
};

export default function MockDataPage() {
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
        name: "Mock Data Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mock Data Generator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Data Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free mock data generator with custom schema builder, seeded output, and relational presets. Export JSON, CSV, SQL, JSON Schema, TypeScript interfaces, and OpenAPI examples. Copy Jest fixtures, Playwright mocks, and docs snippets. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Custom schema builder with field constraints",
      "Seeded deterministic generation",
      "Relational presets with foreign key mapping",
      "JSON, CSV, and SQL exports",
      "JSON Schema, TypeScript, OpenAPI, Prisma, MongoDB outputs",
      "GitHub-ready example exports",
      "Copy as Jest fixture or Playwright mock",
      "Embed snippets for docs",
      "Performance mode for large datasets",
      "Saved templates with tagging and search",
      "Locale and domain packs for realistic data",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.0.0",
    datePublished: "2025-12-09",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1480",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: `${siteUrl.replace(/\/$/, "")}/og-mock-data.png`,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate Mock Data",
    description: "Create realistic mock datasets with a custom schema and export them for testing or prototyping.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose a schema",
        text: "Pick a preset schema, relational preset, or create a custom schema in the builder.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Configure fields and constraints",
        text: "Set field types, optional/nullable rules, and constraints like min/max or regex.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Set output options",
        text: "Select format (JSON, CSV, SQL, TypeScript, JSON Schema, OpenAPI) and set a record count or seed.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Generate and export",
        text: "Click Generate, then copy or download the output. Export GitHub-ready examples or copy Jest/Playwright snippets.",
        position: 4,
      },
    ],
    tool: [
      {
        "@type": "HowToTool",
        name: "Mock Data Generator",
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does the mock data generator run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Data is generated in your browser by default and no files are uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JSON, CSV, SQL inserts, JSON Schema, TypeScript interfaces, OpenAPI examples, Prisma seeds, and MongoDB insertMany output.",
        },
      },
      {
        "@type": "Question",
        name: "Can I control sample size and determinism?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Set the record count and optionally provide a seed so the same inputs produce identical output.",
        },
      },
      {
        "@type": "Question",
        name: "Is the API required to use the tool?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The UI runs fully client-side. The API endpoint is optional for automation and requires an API key.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export GitHub-ready examples or test fixtures?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Export a Markdown-ready GitHub example, or copy snippets formatted for Jest fixtures and Playwright mocks directly from the output panel.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mock Data Generator - JSON, CSV, SQL, Schema Builder",
    description:
      "Free online mock data generator with custom schemas, seeded output, relational presets, and multi-format exports.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Mock Data Generation",
      description: "Creating realistic sample data for testing, prototyping, and automation workflows.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Mock Data Generator",
    },
    keywords:
      "mock data generator, seeded data, schema builder, json mock data, csv mock data, sql insert generator, jest fixture, playwright mock",
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
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <MockDataClient />
    </>
  );
}
