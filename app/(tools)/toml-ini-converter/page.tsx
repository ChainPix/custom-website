import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TomlIniClient from "./client";

export const metadata: Metadata = {
  title: "TOML/INI to JSON Converter ",
  description:
    "Convert TOML or INI files to JSON in your browser. Validate input and copy formatted output.",
  keywords: [
    "toml to json",
    "ini to json",
    "convert toml",
    "convert ini",
    "config converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
  },
  openGraph: {
    title: "TOML/INI to JSON Converter ",
    description: "Parse TOML or INI config text into JSON with validation.",
    url: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML/INI to JSON Converter ",
    description: "Convert TOML or INI configs to JSON locally with copy-ready output.",
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
            text: "Yes. Conversions happen in your browser; config text is not uploaded.",
          },
        },
        {
          "@type": "Question",
          name: "What formats are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "TOML and INI configuration text can be converted to JSON. Samples are provided for each.",
          },
        },
        {
          "@type": "Question",
          name: "Can I export the JSON?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can copy the JSON output or download it as a file directly.",
          },
        },
      ],
    }),
  },
};

export default function TomlIniPage() {
  return <TomlIniClient />;
}
