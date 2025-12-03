import type { Metadata } from "next";
import PdfToTextClient from "./client";

export const metadata: Metadata = {
  title: "PDF to Text | FastFormat Tools",
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
    canonical: "/pdf-to-text",
  },
};

export default function PdfToTextPage() {
  return <PdfToTextClient />;
}
