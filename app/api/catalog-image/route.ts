import rawAuthorizedMedia from "../../../content/runtime/catalog-v2/authorized-media.json";
import { validatedCatalogImagePath } from "../../../lib/catalog-image";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UPSTREAM_HOST = ["bocang", "oss-cn-shenzhen", "aliyuncs", "com"].join(".");
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function buildAuthorizedPathSet(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { schema_version?: unknown }).schema_version !== 1 ||
    (value as { visibility?: unknown }).visibility !== "private_noindex"
  ) {
    return new Set<string>();
  }
  const paths = (value as { paths?: unknown }).paths;
  if (
    !Array.isArray(paths) ||
    !paths.every(
      (path): path is string =>
        typeof path === "string" && validatedCatalogImagePath(path) === path,
    )
  ) {
    return new Set<string>();
  }
  return new Set(paths);
}

const AUTHORIZED_IMAGE_PATHS = buildAuthorizedPathSet(rawAuthorizedMedia);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (!LOCAL_HOSTNAMES.has(requestUrl.hostname.toLowerCase())) {
    return new Response("Catalog image not found", { status: 404 });
  }
  const imagePath = validatedCatalogImagePath(
    requestUrl.searchParams.get("path"),
  );
  if (!imagePath) {
    return new Response("Invalid catalog image source", { status: 400 });
  }
  if (!AUTHORIZED_IMAGE_PATHS.has(imagePath)) {
    return new Response("Catalog image not found", { status: 404 });
  }
  const source = new URL(imagePath, `https://${UPSTREAM_HOST}`);

  let upstream: Response;
  try {
    upstream = await fetch(source.href, {
      redirect: "manual",
      headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/*" },
    });
  } catch (error) {
    return new Response("Catalog image unavailable", {
      status: 502,
      headers: {
        "x-catalog-upstream-error":
          error instanceof Error ? error.name : "unknown",
      },
    });
  }
  if (!upstream.ok) {
    return new Response("Catalog image unavailable", {
      status: 502,
      headers: { "x-catalog-upstream-status": String(upstream.status) },
    });
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0] ?? "";
  const contentLength = Number(upstream.headers.get("content-length") ?? 0);
  if (
    !contentType.startsWith("image/") ||
    (contentLength > 0 && contentLength > MAX_IMAGE_BYTES)
  ) {
    await upstream.body?.cancel();
    return new Response("Unsupported catalog image", { status: 415 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
