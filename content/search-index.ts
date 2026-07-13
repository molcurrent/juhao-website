import { pages } from "@/app/_data/pages";
import { caseStudies, productTopics } from "@/content/catalog";
import { productPageData, products } from "@/content/products";
import { publishedSearchableRecords } from "@/content/publication-ledger";
import type { SearchResult } from "@/lib/api/types";

const homepage: SearchResult = {
  path: "/",
  title: "钜豪照明官网",
  description: "钜豪照明健康照明、智能家居、产品、案例与合作咨询入口。",
  type: "page",
};

const searchablePaths = new Set(publishedSearchableRecords.map((record) => record.route));

const availableSearchEntries: SearchResult[] = [
  homepage,
  ...Object.values(pages)
    .map((page) => ({
      path: page.path,
      title: page.title,
      description: page.description,
      type: page.type ?? "page",
    })),
  ...productTopics.map((topic) => ({
    path: `/products/${topic.slug}`,
    title: topic.title,
    description: topic.description,
    type: "page" as const,
  })),
  ...products.map((product) => {
    const page = productPageData(product.seo_slug.slice(1));
    return {
      path: product.seo_slug,
      title: product.title,
      description: page?.description ?? `${product.topic}产品 ${product.model}`,
      type: "page" as const,
    };
  }),
  ...caseStudies.map((study) => ({
    path: `/cases/${study.slug}`,
    title: study.title,
    description: `${study.summary} 当前阶段：${study.stage}。`,
    type: "page" as const,
  })),
];

export const searchIndex = availableSearchEntries.filter((entry) => searchablePaths.has(entry.path));

export function searchSite(query: string): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return [];
  return searchIndex.filter((page) =>
    `${page.path} ${page.title} ${page.description}`.toLocaleLowerCase("zh-CN").includes(normalized),
  );
}
