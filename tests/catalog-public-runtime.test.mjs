import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");

const routeContract = readJson(
  "content/governance/product-catalog-v2-public-route-contract.json",
);
const runtime = readJson("content/runtime/catalog-v2-public/index.json");

test("neutral public catalog contract covers all approved families without replacing legacy URLs", () => {
  assert.equal(routeContract.strategy, "neutral_catalog_series");
  assert.equal(routeContract.activation_state, "prepared_not_active");
  assert.equal(routeContract.family_count, 1208);
  assert.equal(routeContract.neutral_catalog_route_count, 1186);
  assert.equal(routeContract.existing_product_route_count, 22);
  assert.equal(routeContract.entries.length, 1208);
  assert.equal(
    new Set(routeContract.entries.map((entry) => entry.canonical_path)).size,
    1208,
  );
  assert.equal(
    routeContract.entries.filter((entry) => entry.route_kind === "neutral_catalog_series")
      .length,
    1186,
  );
  assert.ok(
    routeContract.entries
      .filter((entry) => entry.route_kind === "neutral_catalog_series")
      .every(
        (entry) =>
          /^p-[a-f0-9]{16}$/.test(entry.catalog_id) &&
          entry.canonical_path === `/products/catalog/${entry.catalog_id}`,
      ),
  );
  assert.ok(
    routeContract.entries
      .filter((entry) => entry.route_kind === "legacy_product_route")
      .every(
        (entry) =>
          entry.catalog_id === null &&
          /^\/products\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(entry.canonical_path),
      ),
  );
});

test("public catalog runtime is a noindex safe projection with zero emitted source media", () => {
  assert.equal(runtime.publication_state, "prepared_noindex");
  assert.equal(runtime.catalog_count, 1208);
  assert.equal(runtime.items.length, 1208);
  assert.equal(
    new Set(runtime.items.map((item) => item.canonical_path)).size,
    1208,
  );
  assert.equal(
    new Set(runtime.items.filter((item) => item.catalog_id).map((item) => item.catalog_id))
      .size,
    1186,
  );
  assert.ok(
    runtime.items.every(
      (item) =>
        item.media.display_state === "suppressed_pending_authorization" &&
        item.media.emitted_media_count === 0 &&
        Number.isInteger(item.media.suppressed_source_media_count) &&
        item.media.suppressed_source_media_count >= 0,
    ),
  );
  assert.equal(
    runtime.items.reduce((total, item) => total + item.media.emitted_media_count, 0),
    0,
  );

  const crossCategory = runtime.items.filter(
    (item) => item.category_state === "pending_owner_selection",
  );
  assert.equal(crossCategory.length, 24);
  assert.ok(
    crossCategory.every(
      (item) =>
        item.route_kind === "neutral_catalog_series" &&
        item.source_categories.length >= 2 &&
        !Object.hasOwn(item, "primary_category"),
    ),
  );
});

test("public catalog JSON and route source cannot expose governance or media source fields", () => {
  const runtimeText = readText("content/runtime/catalog-v2-public/index.json");
  for (const forbidden of [
    /"(?:family_id|source_key|source_id|source_path|source_sha256)"\s*:/i,
    /"(?:primary_image|detail_images|representative|variants)"\s*:/i,
    /https?:\/\//i,
    /bocang\.oss/i,
    /\/upload\//i,
    /\/api\/catalog-image/i,
  ]) {
    assert.doesNotMatch(runtimeText, forbidden);
  }

  const source = [
    readText("content/public-catalog-v2.ts"),
    readText("app/products/catalog/[catalogId]/page.tsx"),
    readText("features/catalog-public/PublicCatalogProductPage.tsx"),
  ].join("\n");
  assert.doesNotMatch(source, /catalog-v2-full-private|catalogFullPrivate/i);
  assert.doesNotMatch(source, /\/api\/catalog-image/i);
  assert.doesNotMatch(source, /<img\b|next\/image/i);
});
