import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidAdvancedClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/uuid-advanced`;

export const metadata: Metadata = {
  title: "UUID v1/v3/v4/v5 Generator",
  description:
    "Generate UUID v1, v3, v4, or v5 (namespace/name) in your browser. Copy single or bulk IDs instantly.",
  keywords: [
    "uuid v1",
    "uuid v3",
    "uuid v4",
    "uuid v5",
    "uuid generator",
    "namespace uuid",
    "random uuid",
    "developer tools",
  ],
  alternates: {
    canonical,
  },
  openGraph: {
    title: "UUID v1/v3/v4/v5 Generator",
    description: "Create UUID v1, v3, v4, or v5 with namespace/name support. Copy outputs quickly.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID v1/v3/v4/v5 Generator",
    description: "Generate namespace-based v3/v5 UUIDs or time-based v1 in your browser.",
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
      "Batch generation with copy and download",
      "Format options: uppercase, no hyphens, urn:uuid prefix",
      "History restore and output filtering",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What's v1/v4/v5?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "v1 is time-based, v4 is random, and v5 is deterministic using a namespace + name (SHA-1).",
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
        id="uuid-advanced-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <UuidAdvancedClient />
    </>
  );
}
