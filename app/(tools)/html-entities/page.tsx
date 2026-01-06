import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HtmlEntitiesClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/html-entities`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "HTML Entities Encoder/Decoder - Escape & Unescape Text",
  description:
    "Encode or decode HTML entities with Unicode-safe output, named or numeric formats, and fast client-side decoding. Works entirely in your browser with no uploads.",
  keywords: [
    "html entities encoder",
    "html escape",
    "encode html entities",
    "decode html entities",
    "html entity decoder",
    "numeric html entities",
    "named html entities",
    "unicode html entities",
    "xss-safe encoding",
    "web development tools",
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
    title: "HTML Entities Encoder/Decoder - Escape & Unescape Text",
    description:
      "Encode or decode HTML entities with Unicode-safe output, named or numeric formats, and fast client-side decoding.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "HTML Entities Encoder/Decoder tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HTML Entities Encoder/Decoder - Escape & Unescape Text",
    description:
      "Encode or decode HTML entities with Unicode-safe output and fast in-browser decoding.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "HTML Entities Encoder/Decoder",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "HTML Entities",
  },
};

export default function HtmlEntitiesPage() {
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
        name: "HTML Entities",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HTML Entities Encoder/Decoder",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "HTML Encoding Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Encode or decode HTML entities with Unicode-safe output, named and numeric formats, unsafe-only encoding, and fast client-side decoding. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Unicode-safe encoding with code points",
      "Named + numeric (decimal/hex) entity output",
      "Unsafe-only encoding for readability",
      "Fast entity decoder with large-input worker",
      "Diff view and entity count stats",
      "Batch file processing with zip downloads",
      "Client-side processing with no uploads",
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
    name: "How to Encode or Decode HTML Entities",
    description: "Encode text for safe HTML display or decode entities back to readable text.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose mode",
        text: "Select Encode or Decode depending on whether you need safe HTML output or readable text.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Paste input",
        text: "Paste or type your text into the input box.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Run the transform",
        text: "Click Run to process the input. Auto-run can be enabled for quick updates.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or download",
        text: "Copy the output or download it as a text file.",
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
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Encoding and decoding happen in your browser; text is not sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Is this a sanitizer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Encoding is for safely displaying text in HTML, not sanitizing unsafe HTML.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use named or numeric entities?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose named entities when available or always numeric (decimal or hex).",
        },
      },
      {
        "@type": "Question",
        name: "What if my input is huge?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Large inputs use a background worker to keep the UI responsive and may show a progress indicator.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "HTML Entities Encoder/Decoder - Escape & Unescape Text",
    description:
      "Encode or decode HTML entities with Unicode-safe output, named or numeric formats, and fast in-browser decoding.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "HTML Entities",
      description: "Encoding special characters for safe HTML display and decoding entities back to text.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "HTML Entities Encoder/Decoder",
    },
    primaryImageOfPage: ogImage,
    keywords:
      "html entities encoder, html escape, html entity decoder, unicode entities, numeric entities, named entities",
  };

  return (
    <>
      <Script
        id="html-entities-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="html-entities-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script
        id="html-entities-howto"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Script
        id="html-entities-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="html-entities-webpage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <HtmlEntitiesClient />
    </>
  );
}
