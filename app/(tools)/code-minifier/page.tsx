import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CodeMinifierClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/code-minifier`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Code Minifier & Pretty Printer - HTML, CSS, JS",
  description:
    "Minify or pretty-print HTML, CSS, and JavaScript with real engines that run locally in your browser. Batch tabs, ZIP export, and shareable links included.",
  keywords: [
    "code minifier",
    "html minifier",
    "css minifier",
    "js minifier",
    "pretty printer",
    "code formatter",
    "batch minifier",
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
    title: "Code Minifier & Pretty Printer - HTML, CSS, JS",
    description: "Minify or prettify code locally with batch tabs, ZIP export, and shareable links.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Code minifier with batch tabs, Monaco editor, and exports",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Code Minifier & Pretty Printer - HTML, CSS, JS",
    description: "Minify or prettify HTML/CSS/JS locally. Batch tabs, ZIP export, share links.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Code Minifier",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Code Minifier",
  },
};

export default function CodeMinifierPage() {
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
        name: "Code Minifier",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Code Minifier",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Code Minifier and Pretty Printer",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Minify or pretty-print HTML, CSS, and JavaScript with batch tabs, Monaco editor, ZIP export, and shareable links. Runs locally in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Minify or pretty-print HTML, CSS, and JavaScript",
      "Batch tabs with ZIP download",
      "Monaco editor with syntax highlighting",
      "Safe Mode and configurable options",
      "Shareable links and snippet library",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Minify or Pretty-Print Code",
    description: "Minify HTML/CSS/JS or pretty-print it in seconds using this browser tool.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Code Minifier",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Paste code",
        text: "Paste your HTML, CSS, or JavaScript into the editor.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Choose mode",
        text: "Select Minify or Pretty-print and adjust options like Safe Mode.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Convert",
        text: "Run the conversion and review the output and size stats.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Export",
        text: "Copy, download, or share your output.",
      },
    ],
  };

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
          text: "HTML, CSS, and JavaScript using real formatter/minifier engines that run in your browser.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support batch exports?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Enable batch mode to convert multiple tabs and download a ZIP.",
        },
      },
      {
        "@type": "Question",
        name: "Is Safe Mode recommended?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Safe Mode is on by default and reduces aggressive transforms to avoid breaking code.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Code Minifier",
    description: "Minify or pretty-print HTML/CSS/JS in the browser with batch tools and exports.",
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    breadcrumb: breadcrumbSchema,
  };

  return (
    <>
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <CodeMinifierClient />
    </>
  );
}
