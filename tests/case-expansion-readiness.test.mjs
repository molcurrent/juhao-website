import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readiness = JSON.parse(readFileSync(new URL("../content/governance/case-expansion-readiness.json", import.meta.url), "utf8"));

test("keeps the ten-case target blocked until missing project classes have real source packages", () => {
  assert.equal(readiness.target_total, 10);
  assert.equal(readiness.current_preview_records, 6);
  assert.equal(readiness.publish_eligible, false);
  const categories = Object.fromEntries(readiness.category_readiness.map((item) => [item.category, item]));
  assert.deepEqual(categories.residential.candidate_source_ids, []);
  assert.equal(categories.residential.gap, 3);
  assert.equal(categories.commercial.gap, 1);
  assert.equal(categories.industrial.gap, 1);
  assert.equal(categories.hospitality.current, 4);
  assert.deepEqual(categories.public.candidate_source_ids, ["158", "204"]);
  for (const candidate of readiness.private_review_candidates) {
    assert.doesNotMatch(`${candidate.evidence} ${candidate.media_status}`, /已完工|已交付|已验收/);
  }
});
