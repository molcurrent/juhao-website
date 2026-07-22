import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canonicalProductRoute,
  legacyProductRoute,
  projectProductPublication,
  projectProductTopic,
  productTopicOverrides,
} from "../content/product-topic-overrides.ts";
import { siteRedirects } from "../lib/site-redirects.ts";

const rawProducts = JSON.parse(
  readFileSync(new URL("../content/runtime/published-products.json", import.meta.url), "utf8"),
);
const products = rawProducts.map(projectProductTopic);
const rawPublicationLedger = JSON.parse(
  readFileSync(new URL("../content/runtime/publication-ledger.json", import.meta.url), "utf8"),
);
const routeAliases = JSON.parse(
  readFileSync(new URL("../content/governance/product-catalog-v2-route-aliases.json", import.meta.url), "utf8"),
);

const expectedIds = new Set([
  "9236", "9237", "9238", "11650", "11651", "11652", "11001", "8947", "8948",
]);

test("projects the nine reviewed source categories into canonical product topics", () => {
  assert.deepEqual(new Set(productTopicOverrides.map((item) => item.source_id)), expectedIds);
  assert.equal(new Set(products.map((item) => item.seo_slug)).size, products.length);

  for (const override of productTopicOverrides) {
    const raw = rawProducts.find((item) => item.source_id === override.source_id);
    const projected = products.find((item) => item.source_id === override.source_id);
    assert.ok(raw, override.source_id);
    assert.ok(projected, override.source_id);
    assert.equal(raw.category, override.source_category, override.source_id);
    assert.equal(raw.topic_slug, override.legacy_topic_slug, override.source_id);
    assert.equal(projected.topic, override.canonical_topic, override.source_id);
    assert.equal(projected.topic_slug, override.canonical_topic_slug, override.source_id);
    assert.equal(projected.seo_slug, canonicalProductRoute(override), override.source_id);
  }

  const counts = Object.groupBy(products, (item) => item.topic_slug);
  assert.equal(counts["ceiling-lights"].length, 12);
  assert.equal(counts["table-floor-lights"].length, 3);
  assert.equal(counts["crystal-chandeliers"], undefined);
  assert.equal(counts["linear-lighting"], undefined);
  assert.equal(counts["outdoor-lighting"], undefined);
  assert.equal(Object.values(counts).reduce((sum, items) => sum + items.length, 0), 31);
});

test("keeps every historical misclassified URL as one governed permanent redirect", () => {
  for (const override of productTopicOverrides) {
    const matches = siteRedirects.filter((item) => item.source === legacyProductRoute(override));
    assert.equal(matches.length, 1, override.source_id);
    assert.equal(matches[0].destination, canonicalProductRoute(override), override.source_id);
    assert.equal(matches[0].statusCode, 308, override.source_id);
  }
});

test("publishes the corrected private-preview routes and records the V2 migration evidence", () => {
  const publishedRoutes = new Set(
    rawPublicationLedger
      .map(projectProductPublication)
      .filter((record) => record.publish_status === "published")
      .map((record) => record.route),
  );

  for (const override of productTopicOverrides) {
    const canonical = canonicalProductRoute(override);
    assert.ok(publishedRoutes.has(canonical), canonical);
    assert.equal(publishedRoutes.has(legacyProductRoute(override)), false, override.source_id);

    const alias = routeAliases.find((item) => item.source_key === `mall_sql:${override.source_id}`);
    assert.ok(alias, override.source_id);
    assert.equal(alias.taxonomy_override, true, override.source_id);
    assert.equal(alias.historical_route, legacyProductRoute(override), override.source_id);
    assert.equal(alias.legacy_route, canonical, override.source_id);
  }
});

test("does not manufacture missing engineering fields during recategorization", () => {
  const targetProducts = products.filter((item) => expectedIds.has(item.source_id));
  const unsupportedFields = new Set(["功率", "额定功率", "色温", "显色指数", "显指", "光束角", "安装方式", "开孔尺寸"]);
  for (const product of targetProducts) {
    assert.equal(
      product.parameters.some((parameter) => unsupportedFields.has(parameter.name)),
      false,
      product.source_id,
    );
  }
});
