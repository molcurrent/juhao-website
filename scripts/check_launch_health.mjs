import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeLedger = JSON.parse(readFileSync(resolve(ROOT, "content/runtime/publication-ledger.json"), "utf8"));
const publishedRecords = runtimeLedger.filter((record) => record.publish_status === "published");
const eligibleRecords = publishedRecords.filter((record) => record.index_eligible);

const baseUrl = (process.env.BASE_URL || "https://juhao.com").replace(/\/$/, "");
const mallBaseUrl = (process.env.MALL_BASE_URL || "https://mall.juhao.com").replace(/\/$/, "");
const siteBypassToken = process.env.OAI_SITES_BYPASS_TOKEN || "";
const checkMall = process.env.CHECK_MALL === "1";
const publicIndexingEnabled = ["1", "true"].includes((process.env.PUBLIC_INDEXING_ENABLED || "false").toLowerCase());
const canonicalHostApproved = ["1", "true"].includes((process.env.CANONICAL_HOST_APPROVED || "false").toLowerCase());
const expectedRoutes = publishedRecords.map((record) => record.route);
const expectedPublicSitemapRoutes = eligibleRecords.map((record) => record.canonical_slug).sort();
const spamPaths = ["/static/news/9062.html", "/static/news/1689.html", "/static/news/1022.html", "/static/news/3649.html", "/static/news/5795.html", "/static/news/8058.html"];
const siteHeaders = siteBypassToken ? { "OAI-Sites-Authorization": `Bearer ${siteBypassToken}` } : {};

export const EXPECTED_PUBLIC_SITEMAP_URLS = expectedPublicSitemapRoutes.length;

export function hasNoindexRobotsMeta(html) {
  return (html.match(/<meta\b[^>]*>/gi) || []).some((tag) => {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    return name === "robots" && content.split(/[\s,]+/).includes("noindex");
  });
}

export function indexingPolicyFailures({ html, path, sitemapStatus, sitemapRoutes, shouldIndex = false, expectedSitemapRoutes = [] }) {
  const failures = [];

  if (typeof html === "string") {
    const noindex = hasNoindexRobotsMeta(html);
    if (shouldIndex && noindex) failures.push(`${path}: eligible public route must not include robots noindex`);
    if (!shouldIndex && !noindex) failures.push(`${path}: route must include robots noindex`);
  }

  if (typeof sitemapStatus === "number" && Array.isArray(sitemapRoutes)) {
    if (sitemapStatus !== 200) failures.push(`/sitemap.xml: expected 200, got ${sitemapStatus}`);
    const actual = [...sitemapRoutes].sort();
    const expected = [...expectedSitemapRoutes].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`/sitemap.xml: expected exact ${expected.length}-route set, got ${actual.length}`);
    }
  }

  return failures;
}

export function publicLaunchGateFailures({ indexingEnabled, hostApproved }) {
  if (indexingEnabled && !hostApproved) return ["public launch blocked: canonical host is not approved"];
  return [];
}

function tagAttribute(html, selector, attribute) {
  const tags = html.match(selector) || [];
  for (const tag of tags) {
    const value = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
    if (value) return value;
  }
  return "";
}

function tagWithAttribute(html, selector, attribute, expected) {
  return (html.match(selector) || []).find((tag) =>
    tagAttribute(tag, selector, attribute).toLowerCase() === expected.toLowerCase(),
  ) || "";
}

function pageSeo(html) {
  const descriptionTag = tagWithAttribute(html, /<meta\b[^>]*>/gi, "name", "description");
  const canonicalTag = tagWithAttribute(html, /<link\b[^>]*>/gi, "rel", "canonical");
  const ogImageTag = tagWithAttribute(html, /<meta\b[^>]*>/gi, "property", "og:image");
  return {
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "",
    description: tagAttribute(descriptionTag, /<meta\b[^>]*>/gi, "content"),
    canonical: tagAttribute(canonicalTag, /<link\b[^>]*>/gi, "href"),
    ogImage: tagAttribute(ogImageTag, /<meta\b[^>]*>/gi, "content"),
    h1Count: (html.match(/<h1\b/gi) || []).length,
  };
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
  const failures = publicLaunchGateFailures({ indexingEnabled: publicIndexingEnabled, hostApproved: canonicalHostApproved });
  const seenTitles = new Map();
  const seenDescriptions = new Map();
  const seenCanonicals = new Map();

  for (const record of publishedRecords) {
    const path = record.route;
    const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path, failures);
    if (!response) continue;
    const html = await response.text();
    if (response.status !== 200) failures.push(`${path}: expected 200, got ${response.status}`);
    if (/nvc-lighting|雷士|cnzz/i.test(html)) failures.push(`${path}: residual source brand or tracker`);
    failures.push(...indexingPolicyFailures({ html, path, shouldIndex: publicIndexingEnabled && record.index_eligible }));

    const seo = pageSeo(html);
    if (seo.h1Count !== 1) failures.push(`${path}: expected one H1, got ${seo.h1Count}`);
    if (!seo.title) failures.push(`${path}: title missing`);
    if (!seo.description) failures.push(`${path}: description missing`);
    if (!seo.canonical || new URL(seo.canonical, baseUrl).pathname !== record.canonical_slug) failures.push(`${path}: canonical mismatch (${seo.canonical})`);
    if (!seo.ogImage || !new URL(seo.ogImage, baseUrl).pathname.startsWith("/og/")) failures.push(`${path}: generated OG image missing`);
    for (const [label, value, map] of [["title", seo.title, seenTitles], ["description", seo.description, seenDescriptions], ["canonical", seo.canonical, seenCanonicals]]) {
      if (!value) continue;
      const prior = map.get(value);
      if (prior) failures.push(`${path}: duplicate ${label} with ${prior}`);
      else map.set(value, path);
    }
  }

  for (const path of spamPaths) {
    const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path, failures);
    if (!response) continue;
    if (response.status !== 410) failures.push(`${path}: expected 410, got ${response.status}`);
    if (!/noindex/i.test(response.headers.get("x-robots-tag") || "")) failures.push(`${path}: x-robots-tag noindex missing`);
  }

  const login = await request(`${baseUrl}/login.html`, { redirect: "manual", headers: siteHeaders }, "/login.html", failures);
  if (login) {
    const location = login.headers.get("location") || "";
    if (![307, 308].includes(login.status) || new URL(location, baseUrl).pathname !== "/mall") {
      failures.push(`/login.html: expected internal mall status redirect, got ${login.status} ${location}`);
    }
  }

  const sitemap = await request(`${baseUrl}/sitemap.xml`, { headers: siteHeaders }, "/sitemap.xml", failures);
  const sitemapXml = sitemap ? await sitemap.text() : "";
  const sitemapRoutes = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  if (sitemap) {
    failures.push(...indexingPolicyFailures({
      sitemapStatus: sitemap.status,
      sitemapRoutes,
      expectedSitemapRoutes: publicIndexingEnabled ? expectedPublicSitemapRoutes : [],
    }));
  }

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

  console.log(JSON.stringify({ baseUrl, mallBaseUrl, mallChecked: checkMall, indexingMode: publicIndexingEnabled ? "public" : "private", ok: true, checkedRoutes: expectedRoutes.length, seoEligible: EXPECTED_PUBLIC_SITEMAP_URLS, spam410: spamPaths.length, sitemapUrls: sitemapRoutes.length }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
