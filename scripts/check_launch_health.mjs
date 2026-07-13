import { pathToFileURL } from "node:url";

const baseUrl = (process.env.BASE_URL || "https://juhao.com").replace(/\/$/, "");
const mallBaseUrl = (process.env.MALL_BASE_URL || "https://mall.juhao.com").replace(/\/$/, "");
const siteBypassToken = process.env.OAI_SITES_BYPASS_TOKEN || "";
const checkMall = process.env.CHECK_MALL === "1";
const publicIndexingEnabled = process.env.PUBLIC_INDEXING_ENABLED === "1";
const minimumPublicSitemapUrls = 60;
const expectedRoutes = ["/", "/products", "/products/spotlights/12287", "/cases", "/about/history", "/service", "/partners", "/contact"];
const spamPaths = ["/static/news/9062.html", "/static/news/1689.html", "/static/news/1022.html", "/static/news/3649.html", "/static/news/5795.html", "/static/news/8058.html"];
const siteHeaders = siteBypassToken ? { "OAI-Sites-Authorization": `Bearer ${siteBypassToken}` } : {};

export function hasNoindexRobotsMeta(html) {
  return (html.match(/<meta\b[^>]*>/gi) || []).some((tag) => {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    return name === "robots" && content.split(/[\s,]+/).includes("noindex");
  });
}

export function indexingPolicyFailures({ html, path, sitemapStatus, sitemapUrlCount, isPublic }) {
  const policyFailures = [];

  if (typeof html === "string") {
    const noindex = hasNoindexRobotsMeta(html);
    if (isPublic && noindex) policyFailures.push(`${path}: public indexing is enabled but robots noindex is present`);
    if (!isPublic && !noindex) policyFailures.push(`${path}: private preview must include robots noindex`);
  }

  if (typeof sitemapStatus === "number" && typeof sitemapUrlCount === "number") {
    if (sitemapStatus !== 200) policyFailures.push(`/sitemap.xml: expected 200, got ${sitemapStatus}`);
    if (isPublic && sitemapUrlCount < minimumPublicSitemapUrls) {
      policyFailures.push(`/sitemap.xml: public mode expected at least ${minimumPublicSitemapUrls} URLs, got ${sitemapUrlCount}`);
    }
    if (!isPublic && sitemapUrlCount !== 0) {
      policyFailures.push(`/sitemap.xml: private preview expected 0 URLs, got ${sitemapUrlCount}`);
    }
  }

  return policyFailures;
}

async function request(url, options, label, failures) {
  try {
    return await fetch(url, options);
  } catch (error) {
    failures.push(`${label}: network failure (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

export async function main() {
  const failures = [];

  for (const path of expectedRoutes) {
    const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path, failures);
    if (!response) continue;
    const html = await response.text();
    if (response.status !== 200) failures.push(`${path}: expected 200, got ${response.status}`);
    if (!html.includes("rel=\"canonical\"")) failures.push(`${path}: canonical missing`);
    if (/nvc-lighting|雷士|cnzz/i.test(html)) failures.push(`${path}: residual source brand or tracker`);
    failures.push(...indexingPolicyFailures({ html, path, isPublic: publicIndexingEnabled }));
  }

  for (const path of spamPaths) {
    const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path, failures);
    if (!response) continue;
    if (response.status !== 410) failures.push(`${path}: expected 410, got ${response.status}`);
    if (!/noindex/i.test(response.headers.get("x-robots-tag") || "")) failures.push(`${path}: x-robots-tag noindex missing`);
  }

  const login = await request(`${baseUrl}/login.html`, { redirect: "manual", headers: siteHeaders }, "/login.html", failures);
  if (login && (![301, 308].includes(login.status) || login.headers.get("location") !== `${mallBaseUrl}/login.html`)) failures.push(`/login.html: invalid mall redirect (${login.status} ${login.headers.get("location")})`);

  const sitemap = await request(`${baseUrl}/sitemap.xml`, { headers: siteHeaders }, "/sitemap.xml", failures);
  const sitemapXml = sitemap ? await sitemap.text() : "";
  const urlCount = (sitemapXml.match(/<loc>/g) || []).length;
  if (sitemap) failures.push(...indexingPolicyFailures({ sitemapStatus: sitemap.status, sitemapUrlCount: urlCount, isPublic: publicIndexingEnabled }));

  if (checkMall) {
    for (const path of ["/", "/login.html"]) {
      const response = await request(`${mallBaseUrl}${path}`, { redirect: "manual" }, `mall${path}`, failures);
      if (response && (response.status < 200 || response.status >= 400)) failures.push(`mall${path}: expected 2xx/3xx, got ${response.status}`);
    }
  }

  if (failures.length) {
    console.error(JSON.stringify({ baseUrl, indexingMode: publicIndexingEnabled ? "public" : "private", ok: false, failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ baseUrl, mallBaseUrl, mallChecked: checkMall, indexingMode: publicIndexingEnabled ? "public" : "private", ok: true, checkedRoutes: expectedRoutes.length, spam410: spamPaths.length, sitemapUrls: urlCount }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
