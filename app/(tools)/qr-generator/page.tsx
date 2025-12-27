import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import QrGeneratorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/qr-generator`;

export const metadata: Metadata = {
  title: "QR Code Generator - Wi-Fi, vCard, Links, SVG Export",
  description:
    "Create QR codes for links, Wi-Fi, vCards, email, SMS, and events. Customize size, colors, error correction, and export PNG/SVG with transparent background. 100% client-side.",
  keywords: [
    "qr code generator",
    "qr generator",
    "wifi qr code",
    "vcard qr code",
    "link qr code",
    "text to qr",
    "email qr code",
    "sms qr code",
    "geo qr code",
    "calendar qr code",
    "svg qr code",
    "qr code download",
    "qr code transparent background",
    "custom qr code",
    "qr code colors",
    "qr code size",
    "qr code error correction",
    "qr code mask pattern",
    "qr code logo",
    "qr code scanner test",
    "browser qr generator",
    "client side qr generator",
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
    title: "QR Code Generator - Wi-Fi, vCard, Links, SVG Export",
    description:
      "Generate QR codes for links, Wi-Fi, vCards, email, SMS, and events. Customize size, colors, error correction, and export PNG/SVG with transparent backgrounds. 100% client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Generator - Wi-Fi, vCard, Links, SVG Export",
    description:
      "Create QR codes for links, Wi-Fi, vCards, email, SMS, and events. Customize style and export PNG/SVG. Private, client-side.",
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
      "Client-side generation with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Create a QR Code",
    description:
      "Generate a QR code for links, Wi-Fi, or contact details and export as PNG or SVG with custom styling.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose a payload type",
        text: "Select a builder (Wi-Fi, vCard, email, SMS, geo, event) or paste text/URL.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Customize styling",
        text: "Adjust size, colors, quiet zone, error correction, and module style. Add a logo if needed.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Generate and preview",
        text: "Use Live mode (debounced) or Manual mode to generate the QR preview.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Export or verify",
        text: "Download PNG/SVG, copy to clipboard, or verify the scan using your camera.",
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
          text: "Yes. You can change size, colors, quiet zone, error correction, mask pattern, and module style.",
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
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "QR Code Generator - Wi-Fi, vCard, Links, SVG Export",
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
    keywords:
      "qr code generator, wifi qr, vcard qr, svg qr, qr code export, custom qr code, client side qr",
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
