import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CssUnitsClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/css-units`;

export const metadata: Metadata = {
  title: "CSS Units Converter | ToolStack",
  description: "Convert between px, rem, em, vw, and vh with custom base font size and viewport dimensions. Runs locally in your browser.",
  keywords: ["css units converter", "px to rem", "rem to px", "vw to px", "vh to px", "responsive design"],
  alternates: { canonical },
  openGraph: {
    title: "CSS Units Converter | ToolStack",
    description: "Translate CSS units (px, rem, em, vw, vh) for responsive design quickly.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSS Units Converter | ToolStack",
    description: "Convert CSS units with custom base and viewport values in-browser.",
  },
};

export default function CssUnitsPage() {
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
          text: "px, rem, em, vw, and vh with custom base font size and viewport dimensions.",
        },
      },
      {
        "@type": "Question",
        name: "Can I customize the base?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Set base font size for rem/em and viewport width/height for vw/vh calculations.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <CssUnitsClient />
    </>
  );
}
