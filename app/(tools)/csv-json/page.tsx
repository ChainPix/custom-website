import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CsvJsonClient from "./client";

export const metadata: Metadata = {
  title: "CSV ⇄ JSON Converter - Fast, Private, Browser-Based",
  description:
    "Convert CSV to JSON or JSON to CSV instantly in your browser. Preview, validate, and export clean output with type inference, mappings, and large-file performance mode.",
  keywords: [
    "csv to json",
    "json to csv",
    "convert csv",
    "convert json",
    "csv parser",
    "json converter",
    "csv validator",
    "json formatter",
    "csv to json online",
    "json to csv online",
    "browser csv converter",
    "developer tools",
    "data transformation",
    "csv mapping",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
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
    canonical: `${siteUrl.replace(/\/$/, "")}/csv-json`,
  },
  openGraph: {
    title: "CSV ⇄ JSON Converter - Fast, Private, Browser-Based",
    description: "Bidirectional CSV/JSON converter with validation, mapping, and copy-ready output. Runs locally in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/csv-json`,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSV ⇄ JSON Converter - Fast, Private, Browser-Based",
    description: "Convert CSV to JSON or JSON to CSV instantly. Runs in your browser.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "CSV ⇄ JSON Converter",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "CSV ⇄ JSON",
  },
};

export default function CsvJsonPage() {
  const canonical = `${siteUrl.replace(/\/$/, "")}/csv-json`;

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CSV ⇄ JSON Converter",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    url: canonical,
    description:
      "Browser-based CSV to JSON and JSON to CSV converter with preview, validation, and type inference. Runs locally with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "CSV to JSON and JSON to CSV conversion",
      "Delimiter auto-detection and dialect presets",
      "Column mapping, transforms, and schema preview",
      "Type inference and validation reports",
      "Large-file performance mode with streaming output",
      "Privacy-first: runs locally in the browser",
    ],
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

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
        item: `${siteUrl.replace(/\/$/, "")}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "CSV ⇄ JSON Converter",
        item: canonical,
      },
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert CSV to JSON",
    description: "Convert CSV to JSON or JSON to CSV in a few steps with preview and validation.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste your data",
        text: "Paste CSV or JSON into the input area or upload a file.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Configure options",
        text: "Choose delimiter, headers, and conversion options like type inference or mapping.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Convert and export",
        text: "Convert to your target format and copy or download the output.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CSV and JSON conversion runs in your browser; files are not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I change delimiters, headers, and column mappings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose delimiter presets or auto-detect, toggle headers, and rename/reorder columns before exporting.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a size limit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool warns on very large inputs and enforces a 20,000-row soft limit for reliable performance. Use Performance mode for large outputs.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="csv-json-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="csv-json-breadcrumbs" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="csv-json-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="csv-json-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CsvJsonClient />
    </>
  );
}
