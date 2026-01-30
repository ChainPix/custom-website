import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TomlYamlClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/toml-yaml`;

export const metadata: Metadata = {
  title: "TOML ⇄ YAML Converter - Validate, Sort, Diff, and Copy Configs",
  description:
    "Convert TOML to YAML or YAML to TOML with validation, presets, diff view, and privacy-first client-side processing.",
  keywords: [
    "toml to yaml",
    "yaml to toml",
    "convert toml",
    "convert yaml",
    "toml yaml converter",
    "config converter",
    "yaml formatter",
    "toml formatter",
    "toml yaml diff",
    "config converter",
    "developer tools",
  ],
  authors: [{ name: "ToolStack Development Team" }],
  creator: "ToolStack",
  publisher: "ToolStack",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical,
  },
  openGraph: {
    title: "TOML ⇄ YAML Converter - Validate, Sort, Diff, and Copy",
    description:
      "Bidirectional TOML/YAML converter with validation, presets, diff view, and copy-ready output. Runs locally in your browser.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML ⇄ YAML Converter - Validate, Sort, Diff",
    description:
      "Convert TOML to YAML or YAML to TOML with validation, presets, diff view, and privacy-first processing.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "TOML ⇄ YAML Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "TOML ⇄ YAML",
  },
};

export default function TomlYamlPage() {
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
          text: "Strict TOML disallows mixed arrays and null/undefined values. Use uniform arrays or enable Basic TOML mode to normalize mixed arrays.",
        },
      },
      {
        "@type": "Question",
        name: "Does the converter keep key order stable?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use the Stable sorted preset to sort keys consistently across conversions.",
        },
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl.replace(/\/$/, ""),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tools",
        item: `${siteUrl.replace(/\/$/, "")}/#tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "TOML ⇄ YAML Converter",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TOML ⇄ YAML Converter",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Configuration Converter",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Convert TOML and YAML with validation, presets, diff view, and copy variants. Runs locally in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Bidirectional TOML ↔ YAML conversion with validation",
      "Format presets and stable sorting",
      "Diff view and swap workflow",
      "Copy variants for minified and escaped output",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert TOML to YAML (and back)",
    description: "Paste your config, choose a preset, and export or copy the converted result.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "TOML ⇄ YAML Converter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Paste your config",
        text: "Paste TOML or YAML into the input editor.",
      },
      {
        "@type": "HowToStep",
        name: "Choose options",
        text: "Select a preset, schema mode, and sorting options if needed.",
      },
      {
        "@type": "HowToStep",
        name: "Convert and copy",
        text: "Convert, review the diff, and copy or download the output.",
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TOML ⇄ YAML Converter",
    url: canonical,
    description:
      "Convert TOML and YAML with validation, presets, and privacy-first client-side processing.",
    inLanguage: "en-US",
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <Script id="toml-yaml-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="toml-yaml-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script id="toml-yaml-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="toml-yaml-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Script id="toml-yaml-webpage" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <TomlYamlClient />
    </>
  );
}
