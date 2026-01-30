import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JwtDecoderClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/jwt-decoder`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "JWT Decoder & Inspector - Decode JWS/JWE Locally",
  description:
    "Decode JWT header and payload locally to inspect claims, expiry, and token structure. Detect JWS vs JWE, export decoded data, and verify signatures optionally. No uploads.",
  keywords: [
    "jwt decoder",
    "jwt inspector",
    "decode jwt",
    "json web token",
    "jwt payload",
    "jws decoder",
    "jwe decoder",
    "jwt verifier",
    "jwt claims",
    "jwt exp checker",
    "jwt debug tool",
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
    title: "JWT Decoder & Inspector - Decode JWS/JWE Locally",
    description:
      "Decode JWTs in-browser to inspect header and payload, detect JWS/JWE, and verify signatures optionally. No server upload.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "JWT Decoder and Inspector tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Decoder & Inspector",
    description: "Decode JSON Web Tokens locally and inspect claims, expiry, and structure.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JWT Decoder",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JWT Decoder",
  },
};

export default function JwtDecoderPage() {
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
        name: "JWT Decoder",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JWT Decoder & Inspector",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Security Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Decode JWT headers and payloads locally, detect JWS vs JWE, inspect claims, and optionally verify signatures with secrets, public keys, or JWKS. No uploads.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "JWS vs JWE detection",
      "Header and payload decoding with claim inspection",
      "Optional signature verification (HS/RS/ES + JWKS)",
      "Claim lint warnings for risky patterns",
      "Diff mode for comparing tokens",
      "Share-safe redaction mode",
      "Copy/download exports (JSON, Markdown, headers)",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.2.0",
    datePublished: "2025-01-08",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1240",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Decode and Inspect a JWT",
    description: "Paste a JWT to inspect its header, payload, and signature details locally.",
    totalTime: "PT1M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste your token",
        text: "Paste a JWT into the input field. The tool detects JWS vs JWE automatically.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Inspect claims",
        text: "Review the decoded header and payload, including expiry and standard claims.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Verify or share safely",
        text: "Optionally verify signatures or enable Share-safe view before copying or exporting.",
        position: 3,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is decoding done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. JWT decoding happens in your browser; no tokens are uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Is the signature verified?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Decoding is automatic; signature verification is optional and requires a secret, public key, or JWKS.",
        },
      },
      {
        "@type": "Question",
        name: "Does it support JWE (encrypted) tokens?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It detects JWE structure and warns that payloads cannot be decoded without decryption.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download the decoded data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy header/payload or download all decoded sections as JSON.",
        },
      },
      {
        "@type": "Question",
        name: "What algorithms are supported for verification?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool supports HS256/384/512, RS256/384/512, and ES256/384/512 algorithms, plus JWKS URL verification.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "JWT Decoder & Inspector",
    url: canonical,
    description:
      "Decode JWTs locally, inspect claims, detect JWS/JWE, and optionally verify signatures without uploads.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="jwt-decoder-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="jwt-decoder-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="jwt-decoder-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="jwt-decoder-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="jwt-decoder-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <JwtDecoderClient />
    </>
  );
}
