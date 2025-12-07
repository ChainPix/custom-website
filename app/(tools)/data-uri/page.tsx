import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import DataUriClient from "./client";

export const metadata: Metadata = {
  title: "Data URI Generator | ToolStack",
  description:
    "Convert text or files to data URIs with a chosen MIME type. Copy-ready output for embeds and tests.",
  keywords: [
    "data uri generator",
    "base64 data uri",
    "text to data uri",
    "file to data uri",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/data-uri`,
  },
  openGraph: {
    title: "Data URI Generator | ToolStack",
    description: "Generate data URIs from text or files. Choose MIME type and copy the result.",
    url: `${siteUrl.replace(/\/$/, "")}/data-uri`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data URI Generator | ToolStack",
    description: "Create data URIs in-browser from text or uploaded files.",
  },
};

export default function DataUriPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Data URI generation happens in your browser; files and text are not uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "What can I encode?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can encode text or small files into data URIs. A MIME type can be provided or detected from the file.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Copy the data URI, copy the decoded text, or download the URI as a file.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <DataUriClient />
    </>
  );
}
