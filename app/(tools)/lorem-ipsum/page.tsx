import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import LoremIpsumClient from "./client";

export const metadata: Metadata = {
  title: "Lorem Ipsum & Mock Data Generator | ToolStack",
  description:
    "Generate lorem ipsum text, sentences, or mock data snippets for quick prototyping. Copy instantly.",
  keywords: [
    "lorem ipsum generator",
    "mock data generator",
    "placeholder text",
    "dummy text",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/lorem-ipsum`,
  },
  openGraph: {
    title: "Lorem Ipsum & Mock Data Generator | ToolStack",
    description: "Create lorem ipsum paragraphs or mock snippets on the fly. Free and fast.",
    url: `${siteUrl.replace(/\/$/, "")}/lorem-ipsum`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lorem Ipsum & Mock Data Generator | ToolStack",
    description: "Generate placeholder text or mock snippets for prototyping.",
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
            text: "Yes. Lorem Ipsum generation happens entirely in your browser; no data is sent to a server.",
          },
        },
        {
          "@type": "Question",
          name: "Can I choose formats?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can generate paragraphs, sentences, bullet lists, or headline-style text with presets for quick setup.",
          },
        },
        {
          "@type": "Question",
          name: "Can I download the text?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Copy to clipboard or download as a text file directly from the tool.",
          },
        },
      ],
    }),
  },
};

export default function LoremIpsumPage() {
  return <LoremIpsumClient />;
}
