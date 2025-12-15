import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JwtGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "JWT Generator (HS256) ",
  description:
    "Generate and decode HS256 JWTs in your browser. Provide payload and secret to create tokens safely.",
  keywords: [
    "jwt generator",
    "hs256 jwt",
    "jwt signer",
    "jwt encode",
    "json web token",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/jwt-generator`,
  },
  openGraph: {
    title: "JWT Generator (HS256) ",
    description: "Sign and decode JWTs locally using HS256. No server upload.",
    url: `${siteUrl.replace(/\/$/, "")}/jwt-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Generator (HS256) ",
    description: "Create and decode JWTs locally; input payload and secret to sign tokens.",
  },
};

export default function JwtGeneratorPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does JWT generation run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Tokens are generated in your browser using HS256; secrets are not sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Which algorithm is used?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "HS256 (HMAC-SHA256). For production, use strong secrets and consider RS/ES algos.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download parts of the JWT?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy or download the signed token, header, and payload JSON.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <JwtGeneratorClient />
    </>
  );
}
