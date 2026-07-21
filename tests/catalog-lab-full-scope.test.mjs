import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync("app/catalog-lab/page.tsx", "utf8");
const indexSource = readFileSync(
  "features/catalog-lab/CatalogLabIndex.tsx",
  "utf8",
);
const loaderSource = readFileSync(
  "features/catalog-lab/catalogFullPrivate.ts",
  "utf8",
);
const sample = JSON.parse(
  readFileSync("content/runtime/catalog-v2/index.json", "utf8"),
);
const manifest = JSON.parse(
  readFileSync("content/runtime/catalog-v2-full-private/manifest.json", "utf8"),
);

test("catalog lab preserves full scope in URL until private data is ready", () => {
  assert.match(pageSource, /first\(params\.scope\) === "full"/);
  assert.match(pageSource, /scope: requestedScope/);
  assert.match(indexSource, /params\.set\("scope", "full"\)/);
  assert.match(indexSource, /if \(!scopeDataReady\) return/);
  assert.match(indexSource, /awaitingFullData/);
  assert.match(indexSource, /!awaitingFullData &&/);
  assert.match(
    indexSource,
    /window\.addEventListener\("popstate", restoreFilters\)/,
  );
  assert.match(indexSource, /aria-pressed=\{scope === "full"\}/);
});

