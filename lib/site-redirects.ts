import rawProductTopicOverrides from "../content/governance/product-topic-overrides.json" with { type: "json" };

type ProductTopicRedirectOverride = {
  source_id: string;
  legacy_topic_slug: string;
  canonical_topic_slug: string;
};

export type SiteRedirect = {
  source: string;
  destination: string;
  statusCode: 307 | 308;
};

const productTopicRedirects: SiteRedirect[] = (
  rawProductTopicOverrides.overrides as ProductTopicRedirectOverride[]
).map(
  (override) => ({
    source: `/products/${override.legacy_topic_slug}/${override.source_id}`,
    destination: `/products/${override.canonical_topic_slug}/${override.source_id}`,
    statusCode: 308,
  }),
);

export const siteRedirects = Object.freeze<SiteRedirect[]>([
  { source: "/about/duty", destination: "/sustainability", statusCode: 308 },
  { source: "/brand", destination: "/solutions", statusCode: 308 },
  { source: "/brand/whole_house", destination: "/solutions/residential", statusCode: 308 },
  { source: "/brand/hotel", destination: "/solutions/hospitality", statusCode: 308 },
  { source: "/brand/business", destination: "/solutions/commercial", statusCode: 308 },
  { source: "/brand/public", destination: "/solutions/public", statusCode: 308 },
  { source: "/brand/special", destination: "/solutions/industrial", statusCode: 308 },
  { source: "/healthy", destination: "/healthy-light", statusCode: 308 },
  { source: "/esg", destination: "/sustainability", statusCode: 308 },
  { source: "/investment", destination: "/partners", statusCode: 308 },
  { source: "/download", destination: "/downloads", statusCode: 308 },
  { source: "/law", destination: "/legal", statusCode: 308 },
  { source: "/news/page/1", destination: "/news", statusCode: 308 },
  { source: "/index.html", destination: "/", statusCode: 308 },
  { source: "/login.html", destination: "/mall", statusCode: 307 },
  { source: "/register.html", destination: "/mall", statusCode: 307 },
  { source: "/forget.html", destination: "/mall", statusCode: 307 },
  { source: "/products/project-custom/12265", destination: "/products/spotlights/12265", statusCode: 308 },
  { source: "/products/project-custom/12266", destination: "/products/spotlights/12266", statusCode: 308 },
  { source: "/products/project-custom/12267", destination: "/products/spotlights/12267", statusCode: 308 },
  ...productTopicRedirects,
]);
