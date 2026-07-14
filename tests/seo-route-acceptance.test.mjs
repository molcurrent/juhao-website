import assert from "node:assert/strict";
import test from "node:test";
import { auditSeoRoutes } from "../scripts/seo_route_acceptance.mjs";

test("accepts all 81 JUHAO-only runtime-ledger routes in private-preview SEO mode", { timeout: 120_000 }, async () => {
  const report = await auditSeoRoutes({ mode: "private" });
  assert.equal(report.published_routes, 81);
  assert.equal(report.index_eligible_routes, 0);
  assert.equal(report.sitemap_routes, 0);
  assert.deepEqual(report.failures, []);
  assert.equal(report.passed, true);
});
