import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const governance = path.join(root, "content", "governance");
const stagingDir = path.join(
  governance,
  "product-catalog-v2-family-staging",
);
const fullPrivateRuntimeDir = path.join(
  root,
  "content",
  "runtime",
  "catalog-v2-full-private",
);
const catalogDataRoot =
  process.env.JUHAO_DATA_ROOT ?? "/Users/mac/Documents/juhao数据库";
const sourceRoot = path.join(
  catalogDataRoot,
  "企业知识库",
  "商城系统",
  "商品说明",
);
const externalSupplementSourcesAvailable = fs.existsSync(sourceRoot);

const readText = (file) => fs.readFileSync(file, "utf8");
const readJson = (file) => JSON.parse(readText(file));
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));

const dispositionPath = path.join(
  governance,
  "product-catalog-v2-source-disposition.json",
);
const manifestPath = path.join(stagingDir, "manifest.json");
const disposition = readJson(dispositionPath);
const manifest = readJson(manifestPath);
const shards = manifest.shards.map((descriptor) => ({
  descriptor,
  payload: readJson(path.join(stagingDir, descriptor.file)),
}));
const families = shards.flatMap(({ payload }) => payload.families);
const fullPrivateRuntimeManifest = readJson(
  path.join(fullPrivateRuntimeDir, "manifest.json"),
);
const fullPrivateRuntimeShards = fullPrivateRuntimeManifest.shards.map(
  (descriptor) => ({
    descriptor,
    payload: readJson(path.join(fullPrivateRuntimeDir, descriptor.file)),
  }),
);
const fullPrivateRuntimeFamilies = fullPrivateRuntimeShards.flatMap(
  ({ payload }) => payload.items,
);
const fullReleaseReadiness = readJson(
  path.join(governance, "product-catalog-v2-full-release-readiness.json"),
);

test("full private governance projection conserves every source and family", () => {
  assert.equal(disposition.visibility, "private_governance_only");
  assert.equal(disposition.runtime_emission, false);
  assert.equal(disposition.sitemap_included, false);
  assert.equal(disposition.counts.source_count, 1920);
  assert.equal(disposition.counts.eligible_source_count, 1913);
  assert.equal(disposition.counts.effective_eligible_source_count, 1913);
  assert.equal(disposition.counts.family_assigned_source_count, 1913);
  assert.equal(disposition.counts.excluded_non_lighting_source_count, 7);
  assert.equal(disposition.counts.candidate_family_count, 1208);
  assert.equal(disposition.sources.length, 1920);

  const sourceKeys = disposition.sources.map((source) => source.source_key);
  assert.equal(new Set(sourceKeys).size, 1920);
  assert.deepEqual(
    disposition.sources
      .filter(
        (source) =>
          source.disposition === "governance_only_excluded_non_lighting",
      )
      .map((source) => source.source_key)
      .sort(),
    [
      "mall_sql:11702",
      "mall_sql:11703",
      "mall_sql:4014",
      "mall_sql:4019",
      "mall_sql:4020",
      "mall_sql:4021",
      "mall_sql:5181",
    ],
  );

  assert.equal(families.length, 1208);
  assert.equal(new Set(families.map((family) => family.family_id)).size, 1208);
  const familyMembership = new Map();
  for (const family of families) {
    assert.equal(family.source_keys.length, family.member_count);
    for (const sourceKey of family.source_keys) {
      const memberships = familyMembership.get(sourceKey) ?? [];
      memberships.push(family.family_id);
      familyMembership.set(sourceKey, memberships);
    }
  }
  assert.equal(familyMembership.size, 1913);
  const crossCategoryFamilies = families.filter(
    (family) => family.category_state === "pending_owner_selection",
  );
  assert.equal(crossCategoryFamilies.length, 24);
  assert.ok(
    crossCategoryFamilies.every(
      (family) =>
        family.source_categories.length >= 2 &&
        family.category === "待复核",
    ),
  );
  assert.ok(
    families
      .filter((family) => family.category_state === "source_category_unambiguous")
      .every(
        (family) =>
          family.source_categories.length === 1 &&
          family.category === family.source_categories[0],
      ),
  );

  for (const source of disposition.sources) {
    assert.equal(typeof source.sample_membership.in_active_private_sample, "boolean");
    assert.ok(Array.isArray(source.quality_gaps));
    assert.equal(typeof source.manual_review.state, "string");
    assert.ok(Array.isArray(source.manual_review.required_review_ids));
    if (source.disposition === "eligible_family_candidate") {
      assert.deepEqual(familyMembership.get(source.source_key), [source.family_id]);
    } else {
      assert.equal(source.family_id, null);
      assert.equal(familyMembership.has(source.source_key), false);
    }
  }
  assert.ok(Object.values(disposition.acceptance).every(Boolean));
  assert.ok(Object.values(manifest.acceptance).every(Boolean));
});

