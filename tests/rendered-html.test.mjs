import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REMOVED_PROFESSIONAL_ARTICLE_ROUTES } from "./fixtures/removed-professional-article-routes.mjs";

globalThis.__cloudflareTestEnv = {};

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

async function renderSecure(worker, path) {
  return worker.fetch(
    new Request(`https://juhao.com${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function structuredData(html) {
  return [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [value];
    });
}

function normalizeRenderedImageSource(value) {
  const url = new URL(value.replaceAll("&amp;", "&"), "http://localhost");
  return url.pathname === "/_vinext/image" ? (url.searchParams.get("url") ?? url.pathname) : url.pathname;
}

function mainVisualSources(html) {
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? "";
  const sources = [...main.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)]
    .map((match) => normalizeRenderedImageSource(match[1]));
  for (const styleMatch of main.matchAll(/\bstyle="([^"]*)"/gi)) {
    for (const pathMatch of styleMatch[1].matchAll(/\/images\/[A-Za-z0-9._-]+\.(?:webp|png|jpe?g)/gi)) {
      sources.push(pathMatch[0]);
    }
  }
  return sources;
}

class FakeD1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.startsWith("DELETE FROM consultation_leads")) {
      const before = this.database.rows.size;
      for (const [key, row] of this.database.rows) if (row.expires_at < this.values[0]) this.database.rows.delete(key);
      return { meta: { changes: before - this.database.rows.size } };
    }
    if (this.sql.startsWith("DELETE FROM consultation_rate_limits")) {
      const before = this.database.rateLimits.size;
      for (const [key, row] of this.database.rateLimits) if (row.expiresAt < this.values[0]) this.database.rateLimits.delete(key);
      return { meta: { changes: before - this.database.rateLimits.size } };
    }
    if (this.sql.startsWith("INSERT INTO consultation_leads")) {
      const clientRequestId = this.values[1];
      if (this.database.rows.has(clientRequestId)) return { meta: { changes: 0 } };
      const columns = ["id", "client_request_id", "request_hash", "direction", "source", "source_detail", "scene", "intent", "project", "stage", "need", "contact_name", "contact_channel", "contact_value", "privacy_version", "consent_at", "status", "notification_status", "notification_attempts", "notification_last_error", "notification_last_attempt_at", "notification_next_attempt_at", "created_at", "expires_at"];
      this.database.rows.set(clientRequestId, Object.fromEntries(columns.map((column, index) => [column, this.values[index]])));
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE consultation_leads")) {
      const row = [...this.database.rows.values()].find((item) => item.id === this.values[4]);
      if (row) {
        row.notification_status = this.values[0];
        row.notification_attempts += 1;
        row.notification_last_error = this.values[1];
        row.notification_last_attempt_at = this.values[2];
        row.notification_next_attempt_at = this.values[3];
      }
      return { meta: { changes: row ? 1 : 0 } };
    }
    throw new Error(`Unexpected SQL: ${this.sql}`);
  }

  async first() {
    if (this.sql.startsWith("INSERT INTO consultation_rate_limits")) {
      const [keyHash, windowStartedAt, expiresAt] = this.values;
      const current = this.database.rateLimits.get(keyHash);
      const next = !current || current.expiresAt <= windowStartedAt
        ? { requestCount: 1, expiresAt }
        : { requestCount: current.requestCount + 1, expiresAt: current.expiresAt };
      this.database.rateLimits.set(keyHash, next);
      return next;
    }
    if (this.sql.startsWith("SELECT id, client_request_id")) {
      const row = this.database.rows.get(this.values[0]);
      return row ? { id: row.id, client_request_id: row.client_request_id, request_hash: row.request_hash, submitted_at: row.created_at } : null;
    }
    if (this.sql.startsWith("SELECT id, created_at AS submitted_at")) {
      const row = [...this.database.rows.values()].find((item) => item.id === this.values[0]);
      return row && row.expires_at >= this.values[1] ? { id: row.id, submitted_at: row.created_at } : null;
    }
    throw new Error(`Unexpected SQL: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("notification_status IN ('pending', 'retry')")) {
      const [now, limit] = this.values;
      const results = [...this.database.rows.values()]
        .filter((row) => ["pending", "retry"].includes(row.notification_status) && (!row.notification_next_attempt_at || row.notification_next_attempt_at <= now))
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
        .slice(0, limit)
        .map((row) => ({
          id: row.id,
          clientRequestId: row.client_request_id,
          requestHash: row.request_hash,
          direction: row.direction,
          source: row.source,
          sourceDetail: row.source_detail,
          scene: row.scene,
          intent: row.intent,
          project: row.project,
          stage: row.stage,
          need: row.need,
          contactName: row.contact_name,
          contactChannel: row.contact_channel,
          contactValue: row.contact_value,
          privacyVersion: row.privacy_version,
          consentAt: row.consent_at,
          status: row.status,
          notificationStatus: row.notification_status,
          notificationAttempts: row.notification_attempts,
          notificationLastError: row.notification_last_error,
          notificationLastAttemptAt: row.notification_last_attempt_at,
          notificationNextAttemptAt: row.notification_next_attempt_at,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        }));
      return { results };
    }
    throw new Error(`Unexpected SQL: ${this.sql}`);
  }
}

class FakeD1 {
  constructor() {
    this.rows = new Map();
    this.rateLimits = new Map();
  }

  prepare(sql) {
    return new FakeD1Statement(this, sql);
  }
}

async function postContact(worker, database, payload, origin = "http://localhost", runtime = {}, requestHeaders = {}) {
  for (const key of Object.keys(globalThis.__cloudflareTestEnv)) delete globalThis.__cloudflareTestEnv[key];
  Object.assign(globalThis.__cloudflareTestEnv, { DB: database, ...runtime });
  return worker.fetch(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin,
        "CF-Connecting-IP": "203.0.113.10",
        ...requestHeaders,
      },
      body: JSON.stringify(payload),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB: database, ...runtime },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const PUBLIC_CONTACT_RUNTIME = {
  PUBLIC_INTAKE_READY: "true",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
  CONTACT_EDGE_RATE_LIMIT_VERIFIED: "true",
  JUHAO_LEAD_RATE_LIMIT_SECRET: "test-rate-limit-secret-at-least-32-characters",
  JUHAO_LEAD_WEBHOOK_URL: "https://hooks.juhao.test/leads",
  JUHAO_LEAD_WEBHOOK_SECRET: "webhook-secret",
  JUHAO_LEAD_MAINTENANCE_SECRET: "maintenance-secret",
};

function publicContactPayload(clientRequestId, turnstileToken = "turnstile-token") {
  return {
    direction: "home",
    source: "home-hero",
    scene: "home-health",
    intent: "space-advice",
    project: "三居室家庭照明规划",
    stage: "planning",
    need: "希望改善客餐厅不同活动下的照明层次",
    contactName: "林女士",
    contactChannel: "email",
    contactValue: "lin@example.com",
    consent: true,
    privacyVersion: "2026-07-18",
    clientRequestId,
    turnstileToken,
  };
}

