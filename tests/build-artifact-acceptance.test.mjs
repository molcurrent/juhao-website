import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { auditBundleBudgets, extractInitialAssets } from "../scripts/check_bundle_budget.mjs";
import { auditDistLeaks, findLeaksInText } from "../scripts/check_dist_leaks.mjs";

globalThis.__cloudflareTestEnv ??= {};

async function allFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const pathname = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await allFiles(pathname));
    else if (entry.isFile()) files.push(pathname);
  }
  return files;
}

test("extracts only unique initial JS and CSS assets from rendered HTML", () => {
  const html = [
    '<link rel="stylesheet" href="/assets/site.css">',
    '<link rel="modulepreload" href="/assets/app.js">',
    '<link rel="modulepreload" href="/assets/app.js">',
    '<link rel="preload" href="/assets/font.woff2">',
    '<script src="/assets/later.js"></script>',
  ].join("");
  assert.deepEqual(extractInitialAssets(html), ["/assets/app.js", "/assets/site.css"]);
});

test("detects governed runtime leak patterns without scanning arbitrary words", () => {
  const source = [
    "https://bocang.oss-cn-shenzhen.aliyuncs.com/a.jpg",
    "/Users/mac/Documents/source.md",
    "jh_sys_configs",
    "undefined-color_temperature",
    '"stock": 10',
    "400-0760-888",
    "4014",
    "product_catalog_v2_full_source_disposition",
  ].join("\n");
  const rules = new Set(findLeaksInText(source).map((finding) => finding.rule));
  assert.deepEqual(rules, new Set([
    "enterprise_oss_domain",
    "local_absolute_path",
    "forbidden_source_table",
    "undefined_parameter",
    "price_or_inventory_field",
    "legacy_service_phone",
    "non_lighting_product_id",
    "private_catalog_governance_projection",
  ]));
  assert.deepEqual(findLeaksInText("contactChannel: 'phone'; approved product 12287"), []);
  assert.equal(findLeaksInText("stock: 10")[0]?.rule, "price_or_inventory_field");
});

test("keeps every published route within the initial bundle budgets", async () => {
  const report = await auditBundleBudgets();
  assert.equal(report.summary.audited_routes, 81);
  assert.equal(report.summary.failed_routes, 0, JSON.stringify(report.routes.filter((route) => !route.passed), null, 2));
  assert.ok(report.summary.minimum_gzip_safety_margin_bytes >= 10 * 1024);
  assert.equal(report.passed, true);
});

test("keeps private catalog routes and route-local CSS within explicit budgets", async () => {
  const index = JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "../content/runtime/catalog-v2/index.json"),
      "utf8",
    ),
  );
  const routes = [
    "/catalog-lab",
    `/catalog-lab/${index.items[0].family_id}`,
    "/catalog-lab/review",
  ];
  const previousWorkbenchFlag =
    process.env.CATALOG_REVIEW_WORKBENCH_ENABLED;
  process.env.CATALOG_REVIEW_WORKBENCH_ENABLED = "true";
  let report;
  try {
    report = await auditBundleBudgets({ routes });
  } finally {
    if (previousWorkbenchFlag === undefined) {
      delete process.env.CATALOG_REVIEW_WORKBENCH_ENABLED;
    } else {
      process.env.CATALOG_REVIEW_WORKBENCH_ENABLED = previousWorkbenchFlag;
    }
  }
  assert.equal(report.summary.audited_routes, routes.length);
  assert.equal(
    report.summary.failed_routes,
    0,
    JSON.stringify(report.routes.filter((route) => !route.passed), null, 2),
  );

  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("catalog-css-budget", `${process.pid}-${Date.now()}`);
  const worker = (await import(workerUrl.href)).default;
  const response = await worker.fetch(
    new Request("http://localhost/catalog-lab/styles"),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/css\b/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const css = Buffer.from(await response.arrayBuffer());
  assert.ok(css.length < 64 * 1024, `catalog CSS raw bytes: ${css.length}`);
  assert.ok(
    gzipSync(css, { level: 9 }).length < 12 * 1024,
    `catalog CSS gzip bytes: ${gzipSync(css, { level: 9 }).length}`,
  );
});

test("keeps the neutral public catalog detail route within the ordinary bundle budget", async () => {
  const runtime = JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "../content/runtime/catalog-v2-public/index.json"),
      "utf8",
    ),
  );
  const route = runtime.items.find(
    (item) =>
      item.route_kind === "neutral_catalog_series" &&
      item.category_state === "pending_owner_selection",
  )?.canonical_path;
  assert.ok(route, "expected a cross-category neutral catalog route");

  const report = await auditBundleBudgets({ routes: [route] });
  assert.equal(report.summary.audited_routes, 1);
  assert.equal(report.summary.failed_routes, 0, JSON.stringify(report.routes, null, 2));
  assert.ok(
    report.summary.minimum_gzip_safety_margin_bytes >= 10 * 1024,
    JSON.stringify(report.routes, null, 2),
  );
});

test("keeps governed source data out of built runtime artifacts", async () => {
  const report = await auditDistLeaks();
  assert.equal(report.finding_count, 0, JSON.stringify(report.findings.slice(0, 20), null, 2));
  assert.equal(report.passed, true);
});

test("ships only runtime-selected media derivatives", async () => {
  const root = resolve(import.meta.dirname, "..");
  const mediaRoot = resolve(root, "dist/client/media");
  const runtime = JSON.parse(await readFile(resolve(root, "content/governance/runtime-media.json"), "utf8"));
  const expected = new Set(runtime.flatMap((record) => [record.fallback, ...record.variants.map((variant) => variant.path)])
    .map((pathname) => pathname.slice("/media/".length)));
  const actual = new Set((await allFiles(mediaRoot)).map((pathname) => relative(mediaRoot, pathname)));

  assert.equal(runtime.length, 120);
  assert.deepEqual(actual, expected);
  assert.equal([...actual].some((pathname) => pathname.startsWith("source/")), false);
});

test("ships the daily consultation retention trigger", async () => {
  const config = JSON.parse(await readFile(resolve(import.meta.dirname, "../dist/server/wrangler.json"), "utf8"));
  assert.deepEqual(config.triggers?.crons, ["0 3 * * *"]);
});
