import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
import ResumeAnalyzerClient from "./client";

const canonical = `${siteUrl.replace(/\/$/, "")}/resume-analyzer`;
const ogImage = `${siteUrl.replace(/\/$/, "")}/logo.png`;

export const metadata: Metadata = {
  title: "Resume Analyzer & ATS Match Checker - Free Online Resume Scan",
  description:
    "Analyze your resume for ATS-friendly keywords, match score, bullet quality, and section coverage. Compare against a job description, get targeted fixes, and keep everything private in your browser.",
  keywords: [
    "resume analyzer",
    "ats resume checker",
    "resume match score",
    "resume keyword scan",
    "resume keyword checker",
    "job description match",
    "resume optimization tool",
    "resume bullet analysis",
    "resume readability",
    "resume section checklist",
    "resume skills gap",
    "resume ats scan free",
    "resume analyzer online",
    "resume parser checker",
    "ats friendly resume",
    "resume improvement tips",
    "resume quality checker",
    "resume formatting checker",
    "resume scanner free",
    "privacy resume analyzer",
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
    title: "Resume Analyzer & ATS Match Checker - Free Online Resume Scan",
    description:
      "Check ATS readiness with keyword matching, bullet quality scoring, and section coverage. Compare with a job description and get targeted fixes. Private, browser-only analysis.",
    url: canonical,
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Resume Analyzer with ATS match checking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume Analyzer & ATS Match Checker",
    description:
      "Scan your resume for ATS match score, keyword gaps, and bullet quality. Compare against a job description and fix fast.",
    images: [ogImage],
    creator: "@ToolStack",
    site: "@ToolStack",
  },
  category: "Career Tools",
  other: {
    "application-name": "Resume Analyzer",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Resume Analyzer",
  },
};

export default function ResumeAnalyzerPage() {
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
        name: "Resume Analyzer",
        item: canonical,
      },
    ],
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Resume Analyzer & ATS Match Checker",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Career Optimization",
    operatingSystem: "Any (Web Browser)",
    url: canonical,
    description:
      "Free online resume analyzer with ATS-style matching, section checks, and bullet quality scoring. Compare your resume to a job description and get targeted fixes, all in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "ATS-style keyword matching with section weighting",
      "Resume-to-job description comparison",
      "Bullet quality scoring and measurability checks",
      "Missing skill guidance with suggested insert locations",
      "Role-specific presets for scoring",
      "Privacy mode with email/phone/link redaction",
      "PDF/DOCX/TXT parsing with per-page progress",
      "One-page PDF report export",
    ],
    browserRequirements: "Chrome 90+, Firefox 88+, Safari 14+, Edge 90+",
    softwareVersion: "1.0.0",
    datePublished: "2025-12-20",
    dateModified: "2026-01-30",
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "2300",
      bestRating: "5",
      worstRating: "1",
    },
    screenshot: ogImage,
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Check Your Resume Against a Job Description",
    description: "Step-by-step guide to analyze a resume for ATS readiness and keyword coverage.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Paste your resume",
        text: "Paste your resume text or upload a PDF/DOCX/TXT file for analysis.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Add the job description",
        text: "Paste the job description to compare keywords and match score.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Review missing skills",
        text: "Check missing terms, suggested insert locations, and cluster recommendations.",
        position: 3,
      },
      {
        "@type": "HowToStep",
        name: "Improve bullets",
        text: "Use tailored bullet templates to strengthen impact and measurability.",
        position: 4,
      },
      {
        "@type": "HowToStep",
        name: "Export a report",
        text: "Download the one-page PDF report or copy insights.",
        position: 5,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this resume analyzer private?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Analysis runs locally in your browser. Your resume data is not uploaded to any server.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work with scanned PDFs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Text extraction works for text-based PDFs. If the resume is scanned, the tool will warn that little text was detected.",
        },
      },
      {
        "@type": "Question",
        name: "What file types are supported?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PDF, DOCX, and plain text files are supported.",
        },
      },
      {
        "@type": "Question",
        name: "How is the match score calculated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The score uses weighted keyword matching with section weighting and exact/alias matches against the job description.",
        },
      },
      {
        "@type": "Question",
        name: "Can I redact personal information before sharing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Use Privacy mode to redact emails, phone numbers, and links from your resume before exporting the report.",
        },
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Resume Analyzer & ATS Match Checker",
    url: canonical,
    description:
      "Analyze resume quality, ATS match score, and keyword gaps with privacy-first, in-browser processing.",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl.replace(/\/$/, ""),
    },
  };

  return (
    <>
      <Script id="resume-analyzer-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="resume-analyzer-software" type="application/ld+json">
        {JSON.stringify(softwareAppSchema)}
      </Script>
      <Script id="resume-analyzer-howto" type="application/ld+json">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="resume-analyzer-faq" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>
      <Script id="resume-analyzer-webpage" type="application/ld+json">
        {JSON.stringify(webPageSchema)}
      </Script>
      <ResumeAnalyzerClient />
    </>
  );
}
