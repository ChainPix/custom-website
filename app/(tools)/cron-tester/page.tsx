import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronTesterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/cron-tester`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Cron Tester & Next Run Time Calculator - Preview, Calendar, Exports",
  description:
    "Validate cron expressions and preview next run times instantly. Supports Vixie/Linux, Quartz, GitHub Actions, and AWS EventBridge. Timezone-aware previews, shareable links, calendar view, and .ics/ISO/Unix exports. 100% client-side.",
  keywords: [
    "cron tester",
    "cron expression tester",
    "cron validator",
    "next run time",
    "cron schedule preview",
    "cron parser",
    "cron calculator",
    "cron expression",
    "vixie cron",
    "quartz cron",
    "github actions cron",
    "aws eventbridge cron",
    "timezone cron",
    "cron calendar",
    "ics export",
    "unix timestamp export",
    "iso timestamp export",
    "cron share link",
    "cron schedule tool",
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
    title: "Cron Tester & Next Run Time Calculator",
    description:
      "Preview cron schedules with timezone support, calendar view, and exports. Supports Vixie, Quartz, GitHub Actions, and AWS EventBridge. Runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Cron Tester with next run preview and calendar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Tester & Next Run Time Calculator",
    description:
      "Validate cron expressions, preview upcoming runs, and export schedules. Timezone-aware and private.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Cron Tester",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Cron Tester",
  },
};

export default function CronTesterPage() {
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
        name: "Cron Tester",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cron Expression Tester",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Scheduling Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Cron tester and next-run calculator with timezone-aware previews, calendar view, and exports. Supports Vixie/Linux, Quartz, GitHub Actions, and AWS EventBridge cron dialects. Client-side processing with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Cron validation with clear diagnostics",
      "Next run time previews (configurable count)",
      "Timezone-aware scheduling (IANA zones)",
      "Dialects: Vixie/Linux, Quartz, GitHub Actions, AWS EventBridge",
      "Human-readable schedule summaries",
      "Mini calendar preview",
      "Export to .ics, ISO timestamps, and Unix timestamps",
      "Shareable links for debugging",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
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
    name: "How to Test a Cron Expression",
    description: "Validate a cron schedule, preview upcoming runs, and export results.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Select a dialect and timezone",
        text: "Choose Vixie, Quartz, GitHub Actions, or AWS EventBridge and pick a timezone for previews.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Enter or build the cron",
        text: "Paste a cron expression or use the field builder for minutes, hours, and weekdays.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Validate and preview runs",
        text: "Click Validate to see upcoming run times, summaries, and a calendar highlight.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Share or export",
        text: "Copy a share link or export .ics/ISO/Unix timestamps for scheduling tools.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Which cron dialects are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vixie/Linux (5-field), Quartz, GitHub Actions, and AWS EventBridge. Quartz/AWS previews accept numeric fields; special tokens like L/W/# are not supported yet.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support timezones?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose from common IANA timezones or local time. Previews and exports are timezone-aware.",
        },
      },
      {
        "@type": "Question",
        name: "Is the computation local?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Parsing and next-run calculations happen in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I share a failing cron?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool generates shareable links that encode the expression, timezone, and preview settings.",
        },
      },
      {
        "@type": "Question",
        name: "What exports are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Download .ics or copy ISO and Unix timestamps for upcoming runs.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cron Tester & Next Run Time Calculator",
    description:
      "Validate cron expressions, preview upcoming runs, and export schedules with timezone-aware results.",
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <Script id="cron-tester-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="cron-tester-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="cron-tester-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="cron-tester-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="cron-tester-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <CronTesterClient />
    </>
  );
}
