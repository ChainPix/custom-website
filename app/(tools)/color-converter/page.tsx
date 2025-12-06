import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ColorConverterClient from "./client";

export const metadata: Metadata = {
  title: "Color Converter | ToolStack",
  description:
    "Convert colors between HEX, RGB, and HSL with validation and previews. Copy any format instantly.",
  keywords: [
    "color converter",
    "hex to rgb",
    "rgb to hex",
    "hsl converter",
    "color picker",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/color-converter`,
  },
  openGraph: {
    title: "Color Converter | ToolStack",
    description: "Convert HEX, RGB, and HSL with live preview and copy-ready formats.",
    url: `${siteUrl.replace(/\/$/, "")}/color-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Converter | ToolStack",
    description: "Convert and preview colors across HEX, RGB, and HSL formats.",
  },
};

export default function ColorConverterPage() {
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
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <ColorConverterClient />
    </>
  );
}
