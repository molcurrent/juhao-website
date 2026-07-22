import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("keeps news and downloads server-rendered and contact isolated from the aggregate mock API", () => {
  const news = read("../features/news/NewsPage.tsx");
  const newsArticle = read("../features/news/NewsArticlePage.tsx");
  const knowledge = read("../features/knowledge/KnowledgeLibraryPage.tsx");
  const downloads = read("../features/utility/UtilityPages.tsx");
  const contact = read("../features/platform/ContactPage.tsx");
  const route = read("../app/[...slug]/page.tsx");

  assert.doesNotMatch(news, /"use client"|siteApi|useEffect|useState/);
  assert.doesNotMatch(newsArticle, /"use client"|LightFieldCanvas|<canvas/);
  assert.doesNotMatch(knowledge, /"use client"|LightFieldCanvas|<canvas/);
  assert.doesNotMatch(downloads, /"use client"|siteApi|useEffect|useState/);
  assert.match(contact, /from "@\/lib\/api\/contact"/);
  assert.match(contact, /from "@\/lib\/api\/types"/);
  assert.doesNotMatch(contact, /from "@\/lib\/api"/);
  assert.doesNotMatch(route, /siteApi|from "@\/lib\/api"/);
});

test("keeps the two-stage contact form keyboard-submittable", () => {
  const contact = read("../features/platform/ContactPage.tsx");

  assert.match(contact, /<form[^>]+onSubmit=\{handleFormSubmit\}/);
  assert.match(contact, /function handleFormSubmit[\s\S]*?result\?\.tone === "ready"[\s\S]*?void handleSubmit\(\)/);
  assert.match(contact, /<button type="button" onClick=\{\(\) => handleCheck\(\)\}>检查准备情况/);
  assert.match(contact, /<button className=\{styles\.submitButton\} type="submit"/);
});

test("keeps view-transition names unique within each upgraded page", () => {
  const news = read("../features/news/NewsPage.tsx");
  const knowledge = read("../features/knowledge/KnowledgeLibraryPage.tsx");
  const sceneCss = read("../features/business/BusinessScenePage.module.css");
  const theatreCss = read("../features/business/RelightingTheatre.module.css");

  assert.doesNotMatch(news, /viewTransitionName/);
  assert.doesNotMatch(knowledge, /viewTransitionName/);
  assert.match(sceneCss, /view-transition-name:\s*juhao-stage/);
  assert.match(theatreCss, /view-transition-name:\s*juhao-relighting-stage/);
  assert.doesNotMatch(theatreCss, /view-transition-name:\s*juhao-stage(?:\s|;)/);
});

