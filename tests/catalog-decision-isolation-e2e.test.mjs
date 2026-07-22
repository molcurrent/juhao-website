import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const catalogDataRoot = process.env.JUHAO_DATA_ROOT ?? "/Users/mac/Documents/juhao数据库";
const externalCatalogSourcesAvailable = [
  path.join(catalogDataRoot, "企业知识库", "商城系统", "商品说明"),
  path.join(catalogDataRoot, "企业知识库", "物联网系统", "产品配置"),
  path.join(catalogDataRoot, "juhao_mall_2026-07-16_02-41-53_mysql_data.sql"),
  path.join(catalogDataRoot, "bocang_2026-07-16_02-30-02_mysql_data.sql"),
  path.join(catalogDataRoot, "bocang_filtered_2026-07-16.sql"),
].every((pathname) => fs.existsSync(pathname));
const familyId = "family-a3d872de3600";
const decisionId = "decision-owner-f-a3d872de3600";
const memberKeys = [
  "mall_sql:11648",
  "mall_sql:11649",
  "mall_sql:11650",
  "mall_sql:11651",
  "mall_sql:11652",
];
const realDecisionLedger = path.join(
  root,
  "content",
  "governance",
  "product-catalog-v2-family-decisions.json",
);
const realReleaseLedger = path.join(
  root,
  "content",
  "governance",
  "product-catalog-v2-release-batches.json",
);
const realRuntimeManifest = path.join(
  root,
  "content",
  "runtime",
  "catalog-v2",
  "manifest.json",
);

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const pythonRunner = String.raw`
import sys
from pathlib import Path
from scripts.product_catalog_v2 import build_catalog_v2

build_catalog_v2(Path(sys.argv[1]), check=sys.argv[2] == "check")
`;

function runCatalog(tempRoot, mode) {
  const result = spawnSync(
    "python3",
    ["-c", pythonRunner, tempRoot, mode],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );
}

function readStagedFamilies(tempRoot) {
  const stagingDir = path.join(
    tempRoot,
    "content",
    "governance",
    "product-catalog-v2-family-staging",
  );
  const manifest = readJson(path.join(stagingDir, "manifest.json"));
  return manifest.shards.flatMap(({ file }) =>
    readJson(path.join(stagingDir, file)).families,
  );
}

test(
  "approved family confirmation is regenerated only inside an isolated content copy",
  { timeout: 120_000, skip: !externalCatalogSourcesAvailable },
  () => {
    const realBefore = {
      decision: sha256File(realDecisionLedger),
      release: sha256File(realReleaseLedger),
      runtime: sha256File(realRuntimeManifest),
    };
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "catalog-decision-isolation-"),
    );

    try {
      fs.cpSync(path.join(root, "content"), path.join(tempRoot, "content"), {
        recursive: true,
      });

      const tempGovernance = path.join(tempRoot, "content", "governance");
      const tempDecisionLedger = path.join(
        tempGovernance,
        "product-catalog-v2-family-decisions.json",
      );
      const tempReleaseLedger = path.join(
        tempGovernance,
        "product-catalog-v2-release-batches.json",
      );
      const tempWorkbench = readJson(
        path.join(
          tempGovernance,
          "product-catalog-v2-review-workbench.json",
        ),
      );
      const candidate = tempWorkbench.review_items.find(
        (item) => item.review_id === familyId,
      );
      assert.ok(candidate);
      assert.equal(candidate.review_kind, "confirm_auto_family");
      assert.equal(candidate.member_count, 5);
      assert.deepEqual(
        candidate.members.map((member) => member.source_key),
        memberKeys,
      );
      assert.ok(
        candidate.members.every((member) => member.title.startsWith("JH-Q58018-")),
      );

      const decisionLedger = readJson(tempDecisionLedger);
      assert.equal(
        decisionLedger.decisions.some(
          (decision) =>
            decision.review_id === familyId &&
            decision.decision_id === decisionId &&
            decision.action === "confirm_family",
        ),
        true,
      );
      writeJson(tempDecisionLedger, decisionLedger);
      const tempDecisionHash = sha256File(tempDecisionLedger);
      const tempReleaseHash = sha256File(tempReleaseLedger);

      runCatalog(tempRoot, "build");

      assert.equal(sha256File(tempDecisionLedger), tempDecisionHash);
      assert.equal(sha256File(tempReleaseLedger), tempReleaseHash);
      const application = readJson(
        path.join(
          tempGovernance,
          "product-catalog-v2-decision-application.json",
        ),
      );
      assert.equal(application.active_approved_decision_ids.length, 358);
      assert.ok(application.active_approved_decision_ids.includes(decisionId));
      assert.equal(application.applied_review_ids.length, 358);
      assert.ok(application.applied_review_ids.includes(familyId));
      assert.deepEqual(application.action_counts, {
        confirm_family: 185,
        keep_separate: 168,
        recategorize: 5,
      });
      assert.equal(application.input_source_count, 1913);
      assert.equal(application.included_source_count, 1913);
      assert.equal(application.input_family_count, 1208);
      assert.equal(application.output_family_count, 1208);

      const sourceDisposition = readJson(
        path.join(
          tempGovernance,
          "product-catalog-v2-source-disposition.json",
        ),
      );
      const targetSources = sourceDisposition.sources.filter(
        (source) => source.family_id === familyId,
      );
      assert.deepEqual(
        targetSources.map((source) => source.source_key),
        memberKeys,
      );
      assert.ok(
        targetSources.every(
          (source) =>
            source.manual_review.state === "approved_and_applied" &&
            source.manual_review.pending_review_ids.length === 0 &&
            source.manual_review.active_approved_review_ids[0] === familyId &&
            source.manual_review.applied_review_ids[0] === familyId,
        ),
      );

      const stagedFamily = readStagedFamilies(tempRoot).find(
        (family) => family.family_id === familyId,
      );
      assert.ok(stagedFamily);
      assert.equal(stagedFamily.member_count, 5);
      assert.deepEqual(stagedFamily.source_keys, memberKeys);
      assert.equal(stagedFamily.manual_review.state, "approved_and_applied");
      assert.deepEqual(stagedFamily.manual_review.pending_review_ids, []);
      assert.deepEqual(stagedFamily.manual_review.applied_review_ids, [familyId]);

      const tempRuntime = path.join(
        tempRoot,
        "content",
        "runtime",
        "catalog-v2",
      );
      const runtimeManifest = readJson(path.join(tempRuntime, "manifest.json"));
      const runtimeIndex = readJson(path.join(tempRuntime, "index.json"));
      const runtimeDetails = fs
        .readdirSync(path.join(tempRuntime, "details"))
        .filter((file) => file.endsWith(".json"));
      const releaseValidation = readJson(
        path.join(
          tempGovernance,
          "product-catalog-v2-release-validation.json",
        ),
      );
      assert.equal(runtimeManifest.visibility, "private_noindex_sample");
      assert.equal(runtimeManifest.sample_family_count, 120);
      assert.equal(runtimeManifest.detail_file_count, 120);
      assert.equal(runtimeManifest.public_release_eligible, false);
      assert.equal(runtimeIndex.visibility, "private_noindex_sample");
      assert.equal(runtimeIndex.items.length, 120);
      assert.equal(runtimeDetails.length, 120);
      assert.equal(releaseValidation.target_visibility, "private_noindex");
      assert.equal(releaseValidation.family_count, 120);
      assert.equal(releaseValidation.public_release_eligible, false);

      runCatalog(tempRoot, "check");
      runCatalog(tempRoot, "check");

      assert.equal(sha256File(realDecisionLedger), realBefore.decision);
      assert.equal(sha256File(realReleaseLedger), realBefore.release);
      assert.equal(sha256File(realRuntimeManifest), realBefore.runtime);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }

    assert.equal(sha256File(realDecisionLedger), realBefore.decision);
    assert.equal(sha256File(realReleaseLedger), realBefore.release);
    assert.equal(sha256File(realRuntimeManifest), realBefore.runtime);
  },
);

