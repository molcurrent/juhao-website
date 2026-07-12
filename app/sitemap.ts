import type { MetadataRoute } from "next";
import { pages, SITE_URL } from "./_data/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: "2026-07-12", changeFrequency: "weekly", priority: 1 },
    ...Object.values(pages).map((page) => ({ url: `${SITE_URL}${page.path}`, lastModified: page.published || "2026-07-12", changeFrequency: page.type === "article" ? "monthly" as const : "weekly" as const, priority: page.path === "/solutions" ? 0.9 : page.type === "article" ? 0.65 : 0.8 }))
  ];
}