test("family staging is deterministic, sharded, and contains no runtime media reference", () => {
  assert.equal(manifest.visibility, "private_governance_only");
  assert.equal(manifest.publication_state, "not_runtime_not_indexable_not_authorized");
  assert.equal(manifest.runtime_emission, false);
  assert.equal(manifest.sitemap_included, false);
  assert.equal(manifest.human_decision_ledger_modified, false);
  assert.equal(manifest.family_count, 1208);
  assert.equal(manifest.shard_size, 100);
  assert.equal(manifest.shard_count, 13);
  assert.equal(shards.length, 13);
  assert.deepEqual(
    manifest.shards.map((descriptor) => descriptor.file),
    Array.from(
      { length: 13 },
      (_, index) => `families-${String(index + 1).padStart(4, "0")}.json`,
    ),
  );

  for (const [index, { descriptor, payload }] of shards.entries()) {
    const shardPath = path.join(stagingDir, descriptor.file);
    assert.equal(path.dirname(shardPath), stagingDir);
    assert.match(descriptor.file, /^families-\d{4}\.json$/);
    assert.equal(descriptor.sha256, sha256(readText(shardPath)));
    assert.equal(descriptor.family_count, payload.family_count);
    assert.equal(payload.visibility, "private_governance_only");
    assert.equal(payload.runtime_emission, false);
    assert.equal(payload.media_policy, "metadata_only_no_media_urls");
    assert.equal(payload.shard_number, index + 1);
    assert.equal(payload.family_count, index < 12 ? 100 : 8);
    assert.equal(
      payload.source_snapshot_sha256,
      manifest.source_snapshot_sha256,
    );
    assert.equal(
      payload.decision_application_sha256,
      manifest.decision_application_sha256,
    );
    for (const family of payload.families) {
      assert.ok(family.source_keys.includes(family.representative_source_key));
    }
  }
  assert.deepEqual(
    families.map((family) => family.family_id),
    families.map((family) => family.family_id).toSorted(),
  );
  assert.equal(
    disposition.source_snapshot_sha256,
    manifest.source_snapshot_sha256,
  );
  assert.equal(
    disposition.decision_application_sha256,
    manifest.decision_application_sha256,
  );

  const projectionText = [
    readText(dispositionPath),
    readText(manifestPath),
    ...manifest.shards.map((descriptor) =>
      readText(path.join(stagingDir, descriptor.file)),
    ),
  ].join("\n");
  for (const forbidden of [
    /https?:\/\//i,
    /bocang\.oss/i,
    /\/upload\//i,
    /\/api\/catalog-image/i,
    /\/media\/source\//i,
    /\b(?:file|data|blob):/i,
  ]) {
    assert.doesNotMatch(projectionText, forbidden);
  }
});

