import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JwtGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "JWT Generator (HS256) | FastFormat Tools",
  description:
    "Generate and decode HS256 JWTs in your browser. Provide payload and secret to create tokens safely.",
  keywords: [
    "jwt generator",
    "hs256 jwt",
    "jwt signer",
    "jwt encode",
    "json web token",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/jwt-generator`,
  },
  openGraph: {
    title: "JWT Generator (HS256) | FastFormat Tools",
    description: "Sign and decode JWTs locally using HS256. No server upload.",
    url: `${siteUrl.replace(/\/$/, "")}/jwt-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JWT Generator (HS256) | FastFormat Tools",
    description: "Create and decode JWTs locally; input payload and secret to sign tokens.",
  },
};

export default function JwtGeneratorPage() {
  return <JwtGeneratorClient />;
}
