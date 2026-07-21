import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import {
  catalogImageUrl,
  catalogImageUrlOrNull,
  validatedCatalogImagePath,
} from "../lib/catalog-image.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const authorizedMedia = JSON.parse(
  readFileSync(
    new URL(
      "../content/runtime/catalog-v2/authorized-media.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
assert.equal(authorizedMedia.schema_version, 1);
assert.equal(authorizedMedia.visibility, "private_noindex");
assert.ok(
  Array.isArray(authorizedMedia.paths) && authorizedMedia.paths.length > 0,
);
const [valid] = authorizedMedia.paths;
const vite = await createServer({
  root,
  configFile: false,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { GET } = await vite.ssrLoadModule("/app/api/catalog-image/route.ts");
test.after(() => vite.close());

test("catalog image proxy accepts only normalized upload paths", () => {
  assert.equal(validatedCatalogImagePath(valid), valid);
  assert.equal(validatedCatalogImagePath("//example.com/upload/a.jpg"), null);
  assert.equal(validatedCatalogImagePath("https://example.com/upload/a.jpg"), null);
  assert.equal(
    validatedCatalogImagePath("/upload/a.jpg?redirect=https://example.com"),
    null,
  );
  assert.equal(
    validatedCatalogImagePath("/not-upload/a.jpg"),
    null,
  );
});

test("catalog image helper keeps local assets and proxies valid remote assets", () => {
  assert.equal(catalogImageUrl("/images/local.webp"), "/images/local.webp");
  assert.equal(catalogImageUrlOrNull("/images/local.webp"), null);
  assert.equal(
    catalogImageUrl("https://example.com/a.jpg"),
    "/images/jh48-product-card-art.webp",
  );
  assert.equal(catalogImageUrlOrNull("https://example.com/a.jpg"), null);
  assert.match(catalogImageUrl(valid), /^\/api\/catalog-image\?path=/);
  assert.match(catalogImageUrlOrNull(valid), /^\/api\/catalog-image\?path=/);
});

test("catalog image route rejects remote hosts before proxying", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response();
  };
  try {
    const response = await GET(
      new Request(
        `https://juhao.example/api/catalog-image?path=${encodeURIComponent(valid)}`,
      ),
    );
    assert.equal(response.status, 404);
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog image route keeps malformed local paths at 400", async () => {
  const response = await GET(
    new Request(
      "http://localhost/api/catalog-image?path=https%3A%2F%2Fexample.com%2Fa.jpg",
    ),
  );
  assert.equal(response.status, 400);
});

test("catalog image route returns 404 for valid paths outside the allowlist", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response();
  };
  try {
    const response = await GET(
      new Request(
        "http://127.0.0.1/api/catalog-image?path=%2Fupload%2Fnot-authorized.jpg",
      ),
    );
    assert.equal(response.status, 404);
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog image route proxies allowlisted paths on local hosts", async () => {
  const originalFetch = globalThis.fetch;
  const fetched = [];
  globalThis.fetch = async (input) => {
    fetched.push(String(input));
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": "3",
      },
    });
  };
  try {
    for (const origin of [
      "http://localhost:4173",
      "http://127.0.0.1:4173",
      "http://[::1]:4173",
    ]) {
      const response = await GET(
        new Request(
          `${origin}/api/catalog-image?path=${encodeURIComponent(valid)}`,
        ),
      );
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("cache-control"),
        "private, max-age=3600",
      );
      assert.deepEqual(
        new Uint8Array(await response.arrayBuffer()),
        new Uint8Array([1, 2, 3]),
      );
    }
    assert.deepEqual(
      fetched,
      Array(3).fill(
        new URL(
          valid,
          "https://bocang.oss-cn-shenzhen.aliyuncs.com",
        ).href,
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