test("removes forced loading and global GSAP while retaining route-specific motion", () => {
  const layout = read("../app/layout.tsx");
  const home = read("../features/home/HomePage.tsx");
  const header = read("../components/layout/SiteHeader.tsx");
  const headerCss = read("../components/layout/SiteHeader.module.css");
  const globalCss = read("../app/globals.css");

  assert.doesNotMatch(layout, /SiteMotion|data-route-curtain/);
  assert.doesNotMatch(home, /PageLoader|SESSION_KEY|LOADING/);
  assert.doesNotMatch(header, /gsap|useGSAP/);
  assert.match(headerCss, /\.drawerOpen\s*\{[\s\S]*?translateX\(0\)/);
  assert.match(headerCss, /@media \(max-width: 1100px\)/);
  assert.match(globalCss, /@media\(max-width:900px\)[\s\S]*?\.actions\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(globalCss, /@media\(max-width:480px\)[\s\S]*?\.heroProofPeek\{display:grid/);

  for (const path of [
    "../components/motion/PageLoader.tsx",
    "../components/motion/PageLoader.module.css",
    "../components/motion/SiteMotion.tsx",
    "../components/motion/SiteMotion.module.css",
  ]) assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
});

test("ships the D1 retry columns and authenticated maintenance route", () => {
  const migration = read("../drizzle/0001_magenta_black_crow.sql");
  const rateLimitMigration = read("../drizzle/0002_cultured_mother_askani.sql");
  const retentionIndexMigration = read("../drizzle/0003_magical_clea.sql");
  const maintenance = read("../app/api/contact/maintenance/route.ts");
  const maintenanceService = read("../lib/server/consultation-maintenance.ts");
  const contactRoute = read("../app/api/contact/route.ts");
  const worker = read("../worker/index.ts");
  const notifications = read("../lib/server/lead-notifications.ts");

  assert.match(migration, /notification_last_attempt_at/);
  assert.match(migration, /notification_next_attempt_at/);
  assert.match(migration, /consultation_leads_notification_retry_idx/);
  assert.match(rateLimitMigration, /CREATE TABLE `consultation_rate_limits`/);
  assert.match(rateLimitMigration, /consultation_rate_limits_expires_at_idx/);
  assert.match(retentionIndexMigration, /consultation_leads_expires_at_idx/);
  assert.match(maintenance, /JUHAO_LEAD_MAINTENANCE_SECRET/);
  assert.match(maintenance, /runConsultationMaintenance/);
  assert.match(maintenanceService, /listRetryableConsultationLeads/);
  assert.match(maintenanceService, /purgeExpiredConsultationLeads/);
  assert.match(maintenanceService, /purgeExpiredConsultationRateLimits/);
  assert.match(contactRoute, /consumeConsultationRateLimit/);
  assert.match(contactRoute, /waitUntil\(deliverInitialNotification/);
  assert.doesNotMatch(contactRoute, /purgeExpiredConsultationLeads/);
  assert.match(contactRoute, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(contactRoute, /JUHAO_LEAD_RATE_LIMIT_SECRET/);
  assert.match(contactRoute, /status:\s*429/);
  assert.match(contactRoute, /"Retry-After"/);
  assert.match(worker, /scheduled\(/);
  assert.match(worker, /runConsultationMaintenance/);
  assert.match(notifications, /"Idempotency-Key": lead\.id/);
  assert.match(notifications, /"X-Juhao-Signature"/);
  for (const status of ["retry", "dead_letter"]) assert.match(notifications, new RegExp(status));
});

test("pins public consultation verification, keyed rate limits and the disclosed privacy contract", () => {
  const contactRoute = read("../app/api/contact/route.ts");
  const turnstileWidget = read("../components/security/TurnstileWidget.tsx");
  const consultation = read("../lib/consultation.ts");
  const privacyPage = read("../app/_data/contract-pages.ts");
  const apiContract = read("../RECON/API_CONTRACT.md");

  assert.match(consultation, /CONSULTATION_PRIVACY_VERSION = "2026-07-18"/);
  assert.match(consultation, /CONSULTATION_TURNSTILE_ACTION = "juhao-contact"/);
  assert.match(turnstileWidget, /action:\s*CONSULTATION_TURNSTILE_ACTION/);
  assert.match(contactRoute, /TURNSTILE_ALLOWED_HOSTNAMES/);
  assert.match(contactRoute, /CONTACT_EDGE_RATE_LIMIT_VERIFIED/);
  assert.match(contactRoute, /validClientAddress/);
  assert.match(contactRoute, /\{ name: "HMAC", hash: "SHA-256" \}/);
  assert.match(contactRoute, /JUHAO_LEAD_RATE_LIMIT_SECRET\?\.trim\(\)\.length \?\? 0\) < 32/);
  assert.match(contactRoute, /errorCodes\.includes\("internal-error"\)/);
  for (const text of [
    "Turnstile 单次令牌",
    "访客网络地址",
    "Cloudflare Siteverify",
    "不作为本站回访线索字段保存",
    "约 10 分钟",
    "下一次每日维护",
    "任务恢复后补清理",
  ]) {
    assert.match(privacyPage, new RegExp(text));
  }
  for (const text of [
    "privacyVersion",
    "2026-07-18",
    "action=juhao-contact",
    "TURNSTILE_ALLOWED_HOSTNAMES",
    "CONTACT_EDGE_RATE_LIMIT_VERIFIED",
    "HMAC-SHA-256",
    "至少 32 个字符",
  ]) assert.match(apiContract, new RegExp(text));
});
