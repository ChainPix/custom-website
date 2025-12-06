import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JwtDecoderClient from "./client";

export const metadata: Metadata = {
  title: "JWT Decoder | ToolStack",
  description:
    "Decode JWT header and payload instantly without verifying the signature. Inspect claims and expiry in your browser.",
  keywords: [
    "jwt decoder",
    "decode jwt",
    "json web token",
    "jwt payload",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/jwt-decoder`,
  },
  openGraph: {
    title: "JWT Decoder | ToolStack",
    description: "Decode JWTs in-browser to inspect header and payload. No server upload.",
    url: `${siteUrl.replace(/\/$/, "")}/jwt-decoder`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Decoder | ToolStack",
    description: "Decode JSON Web Tokens and view claims instantly in your browser.",
  },
};

export default function JwtDecoderPage() {
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
          text: "No. The tool decodes header and payload only. Do not paste sensitive production tokens.",
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
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <JwtDecoderClient />
    </>
  );
}
