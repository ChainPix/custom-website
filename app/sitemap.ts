import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";
import { allTools, toolPath } from "@/lib/tools";

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

  // Contact page - lower priority
  const contact = {
    url: `${base}/contact`,
    lastModified,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  };

  return [
    homepage,
    ...allTools.map((tool) => ({
      url: `${base}${toolPath(tool)}`,
      lastModified,
      changeFrequency: (tool.featured ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: tool.featured ? 0.9 : 0.8,
    })),
    contact,
  ];
}
