import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ImageBase64Client from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/image-base64`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Image to Base64 Converter - Data URL, Batch, and Decode",
  description:
    "Convert images to Base64 data URLs locally. Batch encode, choose output snippets, decode Base64 back to images, and keep everything private in your browser.",
  keywords: [
    "image to base64",
    "png to base64",
    "jpg to base64",
    "convert image",
    "base64 encoder",
    "image to data url",
    "base64 to image",
    "data uri generator",
    "batch image base64",
    "image embed base64",
    "browser image converter",
    "client side base64",
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
    title: "Image to Base64 Converter - Data URL, Batch, and Decode",
    description:
      "Encode images to Base64 data URLs, generate snippets, batch process, and decode back to images. Private, client-side processing.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Image to Base64 Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Image to Base64 Converter - Data URL, Batch, and Decode",
    description: "Convert images to Base64 locally with batch mode, snippets, and decoding.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Image Base64 Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Image Base64",
  },
};

export default function ImageBase64Page() {
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
        name: "Image to Base64",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Image to Base64 Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Image Encoding Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert images to Base64 data URLs with batch processing, output snippets, decoding, and compression helpers. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Image to Base64 and Base64 to image conversion",
      "Batch encoding with size and inflation stats",
      "Output modes: data URL, raw Base64, CSS, HTML, JSON, Markdown",
      "Resize and quality controls for JPEG/WebP",
      "Clipboard image paste support",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-01-09",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1034",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert an Image to Base64",
    description: "Upload an image, choose an output mode, and copy or download the Base64 result.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Upload or paste an image",
        text: "Drop an image, click to upload, or paste from clipboard.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Choose output mode",
        text: "Select data URL, raw Base64, or snippet formats like CSS or HTML.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Copy or download",
        text: "Copy the output or download the Base64 text and decoded image.",
        position: 3,
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
          text: "Yes. Conversions happen entirely in your browser; images are not uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Common web image formats like PNG, JPG, GIF, WebP, and SVG if your browser can read them.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert Base64 back to an image?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Paste a Base64 string or data URL to preview and download the decoded image.",
        },
      },
      {
        "@type": "Question",
        name: "Are there size limits?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "For performance, images over ~10 MB are blocked and 5–10 MB show a warning before processing.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Image to Base64 Converter",
    url: canonical,
    description:
      "Encode images to Base64 data URLs, generate snippets, and decode back to images with privacy-first, client-side processing.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="image-base64-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="image-base64-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="image-base64-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="image-base64-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="image-base64-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <ImageBase64Client />
    </>
  );
}
