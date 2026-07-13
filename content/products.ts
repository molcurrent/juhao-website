import type { PageData } from "@/app/_data/pages";
import rawProducts from "./governance/published-products.json";

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
  primary_image: string;
  category: string;
  parameters: ProductParameter[];
  gallery: string[];
  installation_notes: string[];
};

export const products = rawProducts as ProductRecord[];

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
    seoTitle: `${product.title}｜${product.topic}｜钜豪照明`,
    description: `查看 ${product.title} 的产品参数、适用场景、安装提示与相关照明方案。产品编号 ${product.source_id}。`,
    image: product.primary_image,
    intro: `${product.topic}产品，资料来自钜豪企业商城与产品知识库，并已完成在售、参数与图片门禁核验。`,
    type: "page",
    highlights: [
      { title: "产品型号", text: product.model || product.title },
      { title: "产品专题", text: product.topic },
      { title: "资料状态", text: `${product.sale_status} · 已通过官网内容门禁` },
    ],
    sections: [],
    related: [],
  };
}
