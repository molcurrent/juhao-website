import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";
import { REMOVED_PROFESSIONAL_ARTICLE_ROUTES } from "./fixtures/removed-professional-article-routes.mjs";

const inventoryPath = new URL("../content/governance/media-inventory.json", import.meta.url);
const authorizationPath = new URL("../content/governance/media-authorization-batches.json", import.meta.url);
const mirrorsPath = new URL("../content/governance/media-mirrors.json", import.meta.url);
const runtimePath = new URL("../content/governance/runtime-media.json", import.meta.url);
const runtimeProductsPath = new URL("../content/runtime/published-products.json", import.meta.url);
const assignmentsPath = new URL("../content/governance/content-media-assignments.json", import.meta.url);
const routeOgPath = new URL("../content/governance/route-og.json", import.meta.url);
const ledgerPath = new URL("../content/governance/content-ledger.json", import.meta.url);
const provenancePath = new URL("../RECON/JUHAO_ASSET_PROVENANCE.md", import.meta.url);

const BATCH_ID = "oss-batch-2026-07-14-current-site-341";
const RAW_HASH = "e8418df1c570b6b719c9d916edcfc36f47282c4146b13ba9f7a4818dbf705e7d";
const NORMALIZED_HASH = "da18ce0b67bf50c7d8e549a3995592fe05311af1531e57567547677f450802eb";

const json = async (url) => JSON.parse(await readFile(url, "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function publicFiles(directory = new URL("../public/", import.meta.url), prefix = "public") {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await publicFiles(new URL(`${entry.name}/`, directory), relative));
    if (entry.isFile()) paths.push(relative);
  }
  return paths.sort();
}

test("freezes the finite owner-authorized OSS batch", async () => {
  const [batch] = await json(authorizationPath);
  assert.equal(batch.batch_id, BATCH_ID);
  assert.equal(batch.authorization_status, "approved");
  assert.equal(batch.source_domain, "bocang.oss-cn-shenzhen.aliyuncs.com");
  assert.equal(batch.original_url_count, 341);
  assert.equal(batch.normalized_object_count, 332);
  assert.equal(batch.page_selected_original_url_count, 178);
  assert.equal(batch.original_url_list_sha256, RAW_HASH);
  assert.equal(batch.normalized_url_list_sha256, NORMALIZED_HASH);
  assert.equal(new Set(batch.source_urls).size, 341);
  assert.match(batch.scope, /不覆盖整个 OSS/);
});