test("full private runtime index is complete, deterministic, and fail-closed", () => {
  assert.equal(
    fullPrivateRuntimeManifest.projection,
    "product_catalog_v2_full_private_runtime_index",
  );
  assert.equal(fullPrivateRuntimeManifest.visibility, "private_noindex");
  assert.equal(
    fullPrivateRuntimeManifest.publication_state,
    "private_runtime_not_public_release",
  );
  assert.equal(fullPrivateRuntimeManifest.robots_index, false);
  assert.equal(fullPrivateRuntimeManifest.sitemap_included, false);
  assert.equal(fullPrivateRuntimeManifest.formal_routes_activated, false);
  assert.equal(fullPrivateRuntimeManifest.alias_activation, false);
  assert.equal(
    fullPrivateRuntimeManifest.media_policy,
    "approved_batch_paths_only_unauthorized_suppressed",
  );
  assert.equal(fullPrivateRuntimeManifest.source_count, 1913);
  assert.equal(fullPrivateRuntimeManifest.total_source_count, 1920);
  assert.equal(fullPrivateRuntimeManifest.eligible_source_count, 1913);
  assert.equal(fullPrivateRuntimeManifest.excluded_source_count, 7);
  assert.equal(
    fullPrivateRuntimeManifest.source_disposition_sha256,
    sha256File(dispositionPath),
  );
  assert.equal(fullPrivateRuntimeManifest.family_count, 1208);
  assert.equal(fullPrivateRuntimeManifest.route_ready_family_count, 22);
  assert.equal(fullPrivateRuntimeManifest.route_pending_family_count, 1186);
  assert.equal(fullPrivateRuntimeManifest.rich_detail_family_count, 120);
  assert.equal(fullPrivateRuntimeManifest.summary_detail_family_count, 1088);
  assert.equal(fullPrivateRuntimeManifest.shard_size, 100);
  assert.equal(fullPrivateRuntimeManifest.shard_count, 13);
  assert.equal(fullPrivateRuntimeShards.length, 13);
  assert.equal(
    fullPrivateRuntimeManifest.source_snapshot_sha256,
    manifest.source_snapshot_sha256,
  );
  assert.equal(
    fullPrivateRuntimeManifest.decision_application_sha256,
    manifest.decision_application_sha256,
  );

  assert.deepEqual(
    fullPrivateRuntimeManifest.shards.map((descriptor) => descriptor.file),
    Array.from(
      { length: 13 },
      (_, index) => `index-${String(index + 1).padStart(4, "0")}.json`,
    ),
  );
  for (const [index, { descriptor, payload }] of fullPrivateRuntimeShards.entries()) {
    const shardPath = path.join(fullPrivateRuntimeDir, descriptor.file);
    assert.equal(descriptor.sha256, sha256(readText(shardPath)));
    assert.equal(descriptor.bytes, fs.statSync(shardPath).size);
    assert.equal(descriptor.family_count, payload.family_count);
    assert.equal(descriptor.first_family_id, payload.items[0].family_id);
    assert.equal(
      descriptor.last_family_id,
      payload.items.at(-1).family_id,
    );
    assert.ok(payload.family_count > 0 && payload.family_count <= 100);
    assert.equal(payload.family_count, index < 12 ? 100 : 8);
    assert.equal(payload.shard_number, index + 1);
    assert.equal(payload.visibility, "private_noindex");
    assert.equal(payload.robots_index, false);
    assert.equal(payload.sitemap_included, false);
    assert.equal(payload.alias_activation, false);
    assert.equal(
      payload.media_policy,
      "approved_batch_paths_only_unauthorized_suppressed",
    );
    assert.equal(
      payload.source_snapshot_sha256,
      fullPrivateRuntimeManifest.source_snapshot_sha256,
    );
    assert.equal(
      payload.decision_application_sha256,
      fullPrivateRuntimeManifest.decision_application_sha256,
    );
    assert.equal(
      payload.family_set_sha256,
      fullPrivateRuntimeManifest.family_set_sha256,
    );
  }

  const runtimeFamilyIds = fullPrivateRuntimeFamilies.map(
    (family) => family.family_id,
  );
  const governanceFamilyIds = families.map((family) => family.family_id);
  assert.equal(runtimeFamilyIds.length, 1208);
  assert.equal(new Set(runtimeFamilyIds).size, 1208);
  assert.deepEqual(runtimeFamilyIds, runtimeFamilyIds.toSorted());
  assert.deepEqual(runtimeFamilyIds, governanceFamilyIds);
  assert.equal(
    fullPrivateRuntimeManifest.family_set_sha256,
    sha256(JSON.stringify(runtimeFamilyIds.toSorted())),
  );

  const variantRefs = fullPrivateRuntimeFamilies.flatMap(
    (family) => family.variant_refs,
  );
  assert.equal(variantRefs.length, 1913);
  assert.equal(new Set(variantRefs.map((variant) => variant.source_key)).size, 1913);
  assert.ok(
    variantRefs.every(
      (variant) =>
        variant.model_label === null ||
        variant.model_label !== variant.source_id,
    ),
  );
  assert.ok(
    fullPrivateRuntimeFamilies.every(
      (family) =>
        family.card_specs.length <= 3 &&
        family.card_specs.every(
          (spec) =>
            spec.evidence === "normalized_source_attributes" &&
            spec.values.length > 0,
        ),
    ),
  );
  const runtimeCrossCategoryFamilies = fullPrivateRuntimeFamilies.filter(
    (family) => family.category_state === "pending_owner_selection",
  );
  assert.equal(runtimeCrossCategoryFamilies.length, 24);
  assert.ok(
    runtimeCrossCategoryFamilies.every(
      (family) =>
        family.source_categories.length >= 2 &&
        family.category === "待复核" &&
        family.planned_canonical_route === null &&
        family.route_plan_state === "pending_category_selection",
    ),
  );
  assert.ok(
    fullPrivateRuntimeFamilies.every(
      (family) =>
        family.planned_canonical_route === null ||
        /^\/products\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(
          family.planned_canonical_route,
        ),
    ),
  );

  const shardBuffers = fullPrivateRuntimeManifest.shards.map((descriptor) =>
    fs.readFileSync(path.join(fullPrivateRuntimeDir, descriptor.file)),
  );
  assert.ok(
    shardBuffers.reduce((total, buffer) => total + buffer.length, 0) <
      2.2 * 1024 * 1024,
  );
  assert.ok(
    shardBuffers.reduce(
      (total, buffer) => total + gzipSync(buffer, { level: 9 }).length,
      0,
    ) < 210 * 1024,
  );
  assert.ok(Math.max(...shardBuffers.map((buffer) => buffer.length)) < 180 * 1024);

  const authorizedMedia = readJson(
    path.join(root, "content", "runtime", "catalog-v2", "authorized-media.json"),
  );
  const authorizedPaths = new Set(authorizedMedia.paths);
  const emittedPrimaryPaths = new Set(
    fullPrivateRuntimeFamilies
      .map((family) => family.representative.primary_image)
      .filter(Boolean),
  );
  assert.ok(
    [...emittedPrimaryPaths].every((mediaPath) => authorizedPaths.has(mediaPath)),
  );
  assert.equal(
    emittedPrimaryPaths.size,
    fullPrivateRuntimeManifest.emitted_primary_media_path_count,
  );
  assert.doesNotMatch(
    [
      readText(path.join(fullPrivateRuntimeDir, "manifest.json")),
      ...fullPrivateRuntimeManifest.shards.map((descriptor) =>
        readText(path.join(fullPrivateRuntimeDir, descriptor.file)),
      ),
    ].join("\n"),
    /https?:\/\/|bocang\.oss|undefined-|体戏|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i,
  );
});

