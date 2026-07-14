import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

const knowledge = fixture("../content/governance/knowledge-articles.generated.json");
const helpInventory = fixture("../content/governance/help-article-inventory.json");
const exclusions = fixture("../content/governance/hard-exclusions.json");
const legacyRoutes = fixture("../content/runtime/legacy-news-routes.json");
const candidates = fixture("../content/governance/product-candidates.json");
const publishedProducts = fixture("../content/governance/published-products.json");
const ledger = fixture("../content/governance/content-ledger.json");
const runtimeLedger = fixture("../content/runtime/publication-ledger.json");

test("classifies the complete 137-record help inventory without inventing routes", () => {
  const expected = new Map([
    ["project", 34],
    ["honor", 10],
    ["company_dynamic", 21],
    ["smart_capability", 6],
    ["product_topic", 3],
    ["smart_tutorial", 7],
    ["ies_asset", 6],
    ["video_asset", 5],
    ["legacy_template", 45],
  ]);
  assert.equal(helpInventory.length, 137);
  assert.equal(new Set(helpInventory.map(({ source_id }) => source_id)).size, 137);
  for (const [domain, count] of expected) {
    assert.equal(helpInventory.filter(({ content_domain }) => content_domain === domain).length, count, domain);
  }

  const projectIds = new Set(helpInventory.filter(({ content_domain }) => content_domain === "project").map(({ source_id }) => source_id));
  assert.deepEqual([...projectIds].sort((a, b) => a - b), [154,155,156,157,158,159,181,182,183,186,187,189,190,191,193,194,195,199,200,204,206,207,208,210,216,217,218,219,220,221,226,228,229,231]);
  assert.deepEqual(
    helpInventory.filter(({ content_domain }) => content_domain === "honor").map(({ source_id }) => source_id),
    [126,151,152,167,171,184,185,222,223,225],
  );
  assert.equal(helpInventory.filter(({ content_domain, source_id }) => content_domain === "project" && ![199,220,226,228,229,231,217,218,219,221].includes(source_id)).length, 24);
  assert.ok(helpInventory.every(({ source_path, source_hash }) => !source_path.startsWith("/") && /^[a-f0-9]{64}$/.test(source_hash)));
});

test("keeps hard exclusions and numeric legacy actions explicit", () => {
  assert.equal(exclusions.sql_excluded_help_article_ids.length, 14);
  assert.equal(exclusions.prohibited_legacy_help_article_ids.length, 45);
  assert.deepEqual(exclusions.non_lighting_product_ids, [4014,4019,4020,4021,5181,11702,11703]);
  assert.deepEqual(exclusions.forbidden_source_tables, ["jh_sys_configs"]);

  assert.equal(legacyRoutes.length, 151);
  assert.equal(new Set(legacyRoutes.flatMap(({ legacy_paths }) => legacy_paths)).size, 302);
  assert.ok(legacyRoutes.every(({ legacy_paths }) => legacy_paths.length === 2));
  assert.ok(legacyRoutes.every(({ destination }) => destination !== "/news"));
  const byId = new Map(legacyRoutes.map((item) => [item.source_id, item]));
  assert.deepEqual([byId.get(199).action, byId.get(199).status_code, byId.get(199).destination], ["redirect", 308, "/cases/xingtai-financial-center"]);
  assert.deepEqual([byId.get(149).action, byId.get(149).status_code, byId.get(149).destination], ["redirect", 308, "/about/history"]);
  assert.deepEqual([byId.get(154).action, byId.get(154).status_code], ["not_found", 404]);
  assert.deepEqual([byId.get(1).action, byId.get(1).status_code], ["gone", 410]);
  assert.deepEqual([byId.get(25).action, byId.get(25).status_code], ["gone", 410]);
});

test("adds only the approved smart and JH31L331 evidence candidates", () => {
  const smartIds = new Set(["11701","11700","11699","11698","11693","11692","11690","10088","5844","1185","11689","11691","11694","11695","11696","665","664","587"]);
  const jh31Ids = new Set(["6692","10505","10506","10507","10508"]);
  assert.equal(candidates.length, 112);
  assert.equal(publishedProducts.length, 31);
  assert.equal(candidates.filter(({ source_id }) => smartIds.has(source_id)).length, 18);
  assert.equal(candidates.filter(({ source_id }) => jh31Ids.has(source_id)).length, 5);
  assert.equal(candidates.filter(({ route_state }) => route_state === "private_preview").length, 31);
  assert.equal(candidates.filter(({ route_state }) => route_state === "candidate_only").length, 81);
  for (const item of candidates.filter(({ source_id }) => jh31Ids.has(source_id))) {
    assert.equal(item.route_state, "candidate_only");
    assert.ok(item.publication_blockers.includes("unresolved_variant_mapping"));
    assert.ok(item.publication_blockers.includes("undefined_spec_rows"));
  }
  for (const item of candidates.filter(({ source_id }) => smartIds.has(source_id))) {
    assert.equal(item.route_state, "candidate_only");
    assert.equal(item.publish_status, "needs_review");
  }
});

test("locks the private publication snapshot and keeps runtime governance safe", () => {
  assert.equal(knowledge.length, 33);
  assert.equal(ledger.length, 200);
  assert.equal(ledger.filter(({ publish_status }) => publish_status === "published").length, 119);
  assert.equal(ledger.filter(({ searchable, publish_status }) => searchable && publish_status === "published").length, 101);
  assert.equal(ledger.filter(({ seo_candidate }) => seo_candidate).length, 107);
  assert.equal(ledger.filter(({ index_eligible }) => index_eligible).length, 33);
  const strictlyEligible = ledger.filter((record) =>
    record.publish_status === "published"
    && record.seo_candidate
    && record.review_status === "approved"
    && record.reviewer !== "unknown"
    && record.reviewed_at !== "unknown"
    && ["approved", "not_applicable"].includes(record.image_rights_status)
  );
  assert.deepEqual(
    ledger.filter(({ index_eligible }) => index_eligible).map(({ route }) => route).sort(),
    strictlyEligible.map(({ route }) => route).sort(),
  );
  assert.equal(ledger.filter(({ indexable }) => indexable).length, 0);
  assert.ok(ledger.every(({ published_at }) => published_at === ""));
  assert.equal(ledger.filter(({ previewed_at }) => previewed_at === "2026-07-14").length, 119);
  assert.equal(ledger.filter(({ content_type }) => content_type === "文章").length, 41);
  assert.equal(1 + ledger.filter(({ content_type }) => content_type === "内容分页").length, 7);

  assert.equal(runtimeLedger.length, 200);
  const serializedRuntime = JSON.stringify(runtimeLedger);
  assert.doesNotMatch(serializedRuntime, /\/Users\/|bocang\.oss|https?:\/\//);
  assert.doesNotMatch(serializedRuntime, /"(?:stock|price|delivery|warranty)"/);
  assert.ok(runtimeLedger.every(({ source_sha256 }) => source_sha256 === "unknown" || /^[a-f0-9]{64}$/.test(source_sha256)));
  assert.equal(runtimeLedger.filter(({ index_eligible }) => index_eligible).length, 33);
  assert.equal(runtimeLedger.filter(({ indexable }) => indexable).length, 0);
  assert.ok(runtimeLedger.every(({ published_at }) => published_at === ""));
});