async function runContactMaintenance(worker, database, runtime = {}, token = "maintenance-secret") {
  for (const key of Object.keys(globalThis.__cloudflareTestEnv)) delete globalThis.__cloudflareTestEnv[key];
  Object.assign(globalThis.__cloudflareTestEnv, { DB: database, ...runtime });
  return worker.fetch(
    new Request("http://localhost/api/contact/maintenance", {
      method: "POST",
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB: database, ...runtime },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders published private-preview content", async () => {
  const worker = await createWorker();
  const routes = [
    ["/", "好房子", "钜豪照明官网"],
    ["/about", "关于钜豪照明", "关于钜豪"],
    ["/solutions/residential", "全屋照明解决方案", "健康家居光环境"],
    ["/smart-home", "智能家居照明解决方案", "钜豪智能"],
    ["/news/guangzhou-international-lighting-exhibition-2026", "2026 广州光亚展", "钜豪照明企业动态"],
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

test("does not repeat visual sources inside published main content", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/runtime/publication-ledger.json", import.meta.url), "utf8"));
  const routes = [...new Set(ledger.filter((item) => item.publish_status === "published").map((item) => item.route))];
  assert.equal(routes.length, 81);

  for (const path of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const sources = mainVisualSources(await response.text());
    const seen = new Set();
    const duplicates = [...new Set(sources.filter((source) => seen.has(source) || !seen.add(source)))];
    assert.deepEqual(duplicates, [], `${path}: repeated visual sources ${duplicates.join(", ")}`);
  }
});

test("does not reuse generic scene images across published main content", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/runtime/publication-ledger.json", import.meta.url), "utf8"));
  const routes = [...new Set(ledger.filter((item) => item.publish_status === "published").map((item) => item.route))];
  const placements = new Map();

  for (const path of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const sources = new Set(mainVisualSources(await response.text()).filter((source) => source.startsWith("/images/")));
    for (const source of sources) placements.set(source, [...(placements.get(source) ?? []), path]);
  }

  const repeated = [...placements].filter(([, paths]) => paths.length > 1);
  assert.deepEqual(repeated, [], repeated.map(([source, paths]) => `${source}: ${paths.join(", ")}`).join("\n"));
});

test("adds the baseline security headers to worker responses", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.match(response.headers.get("content-security-policy") ?? "", /challenges\.cloudflare\.com/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
});

test("uses a per-response script nonce instead of unsafe-inline on HTTPS", async () => {
  const worker = await createWorker();
  const response = await renderSecure(worker, "/");
  const html = await response.text();
  const policy = response.headers.get("content-security-policy") ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  assert.match(policy, /script-src[^;]*'strict-dynamic'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  assert.ok(scriptTags.length > 0);
  for (const tag of scriptTags) assert.match(tag, new RegExp(`\\bnonce=["']${nonce}["']`));
});

test("falls back to same-origin images when local optimization bindings are unavailable", async () => {
  const worker = await createWorker();
  const local = await worker.fetch(
    new Request("http://localhost/_vinext/image?url=%2Fimages%2Fjuhao-public.webp&w=640&q=75"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(local.status, 307);
  assert.equal(new URL(local.headers.get("location")).pathname, "/images/juhao-public.webp");

  const external = await worker.fetch(
    new Request("http://localhost/_vinext/image?url=https%3A%2F%2Fexample.com%2Fimage.jpg&w=640&q=75"),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(external.status, 503);
  assert.equal(external.headers.get("location"), null);
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

test("discloses the public consultation security data flow and cleanup boundary", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/privacy");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of [
    "2026-07-18",
    "Turnstile 单次令牌",
    "访客网络地址",
    "Cloudflare Siteverify",
    "不作为本站回访线索字段保存",
    "约 10 分钟",
    "下一次每日维护",
    "任务恢复后补清理",
  ]) {
    assert.match(html, new RegExp(text), text);
  }
});

test("renders independent feature structures instead of the generic fallback", async () => {
  const worker = await createWorker();
  const routes = [
    ["/about", "从一束光，抵达完整的人居体验"],
    ["/about/history", "公开发展节点"],
    ["/solutions", "按真实场景进入方案"],
    ["/solutions/commercial", "场景关联资料"],
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
  assert.doesNotMatch(residentialHtml, /"@type":"FAQPage"/);

  const article = await render(worker, "/news/guangzhou-international-lighting-exhibition-2026");
  const articleHtml = await article.text();
  assert.match(articleHtml, /property="og:site_name" content="钜豪照明 JUHAO"/i);
  assert.doesNotMatch(articleHtml, /property="article:published_time"/i);
  assert.match(articleHtml, /property="og:image" content="https:\/\/juhao\.com\/og\/news--guangzhou-international-lighting-exhibition-2026-[a-f0-9]{8}\.jpg"/i);
  assert.match(articleHtml, /来源记录 #232/);
  assert.match(articleHtml, /待企业内容负责人复核/);
  assert.doesNotMatch(articleHtml, /"@type":"Article"/);
});

test("renders company news from conservative source facts without publishing blocked media", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/news/guangzhou-international-lighting-exhibition-2026");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const marker of ["2026 广州光亚展", "来源日期", "2026-06-11", "来源记录 #232", "当前阶段", "公开边界", "14 个图片候选", "待企业内容负责人复核"]) {
    assert.match(html, new RegExp(marker), marker);
  }
  assert.match(html, /property="og:image" content="https:\/\/juhao\.com\/og\/news--guangzhou-international-lighting-exhibition-2026-[a-f0-9]{8}\.jpg"/i);
  assert.doesNotMatch(html, /6a2a71c2e9cb3_thumb\.JPG|"@type":"Article"/);
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
  assert.doesNotMatch(html, /data-route-curtain|LIGHTING FOR BETTER LIVING[^<]*<\/span>[^<]*LOADING/i);
});

test("renders three tracked consultation paths without demo copy", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<meta[^>]+name="viewport"[^>]+viewport-fit=cover/i);
  for (const marker of ["获取户型 / 空间建议", "提交项目需求", "了解合作条件"]) assert.match(html, new RegExp(marker));
  for (const source of ["home-hero", "home-contact"]) assert.match(html, new RegExp(`source=${source}`));
  for (const marker of ["产品中心", "工程案例", "商城采购", "经销商入口"]) assert.match(html, new RegExp(marker));
  assert.match(html, /href="\/mall"/);
  assert.doesNotMatch(html, /正式能力与开放范围|商品、订单、客户与服务边界以企业确认为准|后续确认的信息为准/);
});

test("publishes private-preview product topics and stage-labelled project pages", async () => {
  const worker = await createWorker();
  const routes = [
    ["/products", "页面只呈现企业知识库与商城中可核对的字段", "照明产品中心"],
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
    assert.match(html, /content="noindex, follow"/i, path);
    assert.match(html, /<link[^>]+rel="canonical"/i, path);
  }

  const caseDetail = await render(worker, "/cases/jw-marriott-shenzhen-huafa-snow-world");
  const caseHtml = await caseDetail.text();
  for (const marker of ["方案范围", "产品方向清单", "完工资料状态", "最终产品型号清单：待项目组确认"]) assert.match(caseHtml, new RegExp(marker));
  assert.match(caseHtml, /项目事实证据刻度/);
  assert.match(caseHtml, /data-case-mode="spatial"/);
  assert.match(caseHtml, /data-light-field="case"/);

  const casesPage = await render(worker, "/cases");
  assert.match(await casesPage.text(), /项目证据档案/);

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  assert.doesNotMatch(xml, /https:\/\/juhao\.com\/products\/spotlights/);
  assert.doesNotMatch(xml, /https:\/\/juhao\.com\/cases\/jw-marriott-shenzhen-huafa-snow-world/);
});

test("renders source-labelled evidence galleries for all six project pages", async () => {
  const worker = await createWorker();
  const cases = [
    ["jw-marriott-shenzhen-huafa-snow-world", "226", "深圳华发冰雪世界 JW 万豪酒店建筑方案效果图"],
    ["pullman-shangrao-guangfeng", "231", "上饶广丰铂尔曼酒店建筑方案效果图"],
    ["grand-hyatt-suzhou-financial-street", "228", "苏州金融街君悦酒店正文资料图 02"],
    ["doubletree-nantong-haimen", "229", "南通海门希尔顿逸林酒店正文资料图 02"],
    ["yangzhou-riverfront-lighting", "220", "扬州经开区一河两岸正文资料图 02"],
    ["xingtai-financial-center", "199", "邢台金融中心正文资料图 02"],
  ];

  for (const [slug, sourceId, imageAlt] of cases) {
    const response = await render(worker, `/cases/${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.match(html, /企业资料图集/, slug);
    assert.match(html, new RegExp(`企业知识库文章[\\s\\S]{0,40}${sourceId}`), slug);
    assert.match(html, /不作为[^<]{0,40}(?:夜景)?完工证明/, slug);
    assert.match(html, new RegExp(imageAlt), slug);
    assert.match(html, /项目事实证据刻度/, slug);
    assert.match(html, /data-light-field="case"/, slug);
  }

  const retiredConferenceCase = await render(worker, "/cases/china-smart-road-lighting-conference-2026");
  assert.equal(retiredConferenceCase.status, 404);
});

test("renders conservative source evidence for the four audited project pages", async () => {
  const worker = await createWorker();
  const detailedCases = [
    ["/cases/grand-hyatt-suzhou-financial-street", "2026-04-08", "23 张", ["大堂", "大堂吧", "全日餐厅", "大宴会厅", "小宴会厅", "中餐厅", "嘉宾轩", "客房"]],
    ["/cases/xingtai-financial-center", "2024-12-03", "15 张", ["会议中心门厅", "多功能厅", "企业接待中心门厅", "酒店大堂", "全日餐厅", "包厢", "贵宾接待室", "客房"]],
  ];

  for (const [path, sourceDate, imageCount, spaces] of detailedCases) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    for (const marker of ["来源日期", sourceDate, "正文图数", imageCount, "事实边界", "媒体授权", "已确认，与尚待补齐", "按空间拆解方案方向", "当前站点媒体批次授权已登记", ...spaces]) {
      assert.match(html, new RegExp(marker), `${path}: ${marker}`);
    }
    assert.match(html, /<picture[^>]+data-media-id="media-[a-f0-9]+"/i, path);
    assert.match(html, /<source[^>]+type="image\/avif"[^>]+srcset="\/media\/derived\//i, path);
    assert.doesNotMatch(html, /juhao-oss|\.aliyuncs\.com/i, path);
    assert.equal((html.match(/class="[^\"]*caseSpaces[^\"]*"/g) ?? []).length, 1, path);
  }

  for (const [path, sourceDate, imageCount] of [
    ["/cases/doubletree-nantong-haimen", "2026-04-10", "11 张"],
    ["/cases/yangzhou-riverfront-lighting", "2025-12-10", "4 张"],
  ]) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    for (const marker of ["来源日期", sourceDate, "正文图数", imageCount, "事实边界", "媒体授权", "已确认，与尚待补齐", "来源正文未提供明确空间分节", "不根据图片内容推断空间名称或用途", "当前站点媒体批次授权已登记"]) {
      assert.match(html, new RegExp(marker), `${path}: ${marker}`);
    }
    assert.match(html, /<picture[^>]+data-media-id="media-[a-f0-9]+"/i, path);
    assert.doesNotMatch(html, /juhao-oss|\.aliyuncs\.com/i, path);
    assert.doesNotMatch(html, /按空间拆解方案方向/, path);
    assert.match(html, /data-case-mode="archive"/, path);
    assert.match(html, /档案证据扫描/, path);
  }

  const yangzhou = await render(worker, "/cases/yangzhou-riverfront-lighting");
  const yangzhouHtml = await yangzhou.text();
  assert.equal((yangzhouHtml.match(/<figure/g) ?? []).length, 3, "220 uses each remaining body image once instead of padding the gallery");
  const yangzhouMediaIds = [...yangzhouHtml.matchAll(/<picture[^>]+data-media-id="(media-[a-f0-9]+)"/g)].map((match) => match[1]);
  for (const mediaId of ["media-8722229d5ba7c13aba4d", "media-328b5a2e6a8e01c7e972", "media-e3dd34a2aa9b6b2493df"]) {
    assert.equal(yangzhouMediaIds.filter((value) => value === mediaId).length, 1, `220 media ${mediaId} is not repeated`);
  }
  assert.equal(new Set(yangzhouMediaIds).size, yangzhouMediaIds.length, "220 uses each approved local media record once");
  assert.match(yangzhouHtml, /src="\/media\/derived\/[a-f0-9]+-w\d+\.webp"/i);
});

test("deepens three flagship topics without inventing missing product facts", async () => {
  const worker = await createWorker();
  const topics = [
    ["/products/spotlights", ["先按空间任务选", "只对照已确认字段", "光束角", "正式资料待补充", "深杯射灯一定不眩光吗"]],
    ["/products/ceiling-lights", ["客厅会客与观影", "光源数量（商城原字段）", "显色指数", "全屋必须统一一个色温吗"]],
    ["/products/smart-home-devices", ["当前 0 款候选设备完成协议、供电、安装、兼容与售后资料审核", "断网后的实体控制", "结构化参数", "为什么专题暂时没有产品"]],
  ];

  for (const [path, markers] of topics) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    for (const marker of markers) assert.match(html, new RegExp(marker), `${path}: ${marker}`);
    assert.match(html, /CONTENT STATUS/);
    assert.doesNotMatch(html, /VERIFIED STATUS/);
    if (path !== "/products/smart-home-devices") {
      assert.match(html, /SOURCE FIELD COMPARISON/);
      assert.doesNotMatch(html, /VERIFIED COMPARISON/);
    }
    if (path !== "/products/smart-home-devices") assert.match(html, /语义化资料图片/);
    else assert.doesNotMatch(html, /语义化资料图片/);
    assert.match(html, /先按空间任务选/);
    assert.match(html, /关联应用与项目资料/);
    assert.doesNotMatch(html, /用知识内容理解选型|知识资料：/);
    for (const removedRoute of REMOVED_PROFESSIONAL_ARTICLE_ROUTES) assert.doesNotMatch(html, new RegExp(removedRoute), `${path}: ${removedRoute}`);
    assert.doesNotMatch(html, /"@type":"FAQPage"/);
    assert.match(html, /<img(?=[^>]*alt=)(?=[^>]*width=)(?=[^>]*height=)[^>]*>/i);
    if (path !== "/products/smart-home-devices") assert.match(html, /查看产品详情/);
  }

  const smart = await render(worker, "/products/smart-home-devices");
  assert.doesNotMatch(await smart.text(), /查看产品详情/);
});

test("builds evidence chains for the two flagship project records", async () => {
  const worker = await createWorker();
  const cases = [
    ["/cases/jw-marriott-shenzhen-huafa-snow-world", "企业知识库文章 226"],
    ["/cases/pullman-shangrao-guangfeng", "企业知识库文章 231"],
  ];

  for (const [path, source] of cases) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    for (const marker of ["已确认，与尚待补齐", "按空间拆解方案方向", "非完工实拍", "不代表项目最终采用", source]) {
      assert.match(html, new RegExp(marker), `${path}: ${marker}`);
    }
    assert.equal((html.match(/<figure/g) ?? []).length, 8, path);
    assert.equal((html.match(/非完工实拍/g) ?? []).length >= 8, true, path);
    assert.match(html, /<img(?=[^>]*alt="[^"]*方案效果图)(?=[^>]*width="800")(?=[^>]*height="\d+")[^>]*>/i, path);
    assert.doesNotMatch(html, /当前阶段[^<]{0,40}已完工|stage[^<]{0,40}已完工/i, path);
  }
});

test("surfaces verified homepage evidence and three content lines", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/");
  const html = await response.text();
  for (const marker of ["31", "私有预览产品详情", "6", "阶段透明的项目档案", "5 个发展资料节点", "企业动态", "项目动态"]) {
    assert.match(html, new RegExp(marker), marker);
  }
  assert.match(html, /<strong>8<\/strong><span>钜豪企业与项目资讯<\/span><small>企业知识库来源记录<\/small>/);
  assert.doesNotMatch(html, /33 篇已审核知识文章|已审核知识文章|JUHAO 内部审核|照明知识/);
  assert.match(html, /企业资料 #226/);
  assert.match(html, /企业资料 #199 \/ #220 \/ #226 \/ #228 \/ #229 \/ #231/);
  assert.doesNotMatch(html, /<strong>5<\/strong><span>有来源的品牌荣誉<\/span>/);
});

test("content ledger separates private routes, search and SEO approval", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/governance/content-ledger.json", import.meta.url), "utf8"));
  const publishedProducts = JSON.parse(readFileSync(new URL("../content/governance/published-products.json", import.meta.url), "utf8"));
  const pendingProducts = ledger.filter((item) => item.content_type === "产品" && item.publish_status !== "published");
  const previewProducts = ledger.filter((item) => item.content_type === "产品" && item.publish_status === "published");
  const previewCases = ledger.filter((item) => item.content_type === "案例" && item.publish_status === "published");
  const productRecords = ledger.filter((item) => item.content_type === "产品");
  assert.ok(pendingProducts.length > 0, "the review queue should retain unpublished products");
  assert.ok(previewProducts.length >= 30, "private-preview product coverage fell below the launch baseline");
  assert.equal(publishedProducts.length, previewProducts.length);
  assert.equal(pendingProducts.length + previewProducts.length, productRecords.length);
  assert.equal(new Set(productRecords.map((item) => item.source_id)).size, productRecords.length);
  assert.ok(previewCases.length >= 6, "private-preview case coverage fell below the launch baseline");
  assert.deepEqual(new Set(previewCases.map((item) => item.source_id)), new Set(["199", "220", "226", "228", "229", "231"]));
  assert.equal(previewCases.find((item) => item.source_id === "220").body_image_count, 4);
  assert.equal(previewCases.find((item) => item.source_id === "228").body_image_count, 23);
  assert.equal(previewCases.find((item) => item.source_id === "199").related_routes.includes("/solutions/commercial"), true);
  assert.equal(previewCases.find((item) => item.source_id === "220").related_routes.includes("/solutions/public"), true);
  for (const item of [...previewProducts, ...previewCases]) {
    assert.equal(item.review_status, "needs_review", item.route);
    assert.equal(item.indexable, false, item.route);
  }

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  for (const item of previewCases) assert.doesNotMatch(xml, new RegExp(item.seo_slug.replaceAll("/", "\\/")), item.seo_slug);
  for (const item of previewProducts) assert.doesNotMatch(xml, new RegExp(item.seo_slug.replaceAll("/", "\\/")), item.seo_slug);
  for (const item of pendingProducts) assert.doesNotMatch(xml, new RegExp(item.seo_slug.replaceAll("/", "\\/")), item.seo_slug);

  const privatePreview = await render(worker, previewProducts[0].route);
  assert.equal(privatePreview.status, 200);
  const unpublished = await render(worker, pendingProducts[0].route);
  assert.equal(unpublished.status, 404);
});

test("renders all private-preview product detail pages without Product schema", async () => {
  const worker = await createWorker();
  const products = JSON.parse(readFileSync(new URL("../content/governance/published-products.json", import.meta.url), "utf8"));
  for (const product of products) {
    const response = await render(worker, product.seo_slug);
    assert.equal(response.status, 200, product.seo_slug);
    const html = await response.text();
    assert.match(html, new RegExp(product.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), product.seo_slug);
    assert.match(html, /产品参数/);
    assert.match(html, /安装与选型提示/);
    assert.match(html, new RegExp(`产品资料图｜来源：企业商城商品 ${product.source_id}`));
    assert.match(html, /<figure[^>]*>[\s\S]*?<picture[^>]+data-media-id=/i);
    assert.doesNotMatch(html, /"@type":"Product"/);
    assert.match(html, /source=product-detail/);
    assert.match(html, new RegExp(`sourceDetail=${product.source_id}`));
    assert.match(html, /产品选型证据刻度/);
    if (product.topic_slug === "spotlights") {
      assert.match(html, /OPTICAL SPECIMEN \/ SOURCE IMAGE/);
      assert.match(html, /视觉光场演示 · 不代表配光、照度或色温数据/);
      assert.match(html, /data-light-field="product"/);
    } else {
      assert.doesNotMatch(html, /data-light-field="product"/);
    }
    assert.doesNotMatch(html, /undefined-/i);
  }
});

test("separates embedded source models from their visual product descriptions", async () => {
  const worker = await createWorker();
  const overview = await render(worker, "/products");
  const overviewHtml = (await overview.text()).replaceAll("<!-- -->", "");
  assert.equal(overview.status, 200);
  assert.match(overviewHtml, /120112-1000\*300L/);
  assert.match(overviewHtml, /屿光 简约现代铝材亚克力吊灯/);

  const detail = await render(worker, "/products/ceiling-lights/12380");
  const detailHtml = (await detail.text()).replaceAll("<!-- -->", "");
  assert.equal(detail.status, 200);
  assert.match(detailHtml, /120112-500\+600\+800\+500\+600\+800/);
  assert.match(detailHtml, /屿光 简约现代铝材亚克力吊灯/);
});

test("keeps visible Chinese breadcrumbs while private preview omits breadcrumb schema", async () => {
  const worker = await createWorker();
  const topics = [
    ["spotlights", "射灯与轨道照明"], ["ceiling-lights", "家居顶灯"], ["new-chinese", "新中式"], ["art-lights", "艺术灯"],
    ["crystal-chandeliers", "水晶吊灯"], ["linear-lighting", "灯带与线性照明"], ["switches", "开关电工"],
    ["outdoor-lighting", "户外照明"], ["project-custom", "工程定制"], ["smart-home-devices", "家居智能设备"],
  ];
  const cases = [
    ["jw-marriott-shenzhen-huafa-snow-world", "深圳华发冰雪世界 JW 万豪酒店"],
    ["pullman-shangrao-guangfeng", "上饶广丰铂尔曼酒店"],
    ["grand-hyatt-suzhou-financial-street", "苏州金融街君悦酒店"],
    ["doubletree-nantong-haimen", "南通海门希尔顿逸林酒店"],
    ["yangzhou-riverfront-lighting", "扬州经开区“一河两岸”户外亮化工程"],
    ["xingtai-financial-center", "邢台金融中心"],
  ];
  const products = JSON.parse(readFileSync(new URL("../content/governance/published-products.json", import.meta.url), "utf8"));
  const topicNames = new Map(topics);

  async function assertBreadcrumb(path, expectedNames) {
    const response = await render(worker, path);
    const html = await response.text();
    for (const name of expectedNames) assert.match(html, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${path}: ${name}`);
    assert.equal(structuredData(html).some((item) => item["@type"] === "BreadcrumbList"), false, `${path} has private-preview BreadcrumbList`);
  }

  for (const [slug, title] of topics) await assertBreadcrumb(`/products/${slug}`, ["首页", "产品中心", title]);
  for (const product of products) await assertBreadcrumb(product.seo_slug, ["首页", "产品中心", topicNames.get(product.topic_slug), product.title]);
  for (const [slug, title] of cases) await assertBreadcrumb(`/cases/${slug}`, ["首页", "工程案例", title]);
});

test("search covers ledger-searchable routes without inheriting sitemap state", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/governance/content-ledger.json", import.meta.url), "utf8"));
  const paths = ledger
    .filter((item) => item.publish_status === "published" && item.searchable)
    .map((item) => item.route);
  assert.ok(paths.length >= 60, "searchable route coverage fell below the launch baseline");

  for (const path of paths) {
    const response = await render(worker, `/search?keywords=${encodeURIComponent(path)}`);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /data-search-results="[1-9]\d*"/, path);
    assert.match(html, new RegExp(`href="${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), path);
  }

  for (const path of ledger.filter((item) => !item.searchable).slice(0, 8).map((item) => item.route)) {
    const response = await render(worker, `/search?keywords=${encodeURIComponent(path)}`);
    const html = await response.text();
    assert.match(html, /data-search-results="0"/, path);
  }
});

test("server-renders source-labelled resources and tracked consultation on solution pages", async () => {
  const worker = await createWorker();
  const routes = [
    ["/solutions/residential", ["/products/ceiling-lights", "/products/ceiling-lights/12217"], ["产品专题", "产品资料"]],
    ["/solutions/hospitality", ["/products/spotlights", "/products/spotlights/12287", "/cases/jw-marriott-shenzhen-huafa-snow-world"], ["产品专题", "产品资料", "项目资料"]],
    ["/solutions/commercial", ["/products/spotlights", "/products/spotlights/12286", "/cases/xingtai-financial-center"], ["产品专题", "产品资料", "项目资料"]],
    ["/solutions/public", ["/products/outdoor-lighting", "/products/outdoor-lighting/11001", "/cases/yangzhou-riverfront-lighting"], ["产品专题", "产品资料", "项目资料"]],
    ["/solutions/industrial", ["/products/project-custom"], ["产品专题"]],
  ];

  for (const [path, resourcePaths, resourceKinds] of routes) {
    const response = await render(worker, path);
    const html = await response.text();
    for (const kind of resourceKinds) {
      assert.match(html, new RegExp(`data-resource-kind="${kind}"`), `${path}: ${kind}`);
    }
    for (const resourcePath of resourcePaths) assert.match(html, new RegExp(`href="${resourcePath}"`), `${path}: ${resourcePath}`);
    for (const removedRoute of REMOVED_PROFESSIONAL_ARTICLE_ROUTES) assert.doesNotMatch(html, new RegExp(removedRoute), `${path}: ${removedRoute}`);
    assert.match(html, /咨询本场景方案/, path);
    assert.match(html, /场景决策证据刻度/, path);
    assert.match(html, /空间光感演示台/, path);
    assert.match(html, /仅用于空间光感演示/, path);
    assert.match(html, /不代表照度、色温、配光或工程计算结果/, path);
    assert.match(html, /data-light-field="space"/, path);
    assert.match(html, new RegExp(`source=solutions(?:&amp;|&)scene=project(?:&amp;|&)intent=project-brief(?:&amp;|&)sourceDetail=${path.split("/").at(-1)}`), path);
    assert.doesNotMatch(html, /线性照明组合|重点照明组合|高空间照明组合|产品数据通过可替换的数据层加载/, path);
    if (path === "/solutions/residential" || path === "/solutions/industrial") {
      assert.match(html, /匹配项目资料待补/, path);
      assert.doesNotMatch(html, /data-resource-kind="项目资料"/, path);
    }
  }
});

test("renders CSS-first source trails on news and knowledge records without light-field canvas", async () => {
  const worker = await createWorker();
  const routes = [
    ["/news/guangzhou-international-lighting-exhibition-2026", "资讯来源证据刻度", "news-record"],
    ["/knowledge/232", "资料来源证据刻度", "knowledge-record"],
  ];

  for (const [path, marker, pageKind] of routes) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(marker), path);
    assert.match(html, new RegExp(`data-lightfield-page="${pageKind}"`), path);
    assert.doesNotMatch(html, /data-light-field=/, path);
  }
});

test("keeps source ids and concise unique SEO titles without private Product schema", async () => {
  const worker = await createWorker();
  const products = JSON.parse(readFileSync(new URL("../content/governance/published-products.json", import.meta.url), "utf8"));
  const titles = new Set();
  const skus = new Set();

  for (const product of products) {
    const response = await render(worker, product.seo_slug);
    const html = await response.text();
    assert.equal(structuredData(html).some((item) => item["@type"] === "Product"), false, product.seo_slug);
    assert.equal(skus.has(product.source_id), false, `duplicate source id ${product.source_id}`);
    skus.add(product.source_id);

    const documentTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
    assert.match(documentTitle, new RegExp(product.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), product.seo_slug);
    assert.match(documentTitle, new RegExp(`｜${product.topic}｜钜豪照明$`), product.seo_slug);
    assert.ok(documentTitle.length <= 48, `${product.seo_slug}: ${documentTitle}`);
    assert.equal(titles.has(documentTitle), false, `duplicate title ${documentTitle}`);
    titles.add(documentTitle);
    assert.match(html, new RegExp(`<h1>${product.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h1>`), product.seo_slug);
  }

  assert.equal(skus.size, products.length);
  assert.equal(titles.size, products.length);
});

test("keeps source dates stable while unapproved records stay out of sitemap", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/governance/content-ledger.json", import.meta.url), "utf8"));
  const response = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await response.text();
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  assert.deepEqual(blocks, []);

  const articles = ledger.filter((item) => item.content_type === "文章");
  assert.equal(articles.length, 8);
  const knowledge = articles.filter((item) => item.source_type === "knowledge_base_professional_article_review");
  const companyNews = articles.filter((item) => item.source_type === "mall_sql_jh_articles");
  assert.equal(knowledge.length, 0);
  assert.equal(companyNews.length, 8);
  for (const article of companyNews) {
    assert.equal(article.review_status, "needs_review", article.route);
    assert.equal(article.published_at, "", article.route);
    assert.match(article.publish_date, /^202[56]-\d{2}-\d{2}$/, article.route);
    assert.equal(article.index_eligible, false, article.route);
  }
  const sourceDatedRecords = ledger.filter((item) => ["产品", "案例"].includes(item.content_type));
  assert.equal(sourceDatedRecords.some((item) => item.updated_at === "2026-07-13"), false);
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
  assert.match(html, /光的任务书/);
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

test("gives every footer destination a tracked consultation next step", async () => {
  const worker = await createWorker();
  const destinations = [
    "/about", "/products", "/cases", "/about/history", "/about/join", "/healthy-light", "/sustainability",
    "/solutions", "/solutions/residential", "/solutions/hospitality", "/solutions/commercial", "/solutions/public", "/solutions/industrial",
    "/smart-home", "/service", "/partners", "/downloads", "/news", "/search", "/legal", "/privacy",
  ];

  for (const path of destinations) {
    const response = await render(worker, path);
    const html = (await response.text()).replaceAll("&amp;", "&");
    const hrefs = [...html.matchAll(/href="(\/contact\?[^\"]+)"/g)].map((match) => match[1]);
    assert.equal(hrefs.some((href) => {
      const query = new URL(href, "http://localhost").searchParams;
      return query.has("source") && query.has("scene") && query.has("intent");
    }), true, `${path}: missing tracked consultation CTA`);
  }

  const contact = await render(worker, "/contact");
  const contactHtml = await contact.text();
  assert.match(contactHtml, /id="consultation-form"/);
  assert.match(contactHtml, /选择咨询方向/);
  assert.match(contactHtml, /提交回访/);
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
  assert.doesNotMatch(xml, /<loc>/);
});

test("publishes sourced history and truthful service and cooperation states", async () => {
  const worker = await createWorker();
  const history = await render(worker, "/about/history");
  const historyHtml = await history.text();
  for (const marker of ["2020", "钜豪智慧家庭正式发布", "2026", "品牌荣誉", "工程照明品牌 TOP10"]) assert.match(historyHtml, new RegExp(marker));
  assert.doesNotMatch(historyHtml, /待企业档案核验|年份待核验|时间线骨架/);

  const service = await render(worker, "/service");
  const serviceHtml = await service.text();
  for (const marker of ["官网回访入口", "商城与订单服务", "工程项目支持", "经销商协作", "企业联系信息签核中"]) assert.match(serviceHtml, new RegExp(marker));
  assert.doesNotMatch(serviceHtml, /400-0760-888|Mock|示例服务点|非正式网点/);

  const partners = await render(worker, "/partners");
  const partnersHtml = await partners.text();
  for (const marker of ["经销商合作", "工程项目合作", "供应商合作", "官网与商城分工", "查看商城连接状态"]) assert.match(partnersHtml, new RegExp(marker));
  assert.doesNotMatch(partnersHtml, /Mock|区域信息示例状态/);
});

test("serves private-preview news pagination with independent canonicals", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/governance/content-ledger.json", import.meta.url), "utf8"));
  const articleRoutes = new Set(ledger.filter((item) => item.content_type === "文章" && item.publish_status === "published").map((item) => item.route));
  const pages = ["/news", "/news/page/2"];
  const seenArticles = new Set();

  for (const [index, path] of pages.entries()) {
    const response = await render(worker, path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    if (index > 0) assert.match(html, new RegExp(`第 ${index + 1} 页`), path);
    assert.match(html, new RegExp(`<link(?=[^>]*rel="canonical")(?=[^>]*href="https://juhao\\.com${path}")[^>]*>`, "i"), path);
    assert.doesNotMatch(html, /"@type":"CollectionPage"/, path);
    assert.match(html, /aria-label="资讯分页"/, path);
    assert.match(html, /content="noindex, follow"/i, path);
    const routesOnPage = new Set([...html.matchAll(/href="(\/news\/[a-z0-9-]+)"/g)].map((match) => match[1]).filter((route) => articleRoutes.has(route)));
    assert.equal(routesOnPage.size, index === 0 ? 6 : 2, path);
    for (const route of routesOnPage) {
      assert.equal(seenArticles.has(route), false, `${route} repeated across news pages`);
      seenArticles.add(route);
    }
  }
  assert.deepEqual([...seenArticles].sort(), [...articleRoutes].sort());

  const firstPageAlias = await render(worker, "/news/page/1");
  assert.equal(firstPageAlias.status, 308);
  assert.equal(new URL(firstPageAlias.headers.get("location"), "http://localhost").pathname, "/news");

  const outOfRange = await render(worker, "/news/page/3");
  assert.equal(outOfRange.status, 404);
  const outOfRangeHtml = await outOfRange.text();
  assert.match(outOfRangeHtml, /<meta(?=[^>]*name="robots")(?=[^>]*content="noindex")[^>]*>/i);
  assert.doesNotMatch(outOfRangeHtml, /<link[^>]+rel="canonical"/i);

  const sitemap = await render(worker, "/sitemap.xml", "application/xml");
  const xml = await sitemap.text();
  assert.doesNotMatch(xml, /https:\/\/juhao\.com\/news\/page\/2/);
});

test("returns 404 for removed professional articles without leaking them into search, ledgers, OG, or HTML", async () => {
  const worker = await createWorker();
  const ledger = JSON.parse(readFileSync(new URL("../content/governance/content-ledger.json", import.meta.url), "utf8"));
  const runtimeLedger = JSON.parse(readFileSync(new URL("../content/runtime/publication-ledger.json", import.meta.url), "utf8"));
  const routeOg = JSON.parse(readFileSync(new URL("../content/governance/route-og.json", import.meta.url), "utf8"));
  const removed = new Set(REMOVED_PROFESSIONAL_ARTICLE_ROUTES);

  for (const [label, records] of [["content ledger", ledger], ["runtime ledger", runtimeLedger], ["OG manifest", routeOg]]) {
    assert.equal(records.some(({ route }) => removed.has(route)), false, label);
  }

  const search = await render(worker, "/search?keywords=news");
  const searchHtml = await search.text();
  const publishedHtml = [];
  for (const { route } of ledger.filter(({ publish_status }) => publish_status === "published")) {
    const response = await render(worker, route);
    assert.equal(response.status, 200, route);
    publishedHtml.push(await response.text());
  }
  const serializedPublishedHtml = publishedHtml.join("\n");
  for (const route of REMOVED_PROFESSIONAL_ARTICLE_ROUTES) {
    assert.doesNotMatch(searchHtml, new RegExp(`href="${route}"`), `${route}: search`);
    assert.doesNotMatch(serializedPublishedHtml, new RegExp(route), `${route}: published HTML`);
    const response = await render(worker, route);
    assert.equal(response.status, 404, route);
    const html = await response.text();
    assert.match(html, /这里还没有内容/);
    assert.doesNotMatch(html, /<link[^>]+rel="canonical"/i, `${route}: canonical`);
    const schemas = structuredData(html).flatMap((item) => Array.isArray(item["@graph"]) ? item["@graph"] : [item]);
    for (const type of ["Article", "Product", "Service", "WebPage", "BreadcrumbList", "FAQPage", "CollectionPage"]) {
      assert.equal(schemas.some((item) => item["@type"] === type), false, `${route}: ${type} schema`);
    }
  }

  for (let page = 3; page <= 7; page += 1) {
    const response = await render(worker, `/news/page/${page}`);
    assert.equal(response.status, 404, `/news/page/${page}`);
  }
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
  ];

  for (const [source, destination] of redirects) {
    const response = await render(worker, source);
    assert.equal(response.status, 308, source);
    assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, destination, source);
  }

  for (const path of ["/login.html", "/register.html", "/forget.html"]) {
    const fallback = await render(worker, path);
    assert.equal(fallback.status, 307, path);
    assert.equal(new URL(fallback.headers.get("location"), "http://localhost").pathname, "/mall", path);
  }

  const legacyHome = await render(worker, "/index.html");
  assert.equal(legacyHome.status, 308);
  assert.equal(new URL(legacyHome.headers.get("location"), "http://localhost").pathname, "/");

  const numericRoutes = JSON.parse(readFileSync(new URL("../content/runtime/legacy-news-routes.json", import.meta.url), "utf8"));
  for (const record of numericRoutes) {
    for (const path of record.legacy_paths) {
      const response = await render(worker, path);
      assert.equal(response.status, record.status_code, path);
      if (record.action === "redirect") {
        assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, record.destination, path);
      } else {
        assert.match(response.headers.get("x-robots-tag") || "", /noindex/i, path);
      }
    }
  }
});

test("redirects the three misclassified spotlight product routes", async () => {
  const worker = await createWorker();
  for (const sourceId of ["12265", "12266", "12267"]) {
    const response = await render(worker, `/products/project-custom/${sourceId}`);
    assert.equal(response.status, 308, sourceId);
    assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, `/products/spotlights/${sourceId}`);
  }
});

test("keeps the private catalog lab on localhost and denies public hosts", async () => {
  const worker = await createWorker();
  const local = await render(worker, "/catalog-lab");
  assert.equal(local.status, 200);
  assert.match(await local.text(), /noindex/i);

  for (const path of ["/catalog-lab", "/catalog-lab/review"]) {
    const remote = await renderSecure(worker, path);
    assert.equal(remote.status, 404, path);
    assert.match(
      remote.headers.get("x-robots-tag") || "",
      /noindex,\s*nofollow,\s*noarchive/i,
      path,
    );
    assert.equal(remote.headers.get("cache-control"), "no-store", path);
  }
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
  const sitemapXml = await sitemap.text();
  assert.match(sitemapXml, /<urlset[^>]*>/);
  assert.doesNotMatch(sitemapXml, /<loc>/);

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

test("keeps consultation source and source detail separate", async () => {
  const worker = await createWorker();
  const response = await render(worker, "/contact?source=product-detail&sourceDetail=12345&scene=project&intent=project-brief");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<input(?=[^>]*name="source")(?=[^>]*value="product-detail")[^>]*>/i);
  assert.match(html, /<input(?=[^>]*name="sourceDetail")(?=[^>]*value="12345")[^>]*>/i);
  assert.match(html, /<input(?=[^>]*name="scene")(?=[^>]*value="project")[^>]*>/i);
  assert.match(html, /<input(?=[^>]*name="intent")(?=[^>]*value="project-brief")[^>]*>/i);

  const comparisonDetail = "compare-family-77b9971e550c-family-5c97ea3f5b5b";
  const comparisonResponse = await render(
    worker,
    `/contact?source=products&sourceDetail=${comparisonDetail}&scene=project&intent=project-brief`,
  );
  assert.equal(comparisonResponse.status, 200);
  const comparisonHtml = await comparisonResponse.text();
  assert.match(
    comparisonHtml,
    /<input(?=[^>]*name="source")(?=[^>]*value="products")[^>]*>/i,
  );
  assert.match(
    comparisonHtml,
    new RegExp(
      `<input(?=[^>]*name="sourceDetail")(?=[^>]*value="${comparisonDetail}")[^>]*>`,
      "i",
    ),
  );
});

test("stores same-origin contact leads with validation and idempotency", async () => {
  const worker = await createWorker();
  const database = new FakeD1();
  const payload = {
    direction: "project",
    source: "products",
    sourceDetail: "compare-family-77b9971e550c-family-5c97ea3f5b5b",
    scene: "project",
    intent: "project-brief",
    project: "1200㎡商业空间，处于方案设计阶段",
    stage: "planning",
    need: "希望改善客餐厅不同活动下的照明层次",
    contactName: "李女士",
    contactChannel: "email",
    contactValue: "user@example.com",
    consent: true,
    privacyVersion: "2026-07-18",
    clientRequestId: "550e8400-e29b-41d4-a716-446655440000",
  };

  const created = await postContact(worker, database, payload);
  assert.equal(created.status, 201);
  const receipt = await created.json();
  assert.match(receipt.id, /^JUHAO-\d{8}-[A-F0-9]{8}$/);
  assert.equal(receipt.status, "received");
  assert.equal(database.rows.size, 1);
  const stored = database.rows.get(payload.clientRequestId);
  assert.equal(stored.source, "products");
  assert.equal(
    stored.source_detail,
    "compare-family-77b9971e550c-family-5c97ea3f5b5b",
  );
  assert.equal(stored.privacy_version, "2026-07-18");
  assert.equal(stored.notification_status, "not_configured");

  const repeated = await postContact(worker, database, payload);
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).id, receipt.id);
  assert.equal(database.rows.size, 1);

  const conflict = await postContact(worker, database, { ...payload, need: `${payload.need}，并补充控制需求` });
  assert.equal(conflict.status, 409);
  assert.equal(database.rows.size, 1);

  const withoutConsent = await postContact(worker, database, { ...payload, clientRequestId: "550e8400-e29b-41d4-a716-446655440001", consent: false });
  assert.equal(withoutConsent.status, 400);
  assert.equal(database.rows.size, 1);

  const crossOrigin = await postContact(worker, database, { ...payload, clientRequestId: "550e8400-e29b-41d4-a716-446655440002" }, "https://example.com");
  assert.equal(crossOrigin.status, 403);
  assert.equal(database.rows.size, 1);

  const honeypot = await postContact(worker, database, { website: "https://spam.example" });
  assert.equal(honeypot.status, 201);
  assert.equal(database.rows.size, 1);

  const oversized = await postContact(worker, database, { ...payload, clientRequestId: "550e8400-e29b-41d4-a716-446655440003", need: "a".repeat(17_000) });
  assert.equal(oversized.status, 413);
  assert.equal(database.rows.size, 1);
});

test("notifies the configured internal webhook after storing the lead", async () => {
  const worker = await createWorker();
  const database = new FakeD1();
  let webhookRequest;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    webhookRequest = { url: input.toString(), init };
    return new Response(null, { status: 204 });
  };

  try {
    const response = await postContact(worker, database, {
      direction: "home",
      source: "home-hero",
      scene: "home-health",
      intent: "space-advice",
      project: "80㎡三居室照明改造",
      stage: "planning",
      need: "希望改善客餐厅不同活动下的照明层次",
      contactName: "王女士",
      contactChannel: "phone",
      contactValue: "138 0000 0000",
      consent: true,
      privacyVersion: "2026-07-18",
      clientRequestId: "550e8400-e29b-41d4-a716-446655440004",
    }, "http://localhost", {
      JUHAO_LEAD_WEBHOOK_URL: "https://hooks.juhao.test/leads",
      JUHAO_LEAD_WEBHOOK_SECRET: "test-secret",
    });

    assert.equal(response.status, 201);
    assert.equal(webhookRequest.url, "https://hooks.juhao.test/leads");
    assert.match(webhookRequest.init.headers["X-Juhao-Signature"], /^sha256=[0-9a-f]{64}$/);
    assert.match(webhookRequest.init.headers["Idempotency-Key"], /^JUHAO-\d{8}-[A-F0-9]{8}$/);
    const stored = database.rows.get("550e8400-e29b-41d4-a716-446655440004");
    assert.equal(stored.notification_status, "sent");
    assert.equal(stored.notification_attempts, 1);
    assert.match(stored.notification_last_attempt_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(stored.notification_next_attempt_at, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requires webhook HMAC configuration and gates only explicitly public intake", async () => {
  const worker = await createWorker();
  const payload = {
    direction: "project",
    source: "page",
    sourceDetail: "solutions-commercial",
    scene: "project",
    intent: "project-brief",
    project: "商业空间照明方案咨询",
    stage: "planning",
    need: "希望梳理重点照明与基础照明的选择边界",
    contactName: "周女士",
    contactChannel: "email",
    contactValue: "zhou@example.com",
    consent: true,
    privacyVersion: "2026-07-18",
    clientRequestId: "550e8400-e29b-41d4-a716-446655440006",
  };

  const missingSignatureDatabase = new FakeD1();
  const missingSignature = await postContact(worker, missingSignatureDatabase, payload, "http://localhost", {
    JUHAO_LEAD_WEBHOOK_URL: "https://hooks.juhao.test/leads",
  });
  assert.equal(missingSignature.status, 503);
  assert.equal(missingSignatureDatabase.rows.size, 0);

  const publicDatabase = new FakeD1();
  const missingPublicConfiguration = await postContact(worker, publicDatabase, { ...payload, clientRequestId: "550e8400-e29b-41d4-a716-446655440007" }, "http://localhost", {
    PUBLIC_INTAKE_READY: "true",
  });
  assert.equal(missingPublicConfiguration.status, 503);

  const missingTurnstile = await postContact(
    worker,
    publicDatabase,
    { ...payload, clientRequestId: "550e8400-e29b-41d4-a716-446655440008" },
    "http://localhost",
    PUBLIC_CONTACT_RUNTIME,
  );
  assert.equal(missingTurnstile.status, 403);
  assert.equal(publicDatabase.rows.size, 0);
});

test("verifies Turnstile only after the public intake gate is enabled", async () => {
  const worker = await createWorker();
  const database = new FakeD1();
  const runtime = PUBLIC_CONTACT_RUNTIME;
  const payload = publicContactPayload("550e8400-e29b-41d4-a716-446655440010", "token-one");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    calls.push(input.toString());
    if (input.toString().includes("/turnstile/v0/siteverify")) {
      return Response.json({ success: true, action: "juhao-contact", hostname: "localhost" });
    }
    return new Response(null, { status: 204 });
  };

  try {
    const created = await postContact(worker, database, payload, "http://localhost", runtime);
    assert.equal(created.status, 201);
    assert.equal(database.rows.size, 1);
    assert.equal(calls.filter((url) => url.includes("/turnstile/v0/siteverify")).length, 1);
    assert.equal(calls.filter((url) => url === runtime.JUHAO_LEAD_WEBHOOK_URL).length, 1);

    const repeated = await postContact(worker, database, { ...payload, turnstileToken: "token-two" }, "http://localhost", runtime);
    assert.equal(repeated.status, 200);
    assert.equal(database.rows.size, 1);

    for (let attempt = 3; attempt <= 8; attempt += 1) {
      const withinLimit = await postContact(worker, database, { ...payload, turnstileToken: `token-${attempt}` }, "http://localhost", runtime);
      assert.equal(withinLimit.status, 200);
    }
    const limited = await postContact(worker, database, { ...payload, turnstileToken: "token-nine" }, "http://localhost", runtime);
    assert.equal(limited.status, 429);
    assert.match(limited.headers.get("retry-after") ?? "", /^\d+$/);
    assert.equal((await limited.json()).error, "提交过于频繁，请稍后再试");

    const firstRateLimitKey = [...database.rateLimits.keys()][0];
    assert.match(firstRateLimitKey, /^[0-9a-f]{64}$/);
    assert.doesNotMatch(firstRateLimitKey, /203\.0\.113\.10/);
    const otherAddress = await postContact(
      worker,
      database,
      { ...payload, turnstileToken: "token-other-address" },
      "http://localhost",
      runtime,
      { "CF-Connecting-IP": "198.51.100.24" },
    );
    assert.equal(otherAddress.status, 200);
    assert.equal(database.rateLimits.size, 2);

    database.rateLimits.get(firstRateLimitKey).expiresAt = "2000-01-01T00:00:00.000Z";
    const resetWindow = await postContact(
      worker,
      database,
      { ...payload, turnstileToken: "token-reset-window" },
      "http://localhost",
      runtime,
    );
    assert.equal(resetWindow.status, 200);
    assert.equal(database.rateLimits.get(firstRateLimitKey).requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fails closed for missing client IP and distinguishes invalid from unavailable Turnstile", async () => {
  const worker = await createWorker();
  const database = new FakeD1();
  const originalFetch = globalThis.fetch;
  let verificationCalls = 0;

  async function attempt(id, verification, runtime = PUBLIC_CONTACT_RUNTIME, requestHeaders = {}) {
    globalThis.fetch = async (input) => {
      if (!input.toString().includes("/turnstile/v0/siteverify")) return new Response(null, { status: 204 });
      verificationCalls += 1;
      if (verification instanceof Error) throw verification;
      return verification instanceof Response ? verification : Response.json(verification);
    };
    return postContact(
      worker,
      database,
      publicContactPayload(id),
      "http://localhost",
      runtime,
      requestHeaders,
    );
  }

  try {
    const missingAddress = await attempt(
      "550e8400-e29b-41d4-a716-446655440020",
      { success: true, action: "juhao-contact", hostname: "localhost" },
      PUBLIC_CONTACT_RUNTIME,
      { "CF-Connecting-IP": "" },
    );
    assert.equal(missingAddress.status, 503);
    assert.equal(verificationCalls, 0);

    const invalidAddress = await attempt(
      "550e8400-e29b-41d4-a716-446655440021",
      { success: true, action: "juhao-contact", hostname: "localhost" },
      PUBLIC_CONTACT_RUNTIME,
      { "CF-Connecting-IP": "not-an-ip" },
    );
    assert.equal(invalidAddress.status, 503);
    assert.equal(verificationCalls, 0);

    const invalidToken = await attempt(
      "550e8400-e29b-41d4-a716-446655440022",
      { success: false, "error-codes": ["invalid-input-response"] },
    );
    assert.equal(invalidToken.status, 403);

    const wrongAction = await attempt(
      "550e8400-e29b-41d4-a716-446655440023",
      { success: true, action: "another-form", hostname: "localhost" },
    );
    assert.equal(wrongAction.status, 403);

    const wrongHostname = await attempt(
      "550e8400-e29b-41d4-a716-446655440024",
      { success: true, action: "juhao-contact", hostname: "example.com" },
      { ...PUBLIC_CONTACT_RUNTIME, TURNSTILE_ALLOWED_HOSTNAMES: "localhost,example.com" },
    );
    assert.equal(wrongHostname.status, 403);

    const internalError = await attempt(
      "550e8400-e29b-41d4-a716-446655440025",
      { success: false, "error-codes": ["internal-error"] },
    );
    assert.equal(internalError.status, 503);

    const upstreamFailure = await attempt(
      "550e8400-e29b-41d4-a716-446655440026",
      new Response(null, { status: 503 }),
    );
    assert.equal(upstreamFailure.status, 503);

    const upstreamRateLimit = await attempt(
      "550e8400-e29b-41d4-a716-446655440029",
      new Response(null, { status: 429 }),
    );
    assert.equal(upstreamRateLimit.status, 503);

    const networkFailure = await attempt(
      "550e8400-e29b-41d4-a716-446655440027",
      new Error("network unavailable"),
    );
    assert.equal(networkFailure.status, 503);

    const malformedHostnameConfiguration = await attempt(
      "550e8400-e29b-41d4-a716-446655440028",
      { success: true, action: "juhao-contact", hostname: "localhost" },
      { ...PUBLIC_CONTACT_RUNTIME, TURNSTILE_ALLOWED_HOSTNAMES: "https://localhost" },
    );
    assert.equal(malformedHostnameConfiguration.status, 503);

    const verificationCallsBeforeConfigurationGates = verificationCalls;
    const shortRateLimitSecret = await attempt(
      "550e8400-e29b-41d4-a716-446655440030",
      { success: true, action: "juhao-contact", hostname: "localhost" },
      { ...PUBLIC_CONTACT_RUNTIME, JUHAO_LEAD_RATE_LIMIT_SECRET: "too-short" },
    );
    assert.equal(shortRateLimitSecret.status, 503);
    const unverifiedEdgeRateLimit = await attempt(
      "550e8400-e29b-41d4-a716-446655440031",
      { success: true, action: "juhao-contact", hostname: "localhost" },
      { ...PUBLIC_CONTACT_RUNTIME, CONTACT_EDGE_RATE_LIMIT_VERIFIED: "false" },
    );
    assert.equal(unverifiedEdgeRateLimit.status, 503);
    assert.equal(verificationCalls, verificationCallsBeforeConfigurationGates);
    assert.equal(database.rateLimits.size, 0);
    assert.equal(database.rows.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries failed notifications, reaches dead letter, and purges without new submissions", async () => {
  const worker = await createWorker();
  const database = new FakeD1();
  const runtime = {
    JUHAO_LEAD_WEBHOOK_URL: "https://hooks.juhao.test/leads",
    JUHAO_LEAD_WEBHOOK_SECRET: "webhook-secret",
    JUHAO_LEAD_MAINTENANCE_SECRET: "maintenance-secret",
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });

  try {
    const created = await postContact(worker, database, {
      direction: "channel",
      source: "direct",
      scene: "channel",
      intent: "partnership",
      project: "佛山照明渠道合作咨询",
      stage: "understanding",
      need: "希望了解已审核产品范围和后续合作资料要求",
      contactName: "梁先生",
      contactChannel: "phone",
      contactValue: "138 0000 0000",
      consent: true,
      privacyVersion: "2026-07-18",
      clientRequestId: "550e8400-e29b-41d4-a716-446655440009",
    }, "http://localhost", runtime);
    assert.equal(created.status, 201);
    const stored = database.rows.get("550e8400-e29b-41d4-a716-446655440009");
    assert.equal(stored.notification_status, "retry");
    assert.equal(stored.notification_attempts, 1);
    assert.match(stored.notification_next_attempt_at, /^\d{4}-\d{2}-\d{2}T/);

    stored.notification_next_attempt_at = null;
    globalThis.fetch = async () => new Response(null, { status: 204 });
    const retried = await runContactMaintenance(worker, database, runtime);
    assert.equal(retried.status, 200);
    assert.deepEqual(await retried.json(), { purged: 0, rateLimitsPurged: 0, attempted: 1, sent: 1, retry: 0, deadLetter: 0, notification: "processed" });
    assert.equal(stored.notification_status, "sent");
    assert.equal(stored.notification_attempts, 2);

    stored.notification_status = "retry";
    stored.notification_attempts = 4;
    stored.notification_next_attempt_at = null;
    globalThis.fetch = async () => new Response(null, { status: 503 });
    const exhausted = await runContactMaintenance(worker, database, runtime);
    assert.equal(exhausted.status, 200);
    assert.equal((await exhausted.json()).deadLetter, 1);
    assert.equal(stored.notification_status, "dead_letter");
    assert.equal(stored.notification_attempts, 5);
    assert.equal(stored.notification_next_attempt_at, null);

    stored.expires_at = "2000-01-01T00:00:00.000Z";
    const purged = await runContactMaintenance(worker, database, { JUHAO_LEAD_MAINTENANCE_SECRET: "maintenance-secret" });
    assert.equal(purged.status, 200);
    const purgedResult = await purged.json();
    assert.equal(purgedResult.purged, 1);
    assert.equal(purgedResult.rateLimitsPurged, 0);
    assert.equal(database.rows.size, 0);

    const unauthorized = await runContactMaintenance(worker, database, { JUHAO_LEAD_MAINTENANCE_SECRET: "maintenance-secret" }, "wrong-secret");
    assert.equal(unauthorized.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verifies a stored lead before rendering the noindex contact success receipt", async () => {
  const worker = await createWorker();
  const database = new FakeD1();
  const created = await postContact(worker, database, {
    direction: "project",
    source: "direct",
    scene: "project",
    intent: "project-brief",
    project: "酒店公共空间照明项目",
    stage: "planning",
    need: "希望梳理大堂与客房的照明层次和选型边界",
    contactName: "陈先生",
    contactChannel: "phone",
    contactValue: "138 0000 0000",
    consent: true,
    privacyVersion: "2026-07-18",
    clientRequestId: "550e8400-e29b-41d4-a716-446655440005",
  });
  const receipt = await created.json();
  const response = await render(worker, `/contact/success?lead=${receipt.id}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /咨询已提交/);
  assert.match(html, new RegExp(receipt.id));
  assert.match(html, /<meta(?=[^>]*name="robots")(?=[^>]*content="noindex, nofollow, noarchive")[^>]*>/i);
  assert.doesNotMatch(html, /contactValue|contactName|user@example\.com/);

  const forged = await render(worker, "/contact/success?lead=JUHAO-20260713-12AB34CD");
  const forgedHtml = await forged.text();
  assert.match(forgedHtml, /未找到有效线索编号/);
  assert.doesNotMatch(forgedHtml, /咨询已提交/);
});

test("keeps unverified direct channels unavailable and exposes callback fields after preparation", () => {
  const source = readFileSync(new URL("../features/platform/ContactPage.tsx", import.meta.url), "utf8");
  for (const marker of ["电话、邮件和企业微信入口尚未完成企业核验", "当前不可用", "待企业核验", "提交回访", "contactChannel", "contactValue", "privacyVersion", "clientRequestId", "turnstileToken", "TurnstileWidget", "website"]) {
    assert.match(source, new RegExp(marker), marker);
  }
  assert.doesNotMatch(source, /一键拨打|新建邮件|400-0760-888|service@juhao\.com/);
});
