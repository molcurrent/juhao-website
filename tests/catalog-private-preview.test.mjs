import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  catalogPrivatePreviewPlugin,
  isLoopbackAddress,
  isLoopbackHost,
} from "../build/catalog-private-preview-plugin.mjs";

const root = path.resolve(import.meta.dirname, "..");
const fullPrivateRoot = path.join(
  root,
  "content",
  "runtime",
  "catalog-v2-full-private",
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

async function createFixture() {
  const dataRoot = await mkdtemp(
    path.join(os.tmpdir(), "catalog-private-preview-"),
  );
  const shard = {
    visibility: "private_noindex",
    robots_index: false,
    sitemap_included: false,
    alias_activation: false,
    media_policy: "approved_batch_paths_only_unauthorized_suppressed",
    family_count: 1,
    items: [{ family_id: "family-00141a3f73aa" }],
  };
  const shardBuffer = Buffer.from(JSON.stringify(shard));
  const descriptor = {
    file: "index-0001.json",
    family_count: 1,
    bytes: shardBuffer.byteLength,
    sha256: sha256(shardBuffer),
  };
  const manifest = {
    schema_version: 1,
    projection: "product_catalog_v2_full_private_runtime_index",
    visibility: "private_noindex",
    publication_state: "private_runtime_not_public_release",
    robots_index: false,
    sitemap_included: false,
    formal_routes_activated: false,
    alias_activation: false,
    media_policy: "approved_batch_paths_only_unauthorized_suppressed",
    family_count: 1,
    shard_count: 1,
    shards: [descriptor],
  };
  await writeFile(path.join(dataRoot, descriptor.file), shardBuffer);
  await writeFile(
    path.join(dataRoot, "manifest.json"),
    JSON.stringify(manifest),
  );
  return { dataRoot, descriptor, manifest, shardBuffer };
}

async function startServer(dataRoot) {
  const plugin = catalogPrivatePreviewPlugin({ dataRoot });
  let middleware;
  plugin.configureServer({
    middlewares: {
      use(value) {
        middleware = value;
      },
    },
  });
  assert.equal(typeof middleware, "function");

  const server = http.createServer((request, response) => {
    middleware(request, response, () => {
      response.statusCode = 404;
      response.end("next middleware");
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  return {
    plugin,
    request({ pathname, method = "GET", host = "localhost:4173" }) {
      return new Promise((resolve, reject) => {
        const request = http.request(
          {
            hostname: "127.0.0.1",
            port: address.port,
            path: pathname,
            method,
            headers: { Host: host },
          },
          (response) => {
            const chunks = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
              resolve({
                status: response.statusCode,
                headers: response.headers,
                body: Buffer.concat(chunks),
              });
            });
          },
        );
        request.once("error", reject);
        request.end();
      });
    },
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

function assertPrivateHeaders(response) {
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(
    response.headers["x-robots-tag"],
    "noindex, nofollow, noarchive",
  );
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(
    response.headers["cross-origin-resource-policy"],
    "same-origin",
  );
}

test("serves only locked manifest-declared catalog data on loopback hosts", async (t) => {
  const fixture = await createFixture();
  const server = await startServer(fixture.dataRoot);
  t.after(async () => {
    await server.close();
    await rm(fixture.dataRoot, { recursive: true, force: true });
  });

  assert.equal(server.plugin.apply, "serve");
  assert.equal(server.plugin.name, "catalog-private-preview");
  for (const address of ["127.0.0.1", "127.24.8.9", "::1", "::ffff:127.0.0.1"]) {
    assert.equal(isLoopbackAddress(address), true, address);
  }
  for (const address of [undefined, "192.168.1.20", "::ffff:192.168.1.20", "localhost"]) {
    assert.equal(isLoopbackAddress(address), false, String(address));
  }
  for (const host of ["localhost:4173", "127.0.0.1:4173", "[::1]:4173"]) {
    assert.equal(isLoopbackHost(host), true);
    const response = await server.request({
      pathname: "/catalog-lab/_data/manifest.json",
      host,
    });
    assert.equal(response.status, 200);
    assertPrivateHeaders(response);
    assert.deepEqual(JSON.parse(response.body), fixture.manifest);
  }

  const shard = await server.request({
    pathname: "/catalog-lab/_data/index-0001.json?scope=full",
  });
  assert.equal(shard.status, 200);
  assertPrivateHeaders(shard);
  assert.match(shard.headers["content-type"], /^application\/json\b/);
  assert.deepEqual(shard.body, fixture.shardBuffer);

  const head = await server.request({
    pathname: "/catalog-lab/_data/index-0001.json",
    method: "HEAD",
  });
  assert.equal(head.status, 200);
  assert.equal(head.body.byteLength, 0);
  assert.equal(
    Number(head.headers["content-length"]),
    fixture.shardBuffer.byteLength,
  );

  for (const host of ["catalog.example.com", "localhost.example.com:4173"]) {
    assert.equal(isLoopbackHost(host), false);
    const response = await server.request({
      pathname: "/catalog-lab/_data/manifest.json",
      host,
    });
    assert.equal(response.status, 404);
    assertPrivateHeaders(response);
  }

  const post = await server.request({
    pathname: "/catalog-lab/_data/manifest.json",
    method: "POST",
  });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
  assertPrivateHeaders(post);

  for (const pathname of [
    "/catalog-lab/_data/index-9999.json",
    "/catalog-lab/_data/..%2Fmanifest.json",
    "/catalog-lab/_data/%5Cmanifest.json",
  ]) {
    const response = await server.request({ pathname });
    assert.equal(response.status, 404, pathname);
  }

  const unrelated = await server.request({ pathname: "/health" });
  assert.equal(unrelated.status, 404);
  assert.equal(unrelated.body.toString("utf8"), "next middleware");
});

test("fails closed when manifest locks or shard integrity drift", async (t) => {
  const fixture = await createFixture();
  const server = await startServer(fixture.dataRoot);
  t.after(async () => {
    await server.close();
    await rm(fixture.dataRoot, { recursive: true, force: true });
  });

  await writeFile(
    path.join(fixture.dataRoot, fixture.descriptor.file),
    Buffer.concat([fixture.shardBuffer, Buffer.from("\n")]),
  );
  const corruptShard = await server.request({
    pathname: "/catalog-lab/_data/index-0001.json",
  });
  assert.equal(corruptShard.status, 503);
  assertPrivateHeaders(corruptShard);

  await writeFile(
    path.join(fixture.dataRoot, "manifest.json"),
    JSON.stringify({ ...fixture.manifest, formal_routes_activated: true }),
  );
  const unlockedManifest = await server.request({
    pathname: "/catalog-lab/_data/manifest.json",
  });
  assert.equal(unlockedManifest.status, 503);
  assertPrivateHeaders(unlockedManifest);
});

test("serves every current full-private shard through the guarded data plane", async (t) => {
  const manifest = JSON.parse(
    await readFile(path.join(fullPrivateRoot, "manifest.json"), "utf8"),
  );
  const server = await startServer(fullPrivateRoot);
  t.after(server.close);

  const manifestResponse = await server.request({
    pathname: "/catalog-lab/_data/manifest.json",
  });
  assert.equal(manifestResponse.status, 200);
  assert.equal(JSON.parse(manifestResponse.body).shard_count, 13);

  for (const descriptor of manifest.shards) {
    const response = await server.request({
      pathname: `/catalog-lab/_data/${descriptor.file}`,
    });
    assert.equal(response.status, 200, descriptor.file);
    assert.equal(response.body.byteLength, descriptor.bytes);
    assert.equal(sha256(response.body), descriptor.sha256);
  }
});

async function allFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await allFiles(file)));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

test("keeps the private data plane serve-only and out of production output", async () => {
  const configSource = await readFile(path.join(root, "vite.config.ts"), "utf8");
  assert.match(configSource, /catalogPrivatePreviewPlugin\(\)/);
  assert.ok(
    configSource.indexOf("catalogPrivatePreviewPlugin()") <
      configSource.indexOf("vinext()"),
  );
  assert.equal(catalogPrivatePreviewPlugin().apply, "serve");

  const distRoot = path.join(root, "dist");
  try {
    await access(distRoot);
  } catch {
    return;
  }

  const forbiddenProjection =
    "product_catalog_v2_full_private_runtime_index";
  for (const file of await allFiles(distRoot)) {
    assert.equal(
      path.relative(distRoot, file).includes("catalog-lab/_data/"),
      false,
      file,
    );
    if (!/\.(?:css|html|js|json|map|txt)$/i.test(file)) continue;
    const contents = await readFile(file, "utf8");
    assert.equal(contents.includes(forbiddenProjection), false, file);
  }
});