test("mirrors every normalized object and verifies source and derived bytes", async () => {
  const mirrors = await json(mirrorsPath);
  assert.equal(mirrors.length, 332);
  assert.equal(new Set(mirrors.map((row) => row.source_url)).size, 332);
  assert.equal(new Set(mirrors.map((row) => row.source_sha256)).size, 264);
  assert.equal(mirrors.filter((row) => row.animated).length, 1);

  for (const row of mirrors) {
    assert.equal(row.authorization_batch_id, BATCH_ID);
    assert.match(row.source_url, /^https:\/\/bocang\.oss-cn-shenzhen\.aliyuncs\.com\//);
    assert.match(row.media_id, /^media-[a-f0-9]{20}$/);
    assert.match(row.source_sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(row.width) && row.width > 0, row.source_url);
    assert.ok(Number.isInteger(row.height) && row.height > 0, row.source_url);
    assert.ok(row.variants.length >= 2, row.source_url);
    assert.ok(row.variants.every((variant) => variant.width <= 1600), row.source_url);

    const original = await readFile(new URL(`../public${row.original_path}`, import.meta.url));
    assert.equal(digest(original), row.source_sha256, row.original_path);
    for (const variant of row.variants) {
      assert.ok(["avif", "webp"].includes(variant.format), variant.path);
      assert.ok(variant.width <= row.width, variant.path);
      assert.ok(variant.height <= row.height, variant.path);
      const bytes = await readFile(new URL(`../public${variant.path}`, import.meta.url));
      assert.equal(digest(bytes), variant.sha256, variant.path);
      assert.equal(bytes.length, variant.bytes, variant.path);
    }
  }
});

test("separates batch authorization from the 178-item page display gate", async () => {
  const rows = await json(inventoryPath);
  assert.equal(rows.length, 531);
  assert.equal(rows.some((row) => row.source_type === "knowledge_base_professional_article_review"), false);
  const remote = rows.filter((row) => /^https?:\/\//.test(row.asset_url));
  const selectedUrls = new Set(remote.filter((row) => row.publish_allowed).map((row) => row.asset_url));
  assert.equal(remote.length, 445);
  assert.equal(new Set(remote.map((row) => row.asset_url)).size, 341);
  assert.equal(selectedUrls.size, 178);
  assert.equal(new Set(remote.filter((row) => row.content_route === "/news" && !selectedUrls.has(row.asset_url)).map((row) => row.asset_url)).size, 125);
  assert.equal(new Set(remote.filter((row) => row.content_route.startsWith("/cases/") && !selectedUrls.has(row.asset_url)).map((row) => row.asset_url)).size, 38);

  for (const row of remote) {
    assert.equal(row.rights_status, "approved", row.asset_url);
    assert.equal(row.authorization_batch_id, BATCH_ID, row.asset_url);
    assert.ok(row.local_path.startsWith("public/media/source/"), row.asset_url);
    assert.match(row.sha256, /^[a-f0-9]{64}$/, row.asset_url);
    assert.equal(row.indexable, false, row.asset_url);
    assert.equal(
      row.publish_allowed,
      ["repository_product_catalog", "repository_case_catalog"].includes(row.source_type),
      row.asset_url,
    );
  }
});

test("runtime media contains only local, byte-deduplicated selected assets", async () => {
  const runtime = await json(runtimePath);
  assert.equal(runtime.length, 120);
  assert.equal(new Set(runtime.map((row) => row.media_id)).size, runtime.length);
  for (const row of runtime) {
    assert.deepEqual(Object.keys(row).sort(), ["animated", "fallback", "height", "media_id", "variants", "width"]);
    assert.match(row.fallback, /^\/media\/derived\//);
    assert.doesNotMatch(JSON.stringify(row), /https?:\/\/|oss-cn|source_url/);
    assert.ok(row.variants.some((variant) => variant.format === "avif"));
    assert.ok(row.variants.some((variant) => variant.format === "webp"));
  }
});

test("runtime product, case, and topic data carries media IDs without OSS or absolute source paths", async () => {
  const [products, assignments, catalogSource, topicSource] = await Promise.all([
    json(runtimeProductsPath),
    json(assignmentsPath),
    readFile(new URL("../content/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../content/topic-guides.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(products.length, 31);
  assert.equal(Object.keys(assignments.products).length, 31);
  assert.equal(Object.keys(assignments.cases).length, 6);
  assert.equal(Object.keys(assignments.routes).length, 37);
  assert.equal((catalogSource.match(/media-[a-f0-9]{20}/g) ?? []).length, 46);
  assert.equal((topicSource.match(/media-[a-f0-9]{20}/g) ?? []).length, 3);
  for (const value of [JSON.stringify(products), JSON.stringify(assignments), catalogSource, topicSource]) {
    assert.doesNotMatch(value, /https?:\/\/bocang|oss-cn-shenzhen|\/Users\//);
  }
  for (const product of products) {
    assert.match(product.primary_media_id, /^media-[a-f0-9]{20}$/);
    assert.ok(product.gallery_media_ids.length >= 1);
    assert.ok(product.gallery_media_ids.every((mediaId) => /^media-[a-f0-9]{20}$/.test(mediaId)));
    assert.equal("primary_image" in product, false);
    assert.equal("gallery" in product, false);
  }
});

test("local brand and representative assets match the recorded provenance hashes", async () => {
  const rows = await json(inventoryPath);
  const provenance = await readFile(provenancePath, "utf8");
  const approved = new Map(
    [...provenance.matchAll(/\|\s*`(public\/[^`]+)`\s*\|[^|]*\|\s*`([a-f0-9]{64})`\s*\|/g)]
      .map((match) => [match[1], match[2]]),
  );
  assert.equal(approved.size, 78);
  for (const [localPath, expectedHash] of approved) {
    const bytes = await readFile(new URL(`../${localPath}`, import.meta.url));
    assert.equal(digest(bytes), expectedHash, localPath);
    const matches = rows.filter((row) => row.local_path === localPath);
    assert.ok(matches.length >= 1, localPath);
    assert.ok(matches.every((row) => row.rights_status === "approved" && row.publish_allowed), localPath);
  }
});

test("inventories ordinary public assets while generated media stays in dedicated manifests", async () => {
  const rows = await json(inventoryPath);
  const inventoried = new Set(rows.filter((row) => row.local_path).map((row) => row.local_path));
  const ordinary = (await publicFiles()).filter((path) => !path.startsWith("public/media/") && !path.startsWith("public/og/"));
  for (const path of ordinary) assert.ok(inventoried.has(path), path);
  for (const row of rows) {
    for (const field of ["media_id", "authorization_batch_id", "source_sha256", "original_path", "variants"]) {
      assert.ok(field in row, `${row.asset_url}: ${field}`);
    }
  }
});

test("generates one small deterministic VI social card per published route", async () => {
  const [manifest, ledger] = await Promise.all([json(routeOgPath), json(ledgerPath)]);
  const published = ledger.filter((row) => row.publish_status === "published");
  const removedRoutes = new Set(REMOVED_PROFESSIONAL_ARTICLE_ROUTES);
  assert.equal(manifest.length, 81);
  assert.equal(manifest.length, published.length);
  assert.equal(manifest.some(({ route }) => removedRoutes.has(route)), false);
  assert.equal(new Set(manifest.map((row) => row.route)).size, manifest.length);
  assert.equal(new Set(manifest.map((row) => row.path)).size, manifest.length);
  for (const row of manifest) {
    assert.equal(row.width, 1200, row.route);
    assert.equal(row.height, 630, row.route);
    assert.ok(row.bytes < 300_000, row.route);
    const bytes = await readFile(new URL(`../public${row.path}`, import.meta.url));
    assert.equal(bytes.length, row.bytes, row.route);
    assert.equal(digest(bytes), row.sha256, row.route);
    if (row.route.startsWith("/cases/")) assert.equal(row.stage_label, "签约 / 中标资料", row.route);
  }
  const largest = Math.max(...await Promise.all(manifest.map(async (row) => (await stat(new URL(`../public${row.path}`, import.meta.url))).size)));
  assert.ok(largest < 300_000);
});
