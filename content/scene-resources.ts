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

const sceneResourceConfig: Record<BusinessSceneId, { topic: string; product: string; study: string }> = {
  residential: { topic: "ceiling-lights", product: "12217", study: "jw-marriott-shenzhen-huafa-snow-world" },
  hospitality: { topic: "spotlights", product: "12287", study: "jw-marriott-shenzhen-huafa-snow-world" },
  commercial: { topic: "spotlights", product: "12286", study: "pullman-shangrao-guangfeng" },
  public: { topic: "outdoor-lighting", product: "11001", study: "yangzhou-riverfront-lighting" },
  industrial: { topic: "project-custom", product: "12265", study: "yangzhou-riverfront-lighting" },
};

export function resourcesForScene(sceneId: BusinessSceneId): SceneResource[] {
  const config = sceneResourceConfig[sceneId];
  const topic = productTopics.find((item) => item.slug === config.topic)!;
  const product = products.find((item) => item.source_id === config.product)!;
  const study = caseStudies.find((item) => item.slug === config.study)!;

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
      summary: `${product.topic} · ${product.sale_status} · 来源字段已通过机器校验，具体适用条件以正式资料与项目确认结果为准`,
      image: requireRuntimeMedia(product.primary_media_id).fallback,
      mediaId: product.primary_media_id,
    },
    {
      href: `/cases/${study.slug}`,
      kind: "项目资料",
      detail: study.stage,
      title: study.title,
      summary: study.summary,
      image: requireRuntimeMedia(study.image).fallback,
      mediaId: study.image,
    },
  ];
}
