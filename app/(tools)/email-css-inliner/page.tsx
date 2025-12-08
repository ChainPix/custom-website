import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import EmailCssInlinerClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/email-css-inliner`;

export const metadata: Metadata = {
  title: "Email CSS Inliner | ToolStack",
  description: "Inline CSS styles into HTML for email templates to improve mail client compatibility. Runs locally in your browser.",
  keywords: [
    "email css inliner",
    "inline css",
    "html email inline styles",
    "responsive email css",
    "developer tools",
  ],
  alternates: { canonical },
  openGraph: {
    title: "Email CSS Inliner | ToolStack",
    description: "Inline CSS styles into HTML emails instantly in your browser.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Email CSS Inliner | ToolStack",
    description: "Convert CSS to inline styles for HTML email templates locally.",
  },
};

export default function EmailCssInlinerPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Inlining happens in your browser; nothing is uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What selectors are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Common tag, class, and ID selectors are applied. Complex selectors may be ignored to keep it fast.",
        },
      },
      {
        "@type": "Question",
        name: "Can I keep the original style tag?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool keeps your HTML structure and adds inline styles for better email client support.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <EmailCssInlinerClient />
    </>
  );
}
