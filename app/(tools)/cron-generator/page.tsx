import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "Cron Expression Generator | FastFormat Tools",
  description:
    "Build cron expressions with a simple UI. See the generated cron string and human-friendly schedule.",
  keywords: [
    "cron generator",
    "cron builder",
    "cron expression",
    "schedule cron",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/cron-generator`,
  },
  openGraph: {
    title: "Cron Expression Generator | FastFormat Tools",
    description: "Create cron expressions using pickers and see a readable summary.",
    url: `${siteUrl.replace(/\/$/, "")}/cron-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Expression Generator | FastFormat Tools",
    description: "Generate cron strings visually with human-readable descriptions.",
  },
};

export default function CronGeneratorPage() {
  return <CronGeneratorClient />;
}
