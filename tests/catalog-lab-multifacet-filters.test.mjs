import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

globalThis.__cloudflareTestEnv = {};

const index = JSON.parse(
  readFileSync("content/runtime/catalog-v2/index.json", "utf8"),
);
const componentSource = readFileSync(
  "features/catalog-lab/CatalogLabIndex.tsx",
  "utf8",
);
const pageSource = readFileSync("app/catalog-lab/page.tsx", "utf8");

function safeDimension(value) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || /[\u0000-\u001f\u007f<>]/.test(normalized)) return null;
  if (/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i.test(normalized)) return null;
  return normalized;
}

function values(item, key) {
  return (item.facets[key] ?? [])
    .map((value) =>
      key === "dimensions" ? safeDimension(value) : value.trim(),
    )
    .filter(Boolean);
}

function findUsefulPair() {
  const spaces = [
    ...new Set(index.items.flatMap((item) => values(item, "spaces"))),
  ];
  const materials = [
    ...new Set(index.items.flatMap((item) => values(item, "materials"))),
  ];
  for (const space of spaces) {
    for (const material of materials) {
      const matching = index.items.filter(
        (item) =>
          values(item, "spaces").includes(space) &&
          values(item, "materials").includes(material),
      );
      if (matching.length > 0 && matching.length < index.items.length) {
        return { space, material, matching };
      }
    }
  }
  throw new Error("catalog sample has no useful cross-facet pair");
}

async function createWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(worker, path) {
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  return response.text();
}

test("catalog lab defines the six shareable single-select facet dimensions", () => {
  for (const key of [
    "spaces",
    "areas",
    "materials",
    "styles",
    "light_sources",
    "dimensions",
  ]) {
    assert.match(componentSource, new RegExp(`key: "${key}"`));
    assert.match(
      componentSource,
      new RegExp(`params\\.set\\(key, filters\\.facets\\[key\\]\\)`),
    );
  }
  assert.match(componentSource, /facetFilters\.every\(/);
  assert.match(
    componentSource,
    /window\.addEventListener\("popstate", restoreFilters\)/,
  );
  assert.match(componentSource, /facets: nextFacets, page: 1/);
});

test("catalog lab normalizes invalid pages and keeps clamped state aligned", async () => {
  assert.match(pageSource, /!\/\^\[1-9\]\\d\*\$\/\.test\(value\)/);
  assert.match(componentSource, /!\/\^\[1-9\]\\d\*\$\/\.test\(value\)/);
  assert.match(
    componentSource,
    /if \(page <= totalPages\) return;[\s\S]{0,200}setPage\(totalPages\);\s+writeFilters\(/,
  );

  const worker = await createWorker();
  for (const page of ["0", "-1", "1.5", "2junk", "9007199254740992"]) {
    const html = await render(worker, `/catalog-lab?page=${page}`);
    assert.match(html, /aria-label="第 1 页产品族"/);
  }
});

test("catalog lab canonicalizes invalid facet URLs and restores mobile focus", () => {
  assert.match(componentSource, /hasNonCanonicalFacet/);
  assert.match(
    componentSource,
    /hasNonCanonicalFacet \|\|\s*params\.get\("page"\) !== canonicalPage/,
  );
  assert.match(componentSource, /"replaceState"/);
  assert.match(componentSource, /ref=\{filterToggleRef\}/);
  assert.match(
    componentSource,
    /window\.requestAnimationFrame\(\(\) => filterToggleRef\.current\?\.focus\(\)\)/,
  );
});

test("catalog lab applies cross-facet AND filtering on the server render", async () => {
  const worker = await createWorker();
  const { space, material, matching } = findUsefulPair();
  const params = new URLSearchParams({ spaces: space, materials: material });
  const html = await render(worker, `/catalog-lab?${params}`);

  assert.ok(
    html.includes(`<strong>${matching.length}</strong><span>个结果</span>`),
  );
  assert.match(
    html,
    new RegExp(
      `<option value="${space.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" selected="">`,
    ),
  );
  assert.match(
    html,
    new RegExp(
      `<option value="${material.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" selected="">`,
    ),
  );
});

test("runtime facets omit source values containing unresolved HTML entities", async () => {
  const dirtyDimensions = index.items
    .flatMap((item) => item.facets.dimensions ?? [])
    .filter((value) => /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i.test(value));
  assert.deepEqual(dirtyDimensions, []);

  const worker = await createWorker();
  const html = await render(worker, "/catalog-lab");
  const dimensionSelects = [
    ...html.matchAll(
      /<select[^>]*aria-label="按尺寸筛选"[^>]*>([\s\S]*?)<\/select>/g,
    ),
  ];
  assert.ok(
    dimensionSelects.length >= 2,
    "desktop and mobile controls must render",
  );
  for (const [, options] of dimensionSelects) {
    assert.doesNotMatch(options, /&amp;(?:amp;)+/i);
    assert.doesNotMatch(options, /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i);
  }
});
