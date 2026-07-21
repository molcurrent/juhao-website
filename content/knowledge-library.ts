import type { PageData } from "@/app/_data/pages";
import rawKnowledgeLibrary from "./runtime/knowledge-library.json";

export type KnowledgeCategoryId =
  | "company-news"
  | "engineering-cases"
  | "channel-partners"
  | "mall-help"
  | "smart-home";

export type KnowledgeCategory = {
  id: KnowledgeCategoryId;
  label: string;
  description: string;
  count: number;
};

export type KnowledgeContentStatus =
  | "full_text"
  | "summary_only"
  | "duration_only"
  | "in_progress"
  | "metadata_only";

export type KnowledgeArticle = {
  source_id: number;
  path: `/knowledge/${number}`;
  title: string;
  description: string;
  source_category: string;
  site_category: KnowledgeCategoryId;
  site_category_label: string;
  created_at: string;
  content_status: KnowledgeContentStatus;
  historical_notice: boolean;
  asset_notice: boolean;
  source_locator: string;
  source_sha256: string;
  paragraphs: string[];
};

type KnowledgeLibrary = {
  source_scope: string;
  totals: { records: number } & Record<KnowledgeContentStatus, number>;
  categories: KnowledgeCategory[];
  articles: KnowledgeArticle[];
};

export const knowledgeLibrary = rawKnowledgeLibrary as KnowledgeLibrary;
export const knowledgeArticles = knowledgeLibrary.articles;
export const knowledgeCategories = knowledgeLibrary.categories;
export const knowledgeArticleById = new Map(knowledgeArticles.map((article) => [String(article.source_id), article]));
export const knowledgeArchiveRoutes = new Set([
  "/knowledge",
  ...knowledgeArticles.map((article) => article.path),
]);
export const knowledgeSearchableArticles = knowledgeArticles.filter((article) => !article.historical_notice);
export const knowledgeArchivePolicy = {
  scope: "private_archive" as const,
  indexable: false,
  records: knowledgeArticles.length,
  searchableRecords: knowledgeSearchableArticles.length,
  restrictedRecords: knowledgeArticles.length - knowledgeSearchableArticles.length,
};

export function isKnowledgeArchiveRoute(route: string) {
  return knowledgeArchiveRoutes.has(route);
}

const categoryImages: Record<KnowledgeCategoryId, string> = {
  "company-news": "/images/juhao-industrial.webp",
  "engineering-cases": "/images/juhao-commercial.webp",
  "channel-partners": "/images/juhao-hero.webp",
  "mall-help": "/images/juhao-public.webp",
  "smart-home": "/images/juhao-home.webp",
};

export const knowledgeIndexPage: PageData = {
  path: "/knowledge",
  label: "企业资料库",
  eyebrow: "JUHAO KNOWLEDGE ARCHIVE",
  title: "企业资料库",
  seoTitle: "企业资料库｜新闻、案例、招商、商城帮助与智能家居｜钜豪照明",
  description: "浏览钜豪企业知识库收录的企业新闻、工程案例、招商合作、商城帮助与智能家居资料。",
  image: "/images/juhao-public.webp",
  imageAlt: "钜豪企业资料库主题公共照明空间",
  intro: "以来源编号为线索，将 137 条企业资料保留为不参与公开索引的历史档案。45 条旧商城模板仅供档案核对，不进入全站搜索。",
  type: "page",
  noindex: true,
  highlights: knowledgeCategories.slice(0, 3).map((category) => ({ title: `${category.count} 条${category.label}`, text: category.description })),
  sections: [],
  related: [
    { label: "钜豪动态", href: "/news", text: "查看已进入企业资讯栏目的审核记录。" },
    { label: "工程案例", href: "/cases", text: "查看已建立独立证据页的项目案例。" },
    { label: "智能家居", href: "/smart-home", text: "了解当前智能家居能力与公开边界。" },
  ],
};

export function knowledgeArticlePageData(article: KnowledgeArticle): PageData {
  return {
    path: article.path,
    label: article.title,
    eyebrow: `KNOWLEDGE RECORD · #${article.source_id}`,
    title: article.title,
    seoTitle: `${article.title}｜来源记录 #${article.source_id}｜企业资料库｜钜豪照明`,
    description: `企业资料库来源记录 #${article.source_id}。${article.description}`,
    image: categoryImages[article.site_category],
    imageAlt: `${article.site_category_label}资料主题场景`,
    intro: article.description,
    type: "article",
    noindex: true,
    highlights: [],
    sections: [],
    related: knowledgeIndexPage.related,
  };
}
