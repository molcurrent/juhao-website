import rawPublicCatalog from "./runtime/catalog-v2-public/index.json";
import { PUBLIC_INDEXING_ENABLED } from "./publication-ledger";

export type PublicCatalogCardSpec = {
  key: string;
  label: string;
  values: string[];
};

export type PublicCatalogItem = {
  catalog_id: string | null;
  canonical_path: string;
  route_kind: "legacy_product_route" | "neutral_catalog_series";
  title: string;
  model_label: string | null;
  source_categories: string[];
  category_state: "source_category_unambiguous" | "pending_owner_selection";
  member_count: number;
  grouping_evidence: string;
  review_state: string;
  card_specs: PublicCatalogCardSpec[];
  media: {
    display_state: "suppressed_pending_authorization";
    emitted_media_count: 0;
    suppressed_source_media_count: number;
  };
};

type PublicCatalogRuntime = {
  publication_state: "prepared_noindex" | "active_public_indexable";
  items: PublicCatalogItem[];
};

const PUBLIC_CATALOG_ID = /^p-[a-z0-9-]{8,80}$/;
const PUBLIC_CATALOG_PATH = /^\/products\/catalog\/(p-[a-z0-9-]{8,80})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeText(value: unknown, maxLength = 280): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f<>]/.test(value)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function safeTextList(value: unknown, maxItems: number) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items = value.filter((item): item is string => isSafeText(item));
  return items.length === value.length ? items : null;
}

function parseCardSpec(value: unknown): PublicCatalogCardSpec | null {
  if (!isRecord(value)) return null;
  const values = safeTextList(value.values, 12);
  if (!isSafeText(value.key, 80) || !isSafeText(value.label, 80) || !values?.length) {
    return null;
  }
  return { key: value.key, label: value.label, values };
}

function parseItem(value: unknown): PublicCatalogItem | null {
  if (!isRecord(value)) return null;
  const routeKind = value.route_kind;
  const canonicalPath = value.canonical_path;
  const sourceCategories = safeTextList(value.source_categories, 12);
  const cardSpecs = Array.isArray(value.card_specs)
    ? value.card_specs.map(parseCardSpec)
    : null;
  const media = isRecord(value.media) ? value.media : null;
  const catalogId = value.catalog_id;
  const memberCount = value.member_count;
  const suppressedSourceMediaCount = media?.suppressed_source_media_count;
  const pathMatch = typeof canonicalPath === "string"
    ? canonicalPath.match(PUBLIC_CATALOG_PATH)
    : null;

  if (
    (routeKind !== "legacy_product_route" && routeKind !== "neutral_catalog_series") ||
    !isSafeText(canonicalPath, 180) ||
    !sourceCategories?.length ||
    !Array.isArray(cardSpecs) ||
    cardSpecs.some((item) => item === null) ||
    cardSpecs.length > 6 ||
    !isSafeText(value.title) ||
    !(value.model_label === null || isSafeText(value.model_label, 160)) ||
    (value.category_state !== "source_category_unambiguous" &&
      value.category_state !== "pending_owner_selection") ||
    !isNonNegativeInteger(memberCount) ||
    memberCount < 1 ||
    !isSafeText(value.grouping_evidence, 160) ||
    !isSafeText(value.review_state, 160) ||
    !media ||
    media.display_state !== "suppressed_pending_authorization" ||
    media.emitted_media_count !== 0 ||
    !isNonNegativeInteger(suppressedSourceMediaCount)
  ) {
    return null;
  }

  if (routeKind === "neutral_catalog_series") {
    if (
      typeof catalogId !== "string" ||
      !PUBLIC_CATALOG_ID.test(catalogId) ||
      !pathMatch ||
      pathMatch[1] !== catalogId
    ) {
      return null;
    }
  } else if (catalogId !== null || pathMatch) {
    return null;
  }

  return {
    catalog_id: routeKind === "neutral_catalog_series" ? catalogId : null,
    canonical_path: canonicalPath,
    route_kind: routeKind,
    title: value.title,
    model_label: value.model_label,
    source_categories: [...sourceCategories],
    category_state: value.category_state,
    member_count: memberCount,
    grouping_evidence: value.grouping_evidence,
    review_state: value.review_state,
    card_specs: cardSpecs as PublicCatalogCardSpec[],
    media: {
      display_state: "suppressed_pending_authorization",
      emitted_media_count: 0,
      suppressed_source_media_count: suppressedSourceMediaCount,
    },
  };
}

function parseRuntime(value: unknown): PublicCatalogRuntime {
  if (!isRecord(value)) return { publication_state: "prepared_noindex", items: [] };
  const publicationState = value.publication_state;
  if (
    publicationState !== "prepared_noindex" &&
    publicationState !== "active_public_indexable"
  ) {
    return { publication_state: "prepared_noindex", items: [] };
  }
  if (!Array.isArray(value.items)) return { publication_state: publicationState, items: [] };

  const seenPaths = new Set<string>();
  const seenCatalogIds = new Set<string>();
  const items: PublicCatalogItem[] = [];
  for (const rawItem of value.items) {
    const item = parseItem(rawItem);
    if (
      !item ||
      seenPaths.has(item.canonical_path) ||
      (item.catalog_id !== null && seenCatalogIds.has(item.catalog_id))
    ) {
      continue;
    }
    seenPaths.add(item.canonical_path);
    if (item.catalog_id !== null) seenCatalogIds.add(item.catalog_id);
    items.push(item);
  }
  return { publication_state: publicationState, items };
}

const publicCatalogRuntime = parseRuntime(rawPublicCatalog);

export const publicCatalogPublicationState = publicCatalogRuntime.publication_state;
export const publicCatalogItems = publicCatalogRuntime.items;
export const publicCatalogItemsById = new Map(
  publicCatalogItems
    .filter((item): item is PublicCatalogItem & { catalog_id: string } => item.catalog_id !== null)
    .map((item) => [item.catalog_id, item]),
);

export function publicCatalogItemById(catalogId: string) {
  return publicCatalogItemsById.get(catalogId) ?? null;
}

export function publicCatalogIsIndexable() {
  return (
    PUBLIC_INDEXING_ENABLED &&
    publicCatalogPublicationState === "active_public_indexable"
  );
}

export const publicCatalogIndexableRecords = publicCatalogIsIndexable()
  ? publicCatalogItems
  : [];
