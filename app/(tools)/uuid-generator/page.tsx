import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidClient from "./client";

export const metadata: Metadata = {
  title: "UUID Generator | FastFormat Tools",
  description:
    "Generate v4 UUIDs instantly. Copy one or many random UUIDs for APIs, testing, and development.",
  keywords: [
    "uuid generator",
    "uuid v4",
    "random uuid",
    "generate uuid online",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/uuid-generator`,
  },
  openGraph: {
    title: "UUID Generator | FastFormat Tools",
    description: "Generate v4 UUIDs in your browser. Copy multiple IDs instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/uuid-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID Generator | FastFormat Tools",
    description: "Instant v4 UUIDs with copy-ready output.",
  },
};

export default function UuidPage() {
  return <UuidClient />;
}
