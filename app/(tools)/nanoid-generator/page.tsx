import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import NanoIdClient from "./client";

export const metadata: Metadata = {
  title: "NanoID Generator | ToolStack",
  description:
    "Generate short, URL-safe IDs with customizable length and alphabet. Copy-ready output for tokens and slugs.",
  keywords: [
    "nanoid generator",
    "short id",
    "random id",
    "generate unique id",
    "url safe id",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/nanoid-generator`,
  },
  openGraph: {
    title: "NanoID Generator | ToolStack",
    description: "Create short, URL-safe NanoIDs with custom length and alphabet in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/nanoid-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NanoID Generator | ToolStack",
    description: "Generate short IDs with custom settings and copy instantly.",
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
            text: "Yes. NanoIDs are generated using Web Crypto directly in your browser; nothing is sent to a server.",
          },
        },
        {
          "@type": "Question",
          name: "Can I customize length and alphabet?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can set length (4–32), choose count (1–50), and provide a custom alphabet or pick presets (URL-safe, hex, lowercase, letters+digits).",
          },
        },
        {
          "@type": "Question",
          name: "Why use NanoID?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "NanoID provides short, URL-safe IDs with good collision resistance for many use cases like slugs, tokens, and references.",
          },
        },
      ],
    }),
  },
};

export default function NanoIdGeneratorPage() {
  return <NanoIdClient />;
}
