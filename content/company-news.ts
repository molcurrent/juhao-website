import type { PageData } from "@/app/_data/pages";
import runtimeCompanyNews from "./runtime/company-news.json" with { type: "json" };

export type CompanyNewsSection = {
  title: string;
  text: string;
  points: readonly string[];
};

export type CompanyNewsRelatedLink = {
  label: string;
  href: string;
  text: string;
};

export type CompanyNewsArticle = {
  slug: string;
  path: `/news/${string}`;
  title: string;
  description: string;
  intro: string;
  sections: readonly CompanyNewsSection[];
  published: string;
  source_id: number;
  phase_stage: string;
  publication_boundary: string;
  project_stage: {
    confirmed: "中标报道";
    implementation: "后续实施待证";
  } | null;
  local_representative_media: {
    src: string;
    alt: string;
    width: 1672;
    height: 941;
    role: "section_illustration";
    evidence_role: "representative_not_evidence";
    caption: string;
    rights_status: "approved";
    provenance_path: "RECON/JUHAO_ASSET_PROVENANCE.md";
  };
  remote_media_count: number;
  related: readonly CompanyNewsRelatedLink[];
};

export const companyNewsArticles = runtimeCompanyNews as readonly CompanyNewsArticle[];

export const companyNewsByPath: ReadonlyMap<string, CompanyNewsArticle> = new Map(
  companyNewsArticles.map((article) => [article.path, article]),
);

export function companyNewsArticleByPath(path: string) {
  return companyNewsByPath.get(path);
}

export const companyNewsPages = Object.fromEntries(
  companyNewsArticles.map((article) => [article.path.slice(1), {
    path: article.path,
    label: article.title,
    eyebrow: `COMPANY NEWS · ${article.phase_stage}`,
    title: article.title,
    seoTitle: `${article.title}｜钜豪照明企业动态`,
    description: article.description,
    image: article.local_representative_media.src,
    imageAlt: article.local_representative_media.alt,
    intro: article.intro,
    type: "article",
    published: article.published,
    noindex: true,
    highlights: [
      { title: "来源阶段", text: article.phase_stage },
      { title: "事实边界", text: article.publication_boundary },
      { title: "媒体状态", text: "来源图片尚未完成公开使用授权核验，当前仅使用原创栏目示意图。" },
    ],
    sections: article.sections.map((section) => ({
      title: section.title,
      text: section.text,
      points: [...section.points],
    })),
    related: article.related.map((item) => ({ ...item })),
    companyNewsEvidence: article,
  } satisfies PageData]),
) as Record<string, PageData>;

export const companyNewsRoutes = companyNewsArticles.map((article) => article.path);
