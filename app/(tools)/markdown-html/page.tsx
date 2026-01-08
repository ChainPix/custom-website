import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownHtmlClient from "./client";

export const metadata: Metadata = {
  title: "Markdown ⇄ HTML Converter ",
  description:
    "Convert Markdown to HTML or HTML to Markdown instantly. Local-only conversion with sanitized preview by default.",
  keywords: [
    "markdown to html",
    "html to markdown",
    "convert markdown",
    "convert html",
    "online converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/markdown-html`,
  },
  openGraph: {
    title: "Markdown ⇄ HTML Converter ",
    description: "Bidirectional Markdown/HTML converter with local-only processing and sanitized preview by default.",
    url: `${siteUrl.replace(/\/$/, "")}/markdown-html`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown ⇄ HTML Converter ",
    description: "Convert Markdown to HTML or back to Markdown instantly with local-only processing.",
  },
};

export default function MarkdownHtmlPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is conversion done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Markdown and HTML conversion happens in your browser; nothing is uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert both Markdown to HTML and HTML to Markdown?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Use the direction selector to switch between Markdown → HTML and HTML → Markdown.",
        },
      },
      {
        "@type": "Question",
        name: "Is the HTML preview sanitized?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Sanitized preview is enabled by default, with an optional raw preview toggle for trusted input.",
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
      <MarkdownHtmlClient />
    </>
  );
}
