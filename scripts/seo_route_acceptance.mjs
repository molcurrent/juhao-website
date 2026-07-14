import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeLedger = JSON.parse(
  readFileSync(resolve(ROOT, "content/runtime/publication-ledger.json"), "utf8"),
);

export const publishedSeoRecords = runtimeLedger.filter(
  (record) => record.publish_status === "published",
);

export const indexEligibleSeoRecords = publishedSeoRecords.filter(
  (record) => record.index_eligible,
);

const ROUTE_SCHEMA_TYPES = new Set([
  "Article",
  "BreadcrumbList",
  "CollectionPage",
  "FAQPage",
  "Product",
  "Service",
  "WebPage",
]);

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? "";
}

function tags(html, pattern) {
  return html.match(pattern) ?? [];
}

function metaValues(html, key, value, output) {
  return tags(html, /<meta\b[^>]*>/gi)
    .filter((tag) => attribute(tag, key).toLowerCase() === value.toLowerCase())
    .map((tag) => attribute(tag, output));
}

function linkValues(html, rel, output) {
  return tags(html, /<link\b[^>]*>/gi)
    .filter((tag) => attribute(tag, "rel").toLowerCase() === rel.toLowerCase())
    .map((tag) => attribute(tag, output));
}

export function hasNoindex(html) {
  return metaValues(html, "name", "robots", "content").some((value) =>
    value.toLowerCase().split(/[\s,]+/).includes("noindex"),
  );
}

export function structuredData(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [parsed];
    });
}

function routeSchemaTypes(items) {
  return items
    .map((item) => item?.["@type"])
    .flat()
    .filter((type) => ROUTE_SCHEMA_TYPES.has(type));
}

function canonicalUrl(origin, canonicalSlug) {
  return new URL(canonicalSlug, `${origin}/`).href;
}

