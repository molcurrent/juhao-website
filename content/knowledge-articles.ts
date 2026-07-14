import type { PageData } from "@/app/_data/pages";
import rawKnowledgeArticles from "./governance/knowledge-articles.generated.json";

type KnowledgeArticleSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  topic: { label: string; href: string; text: string };
  additionalRelated: { label: string; href: string; text: string }[];
  consultation: "home-health" | "project";
  image: "/images/juhao-commercial.webp" | "/images/juhao-home.webp" | "/images/juhao-public.webp" | "/images/juhao-industrial.webp";
  imageAlt: string;
  sourcePath: string;
  sourceKey: string;
  sourceHash: string;
  sourceLabel: string;
  sourceUrls: string[];
  externalSourceStatus: "recorded" | "not_recorded";
  sourceDisclosure: string;
  reviewState: "approved_by_juhao";
  reviewer: "JUHAO";
  reviewedAt: string;
  sourceCheckedAt: string;
  coreConclusions: string[];
  supportingSections: { title: string; text: string; points: string[] }[];
  boundaryTitle: string;
  doNotSay: string[];
};

const mediaCaption = "钜豪照明原创场景代表图，仅用于说明文章主题，不作为文中参数或结论的证据图。";
const noExternalSourceDisclosure = "本文已完成 JUHAO 内部知识库审核，外部来源链接未记录。";

function uniqueRelated(items: PageData["related"]) {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.href === item.href) === index);
}

function makeKnowledgeArticle(seed: KnowledgeArticleSeed): PageData {
  const path = `/news/${seed.slug}`;
  const consultationQuery = seed.consultation === "home-health"
    ? "scene=home-health&intent=space-advice"
    : "scene=project&intent=project-brief";
  const sourceDisclosure = seed.externalSourceStatus === "not_recorded"
    ? [{ title: "来源说明", text: seed.sourceDisclosure || noExternalSourceDisclosure, points: [] }]
    : [];

  return {
    path,
    label: seed.title,
    eyebrow: `LIGHTING KNOWLEDGE · ${seed.category.toUpperCase()}`,
    title: seed.title,
    seoTitle: `${seed.title}｜钜豪照明知识`,
    description: seed.description,
    image: seed.image,
    imageAlt: seed.imageAlt,
    intro: seed.coreConclusions[0],
    type: "article",
    highlights: seed.coreConclusions.slice(0, 4).map((text, index) => ({ title: `审核要点 ${String(index + 1).padStart(2, "0")}`, text })),
    sections: [
      { title: "经审核的核心结论", text: seed.coreConclusions[0], points: seed.coreConclusions.slice(1) },
      ...seed.supportingSections,
      ...sourceDisclosure,
    ],
    related: uniqueRelated([
      seed.topic,
      ...seed.additionalRelated,
      { label: "进入产品中心", href: "/products", text: "按产品专题核对具体型号、参数与安装资料。" },
      { label: "咨询空间照明", href: `/contact?source=solutions&${consultationQuery}&sourceDetail=${seed.slug}#consultation-form`, text: "带上空间条件和使用任务，提交进一步咨询。" },
    ]),
    articleEvidence: {
      sourcePath: seed.sourcePath,
      sourceKey: seed.sourceKey,
      sourceLabel: seed.sourceLabel,
      sourceUrls: seed.sourceUrls,
      reviewState: seed.reviewState,
      reviewer: seed.reviewer,
      reviewedAt: seed.reviewedAt,
      sourceCheckedAt: seed.sourceCheckedAt,
      coreConclusions: seed.coreConclusions,
      doNotSay: seed.doNotSay,
      representativeMedia: {
        src: seed.image,
        alt: seed.imageAlt,
        width: 1672,
        height: 941,
        caption: mediaCaption,
        provenancePath: "RECON/JUHAO_ASSET_PROVENANCE.md",
        role: "representative_not_evidence",
      },
    },
  };
}

const seeds = rawKnowledgeArticles as unknown as KnowledgeArticleSeed[];

export const knowledgeArticlePages = Object.fromEntries(
  seeds.map((seed) => [`news/${seed.slug}`, makeKnowledgeArticle(seed)]),
) as Record<string, PageData>;

export const knowledgeArticleRoutes = Object.values(knowledgeArticlePages).map((page) => page.path);
