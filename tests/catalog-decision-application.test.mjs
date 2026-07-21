import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const fixture = String.raw`
import copy

from scripts.product_catalog_v2 import (
    apply_catalog_decisions,
    assemble_family,
    family_model_sha256,
)


def make_record(source_key, category="照明", title=None):
    return {
        "compound_key": source_key,
        "title": title or f"产品 {source_key}",
        "category": category,
        "primary_image": "",
        "detail_images": [],
        "attributes": {},
        "specs": [],
    }


def make_family(family_id, members):
    return assemble_family(
        members,
        family_id,
        "fixture_baseline",
        "fixture_baseline",
    )


def relationship_candidate(review_id, member_keys, review_kind="merge_candidate"):
    return {
        "review_id": review_id,
        "review_kind": review_kind,
        "member_keys": "|".join(member_keys),
    }


def category_candidate(review_id, source_key):
    return {
        "review_id": review_id,
        "review_kind": "category_anomaly",
        "source_key": source_key,
    }


def approved_decision(decision_id, action, **details):
    return {
        "decision_id": decision_id,
        "action": action,
        **details,
    }


def apply(records, families, review_rows=None, category_candidates=None, decisions=None):
    return apply_catalog_decisions(
        records,
        families,
        review_rows or [],
        category_candidates or [],
        decisions or {},
        "fixture-source-snapshot",
    )


def family_ids_by_members(families):
    return {
        tuple(sorted(member["compound_key"] for member in family["members"])):
            family["family_id"]
        for family in families
    }


def must_fail(fragment, callback):
    try:
        callback()
    except RuntimeError as error:
        assert fragment in str(error), str(error)
        return
    raise AssertionError(f"expected RuntimeError containing: {fragment}")
`;

