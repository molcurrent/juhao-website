import { pages } from "@/app/_data/pages";
import { caseStudies, productTopics } from "@/content/catalog";
import { productPageData, products } from "@/content/products";
import { publishedSearchableRecords } from "@/content/publication-ledger";
import { knowledgeSearchableArticles } from "@/content/knowledge-library";
import type { SearchResult } from "@/lib/api/types";

export type SearchCategory = "all" | "products" | "cases" | "knowledge" | "news" | "service" | "pages";
export type SearchEntry = SearchResult & {
  category: Exclude<SearchCategory, "all">;
  scope?: "archive";
};

export const searchCategories: { id: SearchCategory; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "products", label: "产品" },
  { id: "cases", label: "案例" },
  { id: "knowledge", label: "知识库" },
  { id: "news", label: "动态" },
  { id: "service", label: "服务" },
  { id: "pages", label: "其他页面" },
];

function categoryForPath(path: string): SearchEntry["category"] {
  if (path === "/products" || path.startsWith("/products/")) return "products";
  if (path === "/cases" || path.startsWith("/cases/")) return "cases";
  if (path === "/knowledge" || path.startsWith("/knowledge/")) return "knowledge";
  if (path === "/news" || path.startsWith("/news/")) return "news";
  if (["/service", "/downloads", "/contact", "/mall", "/partners"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return "service";
  return "pages";
}

const homepage: SearchEntry = {
  path: "/",
  title: "钜豪照明官网",
  description: "钜豪照明健康照明、智能家居、产品、案例与合作咨询入口。",
  type: "page",
  category: "pages",
};

const searchablePaths = new Set(publishedSearchableRecords.map((record) => record.route));

const availableSearchEntries: SearchEntry[] = [
  homepage,
  ...Object.values(pages)
    .map((page) => ({
      path: page.path,
      title: page.title,
      description: page.description,
      type: page.type ?? "page",
      category: categoryForPath(page.path),
    })),
  ...productTopics.map((topic) => ({
    path: `/products/${topic.slug}`,
    title: topic.title,
    description: topic.description,
    type: "page" as const,
    category: "products" as const,
  })),
  ...products.map((product) => {
    const page = productPageData(product.seo_slug.slice(1));
    return {
      path: product.seo_slug,
      title: product.title,
      description: page?.description ?? `${product.topic}产品 ${product.model}`,
      type: "page" as const,
      category: "products" as const,
    };
  }),
  ...caseStudies.map((study) => ({
    path: `/cases/${study.slug}`,
    title: study.title,
    description: `${study.summary} 当前阶段：${study.stage}。`,
    type: "page" as const,
    category: "cases" as const,
  })),
];

export const searchIndex = [
  ...availableSearchEntries.filter((entry) => searchablePaths.has(entry.path)),
  ...knowledgeSearchableArticles.map((article) => ({
    path: article.path,
    title: article.title,
    description: `${article.site_category_label}｜${article.description}`,
    type: "article" as const,
    category: "knowledge" as const,
    scope: "archive" as const,
  })),
];

export const SEARCH_PAGE_SIZE = 24;

export type SearchPageResult = {
  items: SearchEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  category: SearchCategory;
  facets: Record<SearchCategory, number>;
};

const emptyFacets = () => Object.fromEntries(searchCategories.map((item) => [item.id, 0])) as Record<SearchCategory, number>;

export function searchSite(query: string, requestedPage = 1, requestedCategory: SearchCategory = "all"): SearchPageResult {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return { items: [], page: 1, pageSize: SEARCH_PAGE_SIZE, total: 0, totalPages: 1, category: requestedCategory, facets: emptyFacets() };
  const matches = searchIndex.filter((page) =>
    `${page.path} ${page.title} ${page.description}`.toLocaleLowerCase("zh-CN").includes(normalized),
  );
  const facets = emptyFacets();
  facets.all = matches.length;
  for (const match of matches) facets[match.category] += 1;
  const filteredMatches = requestedCategory === "all" ? matches : matches.filter((item) => item.category === requestedCategory);
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / SEARCH_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * SEARCH_PAGE_SIZE;
  return { items: filteredMatches.slice(offset, offset + SEARCH_PAGE_SIZE), page, pageSize: SEARCH_PAGE_SIZE, total: filteredMatches.length, totalPages, category: requestedCategory, facets };
}
