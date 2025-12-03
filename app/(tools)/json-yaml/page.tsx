import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonYamlClient from "./client";

export const metadata: Metadata = {
  title: "JSON ⇄ YAML Converter | FastFormat Tools",
  description:
    "Convert JSON to YAML or YAML to JSON instantly. Validate input and copy clean output for configs and APIs.",
  keywords: [
    "json to yaml",
    "yaml to json",
    "convert yaml",
    "convert json",
    "online converter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/json-yaml`,
  },
  openGraph: {
    title: "JSON ⇄ YAML Converter | FastFormat Tools",
    description: "Bidirectional JSON/YAML converter with validation. Free and fast.",
    url: `${siteUrl.replace(/\/$/, "")}/json-yaml`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON ⇄ YAML Converter | FastFormat Tools",
    description: "Convert JSON to YAML or YAML to JSON with validation and copy-ready output.",
  },
};

export default function JsonYamlPage() {
  return <JsonYamlClient />;
}
