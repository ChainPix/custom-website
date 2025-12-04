import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import DataUriClient from "./client";

export const metadata: Metadata = {
  title: "Data URI Generator | ToolStack",
  description:
    "Convert text or files to data URIs with a chosen MIME type. Copy-ready output for embeds and tests.",
  keywords: [
    "data uri generator",
    "base64 data uri",
    "text to data uri",
    "file to data uri",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/data-uri`,
  },
  openGraph: {
    title: "Data URI Generator | ToolStack",
    description: "Generate data URIs from text or files. Choose MIME type and copy the result.",
    url: `${siteUrl.replace(/\/$/, "")}/data-uri`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data URI Generator | ToolStack",
    description: "Create data URIs in-browser from text or uploaded files.",
  },
};

export default function DataUriPage() {
  return <DataUriClient />;
}
