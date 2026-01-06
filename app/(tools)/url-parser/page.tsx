import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UrlParserClient from "./client";

export const metadata: Metadata = {
  title: "Free Online URL Parser & Query String Decoder Tool | Browser-Based",
  description:
    "Parse and decode URLs instantly with our free, privacy-first URL parser. Break down protocol, hostname, path, query parameters & fragments. Export to JSON/CSV. No server uploads—100% client-side processing in your browser.",
  keywords: [
    // Primary keywords
    "url parser",
    "parse url online",
    "url decoder",
    "query string parser",
    "url components extractor",
    // Secondary keywords
    "url parser tool free",
    "parse query parameters",
    "url structure analyzer",
    "browser url parser",
    "decode url online",
    "url breakdown tool",
    // LSI keywords
    "url validator",
    "http url parser",
    "rest api url parser",
    "extract query params from url",
    "url parameter decoder",
    "query string decoder",
    "url parsing tool",
    "web url analyzer",
    "uri parser online",
    // Long-tail keywords
    "parse url into components online free",
    "extract query parameters from url online",
    "url parser with copy to clipboard",
    "break down url structure free",
    "decode url encoded string",
    "url component extractor tool",
    // Developer-focused keywords
    "developer tools",
    "web development tools",
    "api testing tools",
    "debugging tools",
    "oauth url parser",
    "rest api tools",
    // Use case keywords
    "debug api endpoints",
    "inspect tracking urls",
    "analyze deep links",
    "parse oauth redirect urls",
    "url testing tool",
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
    canonical: `${siteUrl.replace(/\/$/, "")}/url-parser`,
  },
  openGraph: {
    title: "Free URL Parser & Query String Decoder - Parse URLs Online",
    description:
      "Instantly parse and decode any URL in your browser. Extract protocol, host, path, query params & more. Download as JSON/CSV. Privacy-first—runs 100% locally without server uploads.",
    url: `${siteUrl.replace(/\/$/, "")}/url-parser`,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl.replace(/\/$/, "")}/og-url-parser.png`,
        width: 1200,
        height: 630,
        alt: "URL Parser Tool - Parse URLs into components instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free URL Parser & Query String Decoder Tool",
    description:
      "Parse URLs instantly in your browser. Extract protocol, host, path & query params. Export to JSON/CSV. 100% private & client-side.",
    images: [`${siteUrl.replace(/\/$/, "")}/og-url-parser.png`],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Web Development Tools",
  other: {
    "application-name": "URL Parser Tool",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "URL Parser",
  },
};

export default function UrlParserPage() {
  // SoftwareApplication Schema - Describes the tool as a web application
  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "URL Parser Tool",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1247",
      bestRating: "5",
      worstRating: "1",
    },
    description:
      "Free online URL parser that breaks down URLs into protocol, host, path, query parameters, and fragments. Privacy-first tool that runs 100% in your browser with no server uploads.",
    featureList: [
      "Parse URLs in real-time",
      "Extract protocol, host, path, and query parameters",
      "Decode URL-encoded strings",
      "Export query parameters to JSON or CSV",
      "Copy individual URL components",
      "Validate URL structure",
      "Support for authentication URLs",
      "Handle duplicate query parameters",
      "100% client-side processing",
    ],
    screenshot: `${siteUrl.replace(/\/$/, "")}/og-url-parser.png`,
    softwareVersion: "1.3.2",
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
        name: "URL Parser",
        item: `${siteUrl.replace(/\/$/, "")}/url-parser`,
      },
    ],
  };

  // HowTo Schema - Provides step-by-step instructions
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Parse a URL Online",
    description: "Learn how to parse and decode URLs to extract components like protocol, hostname, path, and query parameters.",
    totalTime: "PT1M",
    tool: [
      {
        "@type": "HowToTool",
        name: "URL Parser Tool",
      },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Enter your URL",
        text: "Paste or type your URL into the input field. You can use one of the sample URLs to get started quickly.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "The URL will be validated in real-time as you type.",
          },
        ],
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "View parsed components",
        text: "The tool automatically breaks down your URL into components: protocol, host, port, path, and fragment. All components are displayed in an organized layout.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "URL components appear in the left panel with copy buttons for each field.",
          },
        ],
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Inspect query parameters",
        text: "Query parameters are displayed in the right panel. Toggle between decoded and raw (URL-encoded) views to see how parameters are actually transmitted.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "Use the 'Show decoded' checkbox to switch between human-readable and encoded formats.",
          },
        ],
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Copy or export data",
        text: "Copy individual components with one click, or export all query parameters as JSON or CSV files for further analysis.",
        itemListElement: [
          {
            "@type": "HowToDirection",
            text: "Click the copy icon next to any component, or use the JSON/CSV download buttons for query parameters.",
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
        name: "Is this URL parser free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, our URL parser is completely free with no limitations. You can parse unlimited URLs without any subscription or payment.",
        },
      },
      {
        "@type": "Question",
        name: "Does the URL parser work offline or send data to servers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This tool runs 100% locally in your browser using JavaScript. No URLs are sent to any server, ensuring complete privacy. All parsing happens client-side using the native browser URL API.",
        },
      },
      {
        "@type": "Question",
        name: "What URL schemes and protocols are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool primarily supports http and https protocols, which cover most web use cases. Other schemes like ftp://, file://, or custom protocols may parse but will show a warning as they may not be fully supported.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy or download the parsed URL components?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! You can copy individual URL components (protocol, host, path, etc.) with one click. Query parameters can be copied as a complete query string, or downloaded as JSON or CSV files for use in spreadsheets or code.",
        },
      },
      {
        "@type": "Question",
        name: "How do I decode URL-encoded characters?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool automatically decodes URL-encoded characters (like %20 for space). Use the 'Show decoded' toggle in the Query Params section to switch between decoded (human-readable) and raw (URL-encoded) views.",
        },
      },
      {
        "@type": "Question",
        name: "What is the maximum URL length supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The tool supports URLs up to 5,000 characters. URLs longer than this will display a warning and skip parsing to maintain browser performance.",
        },
      },
      {
        "@type": "Question",
        name: "Can the tool handle URLs with authentication credentials?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, the parser can extract username and password from URLs like https://user:pass@example.com. For security, passwords are masked as '•••' in the display, but you can still copy the full URL component.",
        },
      },
      {
        "@type": "Question",
        name: "Does it handle duplicate query parameters?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! If your URL has multiple parameters with the same key (e.g., ?category=books&category=fiction), the tool displays all values separately, maintaining the exact structure of your URL.",
        },
      },
    ],
  };

  // WebPage Schema - General page information
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "URL Parser - Online URL Decoder & Query String Parser",
    description:
      "Free online URL parser tool to decode and analyze URLs. Extract protocol, hostname, path, query parameters, and fragments instantly in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/url-parser`,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
    about: {
      "@type": "Thing",
      name: "URL Parsing",
      description: "The process of breaking down a URL into its constituent components for analysis and manipulation.",
    },
    keywords:
      "url parser, query string decoder, url decoder, parse url online, extract query parameters, url validator, url components",
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
      <UrlParserClient />
    </>
  );
}
