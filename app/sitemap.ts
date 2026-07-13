import type { MetadataRoute } from "next";
import { SITE_URL } from "./_data/pages";
import { lastModifiedForPublication, publishedIndexableRecords } from "@/content/publication-ledger";

function routePriority(contentType: string, route: string) {
  if (route === "/") return 1;
  if (route === "/solutions") return 0.9;
  if (["文章", "内容分页"].includes(contentType)) return 0.65;
  if (["产品", "案例", "产品专题"].includes(contentType)) return 0.75;
  return 0.8;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publishedIndexableRecords.map((record) => {
    const lastModified = lastModifiedForPublication(record);
    return {
      url: record.canonical_slug === "/" ? SITE_URL : `${SITE_URL}${record.canonical_slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: ["文章", "案例", "产品", "产品专题"].includes(record.content_type)
        ? "monthly" as const
        : "weekly" as const,
      priority: routePriority(record.content_type, record.canonical_slug),
    };
  });
}
