import rawOverrides from "./governance/product-topic-overrides.json" with { type: "json" };

export type ProductTopicOverride = {
  source_id: string;
  source_category: string;
  source_locator: string;
  legacy_topic: string;
  legacy_topic_slug: string;
  canonical_topic: string;
  canonical_topic_slug: string;
  reason: string;
};

export const productTopicOverrides = Object.freeze(
  rawOverrides.overrides as ProductTopicOverride[],
);

const overrideBySourceId = new Map(
  productTopicOverrides.map((item) => [item.source_id, item]),
);

const legacyRouteByCanonicalRoute = new Map(
  productTopicOverrides.map((item) => [
    `/products/${item.canonical_topic_slug}/${item.source_id}`,
    `/products/${item.legacy_topic_slug}/${item.source_id}`,
  ]),
);

export function productTopicOverride(sourceId: string) {
  return overrideBySourceId.get(sourceId);
}

export function canonicalProductRoute(override: ProductTopicOverride) {
  return `/products/${override.canonical_topic_slug}/${override.source_id}`;
}

export function legacyProductRoute(override: ProductTopicOverride) {
  return `/products/${override.legacy_topic_slug}/${override.source_id}`;
}

type ProductProjection = {
  source_id: string;
  topic: string;
  topic_slug: string;
  seo_slug: string;
};

export function projectProductTopic<T extends ProductProjection>(record: T): T {
  const override = productTopicOverride(String(record.source_id));
  if (!override) return record;
  return {
    ...record,
    topic: override.canonical_topic,
    topic_slug: override.canonical_topic_slug,
    seo_slug: canonicalProductRoute(override),
  };
}

type PublicationProjection = {
  route: string;
  canonical_slug: string;
};

export function projectProductPublication<T extends PublicationProjection>(record: T): T {
  const match = record.route.match(/^\/products\/[^/]+\/(\d+)$/);
  const override = match ? productTopicOverride(match[1]) : undefined;
  if (!override) return record;
  const route = canonicalProductRoute(override);
  return { ...record, route, canonical_slug: route };
}

export function legacyRouteForCanonicalProduct(route: string) {
  return legacyRouteByCanonicalRoute.get(route);
}
