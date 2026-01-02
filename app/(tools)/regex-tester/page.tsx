import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import RegexTesterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/regex-tester`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Regex Tester - Test Patterns, Flags, Replacements, and Groups",
  description:
    "Test regex patterns in your browser with flags, replacements, split results, and match insights. Runs client-side for privacy and speed.",
  keywords: [
    "regex tester",
    "regular expression tester",
    "test regex online",
    "regex match",
    "regex replace tester",
    "regex split tester",
    "regex flags",
    "regex groups",
    "regex validator",
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
    title: "Regex Tester - Test Patterns, Flags, Replacements, and Groups",
    description:
      "Test regex patterns with flags, replacements, split results, and group insights. Shareable URLs and client-side privacy.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Regex Tester with match insights and flags",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Tester - Test Patterns, Flags, Replacements, and Groups",
    description:
      "Run regex against text with flags, replacement previews, and match counts. Client-side and privacy-first.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Regex Tester",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Regex Tester",
  },
};

export default function RegexTesterPage() {
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
        name: "Regex Tester",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Regex Tester",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Regex Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Regex tester for patterns, flags, replacements, splits, and match insights. Includes shareable URLs, recent history, and safe mode. Runs fully client-side.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Flag toggles (i, g, m, s, y, u)",
      "Match counts, named groups, and zero-length handling",
      "Replacement and split previews",
      "Shareable URLs and recent history",
      "Safe mode with time budget",
      "Copy matches as text, JSON, or CSV",
    ],
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
    name: "How to Test a Regular Expression",
    description: "Validate regex patterns with flags, matches, and replacement previews in your browser.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Enter a regex pattern",
        text: "Type your regex in the pattern field and choose flags like i, g, m, s, y, or u.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Paste test text",
        text: "Provide the input text to match against or load a quick recipe.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review matches",
        text: "Inspect highlights, group captures, and match counts to verify behavior.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Try replacements or splits",
        text: "Use the replace and split panels to confirm output transformations.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Share or export",
        text: "Copy matches as text/JSON/CSV or share the URL for collaborators.",
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
        name: "Is regex testing done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Regex testing runs in your browser; text is not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download matches?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy matches as text, JSON, or CSV and download them as a JSON file.",
        },
      },
      {
        "@type": "Question",
        name: "Which flags are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Flags i, g, m, s, y, and u are supported with toggles in the UI.",
        },
      },
    ],
  };

  return (
    <>
      <Script type="application/ld+json" id="regex-tester-breadcrumbs">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script type="application/ld+json" id="regex-tester-software">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script type="application/ld+json" id="regex-tester-howto">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script type="application/ld+json" id="regex-tester-faq">
        {JSON.stringify(faqSchema)}
      </Script>
      <RegexTesterClient />
    </>
  );
}
