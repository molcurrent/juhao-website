import type { PageData } from "@/app/_data/pages";
import { requireRuntimeMedia } from "@/lib/media/runtime";
import rawProducts from "./runtime/published-products.json";

export type ProductParameter = { name: string; value: string };

export type ProductRecord = {
  source_id: string;
  title: string;
  model: string;
  topic: string;
  topic_slug: string;
  review_status: string;
  sale_status: string;
  fact_status: string;
  parameter_completeness: string;
  image_authorization: string;
  department: string;
  publish_date: string;
  seo_slug: string;
  primary_media_id: string;
  category: string;
  parameters: ProductParameter[];
  gallery_media_ids: string[];
  installation_notes: string[];
};

export const products = rawProducts as ProductRecord[];

const modelCounts = new Map<string, number>();
for (const product of products) modelCounts.set(product.model, (modelCounts.get(product.model) ?? 0) + 1);

export function productTitleParts(product: Pick<ProductRecord, "title" | "model">) {
  const title = product.title.replace(/\s+/g, " ").trim();
  const model = product.model.replace(/\s+/g, " ").trim();
  const modelIndex = model ? title.indexOf(model) : -1;
  const hasModel = modelIndex >= 0;
  const description = hasModel
    ? `${title.slice(0, modelIndex)} ${title.slice(modelIndex + model.length)}`.replace(/^[\s（(]+|[）)]$/g, "").replace(/\s+/g, " ").trim() || title
    : title;
  return {
    model: model || null,
    description,
    hasModel,
    accessibleName: hasModel && model && description !== title ? `${model} · ${description}` : title,
  };
}

export function productSeoTitle(product: ProductRecord) {
  const model = product.model || product.source_id;
  const remainder = product.title.startsWith(model)
    ? product.title.slice(model.length).replace(/^[\s（(]+|[）)]$/g, "").replace(/\s+/g, " ").trim()
    : "";
  const variant = (modelCounts.get(product.model) ?? 0) > 1
    ? Array.from(remainder).slice(0, 10).join("").trim()
    : "";
  const identity = variant ? `${model} ${variant}` : model;
  return `${identity}｜${product.topic}｜钜豪照明`;
}

export function productByRouteKey(routeKey: string) {
  return products.find((product) => product.seo_slug.slice(1) === routeKey);
}

export function productsByTopic(topicSlug: string) {
  return products.filter((product) => product.topic_slug === topicSlug);
}

export function productPageData(routeKey: string): PageData | null {
  const product = productByRouteKey(routeKey);
  if (!product) return null;
  return {
    path: product.seo_slug,
    label: product.model || product.title,
    eyebrow: "PRODUCT DETAIL",
    title: product.title,
    seoTitle: productSeoTitle(product),
    description: `查看 ${product.title} 的产品参数、适用场景、安装提示与相关照明方案。产品编号 ${product.source_id}。`,
    image: requireRuntimeMedia(product.primary_media_id).fallback,
    intro: `${product.topic}产品，资料来自钜豪企业商城与产品知识库。页面只呈现已通过机器校验的来源字段，具体适用条件仍需复核。`,
    type: "page",
    highlights: [
      { title: "产品型号", text: product.model || product.title },
      { title: "产品专题", text: product.topic },
      { title: "资料状态", text: `${product.sale_status} · 来源字段已通过机器校验，当前站点媒体批次授权已登记` },
    ],
    sections: [],
    related: [],
  };
}
