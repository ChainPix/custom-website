import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import PdfToTextClient from "./client";

export const metadata: Metadata = {
  title: "PDF to Text | ToolStack",
  description:
    "Free PDF to text converter. Extract clean text from PDFs directly in your browser—no uploads, no limits.",
  keywords: [
    "pdf to text",
    "pdf to text free",
    "convert pdf to text online",
    "extract text from pdf",
    "browser pdf text",
    "free pdf converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/pdf-to-text`,
  },
  openGraph: {
    title: "PDF to Text | ToolStack",
    description:
      "Convert PDF to plain text instantly in your browser. Free, fast, and private—no uploads required.",
    url: `${siteUrl.replace(/\/$/, "")}/pdf-to-text`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Text | ToolStack",
    description:
      "Free browser-based PDF text extractor. Upload and copy clean text, no sign-up or server uploads.",
  },
};

export default function PdfToTextPage() {
  const canonical = `${siteUrl.replace(/\/$/, "")}/pdf-to-text`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PDF to Text",
    applicationCategory: "Utility",
    operatingSystem: "Web",
    url: canonical,
    description:
      "Free PDF to text converter. Extract clean text from PDFs directly in your browser—no uploads, no limits.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <Script id="ld-json-pdf-to-text" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PdfToTextClient />
    </>
  );
}
