import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import UuidAdvancedClient from "./client";

export const metadata: Metadata = {
  title: "UUID v1/v5 Generator | FastFormat Tools",
  description:
    "Generate UUID v1, v4, or v5 (namespace/name) in your browser. Copy single or bulk IDs instantly.",
  keywords: [
    "uuid v1",
    "uuid v5",
    "uuid generator",
    "namespace uuid",
    "random uuid",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/uuid-advanced`,
  },
  openGraph: {
    title: "UUID v1/v5 Generator | FastFormat Tools",
    description: "Create UUID v1, v4, or v5 with namespace/name support. Copy outputs quickly.",
    url: `${siteUrl.replace(/\/$/, "")}/uuid-advanced`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UUID v1/v5 Generator | FastFormat Tools",
    description: "Generate namespace-based v5 UUIDs or time-based v1 in your browser.",
  },
};

export default function UuidAdvancedPage() {
  return <UuidAdvancedClient />;
}
