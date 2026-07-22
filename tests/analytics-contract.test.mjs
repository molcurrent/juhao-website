import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { analyticsActivationFailures } from "../scripts/check_launch_health.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("keeps first-party analytics disabled by default and free of visitor identifiers", () => {
  const exampleEnv = read("../.env.example");
  const client = read("../lib/analytics/client.ts");
  const route = read("../app/api/analytics/route.ts");
  const server = read("../lib/server/analytics.ts");
  const contract = read("../RECON/ANALYTICS_CONTRACT.md");

  for (const setting of [
    "NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED=false",
    "PRIVACY_ANALYTICS_WRITE_ENABLED=false",
    "ANALYTICS_D1_MIGRATION_VERIFIED=false",
    "ANALYTICS_EDGE_RATE_LIMIT_VERIFIED=false",
    "ANALYTICS_PRIVACY_APPROVED=false",
  ]) assert.match(exampleEnv, new RegExp(setting));

  assert.match(client, /globalPrivacyControl === true/);
  assert.match(client, /doNotTrack === "1"/);
  assert.match(client, /if \(!analyticsEnabled \|\| privacySignalEnabled\(\)\) return false/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|document\.cookie/);
  assert.match(route, /if \(!analyticsSettingEnabled\(env\.PRIVACY_ANALYTICS_WRITE_ENABLED\)\) return response\(204\)/);
  assert.match(route, /if \(!analyticsWriteReady\(env\) \|\| !env\.DB\) return response\(503\)/);
  assert.match(route, /eventName === "consultation_lead_created"\) return null/);
  assert.match(server, /if \(!analyticsWriteReady\(runtime\) \|\| !runtime\.DB\) return false/);
  assert.doesNotMatch(route, /CF-Connecting-IP|User-Agent|request\.headers\.get\("referer"\)/i);
  for (const excluded of ["用户/会话 ID", "IP", "联系方式", "咨询正文"]) assert.match(contract, new RegExp(excluded));
});

test("allows analytics activation only when every privacy and infrastructure gate is ready", () => {
  const off = {
    clientEnabled: false,
    writeEnabled: false,
    clientBuildVerified: false,
    d1MigrationVerified: false,
    edgeRateLimitVerified: false,
    privacyApproved: false,
  };
  assert.deepEqual(analyticsActivationFailures(off), []);
  assert.deepEqual(analyticsActivationFailures({ ...off, clientEnabled: true }), [
    "public launch blocked: analytics server writes are not enabled",
    "public launch blocked: analytics client build is not verified",
    "public launch blocked: analytics D1 migrations are not verified",
    "public launch blocked: analytics edge rate limiting is not verified",
    "public launch blocked: analytics privacy disclosure is not approved",
  ]);
  assert.deepEqual(analyticsActivationFailures({ ...off, writeEnabled: true }), [
    "public launch blocked: analytics browser collection is not enabled",
    "public launch blocked: analytics client build is not verified",
    "public launch blocked: analytics D1 migrations are not verified",
    "public launch blocked: analytics edge rate limiting is not verified",
    "public launch blocked: analytics privacy disclosure is not approved",
  ]);
  assert.deepEqual(analyticsActivationFailures({
    clientEnabled: true,
    writeEnabled: true,
    clientBuildVerified: true,
    d1MigrationVerified: true,
    edgeRateLimitVerified: true,
    privacyApproved: true,
  }), []);
});

test("pins content events to current products, current cases, and approved downloads", () => {
  const registry = JSON.parse(read("../content/governance/analytics-content-allowlist.json"));
  const products = JSON.parse(read("../content/runtime/published-products.json"));
  const catalog = read("../content/catalog.ts");
  const caseStart = catalog.indexOf("export const caseStudies = [");
  const caseEnd = catalog.indexOf("] as const;", caseStart);
  const caseIds = [...catalog.slice(caseStart, caseEnd).matchAll(/sourceId: "([^"]+)"/g)].map((match) => match[1]);
  const sortedUnique = (values) => [...new Set(values)].sort();

  assert.deepEqual(sortedUnique(registry.product_source_ids), sortedUnique(products.map((product) => product.source_id)));
  assert.deepEqual(sortedUnique(registry.case_source_ids), sortedUnique(caseIds));
  assert.deepEqual(registry.approved_download_ids, []);
  assert.equal(registry.download_state, "no_approved_downloads");
  assert.equal(registry.notice_version, "2026-07-22");

  const validator = read("../lib/analytics/content-ids.ts");
  const route = read("../app/api/analytics/route.ts");
  assert.match(validator, /caseSourceIds\.has\(contentId\)/);
  assert.match(validator, /productSourceIds\.has\(contentId\)/);
  assert.match(validator, /approvedDownloadIds\.has\(contentId\)/);
  assert.match(route, /validContentId\(eventName, input\.contentId\)/);
  assert.equal([...registry.product_source_ids, ...registry.case_source_ids].includes("arbitrary-high-cardinality-id"), false);
});

