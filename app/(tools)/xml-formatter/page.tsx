import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import XmlFormatterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/xml-formatter`;

export const metadata: Metadata = {
  title: "Free XML Formatter & Validator - Pretty Print, Minify, Diff, XPath",
  description:
    "Format, minify, and validate XML with tree-based formatting, mixed-content safety, diff view, XPath testing, and XSLT transforms. Runs locally in your browser with no uploads.",
  keywords: [
    "xml formatter",
    "xml validator",
    "pretty xml",
    "xml beautifier",
    "xml minify",
    "xml pretty print",
    "xml diff",
    "xpath tester",
    "xslt transformer",
    "format xml online",
    "xml formatter free",
    "xml viewer",
    "xml tools",
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
  alternates: { canonical },
  openGraph: {
    title: "Free XML Formatter & Validator - Pretty Print, Minify, Diff",
    description:
      "Format and validate XML with tree-based pretty printing, minify mode, diff view, XPath tests, and XSLT transforms. Runs locally with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free XML Formatter & Validator",
    description:
      "Pretty print, minify, diff, and validate XML locally in your browser. Includes XPath and XSLT tools.",
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "XML Formatter",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "XML Formatter",
  },
};

export default function XmlFormatterPage() {
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
        item: `${siteUrl.replace(/\/$/, "")}/#tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "XML Formatter",
        item: canonical,
      },
    ],
  };

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "XML Formatter & Validator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "XML Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free XML formatter and validator with tree-based pretty printing, minify mode, diff view, XPath testing, and XSLT transforms. Runs entirely in your browser with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Tree-based XML pretty printing",
      "Mixed content safe inline formatting",
      "Minify and diff view modes",
      "Namespace summary and validation stats",
      "XPath tester and XSLT transformer",
      "Upload and drag-and-drop support",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.4.0",
    datePublished: "2025-12-06",
    dateModified: "2025-12-28",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Format XML Online",
    description: "Pretty print XML, validate structure, and export clean output.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "XML Formatter & Validator",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste or upload XML",
        text: "Paste your XML, or upload an .xml/.xsd/.wsdl file using drag and drop.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose formatting options",
        text: "Pick indentation, mixed-content handling, and optional minify or diff mode.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Review output",
        text: "Copy, download, or compare the formatted XML output side by side.",
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
          text: "Yes. Parsing and formatting happen in your browser; XML is not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "What about invalid XML?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "If the XML is malformed, you will see a clear error message with the parse issue.",
        },
      },
      {
        "@type": "Question",
        name: "Can I minify XML and compare diffs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Switch to minify mode for compact output, or use diff view to compare original vs formatted XML.",
        },
      },
      {
        "@type": "Question",
        name: "Do you support XPath and XSLT?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can run XPath queries and apply XSLT transforms directly in the tool.",
        },
      },
      {
        "@type": "Question",
        name: "Can I change indentation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose spaces, tabs, or a custom indentation size.",
        },
      },
    ],
  };

  return (
    <>
      <Script id="xml-formatter-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </Script>
      <Script id="xml-formatter-software" type="application/ld+json">
        {JSON.stringify(softwareAppJsonLd)}
      </Script>
      <Script id="xml-formatter-howto" type="application/ld+json">
        {JSON.stringify(howToJsonLd)}
      </Script>
      <Script id="xml-formatter-faq" type="application/ld+json">
        {JSON.stringify(faqJsonLd)}
      </Script>
      <XmlFormatterClient />
    </>
  );
}
