import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import IpAsnClient from "./client";

export const metadata: Metadata = {
  title: "IP / ASN Lookup ",
  description:
    "Parse IP addresses, detect IPv4/IPv6 and private ranges, and optionally fetch ASN details when a token is provided.",
  keywords: [
    "ip lookup",
    "asn lookup",
    "ipv4 checker",
    "ipv6 checker",
    "private ip",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
  },
  openGraph: {
    title: "IP / ASN Lookup ",
    description: "Validate IPs, detect private ranges, and fetch ASN info if configured.",
    url: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IP / ASN Lookup ",
    description: "Check IP version/private status; optional ASN lookup via token.",
  },
};

export default function IpAsnPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does this run locally?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IP parsing happens in your browser. ASN lookups call IPInfo only if a token is set.",
        },
      },
      {
        "@type": "Question",
        name: "What IPs are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Valid IPv4 and IPv6 addresses are supported. Private ranges are detected locally.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need a token?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A token is only needed for ASN/org/country lookup. Validation works without it.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <IpAsnClient />
    </>
  );
}
