import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import JsonYamlClient from "./client";

export const metadata: Metadata = {
  title: "JSON ⇄ YAML Converter | ToolStack",
  description:
    "Free online JSON to YAML and YAML to JSON converter with validation, sorting, and custom indentation. Perfect for configs, APIs, and DevOps files.",
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
    title: "JSON ⇄ YAML Converter | ToolStack",
    description:
      "Bidirectional JSON/YAML converter with validation, sorting, and custom indentation. Free, fast, and runs in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/json-yaml`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON ⇄ YAML Converter | ToolStack",
    description:
      "Convert JSON to YAML or YAML to JSON with validation, sorting, and indentation controls. Copy-ready output for configs and APIs.",
  },
};

export default function JsonYamlPage() {
  return <JsonYamlClient />;
}