test("full-release specification is exact but remains fail-closed", () => {
  assert.equal(fullReleaseReadiness.batch_id, "catalog-v2-full-release-1208");
  assert.equal(fullReleaseReadiness.target_visibility, "public_indexable");
  assert.equal(fullReleaseReadiness.state, "draft");
  assert.equal(fullReleaseReadiness.family_count, 1208);
  assert.equal(fullReleaseReadiness.source_member_count, 1913);
  assert.equal(fullReleaseReadiness.full_batch_coverage_exact, true);
  assert.equal(fullReleaseReadiness.relationship_reviews.required_count, 353);
  assert.equal(fullReleaseReadiness.relationship_reviews.approved_count, 353);
  assert.deepEqual(
    fullReleaseReadiness.relationship_reviews.unresolved_review_ids,
    [],
  );
  assert.equal(fullReleaseReadiness.category_anomaly_reviews.required_count, 5);
  assert.equal(fullReleaseReadiness.category_anomaly_reviews.approved_count, 5);
  assert.deepEqual(
    fullReleaseReadiness.category_anomaly_reviews.unresolved_review_ids,
    [],
  );
  assert.equal(
    fullReleaseReadiness.cross_category_owner_selection.required_count,
    24,
  );
  assert.equal(
    fullReleaseReadiness.canonical_route_readiness.route_pending_family_count,
    0,
  );
  assert.equal(
    fullReleaseReadiness.cross_category_owner_selection.neutral_route_contract_complete,
    true,
  );
  assert.equal(fullReleaseReadiness.public_runtime.emitted, true);
  assert.equal(fullReleaseReadiness.public_runtime.publication_state, "prepared_noindex");
  assert.equal(fullReleaseReadiness.public_runtime.catalog_count, 1208);
  assert.equal(
    fullReleaseReadiness.media_authorization.public_projection.emitted_media_path_count,
    0,
  );
  assert.equal(
    fullReleaseReadiness.media_authorization.public_projection.emitted_unauthorized_media_path_count,
    0,
  );
  assert.equal(fullReleaseReadiness.public_release_eligible, false);
  assert.deepEqual(fullReleaseReadiness.blockers, [
    "full_release_batch_not_active",
    "full_release_batch_not_signed",
  ]);
});

