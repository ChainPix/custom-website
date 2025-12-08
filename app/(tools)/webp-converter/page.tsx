import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import WebpConverterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/webp-converter`;

export const metadata: Metadata = {
  title: "WebP Image Converter | ToolStack",
  description: "Convert JPG, PNG, or GIF images to WebP directly in your browser. Fast, private, no upload.",
  keywords: ["webp converter", "jpg to webp", "png to webp", "image converter", "browser tools"],
  alternates: { canonical },
  openGraph: {
    title: "WebP Image Converter | ToolStack",
    description: "Transform images to WebP for faster delivery — runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WebP Image Converter | ToolStack",
    description: "Convert images to WebP instantly without uploading.",
  },
};

export default function WebpConverterPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Conversion happens in your browser; files are not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Upload common image formats like JPG, PNG, or GIF and they will be converted to WebP.",
        },
      },
      {
        "@type": "Question",
        name: "Can I control quality?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use the quality slider (default 80%) to balance size and fidelity.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <WebpConverterClient />
    </>
  );
}
