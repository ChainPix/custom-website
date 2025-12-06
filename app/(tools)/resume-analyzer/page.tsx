import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import Script from "next/script";
import ResumeAnalyzerClient from "./client";

export const metadata: Metadata = {
  title: "Resume Analyzer | ToolStack",
  description:
    "Free resume analyzer to check keywords, word counts, bullet points, and reading time. Optimize for ATS and recruiters instantly.",
  keywords: [
    "resume analyzer",
    "resume keyword checker",
    "ats resume scan",
    "resume word count",
    "resume readability",
    "free resume tool",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/resume-analyzer`,
  },
  openGraph: {
    title: "Resume Analyzer | ToolStack",
    description:
      "ATS-friendly resume analyzer that checks keywords, word count, and readability. Fast and free in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/resume-analyzer`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume Analyzer | ToolStack",
    description:
      "Free resume keyword checker for ATS. Instantly view word counts, bullets, and top keywords.",
  },
};

export default function ResumeAnalyzerPage() {
  const canonical = `${siteUrl.replace(/\/$/, "")}/resume-analyzer`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Resume Analyzer",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: canonical,
    description:
      "Free resume analyzer to check keywords, word counts, bullet points, and reading time. Optimize for ATS and recruiters instantly.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <Script id="ld-json-resume-analyzer" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ResumeAnalyzerClient />
    </>
  );
}
