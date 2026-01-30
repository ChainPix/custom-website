import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, "");
  const lastModified = new Date();

  // Homepage - highest priority
  const homepage = {
    url: base,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 1.0,
  };

  // Featured tools - high priority (most popular/important)
  const featuredTools = [
    "/json-formatter",
    "/resume-analyzer",
    "/pdf-to-text",
    "/sql-formatter",
    "/jwt-decoder",
    "/base64-encoder",
    "/timestamp-converter",
    "/diff-viewer",
    "/cron-parser",
  ];

  // All other tools
  const otherTools = [
    "/url-encoder",
    "/uuid-generator",
    "/hash-generator",
    "/json-yaml",
    "/toml-yaml", // ADDED: Missing tool
    "/password-generator",
    "/csv-json",
    "/text-case",
    "/markdown-html",
    "/qr-generator",
    "/color-converter",
    "/regex-tester",
    "/text-search",
    "/code-minifier",
    "/number-formatter",
    "/json-validator",
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
    "/ip-asn-lookup",
    "/cron-generator",
    "/data-uri",
    "/text-deduper",
    "/uuid-advanced",
    "/query-to-json",
    "/css-units",
    "/email-css-inliner",
    "/curl-to-fetch",
    "/webp-converter",
    "/mock-data",
    "/cron-tester",
    "/xml-formatter",
    "/chmod-calculator",
  ];

  // Contact page - lower priority
  const contact = {
    url: `${base}/contact`,
    lastModified,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  };

  return [
    homepage,
    ...featuredTools.map((path) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...otherTools.map((path) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    contact,
  ];
}
