import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import PdfToTextClient from "./client";

export const metadata: Metadata = {
  title: "PDF to Text Converter Free with OCR - Extract Text from PDFs",
  description:
    "Free PDF to text converter with advanced OCR support. Extract text from scanned PDFs, images, and documents with 85-95% accuracy. 100MB limit, client-side processing, no uploads. Convert PDF to TXT, Markdown, or JSON instantly.",
  keywords: [
    "pdf to text",
    "pdf to text converter",
    "convert pdf to text",
    "extract text from pdf",
    "pdf to text free online",
    "pdf text extractor",
    "pdf ocr online free",
    "convert scanned pdf to text",
    "extract text from pdf image",
    "pdf to text without upload",
    "how to extract text from pdf",
    "how to convert pdf to text",
    "browser pdf text",
    "free pdf converter",
    "ocr pdf",
    "scanned pdf to text",
    "pdf to txt",
    "pdf to markdown",
    "client side pdf converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/pdf-to-text`,
  },
  openGraph: {
    title: "PDF to Text Converter Free with OCR - Extract Text from PDFs",
    description:
      "Convert PDF to text with advanced OCR. Extract from scanned documents with 85-95% accuracy. 100MB limit, client-side processing, export to TXT/MD/JSON. Free, fast, private—no uploads.",
    url: `${siteUrl.replace(/\/$/, "")}/pdf-to-text`,
    siteName,
    type: "website",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og-pdf-to-text.png`,
        width: 1200,
        height: 630,
        alt: "PDF to Text Converter with OCR Support",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Text Converter Free with OCR",
    description:
      "Extract text from PDFs and scanned documents. 85-95% OCR accuracy, 100MB files, client-side processing. Export to TXT/MD/JSON. No uploads, completely free.",
  },
};

export default function PdfToTextPage() {
  const canonical = `${siteUrl.replace(/\/$/, "")}/pdf-to-text`;

  // Breadcrumb Schema
  const breadcrumb = {
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
        name: "PDF to Text",
        item: canonical,
      },
    ],
  };

  // Enhanced SoftwareApplication Schema
  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PDF to Text Converter with OCR",
    applicationCategory: "UtilitiesApplication",
    applicationSubCategory: "PDF Converter",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free online PDF to text converter with advanced OCR support. Extract text from digital PDFs and scanned documents with 85-95% accuracy. Supports files up to 100MB, client-side processing, no uploads required.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "OCR for scanned PDFs (Tesseract.js WASM)",
      "Extract text from digital PDFs (PDF.js)",
      "Process files up to 100MB",
      "Export to TXT, Markdown, or JSON",
      "Client-side processing - no uploads",
      "Checkpoint/resume for interrupted processing",
      "85-95% OCR accuracy on clean scans",
      "Works on desktop and mobile browsers",
      "Normalize whitespace option",
      "Real-time progress tracking",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "2.0.0",
    datePublished: "2025-12-09",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  // HowTo Schema
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert PDF to Text with OCR",
    description: "Step-by-step guide to extract text from PDFs and scanned documents using our free online converter.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Upload Your PDF",
        text: "Click the upload area or drag and drop your PDF file. Supports files up to 100MB.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Automatic Analysis",
        text: "The tool automatically detects if your PDF is text-based, scanned (image-based), or mixed, and applies the optimal extraction method.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Text Extraction",
        text: "For text PDFs, extraction happens in seconds. For scanned PDFs, OCR processes each page (~4s per page) with real-time progress.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Review Results",
        text: "View extracted text in the output panel. Check OCR confidence scores for scanned documents.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Export or Copy",
        text: "Copy text to clipboard or download as TXT, Markdown, or JSON format with metadata.",
        position: 5,
      },
    ],
  };

  // Expanded FAQ Schema
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this PDF to Text tool private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, completely private. All processing happens client-side in your browser using PDF.js and Tesseract.js. Your files are never uploaded to any server, and no data is collected or stored.",
        },
      },
      {
        "@type": "Question",
        name: "What is the maximum file size?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Desktop browsers: 100MB. Mobile Android: 75MB. iOS Safari: 50MB. OCR processing works best with files under 50MB for optimal performance.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support scanned PDFs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! The tool includes built-in OCR using Tesseract.js WASM to extract text from scanned PDFs and images with 85-95% accuracy on clean scans. Processing takes approximately 4 seconds per page.",
        },
      },
      {
        "@type": "Question",
        name: "How accurate is the OCR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "OCR accuracy ranges from 85-95% for high-quality scans with clear text. Factors affecting accuracy include: scan resolution (300+ DPI recommended), text clarity, font quality, and page orientation. Poor quality or faded scans may result in 70-85% accuracy.",
        },
      },
      {
        "@type": "Question",
        name: "Can I extract text from password-protected PDFs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, password-protected or encrypted PDFs cannot be processed. You'll need to remove the password protection first using PDF software before converting to text.",
        },
      },
      {
        "@type": "Question",
        name: "How long does PDF to text conversion take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Text-based PDFs: ~2 seconds for 10 pages (~0.1s per page). Scanned PDFs with OCR: ~45 seconds for 10 pages (~4s per page including initialization). Mixed PDFs vary based on the ratio of text to scanned pages.",
        },
      },
      {
        "@type": "Question",
        name: "What export formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Three formats: TXT (plain text with page markers), Markdown (formatted with document title), and JSON (complete metadata including page-wise text, confidence scores, processing time, and PDF category).",
        },
      },
      {
        "@type": "Question",
        name: "Can I resume interrupted OCR processing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! The tool saves checkpoints every 5 pages to IndexedDB. If your browser crashes or you close the tab, upload the same PDF again and it will automatically resume from the last checkpoint.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work on mobile devices?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, works on iOS 14+ (Safari), Android Chrome 90+, and Firefox Android. Mobile processing is 2-3x slower than desktop due to WASM JIT limitations on iOS and lower processing power.",
        },
      },
      {
        "@type": "Question",
        name: "How do I extract text from invoices or receipts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Upload your invoice/receipt PDF (scanned or digital). The OCR engine will extract text including amounts, dates, and line items. For best results with invoices, ensure scans are high-resolution (300+ DPI) and properly oriented.",
        },
      },
      {
        "@type": "Question",
        name: "What browsers are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Requires Web Workers, WebAssembly, IndexedDB, and Web Crypto API support. All modern browsers since 2021 are fully supported.",
        },
      },
      {
        "@type": "Question",
        name: "Can I extract text from images in PDFs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, OCR extracts text from images embedded in PDFs. The tool automatically detects image-based pages and processes them with Tesseract.js. Pure image files (JPEG, PNG) are not supported—convert them to PDF first.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Script id="software-app-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }} />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <PdfToTextClient />
    </>
  );
}
