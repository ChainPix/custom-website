import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TomlYamlClient from "./client";

export const metadata: Metadata = {
  title: "TOML ⇄ YAML Converter | ToolStack",
  description:
    "Free online TOML to YAML and YAML to TOML converter with validation, sorting, and quick copy/download options.",
  keywords: [
    "toml to yaml",
    "yaml to toml",
    "convert toml",
    "convert yaml",
    "config converter",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/toml-yaml`,
  },
  openGraph: {
    title: "TOML ⇄ YAML Converter | ToolStack",
    description:
      "Bidirectional TOML/YAML converter with validation, sorting, and copy-ready output. Free, fast, and runs in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/toml-yaml`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML ⇄ YAML Converter | ToolStack",
    description:
      "Convert TOML to YAML or YAML to TOML with validation, sorting, and indentation controls for clean configs.",
  },
};

export default function TomlYamlPage() {
  return <TomlYamlClient />;
}
