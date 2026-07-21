import assert from "node:assert/strict";
import test from "node:test";
import { appendDecisionRevisions } from "../features/catalog-lab/catalogDecisionLedger.ts";

const decision = (
  decisionId,
  reviewId,
  status,
  supersedesDecisionId,
) => ({
  decision_id: decisionId,
  review_id: reviewId,
  status,
  ...(supersedesDecisionId
    ? { supersedes_decision_id: supersedesDecisionId }
    : {}),
});

test("ledger export appends revisions without changing historical entries", () => {
  const existing = [
    decision("decision-review-a", "review-a", "approved"),
    decision(
      "decision-review-a-draft",
      "review-a",
      "draft",
      "decision-review-a",
    ),
    decision("decision-review-b", "review-b", "approved"),
  ];
  const before = structuredClone(existing);
  const additions = [
    decision("decision-review-a-2", "review-a", "approved"),
  ];

  const exported = appendDecisionRevisions(existing, additions);

  assert.deepEqual(existing, before);
  assert.equal(exported.length, existing.length + 1);
  assert.deepEqual(exported.slice(0, existing.length), existing);
  assert.ok(
    existing.every((entry, index) => exported[index] === entry),
    "historical entries must be retained as the original objects",
  );
  assert.equal(
    exported.at(-1).supersedes_decision_id,
    "decision-review-a-draft",
    "the next revision must continue from the current draft head",
  );
});

test("ledger export chooses the last effective head in ledger order", () => {
  const existing = [
    decision("decision-review-a", "review-a", "approved"),
    decision(
      "decision-review-a-2",
      "review-a",
      "approved",
      "decision-review-a",
    ),
    decision(
      "decision-review-a-later-draft",
      "review-a",
      "draft",
      "decision-review-a-2",
    ),
    decision("decision-review-b-draft", "review-b", "draft"),
  ];
  const additions = [
    decision("decision-review-a-3", "review-a", "approved"),
    decision("decision-review-b-2", "review-b", "draft"),
    decision("decision-review-c", "review-c", "draft"),
  ];

  const appended = appendDecisionRevisions(existing, additions).slice(
    existing.length,
  );

  assert.equal(
    appended[0].supersedes_decision_id,
    "decision-review-a-later-draft",
  );
  assert.equal(
    appended[1].supersedes_decision_id,
    "decision-review-b-draft",
  );
  assert.equal("supersedes_decision_id" in appended[2], false);
});
