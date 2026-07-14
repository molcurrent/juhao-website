import rawLedger from "./runtime/publication-ledger.json";

export type PublicationReviewStatus = "approved" | "needs_review" | "rejected";
export type PublishStatus = "draft" | "needs_review" | "approved" | "published" | "rejected" | "archived";
export type ImageRightsStatus = "approved" | "needs_review" | "unknown" | "not_applicable";

export type PublicationLedgerRecord = {
  route: string;
  content_type: string;
  publish_status: PublishStatus;
  seo_candidate: boolean;
  searchable: boolean;
  index_eligible: boolean;
  indexable: boolean;
  canonical_slug: string;
  published_at: string;
  updated_at: string;
  source_sha256: string;
  previewed_at: string;
  og_image: string;
  media_authorization_batch_id: string;
  title: string;
};

export const publicationLedger = rawLedger as PublicationLedgerRecord[];

export const PUBLIC_INDEXING_ENABLED = ["1", "true"].includes(
  (process.env.PUBLIC_INDEXING_ENABLED ?? "false").toLowerCase(),
);

export function currentlyIndexable(record: PublicationLedgerRecord) {
  return PUBLIC_INDEXING_ENABLED && record.publish_status === "published" && record.index_eligible;
}

export const publishedIndexableRecords = publicationLedger.filter(
  currentlyIndexable,
);

export const publishedRouteRecords = publicationLedger.filter(
  (record) => record.publish_status === "published",
);

export const publishedSearchableRecords = publicationLedger.filter(
  (record) => record.publish_status === "published" && record.searchable,
);

export function normalizePublicationRoute(route: string) {
  const normalized = route.split("?", 1)[0].split("#", 1)[0] || "/";
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
}

export function publicationRecordByRoute(route: string) {
  const normalized = normalizePublicationRoute(route);
  return publicationLedger.find((record) => normalizePublicationRoute(record.route) === normalized);
}

export function isPublishedRoute(route: string) {
  return publicationRecordByRoute(route)?.publish_status === "published";
}

export function isIndexableRoute(route: string) {
  const record = publicationRecordByRoute(route);
  return record ? currentlyIndexable(record) : false;
}

export function isSearchableRoute(route: string) {
  const record = publicationRecordByRoute(route);
  return record?.publish_status === "published" && record.searchable;
}

export function lastModifiedForPublication(record: PublicationLedgerRecord) {
  for (const value of [record.updated_at, record.published_at]) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  return undefined;
}
