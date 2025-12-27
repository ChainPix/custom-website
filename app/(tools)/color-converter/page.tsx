import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ColorConverterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/color-converter`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-color-converter.png`;

export const metadata: Metadata = {
  title: "Color Converter - HEX, RGB, HSL, Contrast, Palettes, and Naming",
  description:
    "Convert between HEX, RGB, and HSL with live preview, contrast checks, palettes, and smart paste. Copy formats, export palettes, and keep favorites locally with no uploads.",
  keywords: [
    "color converter",
    "hex to rgb",
    "rgb to hex",
    "hsl to rgb",
    "rgb to hsl",
    "color picker",
    "contrast checker",
    "wcag contrast",
    "color palette generator",
    "tailwind color",
    "css named colors",
    "color naming",
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
    title: "Color Converter - HEX, RGB, HSL, Contrast, Palettes, and Naming",
    description:
      "Convert colors, check WCAG contrast, generate palettes, and find nearest names. Runs locally in your browser with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Color Converter with contrast checker and palette generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Converter - HEX, RGB, HSL, Contrast, Palettes, and Naming",
    description:
      "Convert colors, check WCAG contrast, generate palettes, and find nearest names. Private, client-side.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Color Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Color Converter",
  },
};

export default function ColorConverterPage() {
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
        name: "Color Converter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Color Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Color Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free color converter with HEX, RGB, and HSL formats, WCAG contrast checks, palette generation, smart paste, and named color matching. Runs fully client-side with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Convert HEX, RGB, and HSL formats",
      "RGBA and HSLA with alpha controls",
      "WCAG contrast ratios and AA/AAA pass/fail",
      "Palette generation with tints and shades",
      "Closest CSS named color and Tailwind match",
      "Smart paste from CSS snippets",
      "History and favorites stored locally",
      "Copy and download outputs",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.3.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-27",
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
    name: "How to Convert Colors and Check Contrast",
    description: "Convert colors between HEX, RGB, and HSL, then verify accessibility contrast.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Color Converter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Paste or pick a color",
        text: "Paste any HEX, RGB, or HSL value, or use the color picker and presets.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Review formats and alpha",
        text: "Copy HEX, RGB, HSL, RGBA, or HSLA outputs and adjust alpha for transparency.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Check contrast",
        text: "Review WCAG contrast ratios against white and black for AA/AAA compliance.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Generate palettes",
        text: "Explore complementary, triadic, and analogous colors with a 50-900 scale.",
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
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Color parsing and conversion happen in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can convert HEX, RGB, and HSL, with RGBA/HSLA variants and color picker presets.",
        },
      },
      {
        "@type": "Question",
        name: "Can I download all formats?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy each format, copy all, or download them as text.",
        },
      },
      {
        "@type": "Question",
        name: "Does it check contrast and generate palettes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. It includes WCAG contrast checks, palette generation, and named color matches for context.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Color Converter - HEX, RGB, HSL, Contrast, and Palettes",
    description:
      "Convert colors between HEX, RGB, and HSL with live preview, contrast checks, palette generation, and smart paste.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Color Conversion",
      description: "Transforming colors between HEX, RGB, and HSL formats for design and development.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Color Converter",
    },
    primaryImageOfPage: ogImage,
    keywords:
      "color converter, hex to rgb, rgb to hex, hsl converter, contrast checker, wcag, palette generator, css color names",
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
      <ColorConverterClient />
    </>
  );
}
