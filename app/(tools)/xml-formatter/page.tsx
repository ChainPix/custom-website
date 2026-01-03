import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import XmlFormatterClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/xml-formatter`;

export const metadata: Metadata = {
  title: "XML Formatter & Validator",
  description: "Beautify and validate XML with indentation options directly in your browser. Copy or download clean XML.",
  keywords: ["xml formatter", "xml validator", "beautify xml", "pretty xml", "xml tools"],
  alternates: { canonical },
  openGraph: {
    title: "XML Formatter & Validator",
    description: "Beautify and validate XML with indentation options directly in your browser.",
    url: canonical,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XML Formatter & Validator",
    description: "Format and validate XML in your browser. No uploads.",
  },
};

export default function XmlFormatterPage() {
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
        name: "Can I change indentation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Choose 2 or 4 spaces before formatting.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <XmlFormatterClient />
    </>
  );
}
