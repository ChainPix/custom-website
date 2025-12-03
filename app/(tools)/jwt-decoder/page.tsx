import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JwtDecoderClient from "./client";

export const metadata: Metadata = {
  title: "JWT Decoder | FastFormat Tools",
  description:
    "Decode JWT header and payload instantly without verifying the signature. Inspect claims and expiry in your browser.",
  keywords: [
    "jwt decoder",
    "decode jwt",
    "json web token",
    "jwt payload",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/jwt-decoder`,
  },
  openGraph: {
    title: "JWT Decoder | FastFormat Tools",
    description: "Decode JWTs in-browser to inspect header and payload. No server upload.",
    url: `${siteUrl.replace(/\/$/, "")}/jwt-decoder`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Decoder | FastFormat Tools",
    description: "Decode JSON Web Tokens and view claims instantly in your browser.",
  },
};

export default function JwtDecoderPage() {
  return <JwtDecoderClient />;
}