test("full private runtime index is not imported into built artifacts", () => {
  const marker = "product_catalog_v2_full_private_runtime_index";
  const sourceEntrypoints = [
    "content/catalog-v2.generated.ts",
    "app/catalog-lab/page.tsx",
    "app/catalog-lab/[familyId]/page.tsx",
    "worker/index.ts",
  ];
  for (const relativePath of sourceEntrypoints) {
    assert.doesNotMatch(readText(path.join(root, relativePath)), new RegExp(marker));
  }

  const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);
  const builtText = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const pathname = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(pathname);
      else if (entry.isFile() && textExtensions.has(path.extname(pathname))) {
        builtText.push(readText(pathname));
      }
    }
  };
  for (const directory of [path.join(root, "dist", "client"), path.join(root, "dist", "server")]) {
    assert.equal(fs.existsSync(directory), true, directory);
    visit(directory);
  }
  assert.doesNotMatch(builtText.join("\n"), new RegExp(marker));
});

test("three local supplements expose file evidence only and never enter runtime media", () => {
  const supplements = disposition.sources.filter(
    (source) => source.source_type === "local_supplement",
  );
  assert.deepEqual(
    supplements.map((source) => [source.source_key, source.local_media_evidence.length]),
    [
      ["local_supplement:补充-120116", 7],
      ["local_supplement:补充-120118", 4],
      ["local_supplement:补充-120122", 9],
    ],
  );

  const runtimeDir = path.join(root, "content", "runtime", "catalog-v2");
  const runtimeText = [
    readText(path.join(runtimeDir, "index.json")),
    readText(path.join(runtimeDir, "authorized-media.json")),
    ...fs
      .readdirSync(path.join(runtimeDir, "details"))
      .filter((file) => file.endsWith(".json"))
      .map((file) => readText(path.join(runtimeDir, "details", file))),
  ].join("\n");

  for (const source of supplements) {
    assert.equal(source.sample_membership.in_active_private_sample, true);
    assert.ok(
      source.quality_gaps.includes(
        "local_media_governance_only_not_runtime_authorized",
      ),
    );
    assert.equal(
      source.local_media_evidence.filter((evidence) => evidence.role === "primary")
        .length,
      1,
    );
    for (const evidence of source.local_media_evidence) {
      assert.equal(evidence.exists, true);
      assert.ok(evidence.bytes > 0);
      assert.match(evidence.sha256, /^[a-f0-9]{64}$/);
      assert.match(evidence.relative_path_sha256, /^[a-f0-9]{64}$/);
      assert.equal(path.isAbsolute(evidence.catalog_relative_path), false);
      assert.equal(evidence.catalog_relative_path.includes(".."), false);
      assert.ok(evidence.catalog_relative_path.startsWith("商品图片/"));
      assert.equal(
        evidence.relative_path_sha256,
        sha256(evidence.note_relative_path),
      );

      if (externalSupplementSourcesAvailable) {
        const localPath = path.join(sourceRoot, evidence.catalog_relative_path);
        const stat = fs.statSync(localPath);
        assert.equal(stat.isFile(), true);
        assert.equal(stat.size, evidence.bytes);
        assert.equal(sha256File(localPath), evidence.sha256);
      }
      assert.equal(runtimeText.includes(evidence.catalog_relative_path), false);
      assert.equal(runtimeText.includes(evidence.note_relative_path), false);
    }
  }
});
