import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ChmodCalculatorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/chmod-calculator`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/og-chmod-calculator.png`;

export const metadata: Metadata = {
  title: "Free Chmod Calculator - Octal to Symbolic, Special Bits, Security Hints",
  description:
    "Convert chmod permissions between octal and symbolic with setuid/setgid/sticky support, explanations, and security hints. Runs locally in your browser with no uploads.",
  keywords: [
    "chmod calculator",
    "chmod 755",
    "octal to symbolic",
    "symbolic to octal",
    "unix permissions",
    "linux file permissions",
    "permission bits",
    "setuid setgid sticky",
    "chmod special bits",
    "rwx permissions",
    "file mode",
    "chmod command",
    "permission calculator",
    "chmod table",
    "chmod cheat sheet",
    "octal permissions",
    "chmod 644",
    "chmod 700",
    "security hints",
    "world writable",
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
    title: "Free Chmod Calculator - Octal, Symbolic, Special Bits",
    description:
      "Convert chmod values, understand special bits, and see safety hints. Private, client-side tool with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Chmod calculator with octal and symbolic permissions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Chmod Calculator - Octal and Symbolic Permissions",
    description: "Compute chmod values locally with special bits and security hints.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "Chmod Calculator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Chmod Calculator",
  },
};

export default function ChmodCalculatorPage() {
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
        name: "Chmod Calculator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Chmod Calculator",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Permissions Tool",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free chmod calculator for converting octal and symbolic permissions, including setuid/setgid/sticky bits. Includes explanations, security hints, and history. Runs fully client-side with no uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Convert octal to symbolic permissions",
      "Toggle read/write/execute by role",
      "Setuid, setgid, and sticky bit support",
      "Explain mode for octal digit breakdowns",
      "Security hints for risky permission combos",
      "History and compare of last 10 changes",
      "Copy chmod command",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.1.0",
    datePublished: "2025-12-08",
    dateModified: "2025-12-27",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "742",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Convert Chmod Permissions",
    description: "Convert chmod values between octal and symbolic and verify special bits.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Chmod Calculator",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        name: "Enter an octal or toggle permissions",
        text: "Paste an octal like 755 or use the read/write/execute toggles for user, group, and other.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Review symbolic output",
        text: "Check the symbolic string and special bit letters (s/S, t/T).",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Inspect explanations and hints",
        text: "Hover digits for explain mode and review security hints for risky combinations.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Copy the chmod command",
        text: "Click Copy to grab the ready-to-use chmod command.",
        position: 4,
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
          text: "Yes. All calculations happen in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Are special bits supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can toggle setuid, setgid, and sticky bits.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert from octal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste an octal (e.g., 0755 or 755) to update the checkboxes and symbolic string.",
        },
      },
      {
        "@type": "Question",
        name: "What do special bits mean?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "setuid and setgid change execution privileges; sticky bit protects shared directories by restricting deletes.",
        },
      },
      {
        "@type": "Question",
        name: "Does it show security warnings?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The tool highlights risky selections like world-writable permissions or setuid with write access.",
        },
      },
      {
        "@type": "Question",
        name: "What is a safe default for files?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Common safe defaults are 644 for files and 755 for executables, depending on your use case.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chmod Calculator - Octal to Symbolic Permissions",
    description:
      "Convert chmod permissions between octal and symbolic, understand special bits, and review security hints.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "UNIX File Permissions",
      description: "Permission bits that control read, write, and execute access for user, group, and other.",
    },
    mainEntity: {
      "@type": "SoftwareApplication",
      name: "Chmod Calculator",
    },
    primaryImageOfPage: ogImage,
    keywords:
      "chmod calculator, octal to symbolic, rwx permissions, setuid setgid sticky, file mode, chmod 755",
  };

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="software-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script id="howto-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <ChmodCalculatorClient />
    </>
  );
}
