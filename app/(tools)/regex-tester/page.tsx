import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import RegexTesterClient from "./client";

export const metadata: Metadata = {
  title: "Regex Tester ",
  description:
    "Test regular expressions in your browser. Toggle flags, see matches, and count occurrences instantly.",
  keywords: [
    "regex tester",
    "regular expression tester",
    "test regex online",
    "regex match",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/regex-tester`,
  },
  openGraph: {
    title: "Regex Tester ",
    description: "Test regex patterns with flags and view matches in real time.",
    url: `${siteUrl.replace(/\/$/, "")}/regex-tester`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Tester ",
    description: "Run regex against text with flags and match counts in-browser.",
  },
};

export default function RegexTesterPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is regex testing done locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Regex testing runs in your browser; text is not uploaded.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download matches?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can copy matches as text or JSON and download them as a JSON file.",
        },
      },
      {
        "@type": "Question",
        name: "Which flags are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Flags i, g, m, and s are supported with toggles in the UI.",
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
      <RegexTesterClient />
    </>
  );
}
