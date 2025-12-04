import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TimestampConverterClient from "./client";

export const metadata: Metadata = {
  title: "Timestamp Converter | ToolStack",
  description:
    "Convert Unix timestamps to readable dates and back. Supports seconds or milliseconds with time zone context.",
  keywords: [
    "timestamp converter",
    "unix to date",
    "epoch converter",
    "date to timestamp",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/timestamp-converter`,
  },
  openGraph: {
    title: "Timestamp Converter | ToolStack",
    description: "Convert Unix timestamps to human dates and back, including seconds or milliseconds.",
    url: `${siteUrl.replace(/\/$/, "")}/timestamp-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timestamp Converter | ToolStack",
    description: "Quickly convert between epoch timestamps and readable date/time.",
  },
};

export default function TimestampConverterPage() {
  return <TimestampConverterClient />;
}
