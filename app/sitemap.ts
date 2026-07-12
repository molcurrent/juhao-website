import type { MetadataRoute } from "next";
import { pages, SITE_URL } from "./_data/pages";
import { NEWS_PAGE_SIZE, newsPagePath } from "@/lib/news-pagination";
import { caseStudies, productTopics } from "@/content/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const newsPageCount = Math.ceil(Object.values(pages).filter((page) => page.type === "article").length / NEWS_PAGE_SIZE);
  const newsPagination = Array.from({ length: Math.max(0, newsPageCount - 1) }, (_, index) => ({
    url: `${SITE_URL}${newsPagePath(index + 2)}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...Object.values(pages).filter((page) => !page.noindex).map((page) => ({
      url: `${SITE_URL}${page.path}`,
      ...(page.published ? { lastModified: page.published } : {}),
      changeFrequency: page.type === "article" ? "monthly" as const : "weekly" as const,
      priority: page.path === "/solutions" ? 0.9 : page.type === "article" ? 0.65 : 0.8,
    })),
    ...productTopics.map((topic) => ({
      url: `${SITE_URL}/products/${topic.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...caseStudies.map((study) => ({
      url: `${SITE_URL}/cases/${study.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...newsPagination,
  ];
}
