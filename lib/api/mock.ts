import { pages } from "@/app/_data/pages";
import { isPublishedRoute } from "@/content/publication-ledger";
import { searchSite } from "@/content/search-index";
import type { DownloadItem, NewsItem, ProductCard, ServiceLocation, ServiceRegion, SiteApi } from "./types";

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

const news: NewsItem[] = Object.values(pages)
  .filter((page) => page.type === "article" && isPublishedRoute(page.path))
  .map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    image: page.image,
    published: page.published,
  }))
  .sort((left, right) => {
    const dateOrder = (right.published ?? "").localeCompare(left.published ?? "");
    return dateOrder || left.path.localeCompare(right.path);
  });

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
    return searchSite(query);
  },
  async getNewsArticles(query = {}) {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(24, Math.max(1, Math.trunc(query.pageSize ?? 6)));
    const start = (page - 1) * pageSize;
    return {
      items: news.slice(start, start + pageSize),
      page,
      pageSize,
      total: news.length,
      totalPages: Math.ceil(news.length / pageSize),
    };
  },
  async getDownloads() {
    return downloads;
  },
  async submitContact() {
    throw new Error("正式咨询接口尚未配置");
  },
};
