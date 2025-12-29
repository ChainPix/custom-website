import type { Metadata } from "next";
import Script from "next/script";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JwtGeneratorClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/jwt-generator`;

export const metadata: Metadata = {
  title: "JWT Generator & Verifier - HS/RS/ES/EdDSA + JWKS",
  description:
    "Generate, sign, decode, and verify JWTs with HS/RS/ES algorithms and EdDSA. Import/export JWKS or PEM keys, inspect tokens, and keep everything local with no uploads.",
  keywords: [
    "jwt generator",
    "jwt verifier",
    "jwt signer",
    "jwks",
    "jwk import",
    "jwt decode",
    "hs256 jwt",
    "hs384 jwt",
    "hs512 jwt",
    "rs256 jwt",
    "rs384 jwt",
    "rs512 jwt",
    "es256 jwt",
    "es384 jwt",
    "es512 jwt",
    "eddsa jwt",
    "jwt signer",
    "json web token",
    "jwt inspection",
    "jwt token tool",
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
    title: "JWT Generator & Verifier - HS/RS/ES/EdDSA + JWKS",
    description: "Sign, decode, and verify JWTs with HS/RS/ES/EdDSA. Runs locally with no uploads.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Generator & Verifier - HS/RS/ES/EdDSA + JWKS",
    description: "Create, inspect, and verify JWTs locally. Supports JWKS and PEM keys.",
  },
  category: "Developer Tools",
  other: {
    "application-name": "JWT Generator",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "JWT Generator",
  },
};

export default function JwtGeneratorPage() {
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
        name: "JWT Generator",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JWT Generator & Verifier",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Security Utility",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Generate, sign, decode, and verify JWTs with HS/RS/ES algorithms and EdDSA. Import/export JWKS or PEM keys, inspect tokens, and keep everything local.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "HS/RS/ES (256/384/512) and EdDSA signing",
      "JWT verification with secrets or public keys",
      "JWKS and PEM import/export workflows",
      "Claims builder with time helpers",
      "Token inspector and segment copy",
      "Client-side processing with no uploads",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Generate and Verify a JWT",
    description: "Build a payload, sign a JWT, and verify its signature locally.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Prepare payload",
        text: "Paste or edit a JSON payload and optionally set standard claims.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Select algorithm and key",
        text: "Choose HS/RS/ES/EdDSA and provide a secret or import a JWKS/PEM key.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Generate token",
        text: "Sign the JWT and copy the token or export it for your workflow.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Verify signature",
        text: "Paste a token into the verify panel and confirm signature validity.",
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
        name: "Does JWT generation run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Tokens are generated in your browser and never uploaded to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which algorithms are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "HS/RS/ES (256/384/512) and EdDSA, depending on browser support.",
        },
      },
      {
        "@type": "Question",
        name: "Can I import JWKS or PEM keys?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Import/export JWKS and PEM keys to sign or verify tokens.",
        },
      },
      {
        "@type": "Question",
        name: "Do you store secrets?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The default mode does not persist secrets; you can clear secrets anytime.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "JWT Generator & Verifier",
    url: canonical,
    description:
      "Create, inspect, and verify JWTs locally with HS/RS/ES/EdDSA support and JWKS/PEM workflows.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="jwt-generator-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="jwt-generator-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="jwt-generator-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="jwt-generator-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="jwt-generator-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <JwtGeneratorClient />
    </>
  );
}
