import assert from "node:assert/strict";
import test from "node:test";
import { hasNoindexRobotsMeta, indexingPolicyFailures } from "../scripts/check_launch_health.mjs";

test("accepts an empty sitemap and noindex pages in private-preview mode", () => {
  const html = '<meta content="noindex, follow" name="robots">';
  assert.equal(hasNoindexRobotsMeta(html), true);
  assert.deepEqual(indexingPolicyFailures({ html, path: "/products", isPublic: false }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapUrlCount: 0, isPublic: false }), []);
});

test("rejects indexable pages or sitemap URLs in private-preview mode", () => {
  assert.deepEqual(indexingPolicyFailures({ html: '<meta name="robots" content="index, follow">', path: "/", isPublic: false }), [
    "/: private preview must include robots noindex",
  ]);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapUrlCount: 1, isPublic: false }), [
    "/sitemap.xml: private preview expected 0 URLs, got 1",
  ]);
});

test("keeps the public launch threshold strict", () => {
  const html = '<meta name="robots" content="index, follow">';
  assert.deepEqual(indexingPolicyFailures({ html, path: "/products", isPublic: true }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapUrlCount: 60, isPublic: true }), []);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 200, sitemapUrlCount: 59, isPublic: true }), [
    "/sitemap.xml: public mode expected at least 60 URLs, got 59",
  ]);
  assert.deepEqual(indexingPolicyFailures({ html: '<meta name="robots" content="noindex, follow">', path: "/products", isPublic: true }), [
    "/products: public indexing is enabled but robots noindex is present",
  ]);
});

test("requires sitemap HTTP 200 in both modes", () => {
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 503, sitemapUrlCount: 0, isPublic: false }), [
    "/sitemap.xml: expected 200, got 503",
  ]);
  assert.deepEqual(indexingPolicyFailures({ sitemapStatus: 503, sitemapUrlCount: 60, isPublic: true }), [
    "/sitemap.xml: expected 200, got 503",
  ]);
});
