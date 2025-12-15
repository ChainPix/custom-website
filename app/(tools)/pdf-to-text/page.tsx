import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import PdfToTextClient from "./client";

export const metadata: Metadata = {
  title: "PDF to Text",
  description:
    "Free PDF to text converter with OCR support. Extract text from PDFs and scanned documents directly in your browser—no uploads, no limits.",
  keywords: [
    "pdf to text",
    "pdf to text free",
    "convert pdf to text online",
    "extract text from pdf",
    "browser pdf text",
    "free pdf converter",
    "ocr pdf",
    "scanned pdf to text",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/pdf-to-text`,
  },
  openGraph: {
    title: "PDF to Text",
    description:
      "Convert PDF to plain text instantly in your browser with OCR support. Free, fast, and private—no uploads required.",
    url: `${siteUrl.replace(/\/$/, "")}/pdf-to-text`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Text",
    description:
      "Free browser-based PDF text extractor with OCR. Upload and copy clean text, no sign-up or server uploads.",
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

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this PDF to Text tool private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs client-side in your browser; files are not uploaded to any server.",
        },
      },
      {
        "@type": "Question",
        name: "What is the max file size?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Supports files up to 100MB. OCR processing works best with files under 50MB for optimal performance.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support scanned PDFs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! The tool includes built-in OCR using Tesseract.js to extract text from scanned PDFs with 85-95% accuracy.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="ld-json-pdf-to-text" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Script id="ld-json-pdf-to-text-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <PdfToTextClient />
    </>
  );
}