async function loadWorker(label) {
  globalThis.__cloudflareTestEnv ??= {};
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("seo-acceptance", `${label}-${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(worker, route, accept = "text/html") {
  return worker.fetch(
    new Request(`http://localhost${route}`, { headers: { accept } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function duplicateFailure(seen, label, value, route, failures) {
  if (!value) return;
  const previous = seen.get(value);
  if (previous) failures.push(`${route}: duplicate ${label} with ${previous}`);
  else seen.set(value, route);
}

export async function auditSeoRoutes({ mode, canonicalOrigin = "https://juhao.com" }) {
  if (!new Set(["private", "public"]).has(mode)) throw new Error(`Unsupported SEO audit mode: ${mode}`);

  const failures = [];
  const worker = await loadWorker(mode);
  const seenTitles = new Map();
  const seenDescriptions = new Map();
  const seenCanonicals = new Map();
  const eligibleRoutes = new Set(indexEligibleSeoRecords.map((record) => record.route));

  if (publishedSeoRecords.length !== 119) failures.push(`runtime ledger: expected 119 published routes, got ${publishedSeoRecords.length}`);
  if (indexEligibleSeoRecords.length !== 33) failures.push(`runtime ledger: expected 33 index-eligible routes, got ${indexEligibleSeoRecords.length}`);

  for (const record of publishedSeoRecords) {
    const response = await render(worker, record.route);
    const html = await response.text();
    if (response.status !== 200) {
      failures.push(`${record.route}: expected 200, got ${response.status}`);
      continue;
    }

    const titleValues = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => match[1].trim());
    const descriptionValues = metaValues(html, "name", "description", "content");
    const canonicalValues = linkValues(html, "canonical", "href");
    const ogImageValues = metaValues(html, "property", "og:image", "content");
    const h1Count = tags(html, /<h1\b/gi).length;
    const expectedCanonical = canonicalUrl(canonicalOrigin, record.canonical_slug);
    const expectedOgImage = canonicalUrl(canonicalOrigin, record.og_image);
    const shouldIndex = mode === "public" && eligibleRoutes.has(record.route);

    if (h1Count !== 1) failures.push(`${record.route}: expected one H1, got ${h1Count}`);
    if (titleValues.length !== 1 || !titleValues[0]) failures.push(`${record.route}: expected one non-empty title, got ${titleValues.length}`);
    if (descriptionValues.length !== 1 || !descriptionValues[0]) failures.push(`${record.route}: expected one non-empty description, got ${descriptionValues.length}`);
    if (canonicalValues.length !== 1) failures.push(`${record.route}: expected one canonical, got ${canonicalValues.length}`);
    if (canonicalValues[0] !== expectedCanonical) failures.push(`${record.route}: canonical mismatch (${canonicalValues[0] ?? "missing"})`);
    if (ogImageValues.length !== 1) failures.push(`${record.route}: expected one og:image, got ${ogImageValues.length}`);
    if (ogImageValues[0] !== expectedOgImage) failures.push(`${record.route}: og:image mismatch (${ogImageValues[0] ?? "missing"})`);
    if (shouldIndex === hasNoindex(html)) failures.push(`${record.route}: ${shouldIndex ? "eligible public route has noindex" : "route is missing noindex"}`);

    duplicateFailure(seenTitles, "title", titleValues[0], record.route, failures);
    duplicateFailure(seenDescriptions, "description", descriptionValues[0], record.route, failures);
    duplicateFailure(seenCanonicals, "canonical", canonicalValues[0], record.route, failures);

    const schemas = structuredData(html);
    const schemaTypes = routeSchemaTypes(schemas);
    if (shouldIndex) {
      if (record.content_type !== "文章") failures.push(`${record.route}: only reviewed articles may be index-eligible in this snapshot`);
      if (!schemaTypes.includes("Article")) failures.push(`${record.route}: eligible article schema is missing`);
      if (!schemaTypes.includes("BreadcrumbList")) failures.push(`${record.route}: eligible breadcrumb schema is missing`);
    } else if (schemaTypes.length > 0) {
      failures.push(`${record.route}: noindex route exposes route-level schema (${schemaTypes.join(", ")})`);
    }

    if (record.content_type === "文章") {
      const publishedTime = metaValues(html, "property", "article:published_time", "content");
      const modifiedTime = metaValues(html, "property", "article:modified_time", "content");
      const articles = schemas.filter((item) => item?.["@type"] === "Article");
      if (!record.published_at) {
        if (publishedTime.length > 0 || modifiedTime.length > 0) failures.push(`${record.route}: unpublished article exposes social publication dates`);
        for (const article of articles) {
          if ("datePublished" in article || "dateModified" in article) {
            failures.push(`${record.route}: reviewed/source date is exposed as an Article publication date`);
          }
        }
      } else {
        if (publishedTime[0] !== record.published_at) failures.push(`${record.route}: article:published_time does not match published_at`);
        for (const article of articles) {
          if (article.datePublished !== record.published_at || article.dateModified !== record.published_at) {
            failures.push(`${record.route}: Article dates do not match published_at`);
          }
        }
      }
    }
  }

  const sitemapResponse = await render(worker, "/sitemap.xml", "application/xml");
  const sitemapXml = await sitemapResponse.text();
  const actualSitemapRoutes = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .sort();
  const expectedSitemapRoutes = (mode === "public" ? indexEligibleSeoRecords : [])
    .map((record) => record.canonical_slug)
    .sort();

  if (sitemapResponse.status !== 200) failures.push(`/sitemap.xml: expected 200, got ${sitemapResponse.status}`);
  if (JSON.stringify(actualSitemapRoutes) !== JSON.stringify(expectedSitemapRoutes)) {
    failures.push(`/sitemap.xml: expected exact ${expectedSitemapRoutes.length}-route set, got ${actualSitemapRoutes.length}`);
  }

  return {
    mode,
    passed: failures.length === 0,
    published_routes: publishedSeoRecords.length,
    index_eligible_routes: indexEligibleSeoRecords.length,
    sitemap_routes: actualSitemapRoutes.length,
    failures,
  };
}
