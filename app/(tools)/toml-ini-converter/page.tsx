import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TomlIniClient from "./client";

export const metadata: Metadata = {
  title: "TOML/INI/JSON Converter",
  applicationName: siteName,
  description:
    "Convert TOML, INI, and JSON files between formats in your browser. Validate input and copy output.",
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
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
  keywords: [
    "toml to json",
    "ini to json",
    "json to toml",
    "json to ini",
    "toml to ini",
    "ini to toml",
    "toml parser",
    "ini parser",
    "config converter",
    "config parser",
    "toml ini converter",
    "toml ini json converter",
    "toml ini json parser",
    "convert config files",
    "developer tools",
    "configuration tools",
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
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML/INI/JSON Converter",
    description: "Convert TOML, INI, and JSON configs locally with copy-ready output.",
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "TOML/INI/JSON Converter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "TOML/INI/JSON",
  },
};

export default function TomlIniPage() {
  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TOML/INI/JSON Converter",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Convert TOML, INI, and JSON configuration files in your browser with validation, schema checks, and export options. Privacy-first and 100% client-side.",
    featureList: [
      "Convert TOML, INI, and JSON between formats",
      "Schema validation for parsed output",
      "Lossy conversion warnings for TOML ↔ INI",
      "Copy and download converted output",
      "Drag-and-drop and file upload support",
      "Diff mode to compare configurations",
      "100% client-side processing",
    ],
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };

  const breadcrumbJsonLd = {
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
        item: `${siteUrl.replace(/\/$/, "")}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "TOML/INI/JSON Converter",
        item: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
      },
    ],
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert TOML, INI, and JSON Config Files",
    description:
      "Convert configuration files between TOML, INI, and JSON formats with validation, schema checks, and export options.",
    totalTime: "PT2M",
    tool: [
      {
        "@type": "HowToTool",
        name: "TOML/INI/JSON Converter",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste or upload your config",
        text: "Paste TOML/INI/JSON into the editor or upload a file to populate the input.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose output format",
        text: "Select JSON, TOML, or INI as the output format and toggle formatting options if needed.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Copy or download",
        text: "Copy the converted output or download it with the correct extension.",
      },
    ],
  };

  const faqJsonLd = {
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
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TOML/INI/JSON Converter",
    url: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
    description:
      "Convert TOML, INI, and JSON configuration text between formats with validation, schema checks, and export options.",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  };

  return (
    <>
      <TomlIniClient />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </>
  );
}
