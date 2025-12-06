import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import PasswordGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "Password Generator | ToolStack",
  description:
    "Generate strong passwords with customizable length and character sets. Copy instantly—no storage or tracking.",
  keywords: [
    "password generator",
    "strong password",
    "secure password",
    "random password generator",
    "create password",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/password-generator`,
  },
  openGraph: {
    title: "Password Generator | ToolStack",
    description: "Create strong passwords with custom rules and copy instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/password-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Password Generator | ToolStack",
    description: "Generate strong, random passwords in your browser—no tracking.",
  },
};

export default function PasswordGeneratorPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are passwords generated locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Passwords are generated in your browser; nothing is sent to a server.",
        },
      },
      {
        "@type": "Question",
        name: "Can I control the character sets and length?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can pick length 6–64, toggle lowercase/uppercase/numbers/symbols, and use quick presets.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a strength indicator?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. An entropy-based strength label updates as you adjust length and character sets.",
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
      <PasswordGeneratorClient />
    </>
  );
}
