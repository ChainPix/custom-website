import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CurlToFetchClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/curl-to-fetch`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "cURL to Fetch Converter - API Requests to fetch, Axios, Python, Go",
  description:
    "Convert cURL commands into JavaScript fetch, Node, axios, Python requests, or Go http.NewRequest snippets. Runs locally with shareable links and zero uploads.",
  keywords: [
    "curl to fetch",
    "curl converter",
    "curl to javascript",
    "curl to axios",
    "curl to python requests",
    "curl to go http",
    "curl to node fetch",
    "curl to fetch online",
    "curl command converter",
    "api request converter",
    "fetch api",
    "http client",
    "api testing",
    "developer tools",
    "browser based tools",
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
    title: "cURL to Fetch Converter - API Requests to fetch, Axios, Python, Go",
    description:
      "Paste any cURL command and export fetch, axios, Python requests, or Go http.NewRequest code. Private, client-side conversion.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "cURL to Fetch converter for API requests",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "cURL to Fetch Converter - fetch, axios, Python, Go",
    description: "Convert cURL to modern code snippets locally with shareable links.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "cURL to Fetch",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "cURL to Fetch",
  },
};

export default function CurlToFetchPage() {
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
        name: "cURL to Fetch",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "cURL to Fetch Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "API Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert cURL commands into fetch, axios, Python requests, or Go http.NewRequest code with headers, body, and method preserved. Runs locally for privacy.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Convert cURL to fetch, axios, Python requests, and Go snippets",
      "Detect JSON bodies and emit JSON.stringify payloads",
      "Preserve headers, cookies, and ordering",
      "Multipart FormData and URL-encoded support",
      "Shareable local-only links via URL hash",
      "Runnable .mjs exports for Node",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "986",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert cURL to fetch",
    description: "Paste a cURL command and export a fetch snippet in seconds.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "cURL to Fetch Converter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Paste your cURL",
        text: "Paste a cURL command from your terminal or DevTools “Copy as cURL”.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Pick a target",
        text: "Choose fetch (browser/Node), axios, Python requests, or Go http.NewRequest.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Copy or export",
        text: "Copy the snippet or export a runnable .mjs for Node.",
        position: 3,
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
          text: "Yes. Parsing happens in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What is converted?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool extracts URL, method, headers, and body from common cURL flags, including data, headers, cookies, and forms. Unsupported flags are called out with warnings.",
        },
      },
      {
        "@type": "Question",
        name: "Is JSON body handled?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. JSON bodies are detected and emitted as JSON.stringify payloads when possible.",
        },
      },
      {
        "@type": "Question",
        name: "Can I share a conversion without uploading?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The share button encodes your cURL in the URL hash, so it stays local and never hits a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I export a runnable file?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Export a Node-ready .mjs file, optionally using environment variable placeholders.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "cURL to Fetch Converter",
    description:
      "Convert cURL commands into fetch, axios, Python requests, or Go code locally. Private, browser-based tooling.",
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <CurlToFetchClient />
    </>
  );
}
