import { pages } from "@/app/_data/pages";
import type { DownloadItem, NewsItem, ProductCard, SearchResult, ServiceLocation, ServiceRegion, SiteApi } from "./types";

const products: ProductCard[] = [
  { id: "linear-01", name: "线性照明组合", category: "基础照明", summary: "用于连续、均匀的空间基础光。", image: "/images/juhao-home.webp", sceneIds: ["residential", "commercial"] },
  { id: "accent-01", name: "重点照明组合", category: "重点照明", summary: "用于强调陈列、材质与空间层次。", image: "/images/juhao-commercial.webp", sceneIds: ["commercial", "hospitality"] },
  { id: "highbay-01", name: "高空间照明组合", category: "工业照明", summary: "面向高大空间的稳定作业照明思路。", image: "/images/juhao-industrial.webp", sceneIds: ["industrial"] },
];

const regions: ServiceRegion[] = [
  { id: "south", name: "华南", cities: ["广州", "深圳", "东莞"] },
  { id: "east", name: "华东", cities: ["上海", "杭州", "南京"] },
];

const locations: ServiceLocation[] = [
  { id: "gz-demo", name: "广州服务示例点", city: "广州", address: "正式地址待企业确认" },
  { id: "sh-demo", name: "上海服务示例点", city: "上海", address: "正式地址待企业确认" },
];

const searchablePages: SearchResult[] = Object.values(pages)
  .filter((page) => !["/search", "/legal", "/privacy"].includes(page.path))
  .map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    type: page.type ?? "page",
  }));

const news: NewsItem[] = Object.values(pages)
  .filter((page) => page.type === "article")
  .map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    image: page.image,
    published: page.published,
  }));

const downloads: DownloadItem[] = [];

export const mockSiteApi: SiteApi = {
  async getProducts(sceneId) {
    return sceneId ? products.filter((product) => product.sceneIds.includes(sceneId)) : products;
  },
  async getRegions() {
    return regions;
  },
  async getLocations(city) {
    return city ? locations.filter((location) => location.city === city) : locations;
  },
  async getPartnerRegions() {
    return [
      { id: "south", name: "华南", status: "open" },
      { id: "east", name: "华东", status: "available-soon" },
    ];
  },
  async search(query) {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    if (!normalized) return [];
    return searchablePages.filter((page) =>
      `${page.title} ${page.description}`.toLocaleLowerCase("zh-CN").includes(normalized),
    );
  },
  async getNewsArticles() {
    return news;
  },
  async getDownloads() {
    return downloads;
  },
};