function runPython(body) {
  const result = spawnSync("python3", ["-c", `${fixture}\n${body}`], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("empty decision set preserves the baseline family model", () => {
  runPython(String.raw`
a = make_record("source:a")
b = make_record("source:b")
c = make_record("source:c")
records = [a, b, c]
families = [
    make_family("family-a", [a, b]),
    make_family("family-c", [c]),
]

effective_records, final_families, member_map, application = apply(
    records,
    families,
)

assert effective_records == records
assert final_families == families
assert member_map == {
    "source:a": "family-a",
    "source:b": "family-a",
    "source:c": "family-c",
}
assert family_model_sha256(final_families) == family_model_sha256(families)
assert application["input_family_model_sha256"] == application["output_family_model_sha256"]
assert application["active_approved_decision_ids"] == []
assert application["source_files_modified"] is False
`);
});

test("split family IDs ignore group and group-member ordering without losing members", () => {
  runPython(String.raw`
a = make_record("source:a")
b = make_record("source:b")
c = make_record("source:c")
records = [a, b, c]
families = [make_family("family-abc", records)]

first = apply(
    records,
    families,
    [
        relationship_candidate(
            "review-split",
            ["source:a", "source:b", "source:c"],
            "confirm_auto_family",
        )
    ],
    decisions={
        "review-split": approved_decision(
            "decision-split",
            "split_family",
            split_groups=[
                ["source:a", "source:b"],
                ["source:c"],
            ],
        )
    },
)
second = apply(
    records,
    families,
    [
        relationship_candidate(
            "review-split",
            ["source:c", "source:a", "source:b"],
            "confirm_auto_family",
        )
    ],
    decisions={
        "review-split": approved_decision(
            "decision-split",
            "split_family",
            split_groups=[
                ["source:c"],
                ["source:b", "source:a"],
            ],
        )
    },
)

first_families = first[1]
second_families = second[1]
assert family_ids_by_members(first_families) == family_ids_by_members(second_families)
assert set(first[2]) == {"source:a", "source:b", "source:c"}
assert len(first[2]) == sum(family["member_count"] for family in first_families)
assert first[2]["source:a"] == first[2]["source:b"]
assert first[2]["source:a"] != first[2]["source:c"]
`);
});

test("overlapping merge decisions form a deterministic transitive closure", () => {
  runPython(String.raw`
a = make_record("source:a")
b = make_record("source:b")
c = make_record("source:c")
d = make_record("source:d")
records = [a, b, c, d]
families = [
    make_family("base-a", [a]),
    make_family("base-b", [b]),
    make_family("base-c", [c]),
    make_family("base-d", [d]),
]
reviews = [
    relationship_candidate("review-ab", ["source:a", "source:b"]),
    relationship_candidate("review-bc", ["source:b", "source:c"]),
]
decisions = {
    "review-ab": approved_decision("decision-ab", "merge_candidate"),
    "review-bc": approved_decision("decision-bc", "merge_candidate"),
}

first = apply(records, families, reviews, decisions=decisions)
second = apply(
    records,
    families,
    list(reversed(reviews)),
    decisions={
        "review-bc": decisions["review-bc"],
        "review-ab": decisions["review-ab"],
    },
)

assert family_ids_by_members(first[1]) == family_ids_by_members(second[1])
assert first[2]["source:a"] == first[2]["source:b"] == first[2]["source:c"]
assert first[2]["source:d"] != first[2]["source:a"]
assert set(first[2]) == {"source:a", "source:b", "source:c", "source:d"}
assert ("source:a", "source:b", "source:c") in family_ids_by_members(first[1])
`);
});

test("recategorization derives a new record without mutating its input", () => {
  runPython(String.raw`
record = make_record("source:a", category="旧分类")
records = [record]
families = [make_family("base-a", [record])]
before = copy.deepcopy(records)

effective_records, final_families, member_map, application = apply(
    records,
    families,
    category_candidates=[category_candidate("review-category", "source:a")],
    decisions={
        "review-category": approved_decision(
            "decision-category",
            "recategorize",
            target_category="新分类",
        )
    },
)

assert records == before
assert record["category"] == "旧分类"
assert effective_records[0] is not record
assert effective_records[0]["category"] == "新分类"
assert final_families[0]["category"] == "新分类"
assert member_map["source:a"] == final_families[0]["family_id"]
assert application["category_overrides"] == [{
    "source_key": "source:a",
    "category_before": "旧分类",
    "category_after": "新分类",
    "review_id": "review-category",
    "decision_id": "decision-category",
}]
`);
});

test("exclusion records its disposition and conserves the baseline source set", () => {
  runPython(String.raw`
a = make_record("source:a")
b = make_record("source:b")
records = [a, b]
families = [make_family("family-ab", records)]

effective_records, final_families, member_map, application = apply(
    records,
    families,
    category_candidates=[category_candidate("review-exclude", "source:a")],
    decisions={
        "review-exclude": approved_decision(
            "decision-exclude",
            "exclude_with_disposition",
            disposition="insufficient_product_evidence_hold",
        )
    },
)

included = set(member_map)
excluded = {
    item["source_key"]
    for item in application["excluded_sources"]
}
assert {record["compound_key"] for record in effective_records} == {"source:b"}
assert included == {"source:b"}
assert excluded == {"source:a"}
assert included.isdisjoint(excluded)
assert included | excluded == {"source:a", "source:b"}
assert application["included_source_count"] == 1
assert application["excluded_source_count"] == 1
assert application["excluded_sources"][0]["disposition"] == "insufficient_product_evidence_hold"
assert application["excluded_sources"][0]["decision_id"] == "decision-exclude"
assert sum(family["member_count"] for family in final_families) == 1
`);
});

test("confirm-family and recategorization may overlap only when every member converges", () => {
  runPython(String.raw`
a = make_record("source:a", category="旧分类")
b = make_record("source:b", category="旧分类")
records = [a, b]
families = [make_family("family-ab", records)]

effective_records, final_families, member_map, application = apply(
    records,
    families,
    [
        relationship_candidate(
            "review-family",
            ["source:a", "source:b"],
            "confirm_auto_family",
        )
    ],
    [
        category_candidate("review-category-a", "source:a"),
        category_candidate("review-category-b", "source:b"),
    ],
    {
        "review-family": approved_decision("decision-family", "confirm_family"),
        "review-category-a": approved_decision(
            "decision-category-a", "recategorize", target_category="新分类"
        ),
        "review-category-b": approved_decision(
            "decision-category-b", "recategorize", target_category="新分类"
        ),
    },
)

assert len(final_families) == 1
assert final_families[0]["category"] == "新分类"
assert member_map["source:a"] == member_map["source:b"]
assert set(final_families[0]["applied_decision_ids"]) == {
    "decision-family", "decision-category-a", "decision-category-b"
}
`);
});

test("non-converging or structural category overlap remains fail-closed", () => {
  runPython(String.raw`
a = make_record("source:a", category="旧分类")
b = make_record("source:b", category="旧分类")
records = [a, b]
families = [make_family("family-ab", records)]

must_fail(
    "must converge to one category",
    lambda: apply(
        records,
        families,
        [relationship_candidate("review-family", ["source:a", "source:b"], "confirm_auto_family")],
        [category_candidate("review-category", "source:a")],
        {
            "review-family": approved_decision("decision-family", "confirm_family"),
            "review-category": approved_decision(
                "decision-category", "recategorize", target_category="新分类"
            ),
        },
    ),
)
must_fail(
    "category and structural-family decisions overlap",
    lambda: apply(
        records,
        families,
        [relationship_candidate("review-split", ["source:a", "source:b"], "confirm_auto_family")],
        [category_candidate("review-category", "source:a")],
        {
            "review-split": approved_decision(
                "decision-split", "split_family", split_groups=[["source:a"], ["source:b"]]
            ),
            "review-category": approved_decision(
                "decision-category", "recategorize", target_category="新分类"
            ),
        },
    ),
)
`);
});

test("overlapping split and merge decisions fail closed before application", () => {
  runPython(String.raw`
a = make_record("source:a")
b = make_record("source:b")
c = make_record("source:c")
records = [a, b, c]
families = [
    make_family("family-ab", [a, b]),
    make_family("family-c", [c]),
]

must_fail(
    "split and merge decisions overlap",
    lambda: apply(
        records,
        families,
        [
            relationship_candidate(
                "review-split",
                ["source:a", "source:b"],
                "confirm_auto_family",
            ),
            relationship_candidate(
                "review-merge",
                ["source:b", "source:c"],
            ),
        ],
        decisions={
            "review-split": approved_decision(
                "decision-split",
                "split_family",
                split_groups=[["source:a"], ["source:b"]],
            ),
            "review-merge": approved_decision(
                "decision-merge",
                "merge_candidate",
            ),
        },
    ),
)
`);
});

test("a merge that violates keep-separate constraints fails closed", () => {
  runPython(String.raw`
a = make_record("source:a")
b = make_record("source:b")
records = [a, b]
families = [
    make_family("family-a", [a]),
    make_family("family-b", [b]),
]

must_fail(
    "keep-separate constraint was violated",
    lambda: apply(
        records,
        families,
        [
            relationship_candidate(
                "review-keep",
                ["source:a", "source:b"],
            ),
            relationship_candidate(
                "review-merge",
                ["source:a", "source:b"],
            ),
        ],
        decisions={
            "review-keep": approved_decision(
                "decision-keep",
                "keep_separate",
            ),
            "review-merge": approved_decision(
                "decision-merge",
                "merge_candidate",
            ),
        },
    ),
)
`);
});
