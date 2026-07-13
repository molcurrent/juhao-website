import { pages } from "@/app/_data/pages";
import { caseStudies, productTopics } from "@/content/catalog";
import { products } from "@/content/products";

export type BusinessSceneId = "residential" | "hospitality" | "commercial" | "public" | "industrial";

export type SceneResource = {
  href: string;
  kind: "产品专题" | "产品资料" | "项目资料" | "知识内容";
  detail: string;
  title: string;
  summary: string;
  image: string;
};

const sceneResourceConfig: Record<BusinessSceneId, { topic: string; product: string; study: string; knowledge: string }> = {
  residential: { topic: "ceiling-lights", product: "12217", study: "jw-marriott-shenzhen-huafa-snow-world", knowledge: "news/layered-lighting-design" },
  hospitality: { topic: "spotlights", product: "12287", study: "jw-marriott-shenzhen-huafa-snow-world", knowledge: "news/color-rendering-index" },
  commercial: { topic: "spotlights", product: "12286", study: "pullman-shangrao-guangfeng", knowledge: "news/beam-angle-guide" },
  public: { topic: "outdoor-lighting", product: "11001", study: "yangzhou-riverfront-lighting", knowledge: "news/ip-rating-wet-spaces" },
  industrial: { topic: "project-custom", product: "12265", study: "yangzhou-riverfront-lighting", knowledge: "news/ies-photometric-file" },
};

export function resourcesForScene(sceneId: BusinessSceneId): SceneResource[] {
  const config = sceneResourceConfig[sceneId];
  const topic = productTopics.find((item) => item.slug === config.topic)!;
  const product = products.find((item) => item.source_id === config.product)!;
  const study = caseStudies.find((item) => item.slug === config.study)!;
  const knowledge = pages[config.knowledge];

  return [
    {
      href: `/products/${topic.slug}`,
      kind: "产品专题",
      detail: topic.scene,
      title: topic.title,
      summary: topic.description,
      image: topic.image,
    },
    {
      href: product.seo_slug,
      kind: "产品资料",
      detail: product.model,
      title: product.title,
      summary: `${product.topic} · ${product.sale_status} · 当前为私有预览资料，人工审核与媒体授权状态以发布台账为准`,
      image: product.primary_image,
    },
    {
      href: `/cases/${study.slug}`,
      kind: "项目资料",
      detail: study.stage,
      title: study.title,
      summary: study.summary,
      image: study.image,
    },
    {
      href: knowledge.path,
      kind: "知识内容",
      detail: knowledge.eyebrow,
      title: knowledge.title,
      summary: knowledge.description,
      image: knowledge.image,
    },
  ];
}
