import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidAdvancedClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/uuid-advanced`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "UUID v1/v3/v4/v5 Generator - Namespace, Format, and Batch Tools",
  description:
    "Generate UUID v1, v3, v4, or v5 (namespace/name) in your browser with batch input, format controls, and exports. Copy single or bulk IDs instantly.",
  keywords: [
    "uuid v1",
    "uuid v3",
    "uuid v4",
    "uuid v5",
    "uuid generator",
    "namespace uuid",
    "deterministic uuid",
    "uuid batch generator",
    "uuid formatter",
    "random uuid",
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
    title: "UUID v1/v3/v4/v5 Generator - Namespace, Format, and Batch Tools",
    description:
      "Create UUID v1, v3, v4, or v5 with namespace presets, formatting controls, batch names, and quick exports. Runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "UUID Advanced generator with namespace presets and batch outputs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID v1/v3/v4/v5 Generator - Namespace, Format, and Batch Tools",
    description:
      "Generate namespace-based v3/v5 UUIDs or time-based v1 in your browser. Includes formatting, batch names, and exports.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "UUID Advanced",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "UUID Advanced",
  },
};

export default function UuidAdvancedPage() {
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
        name: "UUID Advanced",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "UUID Advanced",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "ID Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Generate UUID v1, v3, v4, or v5 with namespace presets, formatting options, bulk output, and exports. Runs locally in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "UUID v1, v3, v4, v5 generation",
      "Namespace presets with validation for v3/v5",
      "Batch name to UUID mapping for deterministic v5",
      "Format options: uppercase, no hyphens, urn:uuid prefix",
      "Copy single or bulk outputs",
      "Export UUIDs to TXT, CSV, or JSON",
      "History restore and output filtering",
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
    name: "How to Generate UUIDs",
    description: "Generate UUIDs, choose versions, and export outputs in seconds.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "UUID Advanced",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose a UUID version",
        text: "Pick v1, v3, v4, or v5 depending on whether you need time-based, deterministic, or random UUIDs.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Set inputs and options",
        text: "Enter a namespace and name for v3/v5, adjust formatting options, and set a batch count or names list.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Generate and export",
        text: "Generate UUIDs, copy one or all, or download as TXT, CSV, or JSON.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What's v1/v3/v4/v5?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "v1 is time-based, v4 is random, v3 is deterministic with namespace + name (MD5), and v5 is deterministic with namespace + name (SHA-1).",
        },
      },
      {
        "@type": "Question",
        name: "Which should I use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most users should pick v4. Use v3/v5 when you need repeatable IDs from a namespace and name, and v1 only if you specifically need time-based ordering.",
        },
      },
      {
        "@type": "Question",
        name: "Are UUIDs secure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "UUIDs are identifiers, not secrets. Avoid using them as authentication tokens; v4 is generally safe for uniqueness but not a replacement for cryptographic secrets.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "UUID Advanced",
    description:
      "UUID v1/v3/v4/v5 generator with namespace presets, formatting, batch outputs, and exports. Runs locally in your browser.",
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
      <Script
        id="uuid-advanced-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="uuid-advanced-software-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script
        id="uuid-advanced-howto-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Script
        id="uuid-advanced-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="uuid-advanced-webpage-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <UuidAdvancedClient />
    </>
  );
}
