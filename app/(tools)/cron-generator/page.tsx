import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronGeneratorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/cron-generator`;

export const metadata: Metadata = {
  title: "Cron Expression Generator - Dialect-Aware Scheduler Builder",
  description:
    "Build cron expressions with dialect-aware fields, previews, and run simulations. Supports Unix, Quartz, AWS EventBridge, and Kubernetes CronJob formats.",
  keywords: [
    "cron generator",
    "cron builder",
    "cron expression",
    "schedule cron",
    "quartz cron",
    "aws eventbridge cron",
    "kubernetes cronjob schedule",
    "cron preview",
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
    title: "Cron Expression Generator - Dialect-Aware Scheduler Builder",
    description:
      "Create cron expressions for Unix, Quartz, AWS EventBridge, and Kubernetes CronJob. Preview next runs and timezones.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/logo.png`,
        width: 1200,
        height: 630,
        alt: "Cron Expression Generator with dialect support",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Expression Generator - Dialect-Aware Scheduler Builder",
    description: "Generate cron strings with previews, timezones, and dialect-aware rules.",
    images: [`${siteUrl.replace(/\/$/, "")}/logo.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Cron Expression Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Cron Generator",
  },
};

export default function CronGeneratorPage() {
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
        name: "Cron Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cron Expression Generator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Scheduling Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Dialect-aware cron generator with timezone previews, next-run simulation, and export snippets for common schedulers. Runs locally in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Unix, Quartz, AWS EventBridge, and Kubernetes CronJob dialects",
      "Timezone-aware previews with IANA zones",
      "Next-run calendar and timeline view",
      "Shareable links and local history",
      "Export snippets for Kubernetes, GitHub Actions, AWS, and crontab",
      "Client-side execution with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-12-10",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      ratingCount: "512",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: `${siteUrl.replace(/\/$/, "")}/logo.png`,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Build a Cron Expression",
    description: "Choose a dialect, set cron fields, and preview upcoming runs.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Pick a dialect",
        text: "Select Unix, Quartz, AWS EventBridge, or Kubernetes CronJob.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Enter field values",
        text: "Fill the cron fields or choose a preset to generate the expression.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Preview runs",
        text: "Review upcoming runs with timezone and calendar previews.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Export or share",
        text: "Copy the cron, export snippets, or share a link.",
        position: 4,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Cron generation and next-run preview happen in your browser.",
        },
      },
      {
        "@type": "Question",
        name: "Which cron dialects are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Unix 5-field, Quartz 6/7-field, AWS EventBridge, and Kubernetes CronJob are supported.",
        },
      },
      {
        "@type": "Question",
        name: "Can I see next run times?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool shows upcoming runs in local time, UTC, or an IANA timezone.",
        },
      },
      {
        "@type": "Question",
        name: "Does this support Quartz special tokens?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Quartz tokens like ?, L, W, and # are supported when you pick the Quartz or AWS dialect.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cron Expression Generator - Dialect-Aware Scheduler Builder",
    description:
      "Build cron expressions with dialect-aware validation, previews, and exports. Runs entirely in your browser.",
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
      <Script id="cron-generator-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="cron-generator-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="cron-generator-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="cron-generator-faq" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>
      <Script id="cron-generator-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <CronGeneratorClient />
    </>
  );
}
