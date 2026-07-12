import type { ContactRequest, SiteApi } from "./types";
import { parseContactReceipt, parseDownloads, parseLocations, parseNewsPage, parsePartnerRegions, parseProducts, parseRegions, parseSearchResults, unwrapData } from "./validation";

type HttpSiteApiOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class SiteApiHttpError extends Error {
  constructor(message: string, readonly status: number | null, readonly endpoint: string) {
    super(message);
    this.name = "SiteApiHttpError";
  }
}

export function createHttpSiteApi({ baseUrl, fetchImpl = fetch, timeoutMs = 10_000 }: HttpSiteApiOptions): SiteApi {
  const normalizedBaseUrl = new URL(baseUrl);
  if (normalizedBaseUrl.protocol !== "https:" && normalizedBaseUrl.hostname !== "localhost" && normalizedBaseUrl.hostname !== "127.0.0.1") {
    throw new Error("正式 API 必须使用 HTTPS");
  }
  if (!normalizedBaseUrl.pathname.endsWith("/")) normalizedBaseUrl.pathname += "/";

  async function request<T>(endpoint: string, parse: (value: unknown) => T, init?: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = new URL(endpoint.replace(/^\//, ""), normalizedBaseUrl);

    try {
      const response = await fetchImpl(url, {
        ...init,
        credentials: "include",
        signal: controller.signal,
        headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
      });
      if (!response.ok) throw new SiteApiHttpError(`接口返回 ${response.status}`, response.status, url.pathname);
      return parse(unwrapData(await response.json()));
    } catch (error) {
      if (error instanceof SiteApiHttpError) throw error;
      const message = error instanceof DOMException && error.name === "AbortError" ? "接口请求超时" : "接口请求或数据校验失败";
      throw new SiteApiHttpError(message, null, url.pathname);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    getProducts(sceneId) {
      const query = sceneId ? `?sceneId=${encodeURIComponent(sceneId)}` : "";
      return request(`products${query}`, parseProducts);
    },
    getRegions() {
      return request("service/regions", parseRegions);
    },
    getLocations(city) {
      const query = city ? `?city=${encodeURIComponent(city)}` : "";
      return request(`service/locations${query}`, parseLocations);
    },
    getPartnerRegions() {
      return request("partners/regions", parsePartnerRegions);
    },
    search(query) {
      return request(`search?q=${encodeURIComponent(query)}`, parseSearchResults);
    },
    getNewsArticles(query = {}) {
      const page = Math.max(1, Math.trunc(query.page ?? 1));
      const pageSize = Math.min(24, Math.max(1, Math.trunc(query.pageSize ?? 6)));
      return request(`news?page=${page}&pageSize=${pageSize}`, parseNewsPage);
    },
    getDownloads() {
      return request("downloads", parseDownloads);
    },
    submitContact(contact: ContactRequest) {
      return request("contact", parseContactReceipt, { method: "POST", body: JSON.stringify(contact) });
    },
  };
}
