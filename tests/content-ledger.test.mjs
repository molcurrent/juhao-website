import assert from "node:assert/strict";
import test from "node:test";
import { readContentLedger, REQUIRED_PUBLICATION_FIELDS, validateContentLedger } from "../scripts/validate_content_ledger.mjs";

globalThis.__cloudflareTestEnv ??= {};

const FOOTER_NAV_LABELS = [
  "品牌导航",
  "照明解决方案导航",
  "服务与合作导航",
  "内容与联系导航",
  "法律信息",
];

const EXPECTED_FOOTER_TARGETS = [
  "/about",
  "/products",
  "/cases",
  "/about/history",
  "/about/join",
  "/healthy-light",
  "/sustainability",
  "/solutions",
  "/solutions/residential",
  "/solutions/hospitality",
  "/solutions/commercial",
  "/solutions/public",
  "/solutions/industrial",
  "/smart-home",
  "/service",
  "/partners",
  "/downloads",
  "/news",
  "/search",
  "/contact",
  "/legal",
  "/privacy",
].sort();

async function createWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("ledger-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(worker, path, accept = "text/html") {
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("gives every publication-ledger record the governance fields needed for review", () => {
  const ledger = readContentLedger();
  const result = validateContentLedger(ledger);
  const count = (predicate) => ledger.filter(predicate).length;

  assert.deepEqual(result.errors, []);
  assert.ok(ledger.length >= 100, "publication ledger coverage fell below the review baseline");
  assert.equal(result.metrics.published_routes, count((record) => record.publish_status === "published"));
  assert.equal(result.metrics.seo_candidates, count((record) => record.seo_candidate));
  assert.equal(result.metrics.searchable_routes, count((record) => record.searchable));
  assert.equal(result.metrics.indexable_routes, count((record) => record.indexable));
  assert.ok(result.metrics.published_routes >= EXPECTED_FOOTER_TARGETS.length);
  assert.ok(result.metrics.seo_candidates > 0);
  assert.ok(result.metrics.searchable_routes > 0);
  assert.equal(result.metrics.indexable_routes, 0);
  assert.equal(new Set(ledger.map((record) => record.route)).size, ledger.length);
  for (const record of ledger) {
    for (const field of REQUIRED_PUBLICATION_FIELDS) assert.ok(field in record, `${record.route}: ${field}`);
  }

  assert.ok(count((record) => record.content_type === "产品") >= 90, "product review inventory is unexpectedly small");
  assert.ok(count((record) => record.content_type === "案例") >= 6, "case route coverage is unexpectedly small");
  assert.equal(ledger.filter((record) => record.content_type === "产品专题").length, 10);
  assert.ok(count((record) => record.content_type === "文章") >= 6, "article route coverage is unexpectedly small");
  assert.ok(count((record) => record.content_type === "内容分页") >= 1, "news pagination is missing");
});

test("covers all 22 footer destinations in the publication ledger", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  const footerTargets = [];

  for (const label of FOOTER_NAV_LABELS) {
    const nav = html.match(new RegExp(`<nav[^>]+aria-label="${label}"[^>]*>([\\s\\S]*?)<\\/nav>`, "i"))?.[1] ?? "";
    assert.ok(nav, label);
    for (const match of nav.matchAll(/href="([^"]+)"/g)) footerTargets.push(new URL(match[1], "https://juhao.com").pathname);
  }

  const actualTargets = [...new Set(footerTargets)].sort();
  assert.deepEqual(actualTargets, EXPECTED_FOOTER_TARGETS);
  const ledgerRoutes = new Set(readContentLedger().map((record) => record.route));
  for (const route of actualTargets) assert.ok(ledgerRoutes.has(route), route);
});

test("only puts human-approved, rights-cleared records in the sitemap", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/sitemap.xml", "application/xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  const sitemapRoutes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname)
    .sort();
  const ledger = readContentLedger();
  const indexableRoutes = ledger
    .filter((record) => record.publish_status === "published" && record.indexable)
    .map((record) => record.canonical_slug)
    .sort();

  assert.equal(sitemapRoutes.length, 0);
  assert.deepEqual(indexableRoutes, sitemapRoutes);

  const publishedNoindex = ledger
    .filter((record) => record.publish_status === "published" && !record.indexable)
    .map((record) => record.route)
    .sort();
  const publishedRoutes = ledger.filter((record) => record.publish_status === "published");
  assert.equal(publishedNoindex.length + indexableRoutes.length, publishedRoutes.length);
});

test("rejects indexability until review identity, date and media rights are approved", () => {
  const candidate = readContentLedger().find((record) => record.seo_candidate && record.searchable);
  assert.ok(candidate);

  const unapproved = { ...candidate, indexable: true };
  const rejected = validateContentLedger([unapproved]);
  for (const reason of [
    "approved review_status",
    "name a reviewer",
    "have reviewed_at",
    "unapproved image rights",
  ]) {
    assert.ok(rejected.errors.some((error) => error.includes(reason)), reason);
  }

  const approved = {
    ...unapproved,
    review_status: "approved",
    reviewer: "内容审核负责人",
    reviewed_at: "2026-07-13",
    image_rights_status: "approved",
  };
  assert.deepEqual(validateContentLedger([approved]).errors, []);
});
