import assert from "node:assert/strict";
import test from "node:test";

globalThis.__cloudflareTestEnv ??= {};

async function createWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("security-headers-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

test("permits HMR only on the HTTP loopback preview while keeping production CSP closed", async () => {
  const worker = await createWorker();
  const local = await worker.fetch(new Request("http://localhost:4173/"), env, ctx);
  const localCsp = local.headers.get("content-security-policy") ?? "";
  assert.match(localCsp, /connect-src[^;]*ws:\/\/localhost:4173/);
  assert.match(localCsp, /worker-src 'self' blob:/);

  const production = await worker.fetch(new Request("https://example.com/"), env, ctx);
  const productionCsp = production.headers.get("content-security-policy") ?? "";
  assert.doesNotMatch(productionCsp, /connect-src[^;]*ws:/);
  assert.doesNotMatch(productionCsp, /worker-src 'self' blob:/);
  assert.match(productionCsp, /worker-src 'self'(?:;|$)/);
  assert.equal(production.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(production.headers.get("strict-transport-security"), "max-age=86400");
  assert.doesNotMatch(production.headers.get("strict-transport-security") ?? "", /includeSubDomains/i);
});

test("keeps private discovery closed and only opens it behind the explicit runtime flag", async () => {
  const worker = await createWorker();
  const privateRobots = await worker.fetch(new Request("https://example.com/robots.txt"), env, ctx);
  assert.match(await privateRobots.text(), /Disallow:\s*\//i);
  assert.doesNotMatch(await (await worker.fetch(new Request("https://example.com/robots.txt"), env, ctx)).text(), /Sitemap:/i);

  const publicEnv = { ...env, PUBLIC_INDEXING_ENABLED: "true" };
  const publicRobots = await worker.fetch(new Request("https://example.com/robots.txt"), publicEnv, ctx);
  const publicRobotsText = await publicRobots.text();
  assert.match(publicRobotsText, /Allow:\s*\//i);
  assert.match(publicRobotsText, /Sitemap: https:\/\/juhao\.com\/sitemap\.xml/i);
  assert.equal(publicRobots.headers.get("x-robots-tag"), null);
});
