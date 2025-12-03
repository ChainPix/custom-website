import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, "");
  const lastModified = new Date();

  const routes = ["/", "/json-formatter", "/resume-analyzer", "/pdf-to-text"];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
  }));
}
