import { caseStudies, productTopics } from "@/content/catalog";
import { products } from "@/content/products";
import { requireRuntimeMedia } from "@/lib/media/runtime";

export type BusinessSceneId = "residential" | "hospitality" | "commercial" | "public" | "industrial";

export type SceneResource = {
  href: string;
  kind: "产品专题" | "产品资料" | "项目资料";
  detail: string;
  title: string;
  summary: string;
  image: string;
  mediaId?: string;
};

const sceneResourceConfig: Record<BusinessSceneId, { topic: string; product?: string; study?: string; topicImage: string }> = {
  residential: { topic: "ceiling-lights", product: "12217", topicImage: "/images/jh-scene-residential.webp" },
  hospitality: { topic: "spotlights", product: "12287", study: "jw-marriott-shenzhen-huafa-snow-world", topicImage: "/images/jh-scene-hospitality.webp" },
  commercial: { topic: "spotlights", product: "12286", study: "xingtai-financial-center", topicImage: "/images/jh-scene-commercial.webp" },
  public: { topic: "outdoor-lighting", product: "11001", study: "yangzhou-riverfront-lighting", topicImage: "/images/jh-scene-public.webp" },
  industrial: { topic: "project-custom", topicImage: "/images/jh-scene-industrial.webp" },
};

export function resourcesForScene(sceneId: BusinessSceneId): SceneResource[] {
  const config = sceneResourceConfig[sceneId];
  const topic = productTopics.find((item) => item.slug === config.topic)!;
  const product = config.product ? products.find((item) => item.source_id === config.product) : undefined;
  const study = config.study ? caseStudies.find((item) => item.slug === config.study) : undefined;

  return [
    {
      href: `/products/${topic.slug}`,
      kind: "产品专题",
      detail: topic.scene,
      title: topic.title,
      summary: topic.description,
      image: config.topicImage,
    },
    ...(product ? [{
      href: product.seo_slug,
      kind: "产品资料" as const,
      detail: product.model,
      title: product.title,
      summary: `${product.topic} · ${product.sale_status} · 来源字段已通过机器校验，具体适用条件以正式资料与项目确认结果为准`,
      image: requireRuntimeMedia(product.primary_media_id).fallback,
      mediaId: product.primary_media_id,
    }] : []),
    ...(study ? [{
      href: `/cases/${study.slug}`,
      kind: "项目资料" as const,
      detail: study.stage,
      title: study.title,
      summary: study.summary,
      image: requireRuntimeMedia(study.image).fallback,
      mediaId: study.image,
    }] : []),
  ];
}
