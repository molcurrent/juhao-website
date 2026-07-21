export type SearchResult = {
  path: string;
  title: string;
  description: string;
  type: "page" | "service" | "article";
};

export type NewsItem = {
  path: string;
  title: string;
  description: string;
  image: string;
  published?: string;
};

export type DownloadItem = {
  id: string;
  title: string;
  category: string;
  version: string;
  size: string;
  updatedAt: string;
  href: string;
};

export type NewsQuery = {
  page: number;
  pageSize: number;
};

export type NewsPageResult = NewsQuery & {
  items: NewsItem[];
  total: number;
  totalPages: number;
};

export type ContactRequest = {
  direction: "home" | "project" | "channel";
  source: "home-hero" | "home-platform" | "home-contact" | "floating" | "footer" | "header" | "mobile-nav" | "page" | "products" | "product-topic" | "product-detail" | "cases" | "case-detail" | "solutions" | "partners" | "service-network" | "mall" | "direct";
  sourceDetail?: string;
  scene: "home-health" | "project" | "channel";
  intent: "space-advice" | "project-brief" | "partnership";
  project: string;
  stage: "understanding" | "planning" | "delivery" | "operation";
  need: string;
  contactName: string;
  contactChannel: "phone" | "email" | "wechat";
  contactValue: string;
  consent: true;
  privacyVersion: string;
  clientRequestId: string;
  turnstileToken?: string;
  website?: string;
};

export type ContactReceipt = {
  id: string;
  status: "received";
  submittedAt: string;
};
