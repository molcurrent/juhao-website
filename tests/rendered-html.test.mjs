import assert from "node:assert/strict";
import test from "node:test";

async function createWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(worker, path, accept = "text/html") {
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders indexable multi-page content", async () => {
  const worker = await createWorker();
  const routes = [
    ["/", "好房子", "钜豪照明官网"],
    ["/about", "关于钜豪照明", "关于钜豪"],
    ["/solutions/residential", "全屋照明解决方案", "健康家居光环境"],
    ["/smart-home", "智能家居照明解决方案", "钜豪智能"],
    ["/news/healthy-home-lighting", "家庭健康光环境", "钜豪照明资讯"],
  ];

  for (const [path, heading, titleFragment] of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, path);
    const html = await response.text();
    assert.match(html, new RegExp(heading), path);
    assert.match(html, new RegExp(titleFragment), path);
    assert.match(html, /<meta[^>]+name="description"/i, path);
    assert.match(html, /<link[^>]+rel="canonical"/i, path);
    assert.match(html, /application\/ld\+json/i, path);
  }
});

test("serves discovery files and a branded 404", async () => {
  const worker = await createWorker();
  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /https:\/\/www\.juhao\.com\/solutions\/residential/);

  const robots = await render(worker, "/robots.txt", "text/plain");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/www\.juhao\.com\/sitemap\.xml/i);

  const missing = await render(worker, "/page-that-does-not-exist");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /这里还没有内容/);
});
