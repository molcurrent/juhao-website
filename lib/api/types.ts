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

export interface SiteApi {
  getProducts(sceneId?: string): Promise<ProductCard[]>;
  getRegions(): Promise<ServiceRegion[]>;
  getLocations(city?: string): Promise<ServiceLocation[]>;
  getPartnerRegions(): Promise<PartnerRegion[]>;
  search(query: string): Promise<SearchResult[]>;
  getNewsArticles(): Promise<NewsItem[]>;
  getDownloads(): Promise<DownloadItem[]>;
}
