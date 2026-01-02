import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CodeMinifierClient from "./client";

export const metadata: Metadata = {
  title: "Code Minifier & Pretty Printer",
  description:
    "Minify or pretty-print HTML, CSS, or JS quickly in your browser. Copy clean output instantly.",
  keywords: [
    "html minifier",
    "css minifier",
    "js minifier",
    "code formatter",
    "pretty print",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/code-minifier`,
  },
  openGraph: {
    title: "Code Minifier & Pretty Printer",
    description: "Lightweight HTML/CSS/JS minify and prettify directly in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/code-minifier`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Code Minifier & Pretty Printer",
    description: "Minify or prettify code on the fly—no uploads or sign-up.",
  },
};

export default function CodeMinifierPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Minify/pretty happens in your browser; code is not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Which languages are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "HTML, CSS, and JavaScript with lightweight regex-based transforms.",
        },
      },
      {
        "@type": "Question",
        name: "Is this production-grade?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This is a lightweight formatter and may alter complex code. Use full minifiers (e.g., terser, clean-css) for production bundles.",
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
      <CodeMinifierClient />
    </>
  );
}
