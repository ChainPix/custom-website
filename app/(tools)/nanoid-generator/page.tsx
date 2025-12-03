import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import NanoIdClient from "./client";

export const metadata: Metadata = {
  title: "NanoID Generator | FastFormat Tools",
  description:
    "Generate short, URL-safe IDs with customizable length and alphabet. Copy-ready output for tokens and slugs.",
  keywords: [
    "nanoid generator",
    "short id",
    "random id",
    "generate unique id",
    "url safe id",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/nanoid-generator`,
  },
  openGraph: {
    title: "NanoID Generator | FastFormat Tools",
    description: "Create short, URL-safe NanoIDs with custom length and alphabet in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/nanoid-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NanoID Generator | FastFormat Tools",
    description: "Generate short IDs with custom settings and copy instantly.",
  },
};

export default function NanoIdGeneratorPage() {
  return <NanoIdClient />;
}
