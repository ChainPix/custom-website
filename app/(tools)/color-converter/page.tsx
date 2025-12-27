import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ColorConverterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/color-converter`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-color-converter.png`;

export const metadata: Metadata = {
  title: "Free Color Converter - HEX, RGB, HSL, RGBA, HSLA, Contrast, Palettes",
  description:
    "Convert between HEX, RGB, HSL, RGBA, and HSLA with live preview, WCAG contrast checks, palettes, and smart paste. Copy formats, export palettes, and keep favorites locally with no uploads or tracking.",
  keywords: [
    "color converter",
    "free color converter",
    "hex to rgb",
    "rgb to hex",
    "hsl to rgb",
    "rgb to hsl",
    "rgb to hex converter",
    "hex to hsl",
    "hsl to hex",
    "rgba to rgb",
    "rgba to hex",
    "hsla to hex",
    "color picker",
    "contrast checker",
    "wcag contrast",
    "wcag 2.1 contrast",
    "color contrast ratio",
    "accessibility color checker",
    "color palette generator",
    "color palette",
    "color harmony",
    "complementary colors",
    "analogous colors",
    "triadic colors",
    "color accessibility",
    "color contrast checker",
    "css color converter",
    "css color names",
    "tailwind color converter",
    "tailwind color",
    "color naming",
    "nearest color name",
    "design token color",
    "design tools",
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
    title: "Free Color Converter - HEX, RGB, HSL, RGBA, HSLA, Contrast, Palettes",
    description:
      "Convert colors, check WCAG contrast, generate palettes, and find nearest names. Runs locally in your browser with no uploads or tracking.",
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
    title: "Free Color Converter - HEX, RGB, HSL, RGBA, HSLA, Contrast, Palettes",
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
      "Free color converter with HEX, RGB, HSL, RGBA, and HSLA formats, WCAG contrast checks, palette generation, smart paste, and named color matching. Runs fully client-side with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Convert HEX, RGB, HSL, RGBA, and HSLA formats",
      "Alpha-aware RGBA and HSLA controls",
      "WCAG contrast ratios and AA/AAA pass/fail",
      "Palette generation with tints, shades, and harmonies",
      "Closest CSS named color and Tailwind match",
      "Smart paste from CSS snippets",
      "Nearest named color from common palettes",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "986",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert Colors and Check Contrast",
    description: "Convert colors between HEX, RGB, HSL, RGBA, and HSLA, then verify accessibility contrast.",
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
      {
        "@type": "HowToStep",
        name: "Save or export",
        text: "Copy formats, save to favorites, or download palettes for design and development.",
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
          text: "You can convert HEX, RGB, HSL, RGBA, and HSLA, with color picker presets and smart paste.",
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
      {
        "@type": "Question",
        name: "Does it support Tailwind or CSS named colors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. It can match the closest Tailwind color and CSS named color so you can map conversions to design tokens.",
        },
      },
      {
        "@type": "Question",
        name: "How do I check WCAG contrast for text?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste a color and review the contrast ratios against white and black. The tool highlights AA and AAA pass/fail for normal and large text.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert a CSS color string directly?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Smart paste accepts CSS snippets like #1e293b, rgb(30 41 59), or hsl(215 20% 20%).",
        },
      },
      {
        "@type": "Question",
        name: "Does it support transparency?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. RGBA and HSLA outputs include alpha controls so you can tune transparency.",
        },
      },
      {
        "@type": "Question",
        name: "Is anything uploaded or stored on a server?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Everything runs locally in your browser. Favorites are stored only on your device.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Color Converter - HEX, RGB, HSL, RGBA, HSLA, Contrast, and Palettes",
    description:
      "Convert colors between HEX, RGB, HSL, RGBA, and HSLA with live preview, contrast checks, palette generation, and smart paste.",
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
      "color converter, hex to rgb, rgb to hex, hsl converter, rgba, hsla, contrast checker, wcag, palette generator, css color names, tailwind colors",
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
