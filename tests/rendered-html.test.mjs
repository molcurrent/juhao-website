import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    ["/about/history", "公开发展节点"],
    ["/solutions", "按真实场景进入方案"],
    ["/solutions/commercial", "场景产品组合"],
    ["/healthy-light", "不把未经验证的指标"],
    ["/smart-home", "先设计生活"],
    ["/mall", "先把能力边界说清楚"],
    ["/service", "四类服务入口"],
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
  assert.match(html, /<summary[^>]+aria-label="选择咨询方向"/i);
  assert.match(html, /<nav[^>]+aria-label="快捷咨询路径"/i);
  for (const label of ["家庭健康光", "工程项目", "渠道合作"]) assert.match(html, new RegExp(label));
  assert.match(html, /<button(?=[^>]*aria-label="返回页面顶部")(?=[^>]*aria-hidden="true")(?=[^>]*tabindex="-1")[^>]*>/i);
  assert.match(html, /data-route-curtain="true"/i);
});

test("renders three tracked consultation paths without demo copy", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<meta[^>]+name="viewport"[^>]+viewport-fit=cover/i);
  for (const marker of ["获取户型 / 空间建议", "提交项目需求", "了解合作条件"]) assert.match(html, new RegExp(marker));
  for (const source of ["home-hero", "home-contact"]) assert.match(html, new RegExp(`source=${source}`));
  for (const marker of ["产品中心", "工程案例", "商城采购", "经销商登录"]) assert.match(html, new RegExp(marker));
  assert.match(html, /https:\/\/mall\.juhao\.com/);
  assert.doesNotMatch(html, /正式能力与开放范围|商品、订单、客户与服务边界以企业确认为准|后续确认的信息为准/);
});

test("publishes indexable product topics and stage-labelled project pages", async () => {
  const worker = await createWorker();
  const routes = [
    ["/products", "首批开放", "照明产品中心"],
    ["/products/spotlights", "查看产品详情", "产品专题"],
    ["/cases", "把项目阶段", "工程案例与项目动态"],
    ["/cases/jw-marriott-shenzhen-huafa-snow-world", "签约 / 中标项目", "深圳华发冰雪世界 JW 万豪酒店"],
    ["/cases/yangzhou-riverfront-lighting", "尚不表述为完工案例", "扬州经开区"],
  ];
  for (const [path, marker, title] of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(marker), path);
    assert.match(html, new RegExp(title), path);
    assert.doesNotMatch(html, /content="noindex, follow"/i, path);
    assert.match(html, /<link[^>]+rel="canonical"/i, path);
  }

  const caseDetail = await render(worker, "/cases/jw-marriott-shenzhen-huafa-snow-world");
  const caseHtml = await caseDetail.text();
  for (const marker of ["方案范围", "产品方向清单", "完工资料状态", "最终产品型号清单：待项目组确认"]) assert.match(caseHtml, new RegExp(marker));

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  assert.match(xml, /https:\/\/juhao\.com\/products\/spotlights/);
  assert.match(xml, /https:\/\/juhao\.com\/cases\/jw-marriott-shenzhen-huafa-snow-world/);
});

