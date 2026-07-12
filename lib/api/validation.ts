import type { ContactReceipt, DownloadItem, NewsItem, NewsPageResult, PartnerRegion, ProductCard, SearchResult, ServiceLocation, ServiceRegion } from "./types";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
  return value as JsonRecord;
}

function string(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空字符串`);
  return value;
}

function optionalString(value: unknown, label: string) {
  return value === undefined || value === null || value === "" ? undefined : string(value, label);
}

function integer(value: unknown, label: string, minimum = 0) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) throw new Error(`${label} 必须是大于等于 ${minimum} 的整数`);
  return value;
}

function internalPath(value: unknown, label: string) {
  const path = string(value, label);
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error(`${label} 必须是站内绝对路径`);
  return path;
}

function safeResourceUrl(value: unknown, label: string) {
  const url = string(value, label);
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("https://")) return url;
  throw new Error(`${label} 必须是站内路径或 HTTPS 地址`);
}

function strings(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`);
  return value.map((item, index) => string(item, `${label}[${index}]`));
}

function list<T>(value: unknown, label: string, parse: (item: unknown, label: string) => T) {
  if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`);
  return value.map((item, index) => parse(item, `${label}[${index}]`));
}

export function unwrapData(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value) && "data" in value) return (value as JsonRecord).data;
  return value;
}

export function parseProducts(value: unknown): ProductCard[] {
  return list(value, "products", (item, label) => {
    const data = record(item, label);
    return { id: string(data.id, `${label}.id`), name: string(data.name, `${label}.name`), category: string(data.category, `${label}.category`), summary: string(data.summary, `${label}.summary`), image: safeResourceUrl(data.image, `${label}.image`), sceneIds: strings(data.sceneIds, `${label}.sceneIds`) };
  });
}

export function parseRegions(value: unknown): ServiceRegion[] {
  return list(value, "regions", (item, label) => {
    const data = record(item, label);
    return { id: string(data.id, `${label}.id`), name: string(data.name, `${label}.name`), cities: strings(data.cities, `${label}.cities`) };
  });
}

export function parseLocations(value: unknown): ServiceLocation[] {
  return list(value, "locations", (item, label) => {
    const data = record(item, label);
    return { id: string(data.id, `${label}.id`), name: string(data.name, `${label}.name`), city: string(data.city, `${label}.city`), address: string(data.address, `${label}.address`) };
  });
}

export function parsePartnerRegions(value: unknown): PartnerRegion[] {
  return list(value, "partnerRegions", (item, label) => {
    const data = record(item, label);
    const status = string(data.status, `${label}.status`);
    if (status !== "open" && status !== "available-soon") throw new Error(`${label}.status 无效`);
    return { id: string(data.id, `${label}.id`), name: string(data.name, `${label}.name`), status };
  });
}

export function parseSearchResults(value: unknown): SearchResult[] {
  return list(value, "searchResults", (item, label) => {
    const data = record(item, label);
    const type = string(data.type, `${label}.type`);
    if (type !== "page" && type !== "service" && type !== "article") throw new Error(`${label}.type 无效`);
    return { path: internalPath(data.path, `${label}.path`), title: string(data.title, `${label}.title`), description: string(data.description, `${label}.description`), type };
  });
}

function parseNewsItem(item: unknown, label: string): NewsItem {
  const data = record(item, label);
  return { path: internalPath(data.path, `${label}.path`), title: string(data.title, `${label}.title`), description: string(data.description, `${label}.description`), image: safeResourceUrl(data.image, `${label}.image`), published: optionalString(data.published, `${label}.published`) };
}

export function parseNewsPage(value: unknown): NewsPageResult {
  const data = record(value, "newsPage");
  return { items: list(data.items, "newsPage.items", parseNewsItem), page: integer(data.page, "newsPage.page", 1), pageSize: integer(data.pageSize, "newsPage.pageSize", 1), total: integer(data.total, "newsPage.total"), totalPages: integer(data.totalPages, "newsPage.totalPages") };
}

export function parseDownloads(value: unknown): DownloadItem[] {
  return list(value, "downloads", (item, label) => {
    const data = record(item, label);
    return { id: string(data.id, `${label}.id`), title: string(data.title, `${label}.title`), category: string(data.category, `${label}.category`), version: string(data.version, `${label}.version`), size: string(data.size, `${label}.size`), updatedAt: string(data.updatedAt, `${label}.updatedAt`), href: safeResourceUrl(data.href, `${label}.href`) };
  });
}

export function parseContactReceipt(value: unknown): ContactReceipt {
  const data = record(value, "contactReceipt");
  const status = string(data.status, "contactReceipt.status");
  if (status !== "received") throw new Error("contactReceipt.status 无效");
  return { id: string(data.id, "contactReceipt.id"), status, submittedAt: string(data.submittedAt, "contactReceipt.submittedAt") };
}