test(
  "a signed active full batch uses the media-suppressed public projection",
  { timeout: 180_000, skip: !externalCatalogSourcesAvailable },
  () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "catalog-full-release-isolation-"),
    );

    try {
      fs.cpSync(path.join(root, "content"), path.join(tempRoot, "content"), {
        recursive: true,
      });
      const releaseLedgerPath = path.join(
        tempRoot,
        "content",
        "governance",
        "product-catalog-v2-release-batches.json",
      );
      const releaseLedger = readJson(releaseLedgerPath);
      releaseLedger.active_batch_id = "catalog-v2-full-release-1208";
      const fullBatch = releaseLedger.batches.find(
        (batch) => batch.batch_id === releaseLedger.active_batch_id,
      );
      assert.ok(fullBatch);
      fullBatch.state = "approved";
      fullBatch.approved_by = "isolated-release-authority";
      fullBatch.approved_at = "2026-07-21T00:00:00Z";
      writeJson(releaseLedgerPath, releaseLedger);

      runCatalog(tempRoot, "build");

      const governance = path.join(tempRoot, "content", "governance");
      const publicRuntime = readJson(
        path.join(
          tempRoot,
          "content",
          "runtime",
          "catalog-v2-public",
          "index.json",
        ),
      );
      const fullReadiness = readJson(
        path.join(
          governance,
          "product-catalog-v2-full-release-readiness.json",
        ),
      );
      const releaseValidation = readJson(
        path.join(
          governance,
          "product-catalog-v2-release-validation.json",
        ),
      );
      const quality = readJson(
        path.join(governance, "product-catalog-v2-quality-report.json"),
      );

      assert.equal(publicRuntime.publication_state, "active_public_indexable");
      assert.equal(publicRuntime.catalog_count, 1208);
      assert.equal(fullReadiness.public_release_eligible, true);
      assert.deepEqual(fullReadiness.blockers, []);
      assert.equal(
        fullReadiness.publication_boundary,
        "active_public_runtime_generated_not_deployed",
      );
      assert.equal(releaseValidation.public_release_eligible, true);
      assert.deepEqual(releaseValidation.blockers, []);
      assert.equal(releaseValidation.family_count, 1208);
      assert.equal(releaseValidation.media_authorization.scope, "public_runtime_projection");
      assert.equal(
        releaseValidation.media_authorization.unauthorized_media_path_count,
        0,
      );
      assert.equal(
        releaseValidation.media_authorization.suppressed_source_media_path_count,
        9842,
      );
      assert.ok(Object.values(quality.acceptance).every(Boolean));

      runCatalog(tempRoot, "check");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);
