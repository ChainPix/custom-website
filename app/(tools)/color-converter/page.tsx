import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import ColorConverterClient from "./client";

export const metadata: Metadata = {
  title: "Color Converter | ToolStack",
  description:
    "Convert colors between HEX, RGB, and HSL with validation and previews. Copy any format instantly.",
  keywords: [
    "color converter",
    "hex to rgb",
    "rgb to hex",
    "hsl converter",
    "color picker",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/color-converter`,
  },
  openGraph: {
    title: "Color Converter | ToolStack",
    description: "Convert HEX, RGB, and HSL with live preview and copy-ready formats.",
    url: `${siteUrl.replace(/\/$/, "")}/color-converter`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Converter | ToolStack",
    description: "Convert and preview colors across HEX, RGB, and HSL formats.",
  },
};

export default function ColorConverterPage() {
  return <ColorConverterClient />;
}
