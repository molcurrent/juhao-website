import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_PUBLIC_SITEMAP_URLS,
  hasNoindexRobotsMeta,
  indexingPolicyFailures,
  publicLaunchGateFailures,
} from "../scripts/check_launch_health.mjs";

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

test("requires the exact 33-route approved set in public simulation", () => {
  assert.equal(EXPECTED_PUBLIC_SITEMAP_URLS, 33);
  const eligible = Array.from({ length: EXPECTED_PUBLIC_SITEMAP_URLS }, (_, index) => `/route-${index}`);
  assert.deepEqual(indexingPolicyFailures({ html: '<meta name="robots" content="index, follow">', path: "/products", shouldIndex: true }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapRoutes: eligible, expectedSitemapRoutes: eligible }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapRoutes: eligible.slice(1), expectedSitemapRoutes: eligible }), [
    "/sitemap.xml: expected exact 33-route set, got 32",
  ]);
  assert.deepEqual(indexingPolicyFailures({ html: '<meta name="robots" content="noindex, follow">', path: "/products", shouldIndex: true }), [
    "/products: eligible public route must not include robots noindex",
  ]);
});

test("requires sitemap HTTP 200 in both modes", () => {
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 503, sitemapRoutes: [], expectedSitemapRoutes: [] }), [
    "/sitemap.xml: expected 200, got 503",
  ]);
});

test("blocks true public launch until the canonical host is approved", () => {
  assert.deepEqual(publicLaunchGateFailures({ indexingEnabled: false, hostApproved: false }), []);
  assert.deepEqual(publicLaunchGateFailures({ indexingEnabled: true, hostApproved: true }), []);
  assert.deepEqual(publicLaunchGateFailures({ indexingEnabled: true, hostApproved: false }), [
    "public launch blocked: canonical host is not approved",
  ]);
});
