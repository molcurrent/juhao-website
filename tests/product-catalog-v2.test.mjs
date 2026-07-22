import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { consultationHref } from "../lib/consultation.ts";

const root = process.cwd();
const governance = path.join(root, "content", "governance");
const runtime = path.join(root, "content", "runtime", "catalog-v2");
const catalogDataRoot = process.env.JUHAO_DATA_ROOT ?? "/Users/mac/Documents/juhao数据库";
const externalCatalogSourcesAvailable = [
  path.join(catalogDataRoot, "企业知识库", "商城系统", "商品说明"),
  path.join(catalogDataRoot, "企业知识库", "物联网系统", "产品配置"),
  path.join(catalogDataRoot, "juhao_mall_2026-07-16_02-41-53_mysql_data.sql"),
  path.join(catalogDataRoot, "bocang_2026-07-16_02-30-02_mysql_data.sql"),
  path.join(catalogDataRoot, "bocang_filtered_2026-07-16.sql"),
].every((pathname) => fs.existsSync(pathname));

const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha256 = (file) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, file)))
    .digest("hex");
const sha256At = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function directorySnapshot(directory) {
  const snapshot = {};
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const pathname = path.join(current, entry.name);
      if (entry.isDirectory()) visit(pathname);
      else if (entry.isFile()) {
        snapshot[path.relative(directory, pathname)] = sha256At(pathname);
      }
    }
  };
  visit(directory);
  return Object.fromEntries(
    Object.entries(snapshot).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

const sourceSnapshot = readJson(
  "content/governance/product-catalog-v2-source-snapshot.json",
);
const qualityReport = readJson(
  "content/governance/product-catalog-v2-quality-report.json",
);
const routeAliases = readJson(
  "content/governance/product-catalog-v2-route-aliases.json",
);
const manifest = readJson("content/runtime/catalog-v2/manifest.json");
const index = readJson("content/runtime/catalog-v2/index.json");
const sampleBatch = readJson(
  "content/governance/product-sample-batch-120.json",
);
const decisionLedger = readJson(
  "content/governance/product-catalog-v2-family-decisions.json",
);
const releaseBatches = readJson(
  "content/governance/product-catalog-v2-release-batches.json",
);
const releaseValidation = readJson(
  "content/governance/product-catalog-v2-release-validation.json",
);
const fullReleaseReadiness = readJson(
  "content/governance/product-catalog-v2-full-release-readiness.json",
);
const reviewWorkbench = readJson(
  "content/governance/product-catalog-v2-review-workbench.json",
);
const pilotCandidates = readJson(
  "content/governance/product-catalog-v2-public-pilot-candidates.json",
);
const decisionApplication = readJson(
  "content/governance/product-catalog-v2-decision-application.json",
);
const privatePilotPreview = readJson(
  "content/governance/product-catalog-v2-private-pilot-preview.json",
);
const activeAliasPreview = readJson(
  "content/governance/product-catalog-v2-active-alias-preview.json",
);
const authorizedMedia = readJson(
  "content/runtime/catalog-v2/authorized-media.json",
);

test("catalog v2 freezes the 2026-07-16 product and IoT boundaries", () => {
  assert.equal(sourceSnapshot.snapshot_date, "2026-07-16");
  assert.equal(
    sourceSnapshot.sources.knowledge_base_product_notes.product_records,
    1920,
  );
  assert.equal(sourceSnapshot.sources.local_supplements.count, 3);
  assert.equal(sourceSnapshot.web_catalog_boundary.eligible_lighting_records, 1913);
  assert.equal(sourceSnapshot.web_catalog_boundary.excluded_non_lighting_records, 7);
  assert.ok(
    sourceSnapshot.web_catalog_boundary.exclusions.every(
      (item) => item.disposition === "governance_only_excluded_from_web_catalog",
    ),
  );
  assert.equal(sourceSnapshot.sources.iot_boundary.product_note_count, 101);
  assert.equal(sourceSnapshot.sources.iot_boundary.web_catalog_import, "excluded");
  assert.equal(sourceSnapshot.quality.compound_key_duplicates, 0);
});

test("catalog v2 sample is lightweight, cross-category, and internally unique", () => {
  assert.equal(manifest.sample_family_count, 120);
  assert.equal(index.items.length, 120);
  assert.equal(new Set(index.items.map((item) => item.family_id)).size, 120);
  assert.equal(
    new Set(index.items.map((item) => item.category)).size,
    manifest.categories_covered.length,
  );
  assert.equal(manifest.categories_covered.length, 24);
  assert.ok(fs.statSync(path.join(runtime, "index.json")).size <= 500 * 1024);

  const detailFiles = fs
    .readdirSync(path.join(runtime, "details"))
    .filter((file) => file.endsWith(".json"));
  assert.equal(detailFiles.length, 120);

  const sourceKeys = [];
  for (const item of index.items) {
    const detail = readJson(
      `content/runtime/catalog-v2/details/${item.family_id}.json`,
    );
    assert.equal(detail.family.family_id, item.family_id);
    assert.ok(detail.variants.length >= 1);
    sourceKeys.push(...detail.variants.map((variant) => variant.source_key));
  }
  assert.equal(new Set(sourceKeys).size, sourceKeys.length);
});

test("all existing product URLs have a reserved family migration mapping", () => {
  assert.equal(routeAliases.length, 31);
  assert.equal(new Set(routeAliases.map((item) => item.legacy_route)).size, 31);
  assert.equal(new Set(routeAliases.map((item) => item.family_id)).size, 22);
  assert.ok(routeAliases.every((item) => item.planned_canonical_route));
  assert.ok(
    routeAliases.every(
      (item) =>
        /^\/products\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(
          item.planned_canonical_route,
        ) &&
        !item.planned_canonical_route.startsWith("/products/family/"),
    ),
  );
  const preserved = routeAliases.filter(
    (item) => item.route_action === "preserve_canonical",
  );
  const redirected = routeAliases.filter(
    (item) => item.route_action === "redirect_to_family_canonical",
  );
  assert.equal(preserved.length, 22);
  assert.equal(redirected.length, 9);
  assert.ok(
    preserved.every(
      (item) =>
        item.route_state === "reserved_canonical_not_activated" &&
        item.legacy_route === item.planned_canonical_route,
    ),
  );
  assert.ok(
    redirected.every(
      (item) =>
        item.route_state === "reserved_alias_not_activated" &&
        item.legacy_route !== item.planned_canonical_route,
    ),
  );
});

test("derived runtime removes known source defects and excludes sensitive keys", () => {
  const runtimeText = [
    fs.readFileSync(path.join(runtime, "index.json"), "utf8"),
    ...fs
      .readdirSync(path.join(runtime, "details"))
      .filter((file) => file.endsWith(".json"))
      .map((file) =>
        fs.readFileSync(path.join(runtime, "details", file), "utf8"),
      ),
  ].join("\n");

  assert.doesNotMatch(runtimeText, /undefined-/i);
  assert.doesNotMatch(runtimeText, /体戏/);
  assert.doesNotMatch(runtimeText, /https?:\/\//i);
  assert.doesNotMatch(
    runtimeText,
    /"(?:has_snapshot_price|has_snapshot_stock|stock_and_price)"\s*:/i,
  );
  assert.doesNotMatch(
    runtimeText,
    /\b(?:4014|4019|4020|4021|5181|11702|11703)\b/,
  );
  assert.doesNotMatch(
    runtimeText,
    /"(?:user_id|address|payment|device_id|password|secret|token)"\s*:/i,
  );
  assert.ok(Object.values(qualityReport.acceptance).every(Boolean));
  assert.equal(qualityReport.runtime.stock_and_price_exposed, false);
});

test("catalog v2 governance artifacts are present", () => {
  for (const file of [
    "product-family-review.csv",
    "product-catalog-v2-quality-report.md",
    "product-catalog-v2-family-decisions.json",
    "product-catalog-v2-public-route-contract.json",
    "product-catalog-v2-release-batches.json",
    "product-catalog-v2-release-validation.json",
    "product-catalog-v2-full-release-readiness.json",
    "product-catalog-v2-decision-application.json",
    "product-catalog-v2-private-pilot-preview.json",
    "product-catalog-v2-active-alias-preview.json",
    "product-sample-batch-120.json",
  ]) {
    assert.ok(fs.statSync(path.join(governance, file)).size > 0);
  }
});

test("catalog generation is deterministic, cleans stale shards, and preserves human ledgers", {
  skip: !externalCatalogSourcesAvailable,
}, () => {
  const tempRoot = fs.mkdtempSync(path.join(tmpdir(), "juhao-catalog-v2-"));
  const tempContent = path.join(tempRoot, "content");
  fs.cpSync(path.join(root, "content"), tempContent, { recursive: true });
  const decisionPath = path.join(
    tempContent,
    "governance",
    "product-catalog-v2-family-decisions.json",
  );
  const releasePath = path.join(
    tempContent,
    "governance",
    "product-catalog-v2-release-batches.json",
  );
  const staleShard = path.join(
    tempContent,
    "governance",
    "product-catalog-v2-family-staging",
    "families-9999.json",
  );
  const stalePrivateRuntimeShard = path.join(
    tempContent,
    "runtime",
    "catalog-v2-full-private",
    "index-9999.json",
  );
  const python = [
    "from pathlib import Path",
    "from scripts.product_catalog_v2 import build_catalog_v2",
    "import sys",
    "build_catalog_v2(Path(sys.argv[1]), check=sys.argv[2] == 'check')",
  ].join("; ");
  const run = (mode) =>
    spawnSync("python3", ["-c", python, tempRoot, mode], {
      cwd: root,
      encoding: "utf8",
    });

  try {
    const decisionBefore = sha256At(decisionPath);
    const releaseBefore = sha256At(releasePath);
    fs.writeFileSync(staleShard, "{}\n");
    fs.mkdirSync(path.dirname(stalePrivateRuntimeShard), { recursive: true });
    fs.writeFileSync(stalePrivateRuntimeShard, "{}\n");

    const staleCheck = run("check");
    assert.notEqual(staleCheck.status, 0);
    assert.match(
      `${staleCheck.stderr}\n${staleCheck.stdout}`,
      /families-9999\.json/,
    );
    assert.match(
      `${staleCheck.stderr}\n${staleCheck.stdout}`,
      /index-9999\.json/,
    );

    const firstWrite = run("write");
    assert.equal(
      firstWrite.status,
      0,
      firstWrite.stderr || firstWrite.stdout,
    );
    assert.equal(fs.existsSync(staleShard), false);
    assert.equal(fs.existsSync(stalePrivateRuntimeShard), false);
    const firstSnapshot = directorySnapshot(tempContent);

    const secondWrite = run("write");
    assert.equal(
      secondWrite.status,
      0,
      secondWrite.stderr || secondWrite.stdout,
    );
    assert.deepEqual(directorySnapshot(tempContent), firstSnapshot);

    const finalCheck = run("check");
    assert.equal(finalCheck.status, 0, finalCheck.stderr || finalCheck.stdout);
    assert.equal(sha256At(decisionPath), decisionBefore);
    assert.equal(sha256At(releasePath), releaseBefore);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("catalog check validates the committed snapshot without private external sources", () => {
  const result = spawnSync(
    "python3",
    ["scripts/build_product_catalog.py", "--catalog-v2", "--check"],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, JUHAO_DATA_ROOT: path.join(tmpdir(), "juhao-missing-sources") },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.source_mode, "committed_snapshot");
  assert.equal(report.source_products, 1920);
  assert.equal(report.derived_families, 1208);
  assert.equal(report.sample, 120);
  assert.ok(Object.values(report.acceptance).every(Boolean));
});

test("private sample and release batch describe the exact same family set", () => {
  assert.deepEqual(sampleBatch.family_ids, index.items.map((item) => item.family_id));
  assert.equal(sampleBatch.release_batch.batch_id, releaseBatches.active_batch_id);
  assert.equal(sampleBatch.release_batch.target_visibility, "private_noindex");
  assert.equal(sampleBatch.release_batch.robots_index, false);
  assert.equal(sampleBatch.release_batch.sitemap_included, false);
  assert.equal(sampleBatch.release_batch.alias_activation, "disabled");
  assert.equal(sampleBatch.release_batch.public_release_eligible, false);
});

test("human decisions remain separate while public release blockers are explicit", () => {
  assert.equal(decisionLedger.ownership, "human_reviewed_append_only");
  assert.equal(decisionLedger.decisions.length, 358);
  assert.ok(decisionLedger.decisions.every((decision) => decision.status === "approved"));
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(decisionLedger.decisions.map((decision) => decision.action))]
        .sort()
        .map((action) => [
          action,
          decisionLedger.decisions.filter((decision) => decision.action === action)
            .length,
        ]),
    ),
    {
      confirm_family: 185,
      keep_separate: 168,
      recategorize: 5,
    },
  );
  assert.equal(releaseValidation.family_count, 120);
  assert.equal(releaseValidation.required_review_ids.length, 49);
  assert.equal(releaseValidation.unresolved_review_ids.length, 0);
  assert.equal(releaseValidation.required_category_review_ids.length, 0);
  assert.equal(releaseValidation.blocking_category_review_ids.length, 0);
  assert.equal(releaseValidation.media_authorization.unique_media_paths, 1131);
  assert.equal(releaseValidation.media_authorization.authorized_media_paths, 124);
  assert.equal(
    releaseValidation.media_authorization.unauthorized_media_path_count,
    1007,
  );
  assert.equal(releaseValidation.public_release_eligible, false);
  assert.deepEqual(releaseValidation.blockers, [
    "1007_media_paths_unauthorized",
    "private_noindex_batch_not_public_release",
  ]);
  assert.equal(fullReleaseReadiness.public_release_eligible, false);
  assert.equal(fullReleaseReadiness.relationship_reviews.approved_count, 353);
  assert.equal(fullReleaseReadiness.category_anomaly_reviews.approved_count, 5);
});

test("catalog review workbench exactly represents the active decision queue", () => {
  assert.equal(reviewWorkbench.batch_id, releaseValidation.batch_id);
  assert.equal(
    reviewWorkbench.source_snapshot_sha256,
    releaseValidation.source_snapshot_sha256,
  );
  assert.equal(reviewWorkbench.counts.total, 49);
  assert.equal(reviewWorkbench.counts.pending, 0);
  assert.equal(reviewWorkbench.counts.approved, 49);
  assert.equal(reviewWorkbench.counts.confirm_auto_family, 19);
  assert.equal(reviewWorkbench.counts.merge_candidate, 30);
  assert.equal(reviewWorkbench.counts.category_anomaly, 0);
  assert.equal(reviewWorkbench.counts.shared_member_source_keys, 42);
  assert.equal(reviewWorkbench.counts.linked_review_clusters, 4);
  assert.equal(
    reviewWorkbench.decision_ledger_sha256,
    sha256("content/governance/product-catalog-v2-family-decisions.json"),
  );

  const ids = reviewWorkbench.review_items.map((item) => item.review_id);
  assert.equal(new Set(ids).size, 49);
  assert.deepEqual(
    new Set(ids),
    new Set([
      ...releaseValidation.required_review_ids,
      ...releaseValidation.required_category_review_ids,
    ]),
  );
  assert.ok(
    reviewWorkbench.review_items.every(
      (item) =>
        /^[a-f0-9]{64}$/.test(item.candidate_sha256) &&
        item.members.length === item.member_count &&
        item.machine_state === "approved" &&
        item.members.every(
          (member) =>
            member.source_key &&
            member.current_family_id &&
            member.source_sha256,
        ),
    ),
  );

  const categoryItems = reviewWorkbench.review_items.filter(
    (item) => item.review_kind === "category_anomaly",
  );
  assert.equal(categoryItems.length, 0);
});

test("public pilot artifact stays advisory and preserves the real release boundary", () => {
  assert.equal(pilotCandidates.status, "advisory_only_not_release_batch");
  assert.equal(pilotCandidates.counts.active_sample_families, 120);
  assert.equal(pilotCandidates.counts.authorized_primary_candidates, 22);
  assert.equal(pilotCandidates.counts.fully_media_authorized_candidates, 1);
  assert.equal(pilotCandidates.counts.decision_clear_candidates, 22);
  assert.equal(pilotCandidates.counts.release_ready_candidates, 0);
  assert.equal(pilotCandidates.counts.legacy_aliases_covered, 31);
  assert.equal(pilotCandidates.candidates.length, 22);
  assert.ok(
    pilotCandidates.candidates.every(
      (item) =>
        item.media.primary_image_authorized === true &&
        item.release_ready === false &&
        item.governance.unresolved_review_ids.length === 0 &&
        item.governance.unresolved_category_review_ids.length === 0,
    ),
  );
  assert.deepEqual(
    pilotCandidates.candidates
      .filter((item) => item.media.fully_authorized)
      .map((item) => item.family_id),
    ["family-a3d872de3600"],
  );
});

test("decision application is deterministic, auditable, and conserves the current baseline", () => {
  assert.equal(decisionApplication.engine_version, "catalog_decision_engine_v1");
  assert.equal(decisionApplication.input_source_count, 1913);
  assert.equal(decisionApplication.included_source_count, 1913);
  assert.equal(decisionApplication.excluded_source_count, 0);
  assert.equal(decisionApplication.input_family_count, 1208);
  assert.equal(decisionApplication.output_family_count, 1208);
  assert.equal(decisionApplication.active_approved_decision_ids.length, 358);
  assert.equal(decisionApplication.applied_review_ids.length, 358);
  assert.deepEqual(decisionApplication.action_counts, {
    confirm_family: 185,
    keep_separate: 168,
    recategorize: 5,
  });
  assert.equal(decisionApplication.source_files_modified, false);
  assert.match(decisionApplication.input_family_model_sha256, /^[a-f0-9]{64}$/);
  assert.match(decisionApplication.output_family_model_sha256, /^[a-f0-9]{64}$/);
  assert.match(decisionApplication.decision_application_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(
    decisionApplication.input_family_model_sha256,
    decisionApplication.output_family_model_sha256,
  );
});

test("private pilot tiers and alias mapping remain advisory only", () => {
  assert.equal(
    privatePilotPreview.status,
    "advisory_only_not_active_release_batch",
  );
  assert.equal(privatePilotPreview.active_release_batch_modified, false);
  assert.equal(privatePilotPreview.human_decisions_created, false);
  assert.deepEqual(privatePilotPreview.recommended_sequence, [
    "private-pilot-top-1",
    "private-pilot-top-18",
  ]);
  assert.deepEqual(
    privatePilotPreview.tiers.map((tier) => [
      tier.candidate_rank_limit,
      tier.authorized_media_path_count,
      tier.suppressed_media_path_count,
      tier.legacy_alias_preview_count,
      tier.candidate_pool_relationship_closed,
    ]),
    [
      [1, 6, 0, 3, true],
      [14, 76, 77, 17, false],
      [17, 94, 98, 20, false],
      [18, 100, 105, 21, true],
      [22, 124, 133, 31, true],
    ],
  );
  assert.equal(activeAliasPreview.mode, "dry_run");
  assert.equal(activeAliasPreview.activation, false);
  assert.equal(activeAliasPreview.worker_imported, false);
  assert.equal(activeAliasPreview.sitemap_included, false);
  assert.equal(activeAliasPreview.alias_count, 31);
  assert.equal(activeAliasPreview.canonical_preservation_count, 22);
  assert.equal(activeAliasPreview.redirect_count, 9);
  assert.ok(
    activeAliasPreview.aliases.every(
      (alias) =>
        alias.activation === false &&
        alias.private_preview_route.startsWith("/catalog-lab/") &&
        /^\/products\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(
          alias.future_canonical_route,
        ) &&
        !alias.future_canonical_route.startsWith("/products/family/"),
    ),
  );
});

test("private runtime emits only the exact authorized media allowlist", () => {
  assert.equal(authorizedMedia.schema_version, 1);
  assert.equal(authorizedMedia.visibility, "private_noindex");
  assert.equal(authorizedMedia.path_count, 124);
  assert.equal(authorizedMedia.paths.length, 124);
  assert.equal(new Set(authorizedMedia.paths).size, 124);
  const allowlist = new Set(authorizedMedia.paths);
  const emitted = new Set();
  for (const item of index.items) {
    const detail = readJson(
      `content/runtime/catalog-v2/details/${item.family_id}.json`,
    );
    const paths = [
      detail.family.representative.primary_image,
      detail.representative_detail.primary_image,
      ...detail.representative_detail.detail_images,
    ].filter(Boolean);
    for (const mediaPath of paths) {
      assert.ok(allowlist.has(mediaPath), mediaPath);
      emitted.add(mediaPath);
    }
    assert.equal(
      detail.representative_detail.emitted_detail_image_count,
      detail.representative_detail.detail_images.length,
    );
    assert.equal(
      detail.representative_detail.media_policy,
      "approved_batch_paths_only_private_preview",
    );
  }
  assert.deepEqual(emitted, allowlist);
  assert.equal(
    index.items.filter((item) => item.representative.primary_image).length,
    22,
  );
  const filteredDetail = readJson(
    "content/runtime/catalog-v2/details/family-5ae1d7b4ce39.json",
  ).representative_detail;
  assert.equal(filteredDetail.detail_image_count, 18);
  assert.equal(filteredDetail.emitted_detail_image_count, 5);
  assert.equal(filteredDetail.suppressed_media_path_count, 7);
});

test("media owner queue exactly covers active sample paths lacking authorization", () => {
  const csvPath = path.join(
    governance,
    "product-catalog-v2-media-review.csv",
  );
  const lines = fs.readFileSync(csvPath, "utf8").trimEnd().split("\n");
  assert.equal(lines.length, 1008);
  assert.match(lines[0], /^media_path,source_url,roles,/);
  const queuedPaths = lines.slice(1).map((line) => line.split(",", 1)[0]);
  assert.equal(new Set(queuedPaths).size, 1007);
  assert.deepEqual(
    new Set(queuedPaths),
    new Set(releaseValidation.media_authorization.unauthorized_media_paths),
  );
  assert.equal(releaseValidation.media_authorization.family_count, 120);
});

test("decision detail validation is complete and structural approvals stay fail-closed", () => {
  const script = String.raw`
from scripts.product_catalog_v2 import (
    DIRECTLY_EFFECTIVE_REVIEW_ACTIONS,
    validate_decision_details,
)

candidate = {"member_keys": "mall_sql:1|mall_sql:2"}
allowed = {"吸顶灯", "吊灯"}

def must_fail(decision):
    try:
        validate_decision_details(candidate, decision, allowed)
    except RuntimeError:
        return
    raise AssertionError(f"decision unexpectedly passed: {decision}")

must_fail({"decision_id": "decision-split", "action": "split_family"})
must_fail({
    "decision_id": "decision-split-overlap",
    "action": "split_family",
    "split_groups": [["mall_sql:1"], ["mall_sql:1", "mall_sql:2"]],
})
validate_decision_details({
    "member_keys": "mall_sql:1|mall_sql:2"
}, {
    "decision_id": "decision-split-valid",
    "action": "split_family",
    "split_groups": [["mall_sql:1"], ["mall_sql:2"]],
}, allowed)

must_fail({
    "decision_id": "decision-category-invalid",
    "action": "recategorize",
    "target_category": "新造分类",
})
validate_decision_details(candidate, {
    "decision_id": "decision-category-valid",
    "action": "recategorize",
    "target_category": "吸顶灯",
}, allowed)

must_fail({
    "decision_id": "decision-exclude-invalid",
    "action": "exclude_with_disposition",
    "disposition": "anything",
})
validate_decision_details(candidate, {
    "decision_id": "decision-exclude-valid",
    "action": "exclude_with_disposition",
    "disposition": "insufficient_product_evidence_hold",
}, allowed)

assert DIRECTLY_EFFECTIVE_REVIEW_ACTIONS == {"confirm_family", "keep_separate"}
`;
  const result = spawnSync("python3", ["-c", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("decision revisions are linear and drafts cannot deactivate approved heads", () => {
  const script = String.raw`
import json
import tempfile
from pathlib import Path
from scripts.product_catalog_v2 import validate_family_decisions

snapshot = "a" * 64
candidate = {
    "review_id": "family-fixture",
    "review_kind": "confirm_auto_family",
    "candidate_sha256": "b" * 64,
    "member_keys": "mall_sql:1|mall_sql:2",
}
base = {
    "schema_version": 1,
    "ledger_id": "catalog-v2-family-decisions",
    "source_snapshot_sha256": snapshot,
    "ownership": "human_reviewed_append_only",
    "revision_policy": "append_a_new_decision_and_reference_supersedes_decision_id",
}
approved = {
    "decision_id": "decision-old001",
    "review_id": candidate["review_id"],
    "candidate_sha256": candidate["candidate_sha256"],
    "status": "approved",
    "action": "confirm_family",
    "reviewer": "owner",
    "reviewed_at": "2026-07-18",
    "rationale": "baseline approval",
}
draft = {
    "decision_id": "decision-draft01",
    "review_id": candidate["review_id"],
    "candidate_sha256": candidate["candidate_sha256"],
    "status": "draft",
    "action": "split_family",
    "supersedes_decision_id": approved["decision_id"],
}
successor = {
    "decision_id": "decision-new001",
    "review_id": candidate["review_id"],
    "candidate_sha256": candidate["candidate_sha256"],
    "status": "approved",
    "action": "split_family",
    "split_groups": [["mall_sql:1"], ["mall_sql:2"]],
    "reviewer": "owner",
    "reviewed_at": "2026-07-19",
    "rationale": "approved revision",
    "supersedes_decision_id": draft["decision_id"],
}

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    governance = root / "content" / "governance"
    governance.mkdir(parents=True)
    ledger_path = governance / "product-catalog-v2-family-decisions.json"
    ledger_path.write_text(json.dumps({**base, "decisions": [approved, draft]}))
    summary, active = validate_family_decisions(
        root, [candidate], [], snapshot, {"吸顶灯"}
    )
    assert summary["active_approved_count"] == 1
    assert active[candidate["review_id"]]["decision_id"] == approved["decision_id"]

    ledger_path.write_text(
        json.dumps({**base, "decisions": [approved, draft, successor]})
    )
    summary, active = validate_family_decisions(
        root, [candidate], [], snapshot, {"吸顶灯"}
    )
    assert summary["active_approved_count"] == 1
    assert active[candidate["review_id"]]["decision_id"] == successor["decision_id"]

    invalid = {**approved, "reviewed_at": "2026-99-99"}
    ledger_path.write_text(json.dumps({**base, "decisions": [invalid]}))
    try:
        validate_family_decisions(root, [candidate], [], snapshot, {"吸顶灯"})
    except RuntimeError:
        pass
    else:
        raise AssertionError("invalid calendar date was accepted")
`;
  const result = spawnSync("python3", ["-c", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("catalog media authorization requires the approved same-origin batch", () => {
  const script = String.raw`
import json
import tempfile
from pathlib import Path
from scripts.product_catalog_v2 import (
    authorized_catalog_media_paths,
    sample_media_authorization,
)

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    governance = root / "content" / "governance"
    governance.mkdir(parents=True)
    (governance / "media-authorization-batches.json").write_text(json.dumps([
        {
            "batch_id": "approved-batch",
            "authorization_status": "approved",
            "source_domain": "bocang.oss-cn-shenzhen.aliyuncs.com",
            "source_urls": [
                "http://bocang.oss-cn-shenzhen.aliyuncs.com/upload/goods/ok.jpg"
            ],
        },
        {
            "batch_id": "revoked-batch",
            "authorization_status": "revoked",
            "source_domain": "bocang.oss-cn-shenzhen.aliyuncs.com",
            "source_urls": [
                "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/goods/revoked.jpg"
            ],
        },
    ]))
    (governance / "media-inventory.json").write_text(json.dumps([
        {
            "asset_url": "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/goods/ok.jpg",
            "normalized_source_url": "",
            "publish_allowed": True,
            "rights_status": "approved",
            "authorization_batch_id": "approved-batch",
        },
        {
            "asset_url": "https://evil.example/upload/goods/ok.jpg",
            "normalized_source_url": "",
            "publish_allowed": True,
            "rights_status": "approved",
            "authorization_batch_id": "approved-batch",
        },
        {
            "asset_url": "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/goods/revoked.jpg",
            "normalized_source_url": "",
            "publish_allowed": True,
            "rights_status": "approved",
            "authorization_batch_id": "revoked-batch",
        },
        {
            "asset_url": "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/goods/no-rights.jpg",
            "normalized_source_url": "",
            "publish_allowed": True,
            "rights_status": "pending",
            "authorization_batch_id": "approved-batch",
        },
        {
            "asset_url": "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/goods/not-in-batch.jpg",
            "normalized_source_url": "",
            "publish_allowed": True,
            "rights_status": "approved",
            "authorization_batch_id": "approved-batch",
        },
    ]))
    paths = authorized_catalog_media_paths(root)
    assert paths == {"/upload/goods/ok.jpg"}
    details = {
        "family-one": {
            "representative_detail": {
                "primary_image": "/upload/goods/ok.jpg",
                "detail_images": ["/upload/goods/revoked.jpg"],
            }
        }
    }
    report = sample_media_authorization(root, details)
    assert report["family_count"] == 1
    assert report["unique_media_paths"] == 2
    assert report["authorized_media_paths"] == 1
    assert report["unauthorized_media_path_count"] == 1
`;
  const result = spawnSync("python3", ["-c", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("catalog comparison context stays inside the consultation contract", () => {
  const familyIds = index.items.slice(0, 3).map((item) => item.family_id);
  const sourceDetail = `compare-${familyIds.join("-")}`;
  assert.ok(sourceDetail.length <= 80);
  assert.match(sourceDetail, /^[a-z0-9-]+$/i);
  assert.equal(
    consultationHref("project", "products", sourceDetail),
    `/contact?source=products&scene=project&intent=project-brief&sourceDetail=${sourceDetail}#consultation-form`,
  );
});
