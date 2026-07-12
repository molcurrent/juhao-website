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
    const documentTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
    assert.doesNotMatch(documentTitle, /钜豪照明.*钜豪照明/, `${path} title repeats the brand`);
  }
});

test("covers the canonical visitor route contract", async () => {
  const worker = await createWorker();
  const routes = [
    ["/about/history", "钜豪发展历程"],
    ["/about/join", "与钜豪一起创造好光"],
    ["/solutions", "空间照明解决方案"],
    ["/solutions/hospitality", "酒店照明解决方案"],
    ["/solutions/commercial", "商业照明解决方案"],
    ["/solutions/public", "公共照明解决方案"],
    ["/solutions/industrial", "工业照明解决方案"],
    ["/healthy-light", "让光更关照人的感受"],
    ["/sustainability", "让长期价值被看见"],
    ["/service", "让每一次使用都有回应"],
    ["/partners", "与长期主义者一起成长"],
    ["/downloads", "产品与服务资料"],
    ["/search", "搜索钜豪网站"],
    ["/legal", "法律声明"],
    ["/privacy", "隐私政策"],
  ];

  for (const [path, heading] of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(heading), path);
    assert.match(html, /<link[^>]+rel="canonical"/i, path);
  }
});

test("renders independent feature structures instead of the generic fallback", async () => {
  const worker = await createWorker();
  const routes = [
    ["/about", "从一束光，抵达完整的人居体验"],
    ["/about/history", "时间线骨架"],
    ["/solutions", "按真实场景进入方案"],
    ["/solutions/commercial", "场景产品组合"],
    ["/healthy-light", "不把未经验证的指标"],
    ["/smart-home", "先设计生活"],
    ["/mall", "先把能力边界说清楚"],
    ["/service", "按地区查找服务点"],
    ["/sustainability", "长期价值的四个维度"],
    ["/partners", "从了解彼此开始"],
    ["/news", "理解光，也理解空间"],
    ["/downloads", "已核验文件"],
    ["/search", "输入关键词开始搜索"],
    ["/contact", "检查咨询信息是否完整"],
  ];

  for (const [path, marker] of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(marker), path);
    assert.doesNotMatch(html, /nvc-lighting|雷士|cnzz/i, path);
  }

  const residential = await render(worker, "/solutions/residential");
  const residentialHtml = await residential.text();
  assert.match(residentialHtml, /全屋照明应该从什么时候开始规划/);
  assert.match(residentialHtml, /"@type":"FAQPage"/);

  const article = await render(worker, "/news/healthy-home-lighting");
  const articleHtml = await article.text();
  assert.match(articleHtml, /property="og:site_name" content="钜豪照明 JUHAO"/i);
  assert.match(articleHtml, /property="article:published_time" content="2026-07-12"/i);
  assert.match(articleHtml, /"image":"https:\/\/juhao\.com\/og\.png"/);
  assert.match(articleHtml, /"publisher":\{"@id":"https:\/\/juhao\.com\/#organization"\}/);
});

test("renders the global visitor action layer", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<aside[^>]+aria-label="页面快捷操作"/i);
  assert.match(html, /<a[^>]+href="\/contact"[^>]*>[^<]*<span>方案咨询<\/span>/i);
  assert.match(html, /<button(?=[^>]*aria-label="返回页面顶部")(?=[^>]*aria-hidden="true")(?=[^>]*tabindex="-1")[^>]*>/i);
  assert.match(html, /data-route-curtain="true"/i);
});

test("keeps incomplete and utility pages out of the index", async () => {
  const worker = await createWorker();
  const noindexRoutes = [
    "/about/history",
    "/about/join",
    "/mall",
    "/sustainability",
    "/service",
    "/partners",
    "/downloads",
    "/search",
    "/contact",
    "/legal",
    "/privacy",
  ];
  for (const path of noindexRoutes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex, follow"/i, path);
    assert.doesNotMatch(html, /"@type":"(?:BreadcrumbList|Service|FAQPage|WebPage)"/, `${path} has unverified page schema`);
  }

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  assert.match(xml, /https:\/\/juhao\.com\/solutions\/residential/);
  assert.doesNotMatch(xml, /https:\/\/juhao\.com\/(?:mall|sustainability|service|partners|downloads|search|contact|legal|privacy)/);
});

test("serves indexable news pagination with independent canonicals", async () => {
  const worker = await createWorker();
  const pages = [
    ["/news/page/2", "第 2 页", "零售空间照明", "酒店照明"],
    ["/news/page/3", "第 3 页", "眩光控制基础", "工业照明规划"],
  ];

  for (const [path, pageTitle, firstArticle, secondArticle] of pages) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(pageTitle), path);
    assert.match(html, new RegExp(firstArticle), path);
    assert.match(html, new RegExp(secondArticle), path);
    assert.match(html, new RegExp(`<link(?=[^>]*rel="canonical")(?=[^>]*href="https://juhao\\.com${path}")[^>]*>`, "i"), path);
    assert.match(html, /"@type":"CollectionPage"/, path);
    assert.match(html, /aria-label="资讯分页"/, path);
    assert.doesNotMatch(html, /content="noindex, follow"/i, path);
  }

  const firstPageAlias = await render(worker, "/news/page/1");
  assert.equal(firstPageAlias.status, 308);
  assert.equal(new URL(firstPageAlias.headers.get("location"), "http://localhost").pathname, "/news");

  const outOfRange = await render(worker, "/news/page/4");
  assert.equal(outOfRange.status, 404);
  const outOfRangeHtml = await outOfRange.text();
  assert.match(outOfRangeHtml, /<meta(?=[^>]*name="robots")(?=[^>]*content="noindex")[^>]*>/i);
  assert.doesNotMatch(outOfRangeHtml, /<link[^>]+rel="canonical"/i);

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  assert.match(xml, /https:\/\/juhao\.com\/news\/page\/2/);
  assert.match(xml, /https:\/\/juhao\.com\/news\/page\/3/);
  assert.doesNotMatch(xml, /https:\/\/juhao\.com\/news\/page\/4/);
});

test("redirects legacy NVC route families to JUHAO canonicals", async () => {
  const worker = await createWorker();
  const redirects = [
    ["/brand/whole_house", "/solutions/residential"],
    ["/brand/hotel", "/solutions/hospitality"],
    ["/healthy", "/healthy-light"],
    ["/esg", "/sustainability"],
    ["/investment", "/partners"],
    ["/download", "/downloads"],
    ["/law", "/legal"],
    ["/news/page/1", "/news"],
    ["/news/132", "/news"],
  ];

  for (const [source, destination] of redirects) {
    const response = await render(worker, source);
    assert.equal(response.status, 308, source);
    assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, destination, source);
  }

});

test("serves discovery files and a branded 404", async () => {
  const worker = await createWorker();
  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /https:\/\/juhao\.com\/solutions\/residential/);

  const robots = await render(worker, "/robots.txt", "text/plain");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/juhao\.com\/sitemap\.xml/i);

  const missing = await render(worker, "/page-that-does-not-exist");
  assert.equal(missing.status, 404);
  const missingHtml = await missing.text();
  assert.match(missingHtml, /这里还没有内容/);
  assert.match(missingHtml, /<meta(?=[^>]*name="robots")(?=[^>]*content="noindex")[^>]*>/i);
  assert.doesNotMatch(missingHtml, /content="index, follow"/i);
  assert.doesNotMatch(missingHtml, /<link[^>]+rel="canonical"/i);
});
