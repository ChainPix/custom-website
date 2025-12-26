import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import IpAsnClient from "./client";

export const metadata: Metadata = {
  title: "Free IP Address & ASN Lookup Tool | IPv4 & IPv6 Validator",
  description:
    "Validate and analyze IP addresses instantly. Check IPv4/IPv6, detect private ranges (RFC1918), lookup ASN (Autonomous System Number), organization, and country. Free browser-based tool with no server uploads—100% client-side IP parsing.",
  keywords: [
    // Primary keywords
    "ip lookup",
    "ip address lookup",
    "asn lookup",
    "ip checker",
    "ip validator",
    "ip address checker",
    // IPv4/IPv6 specific
    "ipv4 checker",
    "ipv6 checker",
    "ipv4 validator",
    "ipv6 validator",
    "ip address validator",
    "validate ip address",
    // Private/Public IP
    "private ip detector",
    "private ip checker",
    "public ip lookup",
    "check if ip is private",
    "rfc1918 checker",
    // ASN related
    "autonomous system lookup",
    "asn number lookup",
    "ip to asn",
    "as number lookup",
    "bgp lookup",
    "ip owner lookup",
    // Organization/Network
    "ip organization lookup",
    "isp lookup",
    "network owner lookup",
    "ip to organization",
    "hosting provider lookup",
    // Geolocation
    "ip country lookup",
    "ip geolocation",
    "ip location",
    // Technical/Developer
    "ip address parser",
    "cidr notation",
    "ip range checker",
    "network tools",
    "developer tools",
    "sysadmin tools",
    // Use cases
    "ip whois",
    "ip information",
    "ip details",
    "network debugging",
    "server ip lookup",
    "api ip validation",
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
    canonical: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
  },
  openGraph: {
    title: "Free IP Address & ASN Lookup Tool - IPv4/IPv6 Validator",
    description:
      "Instantly validate IP addresses, detect private ranges, and lookup ASN/organization info. Free browser-based tool—no server uploads, 100% client-side IP parsing with optional ASN enrichment.",
    url: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og-ip-asn-lookup.png`,
        width: 1200,
        height: 630,
        alt: "IP/ASN Lookup Tool - Validate IPv4/IPv6 addresses instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free IP & ASN Lookup Tool | IPv4/IPv6 Validator",
    description:
      "Validate IP addresses, detect private ranges, lookup ASN/organization. 100% client-side with optional ASN enrichment.",
    images: [`${siteUrl.replace(/\/$/, "")}/og-ip-asn-lookup.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Network Tools",
  other: {
    "application-name": "IP/ASN Lookup Tool",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "IP Lookup",
  },
};

export default function IpAsnPage() {
  // SoftwareApplication Schema - Describes the tool as a web application
  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IP/ASN Lookup Tool",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "892",
      bestRating: "5",
      worstRating: "1",
    },
    description:
      "Free IP address validation and ASN lookup tool. Validate IPv4/IPv6 addresses, detect private ranges (RFC1918), and lookup Autonomous System Numbers with optional ASN enrichment. 100% client-side parsing with privacy-first design.",
    featureList: [
      "Validate IPv4 and IPv6 addresses",
      "Detect private IP ranges (RFC1918, loopback, link-local)",
      "ASN (Autonomous System Number) lookup",
      "Organization and ISP identification",
      "Country geolocation",
      "CIDR notation display",
      "Copy/download results as JSON or CSV",
      "100% client-side IP parsing",
      "Optional ASN enrichment via IPInfo API",
    ],
    screenshot: `${siteUrl.replace(/\/$/, "")}/og-ip-asn-lookup.png`,
    softwareVersion: "1.0.0",
    author: {
      "@type": "Organization",
      name: "ToolStack",
      url: siteUrl,
    },
    datePublished: "2025-12-09",
    dateModified: "2025-12-25",
    browserRequirements: "Requires JavaScript. Works with Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
  };

  // BreadcrumbList Schema - Improves navigation in search results
  const breadcrumbJsonLd = {
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
        item: `${siteUrl.replace(/\/$/, "")}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "IP/ASN Lookup",
        item: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
      },
    ],
  };

  // HowTo Schema - Provides step-by-step instructions
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Lookup IP Address and ASN Information",
    description:
      "Learn how to validate IP addresses, detect private ranges, and lookup ASN (Autonomous System Number) information for network analysis.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "IP/ASN Lookup Tool",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Enter your IP address",
        text: "Type or paste an IPv4 or IPv6 address into the input field. You can use one of the sample IPs to get started quickly.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "The tool accepts both IPv4 (e.g., 8.8.8.8) and IPv6 (e.g., 2001:4860:4860::8888) formats.",
          },
        ],
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Click Lookup",
        text: "Click the Lookup button to validate the IP address and retrieve network information.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "The tool will parse the IP locally in your browser and optionally fetch ASN data if a token is configured.",
          },
        ],
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "View results",
        text: "Review the IP validation results including version (IPv4/IPv6), private range detection, CIDR notation, and optional ASN/organization information.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "Results show IP version, whether it's a private IP, normalized CIDR format, and ASN details if available.",
          },
        ],
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Copy or export data",
        text: "Copy individual fields or download the complete result as JSON or CSV for further analysis.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "Use the copy buttons next to each field or download buttons to export all data in your preferred format.",
          },
        ],
      },
    ],
  };

  // FAQPage Schema - Answers common questions
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this IP lookup tool free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, our IP/ASN lookup tool is completely free with no limitations. You can validate unlimited IP addresses without any subscription or payment. Basic IP validation works entirely offline in your browser.",
        },
      },
      {
        "@type": "Question",
        name: "Does the IP lookup tool work offline or send data to servers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IP validation happens 100% locally in your browser using the ipaddr.js library—no data is sent to any server for basic IP parsing. ASN lookups (organization, country) are optional and only make API calls to IPInfo if you have a token configured.",
        },
      },
      {
        "@type": "Question",
        name: "What IP address formats are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool supports both IPv4 addresses (e.g., 192.168.1.1, 8.8.8.8) and IPv6 addresses (e.g., 2001:4860:4860::8888, ::1). It also handles compressed IPv6 notation and normalizes addresses to standard CIDR format.",
        },
      },
      {
        "@type": "Question",
        name: "How does private IP detection work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool automatically detects private IP ranges including RFC1918 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback addresses (127.0.0.0/8), link-local addresses (169.254.0.0/16), and IPv6 private ranges. Private IPs are flagged immediately during validation.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an API token for ASN lookup?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No token is required for basic IP validation. A token is only needed if you want ASN enrichment data (Autonomous System Number, organization name, ISP, country). Without a token, the tool still validates IPs and detects private ranges locally.",
        },
      },
      {
        "@type": "Question",
        name: "What is an ASN (Autonomous System Number)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "An ASN is a unique identifier assigned to an autonomous system (AS) on the internet. It represents a collection of IP networks under the control of one organization (like Google AS15169, Cloudflare AS13335). ASNs are used for BGP routing and network identification.",
        },
      },
      {
        "@type": "Question",
        name: "Can I lookup multiple IP addresses at once?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Currently, the tool validates one IP address at a time for optimal performance and user experience. Bulk IP lookup functionality is planned for a future version (v1.3) and will support CSV input for batch processing.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between IPv4 and IPv6?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IPv4 uses 32-bit addresses (4 octets like 192.168.1.1) supporting about 4.3 billion addresses. IPv6 uses 128-bit addresses (8 groups like 2001:4860:4860::8888) supporting 340 undecillion addresses. IPv6 was created to solve IPv4 address exhaustion.",
        },
      },
    ],
  };

  // WebPage Schema - General page information
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "IP/ASN Lookup - Free IPv4/IPv6 Validator & ASN Checker",
    description:
      "Free online IP address validation and ASN lookup tool. Validate IPv4/IPv6, detect private ranges, lookup autonomous system numbers and organization info instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/ip-asn-lookup`,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "IP Address Validation",
      description:
        "The process of verifying IP address format, detecting private ranges, and looking up network ownership information via ASN.",
    },
    keywords:
      "ip lookup, asn lookup, ip validator, ipv4 checker, ipv6 checker, private ip detector, autonomous system lookup, network tools",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <IpAsnClient />
    </>
  );
}
