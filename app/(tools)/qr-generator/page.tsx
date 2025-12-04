import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import QrGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "QR Code Generator | ToolStack",
  description: "Create QR codes from text or URLs and download them instantly. Free and browser-based.",
  keywords: [
    "qr code generator",
    "create qr",
    "text to qr",
    "url qr code",
    "download qr",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/qr-generator`,
  },
  openGraph: {
    title: "QR Code Generator | ToolStack",
    description: "Generate QR codes in-browser and download as PNG. No sign-up required.",
    url: `${siteUrl.replace(/\/$/, "")}/qr-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Generator | ToolStack",
    description: "Create and download QR codes from text or URLs instantly.",
  },
};

export default function QrGeneratorPage() {
  return <QrGeneratorClient />;
}
