import { createHttpSiteApi } from "./http";
import { mockSiteApi } from "./mock";

const apiBaseUrl = process.env.NEXT_PUBLIC_JUHAO_API_BASE_URL?.trim();

export const siteApiMode = apiBaseUrl ? "http" : "mock";
export const contactSubmissionEnabled = siteApiMode === "http" && process.env.NEXT_PUBLIC_JUHAO_CONTACT_ENABLED === "true";
export const siteApi = apiBaseUrl ? createHttpSiteApi({ baseUrl: apiBaseUrl }) : mockSiteApi;

export type { ContactReceipt, ContactRequest, DownloadItem, NewsItem, NewsPageResult, NewsQuery, PartnerRegion, ProductCard, SearchResult, ServiceLocation, ServiceRegion, SiteApi } from "./types";
export { SiteApiHttpError } from "./http";
