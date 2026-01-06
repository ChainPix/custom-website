import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CssUnitsClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/css-units`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "CSS Units Converter",
  description:
    "Convert px, rem, em, vw/vh/vmin/vmax, %, ch/ex, and print units with custom font, viewport, and context values.",
  keywords: [
    "css units converter",
    "px to rem",
    "rem to px",
    "em to px",
    "vw to px",
    "vmin to px",
    "vmax to px",
    "percent to px",
    "print units converter",
    "responsive design",
    "design tokens converter",
    "clamp helper",
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
    title: "CSS Units Converter",
    description: "Translate CSS units (px, rem, em, vw/vh/vmin/vmax, %, ch/ex, print units) quickly.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "CSS Units Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CSS Units Converter",
    description: "Convert CSS units with custom font, viewport, and context values in-browser.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "CSS Units Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "CSS Units",
  },
};

export default function CssUnitsPage() {
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
        name: "CSS Units",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CSS Units Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "CSS Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert px, rem, em, vw/vh/vmin/vmax, %, ch/ex, and print units with custom font, viewport, and context values. Includes multi-output table, design token conversion, clamp helper, history, and shareable links.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Unit conversion for px, rem, em, vw, vh, vmin, vmax, %, ch, ex, pt, pc, in, cm, mm",
      "Separate root and element font sizes",
      "Multi-output table for common units",
      "Design tokens mode for rem and Tailwind-like scales",
      "Clamp() helper for responsive values",
      "Shareable links and local history",
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
    name: "How to Convert CSS Units",
    description: "Convert CSS units with custom font sizes and viewport context, then copy or share results.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "CSS Units Converter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Enter a value and pick units",
        text: "Type a value, then choose the from and to CSS units.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Set context values",
        text: "Adjust root and element font sizes, viewport size, or percent context for accurate conversions.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review results",
        text: "Use the multi-output table to see common unit conversions at a glance.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy or share",
        text: "Copy the result, a CSS snippet, or shareable link.",
        position: 4,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Conversions happen in your browser; no values are sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which units are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "px, rem, em, vw, vh, vmin, vmax, %, ch, ex, pt, pc, in, cm, and mm.",
        },
      },
      {
        "@type": "Question",
        name: "Can I customize the base?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Set root and element font sizes, viewport dimensions, and context values for % and print units.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "CSS Units Converter",
    description:
      "Convert CSS units with custom font, viewport, and context values. Includes multi-output conversions, tokens, and clamp helper.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="css-units-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="css-units-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="css-units-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="css-units-faq" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>
      <Script id="css-units-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <CssUnitsClient />
    </>
  );
}
