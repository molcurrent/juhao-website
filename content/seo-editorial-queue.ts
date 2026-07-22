import rawSeoEditorialQueue from "./governance/seo-editorial-queue.json";

export type SeoEditorialGate =
  | "technical_source_review"
  | "brand_signoff"
  | "legal_signoff";

export type SeoEditorialTopic = {
  id: string;
  target_keyword: string;
  working_title: string;
  source_requirements: string[];
  state: "brief_only";
  body_status: "not_written";
  route: null;
  indexable: false;
  required_signoffs: SeoEditorialGate[];
};

export type SeoEditorialLane = {
  id: "light-environment-knowledge" | "project-cases" | "product-technology";
  label: "光环境知识" | "项目案例" | "产品技术";
  description: string;
  topics: SeoEditorialTopic[];
};

export type SeoEditorialQueue = {
  schema_version: 1;
  updated_at: string;
  scope: "/knowledge";
  publication_state: "editorial_queue_noindex";
  indexable: false;
  routes_created: false;
  summary: string;
  required_gates: SeoEditorialGate[];
  removed_professional_articles: {
    route_count: 33;
    policy: "must_not_restore";
    fixture: string;
  };
  lanes: SeoEditorialLane[];
};

export const seoEditorialQueue = rawSeoEditorialQueue as SeoEditorialQueue;

export const seoEditorialTopicCount = seoEditorialQueue.lanes.reduce(
  (total, lane) => total + lane.topics.length,
  0,
);
