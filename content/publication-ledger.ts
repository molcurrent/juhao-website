import rawLedger from "./governance/content-ledger.json";

export type PublicationReviewStatus = "approved" | "needs_review" | "rejected";
export type PublishStatus = "draft" | "needs_review" | "approved" | "published" | "rejected" | "archived";
export type ImageRightsStatus = "approved" | "needs_review" | "unknown" | "not_applicable";

export type PublicationLedgerRecord = {
  route: string;
  content_type: string;
  source_type: string;
  source_id: string;
  source_path: string;
  review_status: PublicationReviewStatus;
  reviewer: string;
  reviewed_at: string;
  last_verified_at: string;
  publish_status: PublishStatus;
  seo_candidate: boolean;
  searchable: boolean;
  indexable: boolean;
  canonical_slug: string;
  published_at: string;
  updated_at: string;
  image_rights_status: ImageRightsStatus;
  related_products: string[];
  related_cases: string[];
  related_articles: string[];
  related_routes: string[];
  content_scope: string;
  title: string;
  seo_slug: string;
};

export const publicationLedger = rawLedger as PublicationLedgerRecord[];

export const publishedIndexableRecords = publicationLedger.filter(
  (record) => record.publish_status === "published" && record.indexable,
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
  return record?.publish_status === "published" && record.indexable;
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
