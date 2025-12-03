import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import RegexTesterClient from "./client";

export const metadata: Metadata = {
  title: "Regex Tester | FastFormat Tools",
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
    title: "Regex Tester | FastFormat Tools",
    description: "Test regex patterns with flags and view matches in real time.",
    url: `${siteUrl.replace(/\/$/, "")}/regex-tester`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regex Tester | FastFormat Tools",
    description: "Run regex against text with flags and match counts in-browser.",
  },
};

export default function RegexTesterPage() {
  return <RegexTesterClient />;
}
