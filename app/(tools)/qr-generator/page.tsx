import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import QrGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "QR Code Generator | ToolStack",
  description: "Create QR codes from text or URLs and download them instantly. Free and browser-based.",
  keywords: [
    "qr code generator",
    "create qr",
    "text to qr",
    "url qr code",
    "download qr",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/qr-generator`,
  },
  openGraph: {
    title: "QR Code Generator | ToolStack",
    description: "Generate QR codes in-browser and download as PNG. No sign-up required.",
    url: `${siteUrl.replace(/\/$/, "")}/qr-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Generator | ToolStack",
    description: "Create and download QR codes from text or URLs instantly.",
  },
};

export default function QrGeneratorPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is QR generation private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. QR codes are generated in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I generate QR codes for URLs and text?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Paste any text or URL, adjust size and error correction, and download the PNG.",
        },
      },
      {
        "@type": "Question",
        name: "Can I customize the QR code?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can change colors, size, and error correction levels to fit your needs.",
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
      <QrGeneratorClient />
    </>
  );
}
