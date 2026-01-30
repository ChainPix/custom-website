import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonYamlClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/json-yaml`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "JSON ⇄ YAML Converter - Fast, Private, and In-Browser",
  description:
    "Convert JSON to YAML or YAML to JSON instantly with validation, formatting controls, and diff checks. Runs locally in your browser with no uploads.",
  keywords: [
    "json to yaml",
    "yaml to json",
    "convert yaml",
    "convert json",
    "online converter",
    "developer tools",
    "json yaml converter",
    "yaml json converter",
    "yaml validator",
    "json formatter",
    "client side converter",
    "no upload converter",
    "json yaml diff",
    "yaml to json strict",
    "yaml to json coerce",
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
    title: "JSON ⇄ YAML Converter - Fast, Private, and In-Browser",
    description:
      "Convert JSON and YAML locally with validation, formatting controls, and round-trip diff. No uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "JSON ⇄ YAML Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON ⇄ YAML Converter - Fast, Private, and In-Browser",
    description:
      "Convert JSON and YAML locally with validation, formatting controls, and round-trip diff. No uploads.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JSON ⇄ YAML Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JSON ⇄ YAML Converter",
  },
};

export default function JsonYamlPage() {
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
        name: "JSON ⇄ YAML Converter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JSON ⇄ YAML Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Format Converter",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert JSON to YAML or YAML to JSON with validation, formatting controls, round-trip diff, and worker-based performance. Runs locally with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Bidirectional JSON ⇄ YAML conversion",
      "Auto-detect input type",
      "Round-trip diff check",
      "Formatting controls for YAML and JSON",
      "Strict/coerce YAML → JSON modes",
      "Runs locally in your browser (no uploads)",
    ],
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert JSON to YAML or YAML to JSON",
    description: "Step-by-step guide to convert JSON and YAML locally in your browser.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or load input",
        text: "Paste JSON/YAML, load a file, or drop it into the editor.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose direction or auto-detect",
        text: "Select JSON → YAML, YAML → JSON, or Detect input type.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Adjust formatting",
        text: "Set indentation, wrapping, and strict/coerce mode as needed.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Convert or round-trip",
        text: "Convert the input or run a round-trip check to compare diffs.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Copy or download",
        text: "Copy the result or download it with the original filename.",
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
        name: "Does this run locally in my browser?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All parsing and conversion happens in your browser, and files are not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Why can conversions fail for some YAML?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "YAML supports types that JSON does not. Use Strict JSON to reject them or Coerce mode to convert.",
        },
      },
      {
        "@type": "Question",
        name: "What are the keyboard shortcuts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ctrl/Cmd+Enter to convert, Ctrl/Cmd+L to clear, and Ctrl/Cmd+S to download.",
        },
      },
      {
        "@type": "Question",
        name: "Why is output capped at 25MB?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Large outputs can cause memory spikes. Reduce input size for massive conversions.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="json-yaml-breadcrumb" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="json-yaml-softwareapp" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="json-yaml-howto" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="json-yaml-faq" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(faqSchema)}
      </Script>
      <JsonYamlClient />
    </>
  );
}