test("renders source-labelled evidence galleries for all six project pages", async () => {
  const worker = await createWorker();
  const cases = [
    ["jw-marriott-shenzhen-huafa-snow-world", "226", "深圳华发冰雪世界 JW 万豪酒店项目资料图"],
    ["pullman-shangrao-guangfeng", "231", "上饶广丰铂尔曼酒店项目资料图"],
    ["grand-hyatt-suzhou-financial-street", "228", "苏州金融街君悦酒店项目资料图"],
    ["doubletree-nantong-haimen", "229", "南通海门希尔顿逸林酒店项目资料图"],
    ["yangzhou-riverfront-lighting", "220", "扬州经开区一河两岸项目概念资料图"],
    ["china-smart-road-lighting-conference-2026", "225", "中国智慧道路照明大会现场资料图"],
  ];

  for (const [slug, sourceId, imageAlt] of cases) {
    const response = await render(worker, `/cases/${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /企业资料图集/, slug);
    assert.match(html, new RegExp(`企业知识库文章[\\s\\S]{0,40}${sourceId}`), slug);
    assert.match(html, /不作为(?:夜景)?完工证明|不属于工程完工案例/, slug);
    assert.match(html, new RegExp(imageAlt), slug);
  }
});

test("content ledger blocks pending products from public SEO routes", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/governance/content-ledger.json", import.meta.url), "utf8"));
  const publishedProducts = JSON.parse(readFileSync(new URL("../content/governance/published-products.json", import.meta.url), "utf8"));
  const pendingProducts = ledger.filter((item) => item.content_type === "产品" && item.review_status === "待审核");
  const approvedProducts = ledger.filter((item) => item.content_type === "产品" && item.review_status === "已审核" && item.sale_status === "在售" && item.fact_status === "已核实" && item.image_authorization === "企业商城渠道素材");
  const approvedCases = ledger.filter((item) => item.content_type === "案例" && item.review_status === "已审核" && item.fact_status === "已核实" && item.image_status === "完整");
  assert.equal(pendingProducts.length, 75);
  assert.equal(approvedProducts.length, 25);
  assert.equal(publishedProducts.length, 25);
  assert.equal(new Set([...pendingProducts, ...approvedProducts].map((item) => item.source_id)).size, 100);
  assert.equal(approvedCases.length, 6);

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  for (const item of approvedCases) assert.match(xml, new RegExp(item.seo_slug.replaceAll("/", "\\/")), item.seo_slug);
  for (const item of approvedProducts) assert.match(xml, new RegExp(item.seo_slug.replaceAll("/", "\\/")), item.seo_slug);
  for (const item of pendingProducts) assert.doesNotMatch(xml, new RegExp(item.seo_slug.replaceAll("/", "\\/")), item.seo_slug);
});

test("renders all 25 published product detail pages with parameters and Product schema", async () => {
  const worker = await createWorker();
  const products = JSON.parse(readFileSync(new URL("../content/governance/published-products.json", import.meta.url), "utf8"));
  for (const product of products) {
    const response = await render(worker, product.seo_slug);
    assert.equal(response.status, 200, product.seo_slug);
    const html = await response.text();
    assert.match(html, new RegExp(product.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), product.seo_slug);
    assert.match(html, /产品参数/);
    assert.match(html, /安装与选型提示/);
    assert.match(html, /"@type":"Product"/);
    assert.match(html, new RegExp(`source=product-${product.source_id}`));
    assert.doesNotMatch(html, /undefined-/i);
  }
});

test("server-presets and records consultation context", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/contact?source=home-hero&scene=home-health&intent=space-advice");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /已匹配：家庭健康光/);
  assert.match(html, /<input(?=[^>]*name="source")(?=[^>]*value="home-hero")[^>]*>/i);
  assert.match(html, /<input(?=[^>]*name="scene")(?=[^>]*value="home-health")[^>]*>/i);
  assert.match(html, /<input(?=[^>]*name="intent")(?=[^>]*value="space-advice")[^>]*>/i);
  assert.match(html, /<input(?=[^>]*name="direction")(?=[^>]*value="home")(?=[^>]*checked)[^>]*>/i);
  assert.match(html, /80㎡三居，准备改造客餐厅照明/);
});

test("renders search entry points in desktop and mobile navigation", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<a(?=[^>]*href="\/search")(?=[^>]*aria-label="搜索钜豪网站")[^>]*>/i);
  assert.match(html, /<nav[^>]+aria-label="移动端导航"[\s\S]*?<a[^>]+href="\/search"[^>]*>[\s\S]*?站内搜索[\s\S]*?<\/a>/i);
});

test("renders the grouped footer information architecture", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const label of ["品牌导航", "照明解决方案导航", "服务与合作导航", "内容与联系导航", "法律信息"]) {
    assert.match(html, new RegExp(`<nav[^>]+aria-label="${label}"`, "i"), label);
  }
  for (const path of ["/solutions/residential", "/solutions/hospitality", "/smart-home", "/downloads", "/news", "/search", "/contact", "/legal", "/privacy"]) {
    assert.match(html, new RegExp(`href="${path}"`), path);
  }
  assert.match(html, /<nav[^>]+aria-label="咨询路径"/i);
  for (const label of ["家庭健康光", "工程项目", "渠道合作"]) assert.match(html, new RegExp(label));
  assert.match(html, /好房子，光健康。/);
});

test("server-renders the accessible about brand carousel", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /role="region"[^>]+aria-roledescription="carousel"[^>]+aria-label="钜豪品牌场景轮播"/i);
  for (const title of ["先理解人，再设计光", "让每一种空间，有自己的光", "把长期使用，放进设计里"]) {
    assert.match(html, new RegExp(title), title);
  }
  assert.match(html, /aria-label="暂停自动播放"/i);
  assert.match(html, /aria-label="上一张"/i);
  assert.match(html, /aria-label="下一张"/i);
});

test("keeps incomplete and utility pages out of the index", async () => {
  const worker = await createWorker();
  const noindexRoutes = [
    "/about/join",
    "/mall",
    "/sustainability",
    "/downloads",
    "/search",
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
  assert.match(xml, /https:\/\/juhao\.com\/contact/);
  assert.match(xml, /https:\/\/juhao\.com\/(?:about\/history|service|partners)/);
  assert.doesNotMatch(xml, /https:\/\/juhao\.com\/(?:mall|sustainability|downloads|search|legal|privacy)/);
});

test("publishes verified history, honors, service network and cooperation content", async () => {
  const worker = await createWorker();
  const history = await render(worker, "/about/history");
  const historyHtml = await history.text();
  for (const marker of ["2020", "钜豪智慧家庭正式发布", "2026", "品牌荣誉", "工程照明品牌 TOP10"]) assert.match(historyHtml, new RegExp(marker));
  assert.doesNotMatch(historyHtml, /待企业档案核验|年份待核验|时间线骨架/);

  const service = await render(worker, "/service");
  const serviceHtml = await service.text();
  for (const marker of ["总部服务窗口", "商城与订单服务", "工程项目支持", "经销商协作", "400-0760-888"]) assert.match(serviceHtml, new RegExp(marker));
  assert.doesNotMatch(serviceHtml, /Mock|示例服务点|非正式网点/);

  const partners = await render(worker, "/partners");
  const partnersHtml = await partners.text();
  for (const marker of ["经销商合作", "工程项目合作", "供应商合作", "官网与商城分工", "经销商登录"]) assert.match(partnersHtml, new RegExp(marker));
  assert.doesNotMatch(partnersHtml, /Mock|区域信息示例状态/);
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

  const login = await render(worker, "/login.html");
  assert.equal(login.status, 308);
  assert.equal(login.headers.get("location"), "https://mall.juhao.com/login.html");

  const register = await render(worker, "/register.html");
  assert.equal(register.status, 308);
  assert.equal(register.headers.get("location"), "https://mall.juhao.com/register.html");

  const forget = await render(worker, "/forget.html");
  assert.equal(forget.status, 308);
  assert.equal(forget.headers.get("location"), "https://mall.juhao.com/forget.html");

  const legacyHome = await render(worker, "/index.html");
  assert.equal(legacyHome.status, 308);
  assert.equal(new URL(legacyHome.headers.get("location"), "http://localhost").pathname, "/");
});

test("returns 410 for confirmed spam URLs", async () => {
  const worker = await createWorker();
  for (const path of ["/static/news/9062.html", "/static/news/1689.html", "/static/news/1022.html", "/static/news/3649.html", "/static/news/5795.html", "/static/news/8058.html"]) {
    const response = await render(worker, path);
    assert.equal(response.status, 410, path);
    assert.match(response.headers.get("x-robots-tag") || "", /noindex/i, path);
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
