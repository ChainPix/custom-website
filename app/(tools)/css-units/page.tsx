import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CssUnitsClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/css-units`;

export const metadata: Metadata = {
  title: "CSS Units Converter",
  description: "Convert px, rem, em, vw/vh/vmin/vmax, %, ch/ex, and print units with custom font, viewport, and context values.",
  keywords: ["css units converter", "px to rem", "rem to px", "vw to px", "vmin", "vmax", "print units", "responsive design"],
  alternates: { canonical },
  openGraph: {
    title: "CSS Units Converter",
    description: "Translate CSS units (px, rem, em, vw/vh/vmin/vmax, %, ch/ex, print units) quickly.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSS Units Converter",
    description: "Convert CSS units with custom font, viewport, and context values in-browser.",
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <CssUnitsClient />
    </>
  );
}
