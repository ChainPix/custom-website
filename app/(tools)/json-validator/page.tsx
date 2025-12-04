import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonValidatorClient from "./client";

export const metadata: Metadata = {
  title: "JSON Validator & Linter | ToolStack",
  description:
    "Validate and pretty-print JSON in your browser. Catch errors with line/column hints and copy clean output.",
  keywords: [
    "json validator",
    "json linter",
    "validate json online",
    "json formatter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-validator`,
  },
  openGraph: {
    title: "JSON Validator & Linter | ToolStack",
    description: "Check JSON validity and format it with helpful error messages.",
    url: `${siteUrl.replace(/\/$/, "")}/json-validator`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Validator & Linter | ToolStack",
    description: "Validate and format JSON with line/column error hints. Runs in-browser.",
  },
};

export default function JsonValidatorPage() {
  return <JsonValidatorClient />;
}
