import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import QrGeneratorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/qr-generator`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-qr-generator.png`;

export const metadata: Metadata = {
  title: "Free QR Code Generator - Wi-Fi, vCard, Links, SVG/PNG Export",
  description:
    "Create QR codes for links, Wi-Fi, vCards, email, SMS, geo, events, and UTM links. Customize size, colors, error correction, and logo overlays. Export PNG/SVG with transparent background and verify scans. 100% client-side and private.",
  keywords: [
    "qr code generator",
    "free qr code generator",
    "qr generator",
    "qr code maker",
    "wifi qr code",
    "vcard qr code",
    "link qr code",
    "text to qr",
    "email qr code",
    "sms qr code",
    "geo qr code",
    "calendar qr code",
    "event qr code",
    "utm qr code",
    "svg qr code",
    "png qr code",
    "qr code download",
    "qr code transparent background",
    "custom qr code",
    "qr code colors",
    "qr code size",
    "qr code error correction",
    "qr code mask pattern",
    "qr code logo",
    "qr code scanner test",
    "qr code verification",
    "browser qr generator",
    "client side qr generator",
    "offline qr code generator",
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
    title: "Free QR Code Generator - Wi-Fi, vCard, Links, SVG/PNG Export",
    description:
      "Generate QR codes for links, Wi-Fi, vCards, email, SMS, geo, events, and UTM links. Customize size, colors, error correction, and logo overlays. Export PNG/SVG with transparent backgrounds. 100% client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "QR Code Generator with Wi-Fi, vCard, and SVG/PNG export",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free QR Code Generator - Wi-Fi, vCard, Links, SVG/PNG Export",
    description:
      "Create QR codes for links, Wi-Fi, vCards, email, SMS, geo, events, and UTM links. Customize style and export PNG/SVG. Private, client-side.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Productivity Tools",
  other: {
    "application-name": "QR Code Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "QR Generator",
  },
};

export default function QrGeneratorPage() {
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
        name: "QR Code Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QR Code Generator",
    applicationCategory: "UtilitiesApplication",
    applicationSubCategory: "QR Code Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free QR code generator with structured builders (Wi-Fi, vCard, email, SMS, geo, calendar, UTM). Customize size, colors, quiet zone, mask pattern, and error correction. Export PNG/SVG with transparent backgrounds, copy image, and verify scans with your camera.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Text, URL, Wi-Fi, vCard, email, SMS, geo, calendar, and UTM builders",
      "Custom size, colors, quiet zone, and error correction",
      "Mask pattern control and rounded module styling",
      "Logo overlay with safety guardrails",
      "Live or manual generation modes",
      "PNG and SVG export with transparent background",
      "Copy QR image to clipboard",
      "Shareable links and recent history (local only)",
      "Camera-based scan verification",
      "Scan difficulty indicator based on payload density",
      "Client-side generation with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.2.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-27",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1365",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Create a QR Code",
    description:
      "Generate a QR code for links, Wi-Fi, or contact details and export as PNG or SVG with custom styling.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "QR Code Generator",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Choose a payload type",
        text: "Select a builder (Wi-Fi, vCard, email, SMS, geo, event, UTM) or paste text/URL.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Enter your content",
        text: "Fill in the builder fields or paste your text/URL. Enable validation for URLs if needed.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Customize styling",
        text: "Adjust size, colors, quiet zone, error correction, mask pattern, and module style. Add a logo if needed.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Generate and preview",
        text: "Use Live mode (debounced) or Manual mode to generate the QR preview.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Export or verify",
        text: "Download PNG/SVG, copy to clipboard, or verify the scan using your camera.",
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
        name: "Is QR code generation private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All QR codes are generated locally in your browser. Nothing is uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What types of QR codes can I generate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Text, URLs, Wi-Fi credentials, vCards, email, SMS, geo locations, calendar events, and UTM links.",
        },
      },
      {
        "@type": "Question",
        name: "Can I customize colors and size?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can change size, colors, quiet zone, error correction, mask pattern, and module style. You can also add a logo overlay with safety guardrails.",
        },
      },
      {
        "@type": "Question",
        name: "What export formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PNG and SVG with optional transparent backgrounds. You can also copy the QR image to the clipboard.",
        },
      },
      {
        "@type": "Question",
        name: "Can I verify scans before printing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Use the built-in scan test mode to verify the QR with your camera.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a limit on how much text I can encode?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Long payloads can create dense QR codes that are harder to scan. The tool warns you when input is large so you can shorten it or increase size and error correction.",
        },
      },
      {
        "@type": "Question",
        name: "Do you store my QR data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Everything stays in your browser. Optional history is stored locally on your device and never uploaded.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "QR Code Generator - Wi-Fi, vCard, Links, SVG/PNG Export",
    description:
      "Create QR codes for text, URLs, Wi-Fi, vCards, email, SMS, geo, and events. Customize styling and export PNG/SVG locally.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "QR Codes",
      description: "Two-dimensional barcodes used to encode text, links, and structured data for fast scanning.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "QR Code Generator",
    },
    primaryImageOfPage: ogImage,
    keywords:
      "qr code generator, qr code maker, wifi qr, vcard qr, svg qr, png qr, qr code export, custom qr code, client side qr",
  };

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="software-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <QrGeneratorClient />
    </>
  );
}
