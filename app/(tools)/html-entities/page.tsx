import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import HtmlEntitiesClient from "./client";

export const metadata: Metadata = {
  title: "HTML Entity Encoder/Decoder | FastFormat Tools",
  description:
    "Encode or decode HTML entities instantly. Protect markup or turn entities back to readable text.",
  keywords: [
    "html entity encoder",
    "html escape",
    "decode html",
    "encode html",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/html-entities`,
  },
  openGraph: {
    title: "HTML Entity Encoder/Decoder | FastFormat Tools",
    description: "Escape or unescape HTML entities in your browser with copy-ready output.",
    url: `${siteUrl.replace(/\/$/, "")}/html-entities`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HTML Entity Encoder/Decoder | FastFormat Tools",
    description: "Convert text to safe HTML entities or decode them instantly.",
  },
};

export default function HtmlEntitiesPage() {
  return <HtmlEntitiesClient />;
}