test("full catalog loader verifies all 1208 families without static JSON imports", () => {
  assert.equal(manifest.family_count, 1208);
  assert.equal(manifest.eligible_source_count, 1913);
  assert.equal(manifest.shard_count, 13);
  assert.equal(Math.ceil(manifest.family_count / 24), 51);
  assert.match(loaderSource, /\/catalog-lab\/_data/);
  assert.match(loaderSource, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(loaderSource, /bytes\.byteLength !== descriptor\.bytes/);
  assert.match(
    loaderSource,
    /sourceKeys\.size !== manifest\.eligible_source_count/,
  );
  assert.doesNotMatch(
    `${indexSource}\n${loaderSource}`,
    /content\/runtime\/catalog-v2-full-private|index-0001\.json/,
  );
});

test("full catalog loader accepts every grouping state emitted by the approved projection", () => {
  const groupingStates = new Set();
  for (const descriptor of manifest.shards) {
    const shard = JSON.parse(
      readFileSync(
        `content/runtime/catalog-v2-full-private/${descriptor.file}`,
        "utf8",
      ),
    );
    for (const item of shard.items) groupingStates.add(item.grouping_status);
  }

  assert.deepEqual([...groupingStates].sort(), [
    "auto_merged_shared_reference_image_set",
    "human_approved_recategorize",
    "singleton_unreviewed",
  ]);
  for (const state of groupingStates) {
    assert.match(loaderSource, new RegExp(`"${state}"`));
  }
});

test("full catalog loader validates every nested field consumed by the UI", () => {
  assert.match(
    loaderSource,
    /Object\.values\(value\)\.every\(isSafeStringList\)/,
  );
  assert.match(loaderSource, /!hasSafeFacetLists\(item\.facets\)/);
  assert.match(
    loaderSource,
    /primaryImage === null \|\|[\s\S]*?validatedCatalogImagePath\(primaryImage\) === primaryImage/,
  );
  assert.match(
    loaderSource,
    /item\.variant_refs\.every\([\s\S]*?isSafeRuntimeText\(variant\.source_key\)[\s\S]*?isSafeRuntimeText\(variant\.source_id\)[\s\S]*?isSafeRuntimeText\(variant\.display_id\)[\s\S]*?isNullableSafeRuntimeText\(variant\.model_label\)[\s\S]*?isSafeRuntimeText\(variant\.model_state\)/,
  );
  assert.match(
    loaderSource,
    /item\.card_specs\.every\([\s\S]*?isSafeRuntimeText\(spec\.key\)[\s\S]*?isSafeRuntimeText\(spec\.label\)[\s\S]*?isSafeStringList\(spec\.values\)[\s\S]*?spec\.values\.length > 0[\s\S]*?isSafeRuntimeText\(spec\.evidence\)/,
  );
  assert.match(
    loaderSource,
    /item\.category_state === "pending_owner_selection"[\s\S]*?item\.planned_canonical_route !== null[\s\S]*?item\.route_plan_state !== "pending_category_selection"/,
  );
});

test("URL restore clamps once from normalized filters and skips the stale-state clamp", () => {
  const restoreStart = indexSource.indexOf("function restoreFilters() {");
  const restoreEnd = indexSource.indexOf(
    'window.addEventListener("popstate", restoreFilters)',
    restoreStart,
  );
  assert.ok(restoreStart >= 0 && restoreEnd > restoreStart);
  const restoreSource = indexSource.slice(restoreStart, restoreEnd);

  const categoryIndex = restoreSource.indexOf("const normalizedCategory");
  const facetsIndex = restoreSource.indexOf("const normalizedFacets");
  const totalPagesIndex = restoreSource.indexOf("const requestedTotalPages");
  const pageIndex = restoreSource.indexOf("const normalizedPage");
  const skipIndex = restoreSource.indexOf("skipPageClampRef.current = true");
  const settersIndex = restoreSource.indexOf("setCategory(normalizedCategory)");
  assert.ok(
    categoryIndex >= 0 &&
      facetsIndex > categoryIndex &&
      totalPagesIndex > facetsIndex &&
      pageIndex > totalPagesIndex &&
      skipIndex > pageIndex &&
      settersIndex > skipIndex,
  );
  assert.match(
    restoreSource,
    /requestedItems\.filter\([\s\S]*?category: normalizedCategory,[\s\S]*?grouping: normalizedGrouping,[\s\S]*?facets: normalizedFacets/,
  );
  assert.match(
    restoreSource,
    /Math\.min\(requestedPage, requestedTotalPages\)/,
  );
  assert.equal(
    (restoreSource.match(/setPage\(normalizedPage\)/g) ?? []).length,
    1,
  );
  assert.equal((restoreSource.match(/setPage\(/g) ?? []).length, 1);
  assert.doesNotMatch(restoreSource, /setPage\(requestedPage\)/);
  assert.match(
    indexSource,
    /if \(skipPageClampRef\.current\) \{\s*skipPageClampRef\.current = false;\s*return;\s*\}/,
  );
});

test("full projection adds real filter coverage and evidence-led card fields", () => {
  const sampleAreas = new Set(
    sample.items.flatMap((item) => item.facets.areas ?? []),
  );
  const fullAreas = new Set();
  let itemCount = 0;
  for (const descriptor of manifest.shards) {
    const shard = JSON.parse(
      readFileSync(
        `content/runtime/catalog-v2-full-private/${descriptor.file}`,
        "utf8",
      ),
    );
    itemCount += shard.items.length;
    for (const item of shard.items) {
      for (const area of item.facets.areas ?? []) fullAreas.add(area);
      assert.ok(item.card_specs.length <= 3);
      assert.equal(item.variant_refs.length, item.member_count);
    }
  }
  assert.equal(itemCount, 1208);
  const pendingCategoryFamilies = [];
  for (const descriptor of manifest.shards) {
    const shard = JSON.parse(
      readFileSync(
        `content/runtime/catalog-v2-full-private/${descriptor.file}`,
        "utf8",
      ),
    );
    pendingCategoryFamilies.push(
      ...shard.items.filter(
        (item) => item.category_state === "pending_owner_selection",
      ),
    );
  }
  assert.equal(pendingCategoryFamilies.length, 24);
  assert.ok(
    pendingCategoryFamilies.every(
      (item) =>
        item.category === "待复核" &&
        item.source_categories.length >= 2 &&
        item.planned_canonical_route === null &&
        item.route_plan_state === "pending_category_selection",
    ),
  );
  assert.ok(fullAreas.size >= sampleAreas.size);
  assert.ok([...sampleAreas].every((value) => fullAreas.has(value)));
  assert.match(indexSource, /item\.model_label \?\? "型号待审核"/);
  assert.match(indexSource, /\.\.\.item\.source_categories/);
  assert.match(indexSource, /主分类待确认 · 来源/);
  assert.match(indexSource, /item\.card_specs\.slice\(0, 3\)/);
  assert.doesNotMatch(indexSource, /<dt>来源编号<\/dt>/);
});
