import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ImageBase64Client from "./client";

export const metadata: Metadata = {
  title: "Image to Base64 ",
  description:
    "Convert images to Base64 strings in your browser. Drag/drop an image and copy the encoded output.",
  keywords: [
    "image to base64",
    "png to base64",
    "jpg to base64",
    "convert image",
    "base64 encoder",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/image-base64`,
  },
  openGraph: {
    title: "Image to Base64 ",
    description: "Upload an image and get a Base64 string instantly. Runs locally in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/image-base64`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Image to Base64 ",
    description: "Drag/drop an image to convert it to Base64 with copy-ready output.",
  },
};

export default function ImageBase64Page() {
  return (
    <>
      <Script
        id="image-base64-faq"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Does this run locally?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Conversions happen entirely in your browser; images are not uploaded to a server.",
                },
              },
              {
                "@type": "Question",
                name: "What formats are supported?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Common web image formats like PNG, JPG, and GIF. Other image/* types may work if the browser can read them.",
                },
              },
              {
                "@type": "Question",
                name: "Are there size limits?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "For performance, images over ~10 MB are blocked and 5–10 MB show a warning before processing.",
                },
              },
              {
                "@type": "Question",
                name: "Why convert to Base64?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Base64 is useful for data URIs, embedding small assets, or quick transport without separate file hosting.",
                },
              },
            ],
          }),
        }}
      />
      <ImageBase64Client />
    </>
  );
}
