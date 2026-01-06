import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import EmailCssInlinerClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/email-css-inliner`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Email CSS Inliner - Inline Styles for HTML Emails",
  description:
    "Inline CSS into HTML email templates with accurate cascade handling, coverage reporting, client warnings, and export options. Runs entirely in your browser with no uploads.",
  keywords: [
    "email css inliner",
    "inline css for email",
    "html email inline styles",
    "email css inliner online",
    "email template inliner",
    "inline styles for gmail",
    "inline styles for outlook",
    "email css sanitizer",
    "email template tools",
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
    title: "Email CSS Inliner - Inline Styles for HTML Emails",
    description:
      "Inline CSS into HTML email templates with cascade-aware rules, coverage insights, and client warnings. Private, in-browser processing.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Email CSS Inliner with coverage reporting and client warnings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Email CSS Inliner - Inline Styles for HTML Emails",
    description: "Inline CSS for HTML emails with client-aware warnings and export options. Runs locally.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Email CSS Inliner",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Email CSS Inliner",
  },
};

export default function EmailCssInlinerPage() {
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
        name: "Email CSS Inliner",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Email CSS Inliner",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Email Template Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Inline CSS into HTML emails with AST-based parsing, cascade-aware merging, coverage reporting, client warnings, and export options. Runs entirely in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Inline CSS from external and embedded style blocks",
      "Cascade-aware merging with specificity and !important rules",
      "Coverage report with unmatched selectors and overrides",
      "Email-client warnings with compatibility tips",
      "Outlook-safe output option and VML support",
      "Attribute fallbacks for legacy email clients",
      "Diff view and export to HTML/EML",
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
    name: "How to Inline CSS for HTML Emails",
    description: "Inline CSS styles into HTML email templates, review coverage, and export results.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste HTML and CSS",
        text: "Paste your email HTML and CSS, or include <style> blocks in the HTML input.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose options",
        text: "Toggle Outlook-safe output, attribute fallbacks, or media-query handling as needed.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Inline and review",
        text: "Inline CSS, then review the diff, coverage report, and client warnings.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy the HTML or download .html/.eml output for your email platform.",
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
          text: "Yes. Inlining happens in your browser; nothing is uploaded or stored on a server.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support style tags inside HTML?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool extracts <style> blocks from your HTML and merges them into the inlined output.",
        },
      },
      {
        "@type": "Question",
        name: "How does the cascade work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Rules are merged using specificity and source order. Inline styles are respected, and !important declarations are preserved.",
        },
      },
      {
        "@type": "Question",
        name: "Can I keep media queries?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can preserve media queries, or flatten mobile-first rules if preferred.",
        },
      },
      {
        "@type": "Question",
        name: "Is the preview an email client preview?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The preview is sanitized browser rendering. Always test in your target email clients.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Email CSS Inliner",
    url: canonical,
    description:
      "Inline CSS for HTML emails with cascade-aware rules, coverage reporting, client warnings, and exports.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="email-css-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="email-css-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="email-css-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="email-css-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="email-css-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <EmailCssInlinerClient />
    </>
  );
}
