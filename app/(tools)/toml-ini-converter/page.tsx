import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TomlIniClient from "./client";

export const metadata: Metadata = {
  title: "TOML/INI/JSON Converter",
  description:
    "Convert TOML, INI, and JSON files between formats in your browser. Validate input and copy output.",
  keywords: [
    "toml to json",
    "ini to json",
    "json to toml",
    "json to ini",
    "toml to ini",
    "ini to toml",
    "config converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
  },
  openGraph: {
    title: "TOML/INI/JSON Converter",
    description: "Convert TOML, INI, and JSON config text with validation.",
    url: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML/INI/JSON Converter",
    description: "Convert TOML, INI, and JSON configs locally with copy-ready output.",
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
            text: "Yes. Conversion happens in your browser; config text is not uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "What formats are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "TOML, INI, and JSON configuration text can be converted between formats. Samples are provided.",
          },
        },
        {
          "@type": "Question",
          name: "Can I export the output?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can copy or download the converted output directly.",
          },
        },
      ],
    }),
  },
};

export default function TomlIniPage() {
  return <TomlIniClient />;
}
