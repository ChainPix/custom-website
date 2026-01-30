import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import DataUriClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/data-uri`;

export const metadata: Metadata = {
  title: "Data URI Generator & Decoder - Base64, Base64url, File to Data URI",
  description:
    "Create and decode data URIs from text or files with MIME control, base64/base64url support, previews, and inspector details. Runs locally in your browser with no uploads.",
  keywords: [
    "data uri generator",
    "data uri decoder",
    "data url",
    "base64 data uri",
    "base64url",
    "text to data uri",
    "file to data uri",
    "data uri inspector",
    "data uri preview",
    "data uri parser",
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
    title: "Data URI Generator & Decoder - Base64, Base64url, File to Data URI",
    description:
      "Generate and decode data URIs with MIME control, payload previews, inspector details, and developer snippets. Runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/logo.png`,
        width: 1200,
        height: 630,
        alt: "Data URI Generator with MIME control and preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Data URI Generator & Decoder",
    description: "Create and decode data URIs with previews, inspector details, and base64url support.",
    images: [`${siteUrl.replace(/\/$/, "")}/logo.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Data URI Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Data URI",
  },
};

export default function DataUriPage() {
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
        name: "Data URI",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Data URI Generator & Decoder",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Encoding Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Create and decode data URIs from text or files with base64/base64url support, MIME controls, previews, and inspector details. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Text and file to data URI with MIME control",
      "Base64 and base64url encoding for UTF-8 text",
      "Decode mode with validation and file reconstruction",
      "Payload inspector with size estimates",
      "Media previews for images, audio, video, PDFs, and text",
      "Developer snippets for HTML, CSS, Markdown, and fetch",
      "History with quick reload and payload diff for text",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-01-16",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      ratingCount: "612",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: `${siteUrl.replace(/\/$/, "")}/logo.png`,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate or Decode a Data URI",
    description: "Create a data URI from text or files, then preview or decode the payload.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose encode or decode",
        text: "Use Encode to generate a data URI, or Decode to inspect an existing data URI.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Provide input",
        text: "Paste text, upload a file, or paste a full data URI in decode mode.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Adjust encoding options",
        text: "Set the MIME type and choose base64 or base64url if needed.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Inspect and preview",
        text: "Review payload size, MIME details, and previews for common media and text formats.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Copy or download",
        text: "Copy the URI or payload, or download a reconstructed file.",
        position: 5,
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
          text: "Yes. Data URI generation happens in your browser; files and text are not uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What can I encode?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can encode text or small files into data URIs. A MIME type can be provided or detected from the file.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy the data URI or payload, or download the URI or a reconstructed file.",
        },
      },
      {
        "@type": "Question",
        name: "Is base64url supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can generate URL-safe base64 (base64url) for payloads that need URL-friendly encoding.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Data URI Generator & Decoder",
    url: canonical,
    description:
      "Generate and decode data URIs with MIME controls, previews, inspector details, and client-side privacy.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="data-uri-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="data-uri-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="data-uri-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="data-uri-faq" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>
      <Script id="data-uri-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <DataUriClient />
    </>
  );
}
