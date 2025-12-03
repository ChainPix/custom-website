import type { Metadata } from "next";
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
    canonical: "/resume-analyzer",
  },
};

export default function ResumeAnalyzerPage() {
  return <ResumeAnalyzerClient />;
}
