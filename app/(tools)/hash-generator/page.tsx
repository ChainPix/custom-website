import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HashGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "Hash Generator",
  description:
    "Generate SHA-256, SHA-512, or legacy SHA-1 hashes in your browser. Paste text, hash instantly, and copy the result.",
  keywords: [
    "hash generator",
    "sha256",
    "sha512",
    "sha1",
    "compute hash",
    "online hash tool",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/hash-generator`,
  },
  openGraph: {
    title: "Hash Generator",
    description: "Compute SHA-256, SHA-512, or legacy SHA-1 hashes instantly in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/hash-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hash Generator",
    description: "Hash text with SHA-256, SHA-512, or legacy SHA-1. Free, fast, browser-based.",
  },
};

export default function HashGeneratorPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is hashing done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Hashing uses Web Crypto in your browser; no data is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which algorithms are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can hash with SHA-256 and SHA-512, with SHA-1 available for legacy checks only. Results can be copied or downloaded.",
        },
      },
      {
        "@type": "Question",
        name: "Is there an input size limit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Keep input under 100,000 characters for best performance.",
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
      <HashGeneratorClient />
    </>
  );
}
