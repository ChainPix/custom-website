import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
import TomlYamlClient from "./client";

export const metadata: Metadata = {
  title: "TOML ⇄ YAML Converter | ToolStack",
  description:
    "Free online TOML to YAML and YAML to TOML converter with validation, sorting, and quick copy/download options.",
  keywords: [
    "toml to yaml",
    "yaml to toml",
    "convert toml",
    "convert yaml",
    "config converter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/toml-yaml`,
  },
  openGraph: {
    title: "TOML ⇄ YAML Converter | ToolStack",
    description:
      "Bidirectional TOML/YAML converter with validation, sorting, and copy-ready output. Free, fast, and runs in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/toml-yaml`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML ⇄ YAML Converter | ToolStack",
    description:
      "Convert TOML to YAML or YAML to TOML with validation, sorting, and indentation controls for clean configs.",
  },
};

export default function TomlYamlPage() {
  const canonical = `${siteUrl.replace(/\/$/, "")}/toml-yaml`;
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When should I use TOML vs YAML?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TOML is often used for tooling configs (e.g., Rust, Python), YAML is common for CI/CD and infra. Convert based on your ecosystem.",
        },
      },
      {
        "@type": "Question",
        name: "Is this converter private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything runs in your browser; files are not uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Why do arrays fail to convert?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TOML does not allow mixed arrays or null/undefined values. Ensure arrays are uniform and contain valid values.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="ld-json-toml-yaml-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <TomlYamlClient />
    </>
  );
}
