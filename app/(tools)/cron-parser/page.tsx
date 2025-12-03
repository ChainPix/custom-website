import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CronParserClient from "./client";

export const metadata: Metadata = {
  title: "Cron Parser | FastFormat Tools",
  description:
    "Validate cron expressions and see the next run times. Supports standard 5-field crons in your browser.",
  keywords: [
    "cron parser",
    "cron expression",
    "cron generator",
    "next cron run",
    "cron schedule",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/cron-parser`,
  },
  openGraph: {
    title: "Cron Parser | FastFormat Tools",
    description: "Parse 5-field cron expressions and view next run dates. Runs locally.",
    url: `${siteUrl.replace(/\/$/, "")}/cron-parser`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cron Parser | FastFormat Tools",
    description: "Validate cron expressions and get the next run times instantly.",
  },
};

export default function CronParserPage() {
  return <CronParserClient />;
}
