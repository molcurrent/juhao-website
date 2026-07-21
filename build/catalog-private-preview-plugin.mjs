import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CATALOG_PRIVATE_DATA_PREFIX = "/catalog-lab/_data/";

const MANIFEST_FILE = "manifest.json";
const SHARD_FILE_PATTERN = /^index-\d{4}\.json$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DEFAULT_DATA_ROOT = fileURLToPath(
  new URL("../content/runtime/catalog-v2-full-private/", import.meta.url),
);
const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

export function isLoopbackHost(hostHeader) {
  if (typeof hostHeader !== "string") return false;

  const host = hostHeader.trim().toLowerCase();
  if (
    !/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host) &&
    !/^\[::1\](?::\d{1,5})?$/.test(host)
  ) {
    return false;
  }

  try {
    const parsed = new URL(`http://${host}`);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function isLoopbackAddress(remoteAddress) {
  if (typeof remoteAddress !== "string") return false;
  const normalized = remoteAddress.trim().toLowerCase().split("%", 1)[0];
  if (normalized === "::1") return true;

  const ipv4 = normalized.startsWith("::ffff:")
    ? normalized.slice("::ffff:".length)
    : normalized;
  const octets = ipv4.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every(
      (octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255,
    )
  );
}

function assertPrivateLocks(manifest) {
  const locked =
    manifest?.schema_version === 1 &&
    manifest?.projection ===
      "product_catalog_v2_full_private_runtime_index" &&
    manifest?.visibility === "private_noindex" &&
    manifest?.publication_state === "private_runtime_not_public_release" &&
    manifest?.robots_index === false &&
    manifest?.sitemap_included === false &&
    manifest?.formal_routes_activated === false &&
    manifest?.alias_activation === false;

  if (!locked) throw new Error("Private catalog manifest locks are invalid");
}

export function validateCatalogPrivateManifest(manifest) {
  assertPrivateLocks(manifest);
  if (!Array.isArray(manifest.shards) || manifest.shards.length === 0) {
    throw new Error("Private catalog manifest has no shards");
  }
  if (manifest.shard_count !== manifest.shards.length) {
    throw new Error("Private catalog shard count is inconsistent");
  }

  const declaredFiles = new Map();
  let familyCount = 0;
  for (const descriptor of manifest.shards) {
    if (
      !descriptor ||
      !SHARD_FILE_PATTERN.test(descriptor.file) ||
      !Number.isSafeInteger(descriptor.bytes) ||
      descriptor.bytes <= 0 ||
      !Number.isSafeInteger(descriptor.family_count) ||
      descriptor.family_count <= 0 ||
      !SHA256_PATTERN.test(descriptor.sha256)
    ) {
      throw new Error("Private catalog shard descriptor is invalid");
    }
    if (declaredFiles.has(descriptor.file)) {
      throw new Error("Private catalog shard descriptor is duplicated");
    }
    declaredFiles.set(descriptor.file, descriptor);
    familyCount += descriptor.family_count;
  }

  if (manifest.family_count !== familyCount) {
    throw new Error("Private catalog family count is inconsistent");
  }
  return declaredFiles;
}

function requestedDataFile(rawUrl) {
  const rawPath = (rawUrl ?? "").split(/[?#]/, 1)[0];
  if (!rawPath.startsWith(CATALOG_PRIVATE_DATA_PREFIX)) return null;

  let file;
  try {
    file = decodeURIComponent(rawPath.slice(CATALOG_PRIVATE_DATA_PREFIX.length));
  } catch {
    return false;
  }

  if (file === MANIFEST_FILE || SHARD_FILE_PATTERN.test(file)) return file;
  return false;
}

function setPrivateHeaders(response) {
  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.setHeader(name, value);
  }
}

function endResponse(request, response, statusCode, body = "") {
  const payload = Buffer.from(body);
  response.statusCode = statusCode;
  setPrivateHeaders(response);
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Content-Length", String(payload.byteLength));
  response.end(request.method === "HEAD" ? undefined : payload);
}

function sendJson(request, response, payload) {
  response.statusCode = 200;
  setPrivateHeaders(response);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", String(payload.byteLength));
  response.end(request.method === "HEAD" ? undefined : payload);
}

async function readManifest(dataRoot) {
  const manifestBuffer = await readFile(path.join(dataRoot, MANIFEST_FILE));
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  return {
    buffer: manifestBuffer,
    manifest,
    descriptors: validateCatalogPrivateManifest(manifest),
  };
}

function validateShard(payload, descriptor, manifest) {
  const shard = JSON.parse(payload.toString("utf8"));
  if (
    shard?.visibility !== "private_noindex" ||
    shard?.robots_index !== false ||
    shard?.sitemap_included !== false ||
    shard?.alias_activation !== false ||
    shard?.media_policy !== manifest.media_policy ||
    shard?.family_count !== descriptor.family_count ||
    !Array.isArray(shard?.items) ||
    shard.items.length !== descriptor.family_count
  ) {
    throw new Error("Private catalog shard locks are invalid");
  }
}

export async function serveCatalogPrivateData(
  request,
  response,
  next,
  { dataRoot = DEFAULT_DATA_ROOT } = {},
) {
  const file = requestedDataFile(request.url);
  if (file === null) return next();
  if (
    !isLoopbackHost(request.headers.host) ||
    !isLoopbackAddress(request.socket?.remoteAddress)
  ) {
    return endResponse(request, response, 404, "Not found");
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return endResponse(request, response, 405, "Method not allowed");
  }
  if (file === false) return endResponse(request, response, 404, "Not found");

  const resolvedRoot = path.resolve(dataRoot);
  try {
    const lockedManifest = await readManifest(resolvedRoot);
    if (file === MANIFEST_FILE) {
      return sendJson(request, response, lockedManifest.buffer);
    }

    const descriptor = lockedManifest.descriptors.get(file);
    if (!descriptor) return endResponse(request, response, 404, "Not found");

    const shardPath = path.resolve(resolvedRoot, file);
    if (path.dirname(shardPath) !== resolvedRoot) {
      return endResponse(request, response, 404, "Not found");
    }
    const shardBuffer = await readFile(shardPath);
    if (
      shardBuffer.byteLength !== descriptor.bytes ||
      sha256(shardBuffer) !== descriptor.sha256
    ) {
      throw new Error("Private catalog shard integrity check failed");
    }
    validateShard(shardBuffer, descriptor, lockedManifest.manifest);
    return sendJson(request, response, shardBuffer);
  } catch {
    return endResponse(request, response, 503, "Private data unavailable");
  }
}

export function catalogPrivatePreviewPlugin(options = {}) {
  const dataRoot = path.resolve(options.dataRoot ?? DEFAULT_DATA_ROOT);
  return {
    name: "catalog-private-preview",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void serveCatalogPrivateData(request, response, next, { dataRoot }).catch(
          () => endResponse(request, response, 503, "Private data unavailable"),
        );
      });
    },
  };
}

export default catalogPrivatePreviewPlugin;
