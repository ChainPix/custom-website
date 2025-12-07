import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HtmlEntitiesClient from "./client";

export const metadata: Metadata = {
  title: "HTML Entity Encoder/Decoder | ToolStack",
  description:
    "Encode or decode HTML entities instantly. Protect markup or turn entities back to readable text.",
  keywords: [
    "html entity encoder",
    "html escape",
    "decode html",
    "encode html",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/html-entities`,
  },
  openGraph: {
    title: "HTML Entity Encoder/Decoder | ToolStack",
    description: "Escape or unescape HTML entities in your browser with copy-ready output.",
    url: `${siteUrl.replace(/\/$/, "")}/html-entities`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HTML Entity Encoder/Decoder | ToolStack",
    description: "Convert text to safe HTML entities or decode them instantly.",
  },
  other: {
    "script:type:application/ld+json": JSON.stringify({
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
          name: "Why encode HTML?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Encoding prevents browsers from interpreting user input as markup, avoiding XSS or broken layout.",
          },
        },
        {
          "@type": "Question",
          name: "What if my input is huge?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Large inputs may run slower; the tool shows a warning for very large text so you can decide before processing.",
          },
        },
      ],
    }),
  },
};

export default function HtmlEntitiesPage() {
  return <HtmlEntitiesClient />;
}
