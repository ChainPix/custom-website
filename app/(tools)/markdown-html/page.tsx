import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownHtmlClient from "./client";

export const metadata: Metadata = {
  title: "Markdown ⇄ HTML Converter | ToolStack",
  description:
    "Convert Markdown to HTML or HTML to Markdown instantly. Sanitize output and copy clean markup.",
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
    title: "Markdown ⇄ HTML Converter | ToolStack",
    description: "Bidirectional Markdown/HTML converter. Free, fast, and copy-ready.",
    url: `${siteUrl.replace(/\/$/, "")}/markdown-html`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown ⇄ HTML Converter | ToolStack",
    description: "Convert Markdown to HTML or back to Markdown instantly in your browser.",
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
          text: "Yes. Markdown and HTML conversion happens in your browser; nothing is uploaded.",
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
          text: "The preview is not sanitized; only view trusted input when enabling preview.",
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
