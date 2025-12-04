import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import CodeMinifierClient from "./client";

export const metadata: Metadata = {
  title: "Code Minifier & Pretty Printer | ToolStack",
  description:
    "Minify or pretty-print HTML, CSS, or JS quickly in your browser. Copy clean output instantly.",
  keywords: [
    "html minifier",
    "css minifier",
    "js minifier",
    "code formatter",
    "pretty print",
    "developer tools",
  ],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/code-minifier`,
  },
  openGraph: {
    title: "Code Minifier & Pretty Printer | ToolStack",
    description: "Lightweight HTML/CSS/JS minify and prettify directly in your browser.",
    url: `${siteUrl.replace(/\/$/, "")}/code-minifier`,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Code Minifier & Pretty Printer | ToolStack",
    description: "Minify or prettify code on the fly—no uploads or sign-up.",
  },
};

export default function CodeMinifierPage() {
  return <CodeMinifierClient />;
}
