import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
import Base64Client from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/base64-encoder`;

export const metadata: Metadata = {
  title: "Free Base64 Encoder & Decoder - UTF-8, Base64URL, Data URI",
  description:
    "Encode or decode Base64 instantly with UTF-8 support, Base64URL, data URI helpers, file mode, and privacy-first processing. Runs 100% in your browser with no uploads.",
  keywords: [
    "base64 encoder",
    "base64 decoder",
    "base64url",
    "data uri encoder",
    "data uri decoder",
    "encode base64",
    "decode base64",
    "text to base64",
    "base64 to text",
    "file to base64",
    "base64 to file",
    "utf-8 base64",
    "strict base64 validation",
    "base64 online tool",
    "base64 encoder online",
    "base64 decoder online",
    "browser base64 tool",
    "client-side base64",
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
    title: "Free Base64 Encoder & Decoder - UTF-8, Base64URL, File Mode",
    description:
      "Convert text, files, and data URIs to/from Base64 with UTF-8 safety, Base64URL support, and strict validation. Private, fast, and browser-based.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og-base64-encoder.png`,
        width: 1200,
        height: 630,
        alt: "Base64 Encoder & Decoder Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Base64 Encoder & Decoder - UTF-8 + Base64URL Support",
    description:
      "Encode/decode Base64 with UTF-8 safety, Base64URL, file mode, and data URI helpers. Runs locally in your browser.",
    images: [`${siteUrl.replace(/\/$/, "")}/og-base64-encoder.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Base64 Encoder",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Base64 Encoder",
  },
};

export default function Base64Page() {
  const breadcrumb = {
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
        name: "Base64 Encoder",
        item: canonical,
      },
    ],
  };

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Base64 Encoder & Decoder",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free Base64 encoder/decoder with UTF-8 support, Base64URL, strict validation, data URI helpers, and file mode. Runs locally in your browser—no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "UTF-8 safe Base64 encoding and decoding",
      "Base64URL support with convert action",
      "Strict and lenient validation modes",
      "File to Base64 and Base64 to file download",
      "Data URI helpers with MIME detection",
      "Auto-detect encode vs decode",
      "Privacy-first client-side processing",
      "Output wrapping for email/PEM compatibility",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-01-10",
    dateModified: "2025-01-10",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Encode or Decode Base64 Online",
    description: "Step-by-step guide to convert text or files to and from Base64 using this tool.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste text or choose a file",
        text: "Paste text or Base64 into the input, or drag and drop a file to encode.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose options",
        text: "Select Base64 or Base64URL output, strict or lenient decode, and optional output wrapping.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Convert",
        text: "Click Encode, Decode, or Detect. Results appear instantly in the output panels.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Copy or download",
        text: "Copy results, download output, or decode Base64 to a file with detected MIME.",
      },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When should I use Base64?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use Base64 to represent binary data as text (e.g., headers, tokens, small payloads, data URIs).",
        },
      },
      {
        "@type": "Question",
        name: "Is this tool private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs in your browser; no data is uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Why is decode failing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ensure the string is valid Base64 with proper padding (=) and allowed characters. You can switch to lenient mode to auto-fix whitespace and missing padding.",
        },
      },
      {
        "@type": "Question",
        name: "Does this support Base64URL and data URIs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can output Base64URL, convert between formats, and decode data URIs with MIME detection.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="ld-json-base64-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Script id="ld-json-base64-app" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }} />
      <Script id="ld-json-base64-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
      <Script id="ld-json-base64-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Base64Client />
    </>
  );
}
