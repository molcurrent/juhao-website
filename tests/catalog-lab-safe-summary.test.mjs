import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync("app/catalog-lab/[familyId]/page.tsx", "utf8");
const componentSource = readFileSync(
  "features/catalog-lab/CatalogLabSummaryDetail.tsx",
  "utf8",
);
const indexSource = readFileSync(
  "features/catalog-lab/CatalogLabIndex.tsx",
  "utf8",
);
const richDetailSource = readFileSync(
  "features/catalog-lab/CatalogLabDetail.tsx",
  "utf8",
);
const sampleIndex = JSON.parse(
  readFileSync("content/runtime/catalog-v2/index.json", "utf8"),
);
const manifest = JSON.parse(
  readFileSync("content/runtime/catalog-v2-full-private/manifest.json", "utf8"),
);

test("catalog detail route keeps rich pages and allows valid summary family ids", () => {
  assert.doesNotMatch(pageSource, /dynamicParams\s*=\s*false/);
  assert.match(pageSource, /dynamicParams\s*=\s*true/);
  assert.match(pageSource, /\^family-\[a-f0-9\]\{12\}\$/);
  assert.match(
    pageSource,
    /if \(!familyIdPattern\.test\(familyId\)\) notFound\(\)/,
  );
  assert.match(
    pageSource,
    /detail \? \([\s\S]*<CatalogLabDetail detail=\{detail\}/,
  );
  assert.match(pageSource, /<CatalogLabSummaryDetail familyId=\{familyId\}/);
  assert.match(
    pageSource,
    /robots: \{ index: false, follow: false, nocache: true \}/,
  );
});

test("catalog detail links preserve only a whitelisted same-site return context", () => {
  const expectedReturnKeys = [
    "q",
    "category",
    "group",
    "spaces",
    "areas",
    "materials",
    "styles",
    "light_sources",
    "dimensions",
    "page",
    "scope",
  ];
  assert.match(
    indexSource,
    /new URLSearchParams\(\{ returnTo: returnHref \}\)/,
  );
  assert.equal(
    (indexSource.match(/detailHref\(item\.detail_ref, returnHref\)/g) ?? [])
      .length,
    2,
  );

  const returnKeysSource = pageSource.match(
    /const catalogReturnKeys = \[([\s\S]*?)\] as const;/,
  )?.[1];
  assert.ok(returnKeysSource);
  assert.deepEqual(
    [...returnKeysSource.matchAll(/"([^"]+)"/g)].map((match) => match[1]),
    expectedReturnKeys,
  );
  assert.match(
    pageSource,
    /const parsed = new URL\(candidate, catalogReturnOrigin\)/,
  );
  assert.match(pageSource, /parsed\.origin !== catalogReturnOrigin/);
  assert.match(pageSource, /parsed\.pathname !== "\/catalog-lab"/);
  assert.match(pageSource, /!catalogReturnKeys\.includes\(/);
  assert.match(
    pageSource,
    /const values = parsed\.searchParams\.getAll\(key\)/,
  );
  assert.match(pageSource, /if \(values\.length > 1\) return fallback/);
  assert.match(
    pageSource,
    /return `\/catalog-lab\$\{safeParams\.size \? `\?\$\{safeParams\}` : ""\}#catalog-products`/,
  );
  assert.match(
    pageSource,
    /<CatalogLabDetail detail=\{detail\} returnHref=\{returnHref\} \/>/,
  );
  assert.match(
    pageSource,
    /<CatalogLabSummaryDetail familyId=\{familyId\} returnHref=\{returnHref\} \/>/,
  );
  assert.ok((richDetailSource.match(/href=\{returnHref\}/g) ?? []).length >= 3);
  assert.ok((componentSource.match(/href=\{returnHref\}/g) ?? []).length >= 3);
});

test("safe summary loader verifies private locks, shard range, bytes, hash and exact row", () => {
  assert.match(componentSource, /\/catalog-lab\/_data\/manifest\.json/);
  assert.match(
    componentSource,
    /source\.publication_state !== "private_runtime_not_public_release"/,
  );
  assert.match(componentSource, /source\.family_count !== 1208/);
  assert.match(componentSource, /source\.summary_detail_family_count !== 1088/);
  assert.match(componentSource, /!sha256Pattern\.test\(familySetSha256\)/);
  assert.match(
    componentSource,
    /familyId >= shard\.first_family_id && familyId <= shard\.last_family_id/,
  );
  assert.match(componentSource, /bytes\.byteLength !== descriptor\.bytes/);
  assert.match(componentSource, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(
    componentSource,
    /await sha256\(bytes\)\) !== descriptor\.sha256/,
  );
  assert.match(
    componentSource,
    /shard\.shard_number !== descriptor\.shard_number/,
  );
  assert.match(
    componentSource,
    /shard\.family_set_sha256 !== manifest\.family_set_sha256/,
  );
  assert.match(componentSource, /source\.family_id !== requestedFamilyId/);
  assert.match(
    componentSource,
    /source\.detail_state !== "safe_index_summary"/,
  );
  assert.match(componentSource, /value\.visibility !== "private_noindex"/);
  assert.match(componentSource, /value\.robots_index !== false/);
  assert.match(componentSource, /value\.sitemap_included !== false/);
  assert.match(componentSource, /value\.alias_activation !== false/);
  assert.match(
    componentSource,
    /categoryState === "pending_owner_selection"[\s\S]*?plannedCanonicalRoute !== null[\s\S]*?routePlanState !== "pending_category_selection"/,
  );
});

test("safe summary has honest loading, error, unavailable and source-boundary states", () => {
  for (const state of ["loading", "unavailable", "error", "ready"]) {
    assert.match(
      componentSource,
      new RegExp(
        `data-summary-state(?:=|\\})[^\\n]*${state}|status: \"${state}\"`,
      ),
    );
  }
  assert.match(componentSource, /来源记录索引/);
  assert.match(componentSource, /<dt>正式主分类<\/dt>/);
  assert.match(componentSource, /function groupingLabel\(family: SummaryFamily\)/);
  assert.match(componentSource, /不代表可选、可售或参数等价的产品变体/);
  assert.match(componentSource, /没有加载完整商品正文、媒体或可售规格/);
  assert.match(componentSource, /返回全量审核目录/);
  assert.doesNotMatch(
    componentSource,
    /consultationHref|catalogImageUrlOrNull/,
  );
});

test("full private projection contains a non-sample family with a valid safe summary row", () => {
  const sampleFamilyIds = new Set(
    sampleIndex.items.map((item) => item.family_id),
  );
  let matched = null;

  for (const descriptor of manifest.shards) {
    const buffer = readFileSync(
      `content/runtime/catalog-v2-full-private/${descriptor.file}`,
    );
    assert.equal(buffer.byteLength, descriptor.bytes);
    assert.equal(
      createHash("sha256").update(buffer).digest("hex"),
      descriptor.sha256,
    );
    const shard = JSON.parse(buffer.toString("utf8"));
    matched = shard.items.find(
      (item) =>
        item.detail_state === "safe_index_summary" &&
        !sampleFamilyIds.has(item.family_id),
    );
    if (matched) break;
  }

  assert.ok(
    matched,
    "expected a safe summary family outside the 120 rich sample",
  );
  assert.match(matched.family_id, /^family-[a-f0-9]{12}$/);
  assert.equal(matched.detail_ref, `/catalog-lab/${matched.family_id}`);
  assert.equal(matched.variant_refs.length, matched.member_count);
  assert.ok(matched.card_specs.length <= 3);
  if (matched.category_state === "pending_owner_selection") {
    assert.equal(matched.category, "待复核");
    assert.ok(matched.source_categories.length >= 2);
    assert.equal(matched.planned_canonical_route, null);
    assert.equal(matched.route_plan_state, "pending_category_selection");
  }
});
