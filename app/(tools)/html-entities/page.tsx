import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HtmlEntitiesClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/html-entities`;

export const metadata: Metadata = {
  title: "HTML Entity Encoder/Decoder",
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
    canonical,
  },
  openGraph: {
    title: "HTML Entity Encoder/Decoder",
    description: "Escape or unescape HTML entities in your browser with copy-ready output.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HTML Entity Encoder/Decoder",
    description: "Convert text to safe HTML entities or decode them instantly.",
  },
};

export default function HtmlEntitiesPage() {
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
  };

  return (
    <>
      <Script id="html-entities-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <HtmlEntitiesClient />
    </>
  );
}
