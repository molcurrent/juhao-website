export type ProductCard = {
  id: string;
  name: string;
  category: string;
  summary: string;
  image: string;
  sceneIds: string[];
};

export type ServiceRegion = {
  id: string;
  name: string;
  cities: string[];
};

export type ServiceLocation = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export type PartnerRegion = {
  id: string;
  name: string;
  status: "open" | "available-soon";
};

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

export interface SiteApi {
  getProducts(sceneId?: string): Promise<ProductCard[]>;
  getRegions(): Promise<ServiceRegion[]>;
  getLocations(city?: string): Promise<ServiceLocation[]>;
  getPartnerRegions(): Promise<PartnerRegion[]>;
  search(query: string): Promise<SearchResult[]>;
  getNewsArticles(query?: Partial<NewsQuery>): Promise<NewsPageResult>;
  getDownloads(): Promise<DownloadItem[]>;
  submitContact(request: ContactRequest): Promise<ContactReceipt>;
}
