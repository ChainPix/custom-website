import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import PasswordGeneratorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/password-generator`;

export const metadata: Metadata = {
  title: "Password Generator - Secure Passwords & Passphrases",
  description:
    "Generate secure passwords and passphrases with cryptographic randomness, strict rules, strength analysis, and bulk export. Runs locally in your browser with no storage or logging.",
  keywords: [
    "password generator",
    "strong password",
    "secure password",
    "random password generator",
    "passphrase generator",
    "password length 2025",
    "password vs passphrase",
    "entropy password",
    "zxcvbn strength",
    "bulk password generator",
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
    title: "Password Generator - Secure Passwords & Passphrases",
    description:
      "Create strong passwords and passphrases with strict rules, strength scoring, and bulk export. 100% client-side.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Password Generator - Secure Passwords & Passphrases",
    description:
      "Generate strong passwords locally with cryptographic randomness, strength scoring, and passphrase mode.",
  },
  category: "Security Tools",
  other: {
    "application-name": "Password Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Password Generator",
  },
};

export default function PasswordGeneratorPage() {
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
        name: "Password Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Password Generator",
    applicationCategory: "SecurityApplication",
    applicationSubCategory: "Password Generator",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free password generator with cryptographically secure randomness, strict set guarantees, passphrase mode, zxcvbn strength analysis, and bulk export. Runs locally in your browser with no storage or logging.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Cryptographically secure randomness (Web Crypto API)",
      "Strict mode to include each selected character set",
      "Passphrase generator with separators and capitalization",
      "Strength scoring with crack time estimates",
      "Bulk password generation and export",
      "Session-only history with click-to-copy",
      "Client-side processing with no storage",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.4.0",
    datePublished: "2025-12-09",
    dateModified: "2025-12-27",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate a Secure Password",
    description: "Create strong passwords or passphrases with strict rules and strength analysis.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Choose password or passphrase mode",
        text: "Switch between Password or Passphrase mode based on your needs.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Set length or word count",
        text: "Pick a length for passwords or a word count for passphrases.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Configure rules",
        text: "Enable strict mode, symbols, or separators and capitalization.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Generate and copy",
        text: "Generate, review the strength estimate, and copy or export.",
        position: 4,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are passwords generated locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Passwords and passphrases are generated in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "How long should a password be in 2025?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use 14-16 characters for most accounts and 20+ for high-value or admin accounts. Longer is better than adding more symbols.",
        },
      },
      {
        "@type": "Question",
        name: "Password vs passphrase: which is better?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Passphrases are easier to remember and can be longer. Passwords are compact and work well for systems with strict length limits.",
        },
      },
      {
        "@type": "Question",
        name: "Can I control the character sets and length?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose length 6-64, toggle lowercase/uppercase/numbers/symbols, and enable strict mode.",
        },
      },
      {
        "@type": "Question",
        name: "Can I generate multiple passwords at once?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Bulk generation supports 10, 50, or 100 items with TXT, CSV, or JSON export.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Password Generator - Secure Passwords & Passphrases",
    description: "Generate strong passwords and passphrases with strict rules, strength scoring, and bulk export.",
    url: canonical,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    about: {
      "@type": "Thing",
      name: "Password Security",
      description: "Best practices for generating strong, unique passwords and passphrases.",
    },
    keywords: "password generator, passphrase generator, password length 2025, password vs passphrase, entropy",
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
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="webpage-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <PasswordGeneratorClient />
    </>
  );
}
