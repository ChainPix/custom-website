import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import TomlIniClient from "./client";

export const metadata: Metadata = {
  title: "TOML/INI to JSON Converter | ToolStack",
  description:
    "Convert TOML or INI files to JSON in your browser. Validate input and copy formatted output.",
  keywords: [
    "toml to json",
    "ini to json",
    "convert toml",
    "convert ini",
    "config converter",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
  },
  openGraph: {
    title: "TOML/INI to JSON Converter | ToolStack",
    description: "Parse TOML or INI config text into JSON with validation.",
    url: `${siteUrl.replace(/\/$/, "")}/toml-ini-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOML/INI to JSON Converter | ToolStack",
    description: "Convert TOML or INI configs to JSON locally with copy-ready output.",
  },
};

export default function TomlIniPage() {
  return <TomlIniClient />;
}
