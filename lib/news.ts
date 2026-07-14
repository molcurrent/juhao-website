import { pages } from "@/app/_data/pages";
import { isPublishedRoute } from "@/content/publication-ledger";
import type { NewsItem, NewsPageResult } from "@/lib/api/types";

function publishedNews(): NewsItem[] {
  return Object.values(pages)
    .filter((page) => page.type === "article" && isPublishedRoute(page.path))
    .map((page) => ({
      path: page.path,
      title: page.title,
      description: page.description,
      image: page.image,
      published: page.published,
    }))
    .sort((left, right) => {
      const dateOrder = (right.published ?? "").localeCompare(left.published ?? "");
      return dateOrder || left.path.localeCompare(right.path);
    });
}

export function getNewsPage(page = 1, pageSize = 6): NewsPageResult {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(24, Math.max(1, Math.trunc(pageSize)));
  const news = publishedNews();
  const start = (normalizedPage - 1) * normalizedPageSize;
  return {
    items: news.slice(start, start + normalizedPageSize),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total: news.length,
    totalPages: Math.ceil(news.length / normalizedPageSize),
  };
}
