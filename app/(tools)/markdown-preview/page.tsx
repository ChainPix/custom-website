import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import MarkdownPreviewClient from "./client";

export const metadata: Metadata = {
  title: "Markdown Previewer",
  description:
    "Live Markdown preview with rendered output and copy-ready HTML. Runs entirely in your browser.",
  keywords: [
    "markdown preview",
    "markdown viewer",
    "markdown to html",
    "render markdown",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/markdown-preview`,
  },
  openGraph: {
    title: "Markdown Previewer",
    description: "Write Markdown and see the rendered output instantly with copy-ready HTML.",
    url: `${siteUrl.replace(/\/$/, "")}/markdown-preview`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown Previewer",
    description: "Live Markdown rendering in your browser with HTML copy support.",
  },
  other: {
    "script:type:application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does this run locally?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Markdown is rendered in your browser; nothing is uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "Can I export the output?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can copy the rendered HTML or download it as an HTML file, and copy the markdown source.",
          },
        },
        {
          "@type": "Question",
          name: "Is HTML sanitized?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sanitization is enabled by default to strip scripts/styles/on* attributes; you can toggle it if you need raw HTML.",
          },
        },
      ],
    }),
  },
};

export default function MarkdownPreviewPage() {
  return <MarkdownPreviewClient />;
}
