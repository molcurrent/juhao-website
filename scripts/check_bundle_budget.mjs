import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CLIENT_ROOT = resolve(ROOT, "dist/client");
const LEDGER_PATH = resolve(ROOT, "content/runtime/publication-ledger.json");
const WORKER_PATH = resolve(ROOT, "dist/server/index.js");

export const BUNDLE_BUDGETS = Object.freeze({
  ordinaryGzipBytes: 150 * 1024,
  contactGzipBytes: 180 * 1024,
  largestJavaScriptAssetRawBytes: 500 * 1024,
});

function normalizedAssetPath(value) {
  try {
    const pathname = new URL(value, "http://localhost").pathname;
    return pathname.startsWith("/assets/") && /\.(?:css|js)$/.test(pathname) ? pathname : null;
  } catch {
    return null;
  }
}

export function extractInitialAssets(html) {
  const assets = new Set();
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (rel !== "stylesheet" && rel !== "modulepreload") continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const pathname = href ? normalizedAssetPath(href) : null;
    if (pathname) assets.add(pathname);
  }
  return [...assets].sort();
}

async function readPublishedRoutes() {
  const ledger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  return ledger
    .filter((record) => record.publish_status === "published")
    .map((record) => record.route)
    .sort((left, right) => left.localeCompare(right));
}

async function createWorker() {
  const workerUrl = pathToFileURL(WORKER_PATH);
  workerUrl.searchParams.set("bundle-budget", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

async function render(worker, route) {
  return worker.fetch(
    new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

export async function auditBundleBudgets({
  routes,
  worker,
  budgets = BUNDLE_BUDGETS,
} = {}) {
  const publishedRoutes = routes ?? await readPublishedRoutes();
  const appWorker = worker ?? await createWorker();
  const assetMeasurements = new Map();

  async function measureAsset(pathname) {
    if (!assetMeasurements.has(pathname)) {
      const bytes = await readFile(resolve(CLIENT_ROOT, pathname.slice(1)));
      assetMeasurements.set(pathname, {
        path: pathname,
        type: pathname.endsWith(".css") ? "css" : "js",
        raw_bytes: bytes.length,
        gzip_bytes: gzipSync(bytes, { level: 9 }).length,
      });
    }
    return assetMeasurements.get(pathname);
  }

  const results = [];
  for (const route of publishedRoutes) {
    const response = await render(appWorker, route);
    if (response.status !== 200) throw new Error(`${route}: expected 200, received ${response.status}`);
    const assets = await Promise.all(extractInitialAssets(await response.text()).map(measureAsset));
    if (!assets.length) throw new Error(`${route}: no initial JS/CSS assets found`);

    const gzipBytes = assets.reduce((total, asset) => total + asset.gzip_bytes, 0);
    const rawBytes = assets.reduce((total, asset) => total + asset.raw_bytes, 0);
    const javascript = assets.filter((asset) => asset.type === "js");
    const largestJavaScriptAsset = javascript.reduce(
      (largest, asset) => !largest || asset.raw_bytes > largest.raw_bytes ? asset : largest,
      null,
    );
    const gzipBudgetBytes = route === "/contact" ? budgets.contactGzipBytes : budgets.ordinaryGzipBytes;
    const violations = [];
    if (gzipBytes > gzipBudgetBytes) violations.push("initial_gzip");
    if ((largestJavaScriptAsset?.raw_bytes ?? 0) >= budgets.largestJavaScriptAssetRawBytes) {
      violations.push("largest_javascript_asset_raw");
    }

    results.push({
      route,
      asset_count: assets.length,
      initial_raw_bytes: rawBytes,
      initial_gzip_bytes: gzipBytes,
      gzip_budget_bytes: gzipBudgetBytes,
      largest_javascript_asset: largestJavaScriptAsset?.path ?? null,
      largest_javascript_asset_raw_bytes: largestJavaScriptAsset?.raw_bytes ?? 0,
      largest_javascript_asset_raw_budget_bytes: budgets.largestJavaScriptAssetRawBytes,
      assets: assets.map((asset) => asset.path),
      violations,
      passed: violations.length === 0,
    });
  }

  const violations = results.filter((result) => !result.passed);
  const maximumGzip = results.reduce(
    (maximum, result) => !maximum || result.initial_gzip_bytes > maximum.initial_gzip_bytes ? result : maximum,
    null,
  );
  const maximumRawJavaScriptAsset = results.reduce(
    (maximum, result) => !maximum || result.largest_javascript_asset_raw_bytes > maximum.largest_javascript_asset_raw_bytes ? result : maximum,
    null,
  );

  return {
    generated_from: "dist HTML stylesheet/modulepreload links and dist/client assets",
    compression: "node:zlib gzip level 9",
    thresholds: {
      ordinary_initial_js_css_gzip_bytes: budgets.ordinaryGzipBytes,
      contact_initial_js_css_gzip_bytes: budgets.contactGzipBytes,
      largest_initial_javascript_asset_raw_bytes_exclusive: budgets.largestJavaScriptAssetRawBytes,
    },
    summary: {
      audited_routes: results.length,
      passed_routes: results.length - violations.length,
      failed_routes: violations.length,
      maximum_initial_gzip_route: maximumGzip?.route ?? null,
      maximum_initial_gzip_bytes: maximumGzip?.initial_gzip_bytes ?? 0,
      maximum_raw_javascript_asset_route: maximumRawJavaScriptAsset?.route ?? null,
      maximum_raw_javascript_asset_bytes: maximumRawJavaScriptAsset?.largest_javascript_asset_raw_bytes ?? 0,
    },
    routes: results,
    passed: violations.length === 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await auditBundleBudgets();
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
