import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_PUBLIC_SITEMAP_URLS,
  MANUAL_APPROVALS,
  fullCatalogReleaseFailures,
  hasNoindexRobotsMeta,
  indexingPolicyFailures,
  manualApprovalSummary,
  publicLaunchGateFailures,
  validTurnstileAllowedHostnames,
} from "../scripts/check_launch_health.mjs";

const RELEASE_READY = {
  indexingEnabled: true,
  hostApproved: true,
  eligibleRoutes: 1,
  pendingManualApprovals: 0,
  intakeReady: true,
  siteKey: "turnstile-site-key",
  secretKey: "turnstile-secret-key",
  allowedHostnames: ["juhao.com", "www.juhao.com"],
  edgeRateLimitVerified: true,
  leadWebhookUrl: "https://example.com/webhook",
  leadWebhookSecret: "webhook-secret",
  leadMaintenanceSecret: "maintenance-secret",
  leadRateLimitSecret: "test-rate-limit-secret-at-least-32-characters",
};

test("accepts an exact empty sitemap and noindex pages in private-preview mode", () => {
  const html = '<meta content="noindex, follow" name="robots">';
  assert.equal(hasNoindexRobotsMeta(html), true);
  assert.deepEqual(indexingPolicyFailures({ html, path: "/products", shouldIndex: false }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapRoutes: [], expectedSitemapRoutes: [] }), []);
});

test("rejects indexable pages or sitemap URLs in private-preview mode", () => {
  assert.deepEqual(indexingPolicyFailures({ html: '<meta name="robots" content="index, follow">', path: "/", shouldIndex: false }), [
    "/: route must include robots noindex",
  ]);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapRoutes: ["/products"], expectedSitemapRoutes: [] }), [
    "/sitemap.xml: expected exact 0-route set, got 1",
  ]);
});

test("keeps the JUHAO-only public simulation at an exact empty eligible set", () => {
  assert.equal(EXPECTED_PUBLIC_SITEMAP_URLS, 0);
  assert.deepEqual(indexingPolicyFailures({ html: '<meta name="robots" content="noindex, follow">', path: "/products", shouldIndex: false }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapRoutes: [], expectedSitemapRoutes: [] }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapRoutes: ["/news/downlight-vs-spotlight"], expectedSitemapRoutes: [] }), [
    "/sitemap.xml: expected exact 0-route set, got 1",
  ]);
});

test("requires sitemap HTTP 200 in both modes", () => {
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 503, sitemapRoutes: [], expectedSitemapRoutes: [] }), [
    "/sitemap.xml: expected 200, got 503",
  ]);
});

test("blocks true public launch until the canonical host is approved", () => {
  assert.deepEqual(publicLaunchGateFailures(RELEASE_READY), []);
  assert.deepEqual(publicLaunchGateFailures({ ...RELEASE_READY, hostApproved: false }), [
    "public launch blocked: canonical host is not approved",
  ]);
});

test("blocks public launch until indexing is enabled and routes are eligible", () => {
  assert.deepEqual(publicLaunchGateFailures({ ...RELEASE_READY, indexingEnabled: false }), [
    "public launch blocked: PUBLIC_INDEXING_ENABLED is not enabled",
  ]);
  assert.deepEqual(publicLaunchGateFailures({ ...RELEASE_READY, eligibleRoutes: 0 }), [
    "public launch blocked: no index-eligible routes",
  ]);
  assert.deepEqual(publicLaunchGateFailures({ ...RELEASE_READY, hostApproved: false, eligibleRoutes: 0 }), [
    "public launch blocked: canonical host is not approved",
    "public launch blocked: no index-eligible routes",
  ]);
});

test("blocks public launch until the manual approval queue is signed off", () => {
  assert.deepEqual(MANUAL_APPROVALS, { total: 26, completed: 0, pending: 26 });
  assert.deepEqual(publicLaunchGateFailures({ ...RELEASE_READY, pendingManualApprovals: 26 }), [
    "public launch blocked: 26 manual approvals are pending",
  ]);
});

test("keeps the full neutral catalog as an independent public release gate", () => {
  assert.deepEqual(fullCatalogReleaseFailures({ catalogReady: true }), []);
  assert.deepEqual(fullCatalogReleaseFailures({ catalogReady: false }), [
    "public launch blocked: full product catalog release is not eligible",
  ]);
});

test("counts a manual approval only when status, decision and review date are complete", () => {
  const csv = [
    "item_id,item,status,decision,reviewed_at",
    'a,"带,逗号的事项",已签核,通过,2026-07-18',
    "b,缺少决定,已签核,,2026-07-18",
    "c,待签核,待签核,,",
  ].join("\n");
  assert.deepEqual(manualApprovalSummary(csv), { total: 3, completed: 1, pending: 2 });
});

test("accepts hostnames only and rejects Turnstile URLs, ports and paths", () => {
  assert.equal(validTurnstileAllowedHostnames(["juhao.com", "www.juhao.com"]), true);
  for (const value of ["https://juhao.com", "juhao.com:8443", "juhao.com/contact", ".juhao.com", "juhao..com"]) {
    assert.equal(validTurnstileAllowedHostnames([value]), false, value);
  }
});

test("requires a rate-limit HMAC secret of at least 32 characters", () => {
  assert.deepEqual(publicLaunchGateFailures({
    ...RELEASE_READY,
    leadRateLimitSecret: "too-short",
  }), [
    "public launch blocked: JUHAO_LEAD_RATE_LIMIT_SECRET must be at least 32 characters",
  ]);
});

test("blocks public launch until every public intake dependency is configured", () => {
  assert.deepEqual(publicLaunchGateFailures({
    ...RELEASE_READY,
    intakeReady: false,
    siteKey: "",
    secretKey: "",
    allowedHostnames: [],
    edgeRateLimitVerified: false,
    leadWebhookUrl: "",
    leadWebhookSecret: "",
    leadMaintenanceSecret: "",
    leadRateLimitSecret: "",
  }), [
    "public launch blocked: PUBLIC_INTAKE_READY is not enabled",
    "public launch blocked: NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing",
    "public launch blocked: TURNSTILE_SECRET_KEY is missing",
    "public launch blocked: TURNSTILE_ALLOWED_HOSTNAMES is missing or invalid",
    "public launch blocked: contact edge rate limiting is not verified",
    "public launch blocked: JUHAO_LEAD_WEBHOOK_URL is missing",
    "public launch blocked: JUHAO_LEAD_WEBHOOK_SECRET is missing",
    "public launch blocked: JUHAO_LEAD_MAINTENANCE_SECRET is missing",
    "public launch blocked: JUHAO_LEAD_RATE_LIMIT_SECRET is missing",
  ]);
});
