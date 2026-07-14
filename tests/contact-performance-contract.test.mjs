import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("keeps news and downloads server-rendered and contact isolated from the aggregate mock API", () => {
  const news = read("../features/news/NewsPage.tsx");
  const downloads = read("../features/utility/UtilityPages.tsx");
  const contact = read("../features/platform/ContactPage.tsx");
  const route = read("../app/[...slug]/page.tsx");

  assert.doesNotMatch(news, /"use client"|siteApi|useEffect|useState/);
  assert.doesNotMatch(downloads, /"use client"|siteApi|useEffect|useState/);
  assert.match(contact, /from "@\/lib\/api\/contact"/);
  assert.match(contact, /from "@\/lib\/api\/types"/);
  assert.doesNotMatch(contact, /from "@\/lib\/api"/);
  assert.doesNotMatch(route, /siteApi|from "@\/lib\/api"/);
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
  assert.match(headerCss, /@media \(max-width: 960px\)/);
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
  const maintenance = read("../app/api/contact/maintenance/route.ts");
  const notifications = read("../lib/server/lead-notifications.ts");

  assert.match(migration, /notification_last_attempt_at/);
  assert.match(migration, /notification_next_attempt_at/);
  assert.match(migration, /consultation_leads_notification_retry_idx/);
  assert.match(maintenance, /JUHAO_LEAD_MAINTENANCE_SECRET/);
  assert.match(maintenance, /listRetryableConsultationLeads/);
  assert.match(maintenance, /purgeExpiredConsultationLeads/);
  assert.match(notifications, /"Idempotency-Key": lead\.id/);
  assert.match(notifications, /"X-Juhao-Signature"/);
  for (const status of ["retry", "dead_letter"]) assert.match(notifications, new RegExp(status));
});
