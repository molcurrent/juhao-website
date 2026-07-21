import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

globalThis.__cloudflareTestEnv = {};

const familyId = "family-a3d872de3600";
const detail = JSON.parse(
  readFileSync(`content/runtime/catalog-v2/details/${familyId}.json`, "utf8"),
);
const authorizedMedia = JSON.parse(
  readFileSync("content/runtime/catalog-v2/authorized-media.json", "utf8"),
);
const detailSource = readFileSync(
  "features/catalog-lab/CatalogLabDetail.tsx",
  "utf8",
);
const canvasSource = readFileSync(
  "features/catalog-lab/CatalogAmbientFieldCanvas.tsx",
  "utf8",
);
const canvasCss = readFileSync(
  "features/catalog-lab/CatalogAmbientFieldCanvas.module.css",
  "utf8",
);
const routeCss = readFileSync("app/catalog-lab/styles/route.ts", "utf8");

async function createWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

test("flagship evidence stage uses only its six authorized source images", () => {
  const displayedMedia = [
    detail.representative_detail.primary_image,
    ...detail.representative_detail.detail_images,
  ];
  const authorized = new Set(authorizedMedia.paths);

  assert.equal(detail.family.family_id, familyId);
  assert.equal(detail.representative_detail.detail_images.length, 5);
  assert.equal(new Set(displayedMedia).size, 6);
  assert.ok(displayedMedia.every((path) => authorized.has(path)));
  assert.equal(detail.representative_detail.suppressed_media_path_count, 0);
});

test("evidence stage keeps media selection separate from source variants", () => {
  assert.match(detailSource, /function ProductEvidenceStage/);
  assert.match(detailSource, /<ProductEvidenceStage detail=\{detail\} \/>/);
  assert.match(detailSource, /loading=\{selectedIndex === 0 \? undefined : "lazy"\}/);
  assert.match(detailSource, /fetchPriority=\{selectedIndex === 0 \? "high" : "auto"\}/);
  assert.match(detailSource, /aria-current=\{selectedIndex === index \? "true" : undefined\}/);
  assert.match(detailSource, /aria-live="polite"/);
  assert.doesNotMatch(detailSource, /setSelectedIndex\([^)]*selectedId/);
  assert.doesNotMatch(detailSource, /setSelectedId\([^)]*selectedIndex/);
  assert.match(
    detailSource,
    /背景光场非配光、照度或性能模拟。/,
  );
});

test("ambient WebGL field never uploads or samples product textures", () => {
  assert.match(canvasSource, /getContext\("webgl2"/);
  assert.match(canvasSource, /getContext\("webgl"/);
  assert.match(canvasSource, /const MAX_DPR = 1\.25/);
  assert.match(canvasSource, /const MAX_BACKING_PIXELS = 1_500_000/);
  assert.match(canvasSource, /const MAX_FPS = 30/);
  assert.match(canvasSource, /IntersectionObserver/);
  assert.match(canvasSource, /webglcontextlost/);
  assert.match(canvasSource, /webglcontextrestored/);
  assert.match(canvasSource, /saveData/);
  assert.doesNotMatch(canvasSource, /sampler2D|texImage2D|createTexture|new Image\(/);
  assert.match(
    canvasCss,
    /@media \(max-width: 1100px\), \(hover: none\), \(pointer: coarse\), \(prefers-reduced-motion: reduce\)/,
  );
  assert.match(
    routeCss,
    /\.catalogLab-evidenceImageFrame > img[\s\S]*?object-fit: contain/,
  );
  assert.doesNotMatch(routeCss, /catalogLab-detailGallery/);
});

test("server render requests only the flagship primary image initially", async () => {
  const worker = await createWorker();
  const response = await worker.fetch(
    new Request(`http://localhost/catalog-lab/${familyId}`, {
      headers: { accept: "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /来源证据光场展陈台/);
  assert.match(html, /非配光、照度或性能模拟/);
  assert.match(html, /来源图 05/);
  const initialCatalogUrls = [
    ...html.matchAll(/\/api\/catalog-image\?path=[^"' <]+/g),
  ].map(([url]) => url);
  const catalogImageTags = [...html.matchAll(/<img\b[^>]*>/g)].filter(
    ([tag]) => tag.includes("/api/catalog-image?path="),
  );
  assert.equal(new Set(initialCatalogUrls).size, 1);
  assert.equal(catalogImageTags.length, 1);
  assert.match(html, /data-catalog-ambient-field=""/);
});
