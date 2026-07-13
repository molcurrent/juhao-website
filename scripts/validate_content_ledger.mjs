import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const LEDGER_PATH = resolve(ROOT, "content/governance/content-ledger.json");

export const REQUIRED_PUBLICATION_FIELDS = [
  "route",
  "content_type",
  "source_type",
  "source_id",
  "source_path",
  "review_status",
  "reviewer",
  "reviewed_at",
  "last_verified_at",
  "publish_status",
  "seo_candidate",
  "searchable",
  "indexable",
  "canonical_slug",
  "published_at",
  "updated_at",
  "image_rights_status",
  "related_products",
  "related_cases",
  "related_articles",
];

const REVIEW_STATUSES = new Set(["approved", "needs_review", "rejected"]);
const PUBLISH_STATUSES = new Set(["draft", "needs_review", "approved", "published", "rejected", "archived"]);
const IMAGE_RIGHTS_STATUSES = new Set(["approved", "needs_review", "unknown", "not_applicable"]);
const RELATED_FIELDS = ["related_products", "related_cases", "related_articles"];
const DATE_FIELDS = ["reviewed_at", "last_verified_at", "published_at", "updated_at"];

function hasValue(record, field) {
  if (!(field in record) || record[field] === null || record[field] === undefined || record[field] === "") return false;
  if (RELATED_FIELDS.includes(field)) return Array.isArray(record[field]);
  return true;
}

function sourceExists(sourcePath) {
  const resolved = isAbsolute(sourcePath) ? sourcePath : resolve(ROOT, sourcePath);
  return existsSync(resolved);
}

export function validateContentLedger(records) {
  const errors = [];
  const warnings = [];
  const routeCounts = new Map();
  const canonicalCounts = new Map();
  const routeSet = new Set(records.map((record) => record.route));

  records.forEach((record, index) => {
    const label = record.route || record.seo_slug || `record:${index}`;
    for (const field of REQUIRED_PUBLICATION_FIELDS) {
      if (!hasValue(record, field)) errors.push(`${label}: missing ${field}`);
    }

    if (typeof record.indexable !== "boolean") errors.push(`${label}: indexable must be boolean`);
    if (typeof record.seo_candidate !== "boolean") errors.push(`${label}: seo_candidate must be boolean`);
    if (typeof record.searchable !== "boolean") errors.push(`${label}: searchable must be boolean`);
    if (typeof record.route !== "string" || !record.route.startsWith("/")) errors.push(`${label}: route must be root-relative`);
    if (typeof record.canonical_slug !== "string" || !record.canonical_slug.startsWith("/")) errors.push(`${label}: canonical_slug must be root-relative`);
    if (!REVIEW_STATUSES.has(record.review_status)) errors.push(`${label}: invalid review_status ${record.review_status}`);
    if (!PUBLISH_STATUSES.has(record.publish_status)) errors.push(`${label}: invalid publish_status ${record.publish_status}`);
    if (!IMAGE_RIGHTS_STATUSES.has(record.image_rights_status)) errors.push(`${label}: invalid image_rights_status ${record.image_rights_status}`);
    if (record.source_path && !sourceExists(record.source_path)) errors.push(`${label}: source_path does not exist: ${record.source_path}`);

    for (const field of DATE_FIELDS) {
      const value = record[field];
      if (value !== "unknown" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${label}: invalid ${field} ${value}`);
    }
    for (const field of RELATED_FIELDS) {
      if (!Array.isArray(record[field])) continue;
      for (const route of record[field]) {
        if (typeof route !== "string" || !route.startsWith("/")) errors.push(`${label}: ${field} contains invalid route`);
        else if (!routeSet.has(route)) warnings.push(`${label}: ${field} target is not in ledger: ${route}`);
      }
    }

    routeCounts.set(record.route, (routeCounts.get(record.route) ?? 0) + 1);
    if (record.indexable) canonicalCounts.set(record.canonical_slug, (canonicalCounts.get(record.canonical_slug) ?? 0) + 1);
    if (record.indexable && record.publish_status !== "published") errors.push(`${label}: indexable record must currently be published`);
    if (record.searchable && record.publish_status !== "published") errors.push(`${label}: searchable record must currently be published`);
    if (record.indexable && !record.seo_candidate) errors.push(`${label}: indexable record must be an seo_candidate`);
    if (record.indexable && !record.searchable) errors.push(`${label}: indexable record must be searchable`);
    if (record.indexable && record.review_status !== "approved") errors.push(`${label}: indexable record must have approved review_status`);
    if (record.indexable && record.reviewer === "unknown") errors.push(`${label}: indexable record must name a reviewer`);
    if (record.indexable && record.reviewed_at === "unknown") errors.push(`${label}: indexable record must have reviewed_at`);
    if (record.indexable && !["approved", "not_applicable"].includes(record.image_rights_status)) errors.push(`${label}: indexable record has unapproved image rights`);
  });

  for (const [route, count] of routeCounts) if (count > 1) errors.push(`${route}: duplicate route (${count})`);
  for (const [canonical, count] of canonicalCounts) if (count > 1) errors.push(`${canonical}: duplicate indexable canonical (${count})`);

  const published = records.filter((record) => record.publish_status === "published");
  const indexable = records.filter((record) => record.indexable);
  return {
    errors,
    warnings,
    metrics: {
      records: records.length,
      published_routes: published.length,
      seo_candidates: records.filter((record) => record.seo_candidate).length,
      searchable_routes: records.filter((record) => record.publish_status === "published" && record.searchable).length,
      indexable_routes: indexable.length,
      reviewer_unknown: records.filter((record) => record.reviewer === "unknown").length,
      reviewed_at_unknown: records.filter((record) => record.reviewed_at === "unknown").length,
      published_at_unknown: records.filter((record) => record.published_at === "unknown").length,
      image_rights_pending: records.filter((record) => ["needs_review", "unknown"].includes(record.image_rights_status)).length,
    },
  };
}

export function readContentLedger(path = LEDGER_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateContentLedger(readContentLedger());
  console.log(JSON.stringify({ metrics: result.metrics, errors: result.errors, warning_count: result.warnings.length }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