test("publishes the versioned first-party analytics disclosure before approval", () => {
  const privacyPage = read("../app/_data/contract-pages.ts");
  const events = read("../lib/analytics/events.ts");
  const contract = read("../RECON/ANALYTICS_CONTRACT.md");

  assert.match(events, /ANALYTICS_PRIVACY_NOTICE_VERSION = "2026-07-22"/);
  assert.match(privacyPage, /第一方最小分析（默认关闭）/);
  assert.match(privacyPage, /第一方最小分析披露版本均为 2026-07-22/);
  assert.match(privacyPage, /不接收或保存 Cookie、用户或会话 ID、IP、User-Agent、完整 URL、查询参数、联系方式或咨询正文/);
  assert.match(privacyPage, /第一方分析日聚合记录设置 400 日到期时间/);
  assert.match(contract, /ANALYTICS_PRIVACY_APPROVED/);
  assert.match(contract, /ANALYTICS_CLIENT_BUILD_VERIFIED/);
});

test("pins the minimal KPI event dictionary and real page instrumentation", () => {
  const events = read("../lib/analytics/events.ts");
  const contact = read("../features/platform/ContactPage.tsx");
  const product = read("../features/catalog/ProductDetailPage.tsx");
  const cases = read("../features/catalog/CatalogPages.tsx");
  const downloads = read("../features/utility/UtilityPages.tsx");

  for (const event of [
    "consultation_form_view",
    "consultation_form_started",
    "consultation_submit_success",
    "consultation_lead_created",
    "case_detail_view",
    "case_depth_reached",
    "product_detail_view",
    "product_consultation_click",
    "download_requested",
  ]) assert.match(events, new RegExp(`"${event}"`));

  const contactRoute = read("../app/api/contact/route.ts");
  assert.match(contact, /const nextReceipt = await submitContact[\s\S]*?name: "consultation_submit_success"/);
  assert.match(contactRoute, /insertConsultationLead[\s\S]*?name: "consultation_lead_created"/);
  assert.match(product, /name: "product_detail_view"/);
  assert.match(product, /name: "product_consultation_click"/);
  assert.match(cases, /name: "case_detail_view"/);
  assert.match(cases, /<CaseDepthAnalytics contentId=\{study\.sourceId\}/);
  assert.match(downloads, /name: "download_requested"/);
});

test("aggregates same-day events in D1 without visitor-level rows", () => {
  const database = new DatabaseSync(":memory:");
  try {
    for (const path of [
      "../drizzle/0000_brief_madame_hydra.sql",
      "../drizzle/0001_magenta_black_crow.sql",
      "../drizzle/0002_cultured_mother_askani.sql",
      "../drizzle/0003_magical_clea.sql",
      "../drizzle/0004_lush_roulette.sql",
      "../drizzle/0005_luxuriant_hairball.sql",
    ]) database.exec(read(path));

    const increment = database.prepare(`
      INSERT INTO analytics_daily_counts (
        event_date, event_name, direction, source, content_id, depth,
        event_count, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT (event_date, event_name, direction, source, content_id, depth)
      DO UPDATE SET event_count = event_count + 1, updated_at = excluded.updated_at, expires_at = excluded.expires_at
    `);
    const values = [
      "2026-07-22",
      "consultation_submit_success",
      "project",
      "case-detail",
      "",
      "",
      "2026-07-22T10:00:00.000Z",
      "2027-08-26T10:00:00.000Z",
    ];
    increment.run(...values);
    increment.run(...values);

    const row = database.prepare("SELECT * FROM analytics_daily_counts").get();
    assert.equal(row.event_count, 2);
    assert.equal(Object.hasOwn(row, "visitor_id"), false);
    assert.equal(Object.hasOwn(row, "ip"), false);
    assert.equal(Object.hasOwn(row, "url"), false);
    assert.equal(Object.hasOwn(row, "contact_value"), false);
  } finally {
    database.close();
  }
});

test("cleans aggregate analytics only from the scheduled maintenance path", () => {
  const analytics = read("../db/analytics.ts");
  const maintenance = read("../lib/server/consultation-maintenance.ts");
  const analyticsRoute = read("../app/api/analytics/route.ts");

  assert.match(analytics, /purgeExpiredAnalyticsDailyCounts/);
  assert.match(maintenance, /purgeInBatches\(purgeExpiredAnalyticsDailyCounts/);
  assert.doesNotMatch(analyticsRoute, /purgeExpiredAnalyticsDailyCounts/);
});
