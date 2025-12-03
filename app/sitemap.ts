import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, "");
  const lastModified = new Date();

  const routes = [
    "/",
    "/json-formatter",
    "/resume-analyzer",
    "/pdf-to-text",
    "/url-encoder",
    "/base64-encoder",
    "/uuid-generator",
    "/hash-generator",
    "/json-yaml",
    "/password-generator",
    "/csv-json",
    "/text-case",
    "/markdown-html",
    "/qr-generator",
    "/jwt-decoder",
    "/color-converter",
    "/regex-tester",
    "/diff-viewer",
    "/text-search",
    "/code-minifier",
    "/number-formatter",
    "/json-validator",
    "/cron-parser",
    "/timestamp-converter",
    "/jwt-generator",
    "/html-entities",
    "/image-base64",
    "/nanoid-generator",
    "/lorem-ipsum",
    "/json-diff",
    "/regex-extractor",
    "/json-table",
    "/toml-ini-converter",
    "/markdown-preview",
    "/url-parser",
  ];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
  }));
}
