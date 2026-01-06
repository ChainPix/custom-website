import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronParserClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/cron-parser`;

export const metadata: Metadata = {
  title: "Cron Parser & Next Run Calculator - Timezone Aware Scheduler",
  description:
    "Parse cron expressions, validate dialect rules, and preview upcoming runs with timezone comparison. Supports Vixie-style cron, shortcuts, and Quartz mode.",
  keywords: [
    "cron parser",
    "cron expression",
    "cron schedule",
    "cron next run",
    "cron calculator",
    "cron timezone",
    "quartz cron",
    "crontab parser",
    "schedule parser",
    "scheduler preview",
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
    title: "Cron Parser & Next Run Calculator",
    description: "Parse cron expressions, validate dialects, and preview runs across timezones. Runs locally.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Parser & Next Run Calculator",
    description: "Validate cron expressions, preview runs, and compare timezones instantly.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Cron Parser",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Cron Parser",
  },
};

export default function CronParserPage() {
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
        name: "Cron Parser",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cron Parser",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Scheduling Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Cron parser and next-run calculator with timezone comparison, dialect validation, and Quartz mode support. Runs locally in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Vixie-style cron parsing with lists, ranges, and steps",
      "Shortcut tokens like @daily and @hourly",
      "Quartz mode with ?, L, W, and # support",
      "Timezone selection and side-by-side comparison",
      "Shareable URLs and export snippets",
      "Client-side execution with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Parse a Cron Expression",
    description: "Enter a cron expression, choose a timezone or compare, and review the next run times.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Enter a cron expression",
        text: "Type a Vixie cron (5 fields) or enable Quartz mode for 6/7 fields.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Select timezone options",
        text: "Pick a timezone and optionally enable compare mode to see two schedules side-by-side.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review upcoming runs",
        text: "Use the generated run list and copy/export options for documentation or automation.",
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
          text: "Yes. Cron parsing and next-run calculations happen in your browser.",
        },
      },
      {
        "@type": "Question",
        name: "What formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vixie-style numeric cron (5 fields, optional seconds) with lists/ranges/steps and shortcuts like @daily. Quartz mode supports 6/7 fields with ?, L, W, and #.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use other timezones?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Select a timezone or compare two side-by-side; shareable URLs keep the selection.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download the next runs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy and download buttons are provided for the generated run times.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="cron-parser-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="cron-parser-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="cron-parser-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="cron-parser-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <CronParserClient />
    </>
  );
}
