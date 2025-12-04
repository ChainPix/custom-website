import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import PasswordGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "Password Generator | ToolStack",
  description:
    "Generate strong passwords with customizable length and character sets. Copy instantly—no storage or tracking.",
  keywords: [
    "password generator",
    "strong password",
    "secure password",
    "random password generator",
    "create password",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/password-generator`,
  },
  openGraph: {
    title: "Password Generator | ToolStack",
    description: "Create strong passwords with custom rules and copy instantly.",
    url: `${siteUrl.replace(/\/$/, "")}/password-generator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Password Generator | ToolStack",
    description: "Generate strong, random passwords in your browser—no tracking.",
  },
};

export default function PasswordGeneratorPage() {
  return <PasswordGeneratorClient />;
}
