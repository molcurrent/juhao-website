import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

globalThis.__cloudflareTestEnv ??= {};

const library = JSON.parse(readFileSync(new URL("../content/runtime/knowledge-library.json", import.meta.url), "utf8"));
const inventory = JSON.parse(readFileSync(new URL("../content/governance/help-article-inventory.json", import.meta.url), "utf8"));
const exclusions = JSON.parse(readFileSync(new URL("../content/governance/hard-exclusions.json", import.meta.url), "utf8"));

async function createWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("knowledge-library-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(worker, path) {
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("classifies the complete help archive by the source text that is actually available", () => {
  assert.deepEqual(library.totals, {
    records: 137,
    full_text: 101,
    summary_only: 17,
    duration_only: 9,
    in_progress: 3,
    metadata_only: 7,
  });
  assert.equal(library.articles.length, 137);
  assert.equal(new Set(library.articles.map(({ source_id }) => source_id)).size, 137);
  assert.deepEqual(
    library.articles.map(({ source_id }) => source_id).sort((a, b) => a - b),
    inventory.map(({ source_id }) => source_id).sort((a, b) => a - b),
  );
  assert.deepEqual(
    library.articles.filter(({ content_status }) => content_status === "metadata_only").map(({ source_id }) => source_id).sort((a, b) => a - b),
    [173, 174, 175, 176, 177, 178, 179],
  );
  assert.deepEqual(
    library.articles.filter(({ content_status }) => content_status === "duration_only").map(({ source_id }) => source_id).sort((a, b) => a - b),
    [131, 134, 136, 137, 138, 139, 140, 143, 148],
  );
  assert.deepEqual(
    library.articles.filter(({ content_status }) => content_status === "in_progress").map(({ source_id }) => source_id).sort((a, b) => a - b),
    [112, 113, 114],
  );
  assert.equal(library.articles.filter(({ content_status }) => content_status === "summary_only").length, 17);
  assert.ok(library.articles.filter(({ content_status }) => content_status === "full_text").every(({ paragraphs }) => paragraphs.length > 0));
});

test("classifies every source into the five requested business categories", () => {
  assert.deepEqual(
    Object.fromEntries(library.categories.map(({ id, count }) => [id, count])),
    {
      "company-news": 22,
      "engineering-cases": 34,
      "channel-partners": 23,
      "mall-help": 43,
      "smart-home": 15,
    },
  );
  assert.equal(library.categories.reduce((sum, category) => sum + category.count, 0), 137);
  assert.ok(library.articles.every(({ site_category }) => library.categories.some(({ id }) => id === site_category)));
});

test("keeps all records as noindex archive routes while excluding restricted legacy templates from site search", () => {
  const restrictedIds = library.articles
    .filter(({ historical_notice }) => historical_notice)
    .map(({ source_id }) => source_id)
    .sort((a, b) => a - b);
  assert.deepEqual(restrictedIds, [...exclusions.prohibited_legacy_help_article_ids].sort((a, b) => a - b));
  assert.equal(restrictedIds.length, 45);
  assert.equal(library.articles.length - restrictedIds.length, 92);
});

test("keeps local paths, remote media and legacy contact values out of runtime copy", () => {
  const serialized = JSON.stringify(library);
  assert.doesNotMatch(serialized, /\/Users\/mac|https?:\/\/|\.oss-[a-z0-9-]+\.aliyuncs\.com/i);
  assert.doesNotMatch(serialized, /400-0760-888|153289970|客服QQ|用户QQ群|\bWSTMart\b|商淘/i);
});

test("renders the category archive with truthful source-text status labels", async () => {
  const worker = await createWorker();
  const routes = [
    ["/knowledge", ["企业资料库", "101"]],
    ["/knowledge/154", ["钜豪案例", "正文已收录"]],
    ["/knowledge/148", ["仅收录视频时长", "当前仅收录视频时长：03:08"]],
    ["/knowledge/112", ["正文整理中", "当前正文仍在整理，暂不作为完整正文展示。"]],
    ["/knowledge/173", ["19键遥控器", "教程文件待补"]],
  ];
  for (const [path, markers] of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    for (const marker of markers) assert.match(html, new RegExp(marker), path);
    assert.match(html, /<meta[^>]+name="robots"[^>]+noindex/i, path);
  }
});

test("does not expose source dates as website publication metadata", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/knowledge/154");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /article:(?:published|modified)_time/i);
  assert.doesNotMatch(html, /"date(?:Published|Modified)"/);
  assert.match(html, /来源日期/);
});

test("keeps restricted legacy templates out of site search without deleting their archive routes", async () => {
  const worker = await createWorker();
  const restrictedArchive = await render(worker, "/knowledge/1");
  assert.equal(restrictedArchive.status, 200);
  assert.match(await restrictedArchive.text(), /购物流程/);

  const restrictedSearch = await render(worker, "/search?keywords=%E8%B4%AD%E7%89%A9%E6%B5%81%E7%A8%8B&category=knowledge");
  assert.doesNotMatch(await restrictedSearch.text(), /href="\/knowledge\/1"/);

  const archiveSearch = await render(worker, "/search?keywords=%E5%A4%A7%E7%8E%8B%E5%B1%B1%E6%9C%97%E8%B1%AA&category=knowledge");
  const archiveSearchHtml = await archiveSearch.text();
  assert.match(archiveSearchHtml, /href="\/knowledge\/154"/);
  assert.match(archiveSearchHtml, /历史档案/);
});

test("validates the committed runtime snapshot without the private source vault", () => {
  const result = spawnSync("python3", ["scripts/build_knowledge_library.py", "--check"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, JUHAO_KNOWLEDGE_BASE: "/tmp/juhao-knowledge-source-does-not-exist" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"records": 137/);
});

test("paginates the archive and search output instead of rendering all records", async () => {
  const worker = await createWorker();
  const archiveResponse = await render(worker, "/knowledge");
  const archiveHtml = await archiveResponse.text();
  assert.ok(archiveHtml.length < 500_000, `archive response is ${archiveHtml.length} bytes`);
  assert.equal((archiveHtml.match(/href="\/knowledge\/\d+"/g) ?? []).length, 24);
  assert.match(archiveHtml, /下一页/);
  assert.match(archiveHtml, /category=mall-help/);

  const searchResponse = await render(worker, "/search?keywords=%E7%85%A7%E6%98%8E");
  const searchHtml = await searchResponse.text();
  assert.ok(searchHtml.length < 500_000, `search response is ${searchHtml.length} bytes`);
  assert.match(searchHtml, /data-search-results="24"/);
  assert.match(searchHtml, /category=products/);
  assert.match(searchHtml, /按内容类型筛选/);

  const productSearchResponse = await render(worker, "/search?keywords=%E7%85%A7%E6%98%8E&category=products");
  const productSearchHtml = await productSearchResponse.text();
  assert.match(productSearchHtml, new RegExp('aria-current="page"[^>]*><span>产品</span><b>37</b>'));
  assert.match(productSearchHtml, /data-search-results="24"/);
  assert.match(archiveHtml, /name="category" value="knowledge"/);
});
