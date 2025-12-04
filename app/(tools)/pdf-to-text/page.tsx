import type { Metadata } from "next";
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
  return <PdfToTextClient />;
}
