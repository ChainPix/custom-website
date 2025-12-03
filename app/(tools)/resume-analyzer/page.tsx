import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ResumeAnalyzerClient from "./client";

export const metadata: Metadata = {
  title: "Resume Analyzer | FastFormat Tools",
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
    title: "Resume Analyzer | FastFormat Tools",
    description:
      "ATS-friendly resume analyzer that checks keywords, word count, and readability. Fast and free in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/resume-analyzer`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume Analyzer | FastFormat Tools",
    description:
      "Free resume keyword checker for ATS. Instantly view word counts, bullets, and top keywords.",
  },
};

export default function ResumeAnalyzerPage() {
  return <ResumeAnalyzerClient />;
}
