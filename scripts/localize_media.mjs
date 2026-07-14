import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const INVENTORY_PATH = resolve(ROOT, "content/governance/media-inventory.json");
const INVENTORY_CSV_PATH = resolve(ROOT, "content/governance/media-inventory.csv");
const AUTHORIZATION_PATH = resolve(ROOT, "content/governance/media-authorization-batches.json");
const MIRROR_PATH = resolve(ROOT, "content/governance/media-mirrors.json");
const RUNTIME_PATH = resolve(ROOT, "content/governance/runtime-media.json");
const ASSIGNMENTS_PATH = resolve(ROOT, "content/governance/content-media-assignments.json");
const SOURCE_SNAPSHOT_PATH = resolve(ROOT, "content/governance/media-source-snapshot.json");
const PUBLISHED_PRODUCTS_PATH = resolve(ROOT, "content/governance/published-products.json");
const RUNTIME_PRODUCTS_PATH = resolve(ROOT, "content/runtime/published-products.json");
const PUBLIC_MEDIA = resolve(ROOT, "public/media");

const BATCH_ID = "oss-batch-2026-07-14-current-site-341";
const VERIFIED_AT = "2026-07-14";
const EXPECTED_RAW_COUNT = 341;
const EXPECTED_NORMALIZED_COUNT = 332;
const EXPECTED_RAW_HASH = "e8418df1c570b6b719c9d916edcfc36f47282c4146b13ba9f7a4818dbf705e7d";
const EXPECTED_NORMALIZED_HASH = "da18ce0b67bf50c7d8e549a3995592fe05311af1531e57567547677f450802eb";
const EXPECTED_CONTENT_HASH = "a7df33103c1a8c589215051ebd61b83c4f631c9aadbbe73d8391dfd184a17e71";
const TARGET_WIDTHS = [480, 960, 1600];
const PUBLISHABLE_SOURCE_TYPES = new Set(["repository_product_catalog", "repository_case_catalog"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function lineHash(values) {
  return sha256(`${values.join("\n")}\n`);
}

function normalizeUrl(value) {
  const url = new URL(value);
  if (url.hostname !== "bocang.oss-cn-shenzhen.aliyuncs.com") {
    throw new Error(`授权批次只允许企业 OSS 域名：${value}`);
  }
  url.protocol = "https:";
  url.hash = "";
  return url.href;
}

function csvCell(value) {
  const text = Array.isArray(value) || (value && typeof value === "object")
    ? JSON.stringify(value)
    : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function atomicWrite(path, bytes) {
  await mkdir(resolve(path, ".."), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchBytes(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(45_000),
        headers: { "user-agent": "JUHAO-owned-media-mirror/1.0" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error("empty response");
      return { bytes, responseType: response.headers.get("content-type") ?? "" };
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolvePromise) => setTimeout(resolvePromise, 350 * attempt));
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function sourceExtension(format, responseType, url) {
  const normalized = format === "jpeg" ? "jpg" : format;
  if (["jpg", "png", "gif", "webp", "avif"].includes(normalized)) return normalized;
  const responseFormat = responseType.split(";", 1)[0].split("/", 2)[1]?.replace("jpeg", "jpg");
  if (["jpg", "png", "gif", "webp", "avif"].includes(responseFormat)) return responseFormat;
  const urlFormat = extname(new URL(url).pathname).slice(1).toLowerCase().replace("jpeg", "jpg");
  if (["jpg", "png", "gif", "webp", "avif"].includes(urlFormat)) return urlFormat;
  throw new Error(`无法确定图片格式：${url}`);
}

function publicUrl(path) {
  return `/${path.slice(resolve(ROOT, "public").length + 1).replaceAll("\\", "/")}`;
}

async function buildObject(sourceUrl, previous) {
  let bytes;
  let responseType = previous?.source_mime ?? "";
  if (previous?.original_path) {
    const cachedPath = resolve(ROOT, "public", previous.original_path.replace(/^\//, ""));
    if (await exists(cachedPath)) {
      const cachedBytes = await readFile(cachedPath);
      if (sha256(cachedBytes) === previous.source_sha256) bytes = cachedBytes;
    }
  }
  if (!bytes) ({ bytes, responseType } = await fetchBytes(sourceUrl));
  const digest = sha256(bytes);
  const metadata = await sharp(bytes, { animated: true, failOn: "error" }).metadata();
  if (!metadata.width || !metadata.height || !metadata.format) throw new Error(`图片元数据不完整：${sourceUrl}`);

  const extension = sourceExtension(metadata.format, responseType, sourceUrl);
  const originalPath = resolve(PUBLIC_MEDIA, "source", `${digest}.${extension}`);
  if (!(await exists(originalPath))) await atomicWrite(originalPath, bytes);

  const orientedWidth = metadata.autoOrient?.width ?? metadata.width;
  const orientedHeight = metadata.autoOrient?.height ?? metadata.height;
  const widths = [...new Set(TARGET_WIDTHS.map((width) => Math.min(width, orientedWidth)))].sort((a, b) => a - b);
  const variants = [];
  for (const width of widths) {
    for (const format of ["avif", "webp"]) {
      const variantPath = resolve(PUBLIC_MEDIA, "derived", `${digest}-w${width}.${format}`);
      if (!(await exists(variantPath))) {
        let pipeline = sharp(bytes, { animated: false, failOn: "error" })
          .rotate()
          .resize({ width, withoutEnlargement: true, fit: "inside" });
        pipeline = format === "avif"
          ? pipeline.avif({ quality: 52, effort: 5, chromaSubsampling: "4:2:0" })
          : pipeline.webp({ quality: 82, effort: 5, smartSubsample: true });
        await atomicWrite(variantPath, await pipeline.toBuffer());
      }
      const variantMetadata = await sharp(variantPath).metadata();
      variants.push({
        format,
        width: variantMetadata.width,
        height: variantMetadata.height,
        path: publicUrl(variantPath),
        sha256: sha256(await readFile(variantPath)),
        bytes: (await stat(variantPath)).size,
      });
    }
  }

  return {
    media_id: `media-${digest.slice(0, 20)}`,
    authorization_batch_id: BATCH_ID,
    source_url: sourceUrl,
    source_sha256: digest,
    source_mime: `image/${extension === "jpg" ? "jpeg" : extension}`,
    original_path: publicUrl(originalPath),
    original_bytes: bytes.length,
    width: orientedWidth,
    height: orientedHeight,
    animated: metadata.pages ? metadata.pages > 1 : false,
    variants,
  };
}

async function mapConcurrent(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
      if ((index + 1) % 20 === 0 || index + 1 === values.length) {
        process.stdout.write(`\rmedia ${index + 1}/${values.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  process.stdout.write("\n");
  return output;
}

function runtimeRecord(mirror) {
  return {
    media_id: mirror.media_id,
    width: mirror.width,
    height: mirror.height,
    animated: mirror.animated,
    fallback: mirror.variants.filter((variant) => variant.format === "webp").at(-1)?.path ?? mirror.original_path,
    variants: mirror.variants.map(({ format, width, height, path }) => ({ format, width, height, path })),
  };
}

function contentMediaAssignments(rows) {
  const products = {};
  const cases = {};
  const routes = {};
  const add = (record, key, value) => {
    if (!record[key].includes(value)) record[key].push(value);
  };
  for (const row of rows.filter((item) => item.publish_allowed && item.media_id)) {
    const route = routes[row.content_route] ??= { primary_media_id: "", gallery_media_ids: [] };
    if (row.role === "product_primary" || row.role === "case_hero") {
      route.primary_media_id ||= row.media_id;
    } else {
      add(route, "gallery_media_ids", row.media_id);
    }
    if (row.source_type === "repository_product_catalog") {
      const product = products[row.source_id] ??= { primary_media_id: "", gallery_media_ids: [] };
      if (row.role === "product_primary") product.primary_media_id ||= row.media_id;
      if (row.role === "product_gallery") add(product, "gallery_media_ids", row.media_id);
    }
    if (row.source_type === "repository_case_catalog") {
      const study = cases[row.source_id] ??= { hero_media_id: "", evidence_media_ids: [] };
      if (row.role === "case_hero") study.hero_media_id ||= row.media_id;
      if (row.role === "case_evidence") add(study, "evidence_media_ids", row.media_id);
    }
  }
  return { products, cases, routes };
}

function sourceSnapshot(rows) {
  const fields = ["asset_url", "content_route", "role", "source_type", "source_id", "source_path", "width", "height", "alt"];
  return rows
    .filter((row) => /^https?:\/\//.test(row.asset_url))
    .map((row) => Object.fromEntries(fields.map((field) => [field, row[field] ?? ""])));
}

function runtimeProducts(products, mirrorsByUrl) {
  const mediaId = (value, sourceId) => {
    const mirror = mirrorsByUrl.get(normalizeUrl(value));
    if (!mirror) throw new Error(`产品 ${sourceId} 缺少冻结媒体：${value}`);
    return mirror.media_id;
  };
  return products.map((product) => ({
    source_id: String(product.source_id),
    title: product.title,
    model: product.model,
    topic: product.topic,
    topic_slug: product.topic_slug,
    review_status: product.review_status,
    sale_status: product.sale_status,
    fact_status: product.fact_status,
    parameter_completeness: product.parameter_completeness,
    image_authorization: "当前站点媒体批次授权已登记",
    department: product.department,
    publish_date: product.publish_date,
    seo_slug: product.seo_slug,
    category: product.category,
    parameters: product.parameters,
    primary_media_id: mediaId(product.primary_image, product.source_id),
    gallery_media_ids: product.gallery.map((value) => mediaId(value, product.source_id)),
    installation_notes: product.installation_notes,
  }));
}

async function main() {
  const clean = process.argv.includes("--clean");
  const previousMirrors = !clean && await exists(MIRROR_PATH)
    ? JSON.parse(await readFile(MIRROR_PATH, "utf8"))
    : [];
  const previousByUrl = new Map(previousMirrors.map((mirror) => [mirror.source_url, mirror]));
  if (clean) await rm(PUBLIC_MEDIA, { recursive: true, force: true });
  await mkdir(PUBLIC_MEDIA, { recursive: true });

  const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
  const remoteRows = inventory.filter((row) => /^https?:\/\//.test(row.asset_url));
  const rawUrls = [...new Set(remoteRows.map((row) => row.asset_url))].sort();
  const normalizedUrls = [...new Set(rawUrls.map(normalizeUrl))].sort();
  const rawHash = lineHash(rawUrls);
  const normalizedHash = lineHash(normalizedUrls);
  if (rawUrls.length !== EXPECTED_RAW_COUNT || rawHash !== EXPECTED_RAW_HASH) {
    throw new Error(`授权快照漂移：raw=${rawUrls.length}, sha256=${rawHash}`);
  }
  if (normalizedUrls.length !== EXPECTED_NORMALIZED_COUNT || normalizedHash !== EXPECTED_NORMALIZED_HASH) {
    throw new Error(`授权快照漂移：normalized=${normalizedUrls.length}, sha256=${normalizedHash}`);
  }

  const mirrors = await mapConcurrent(
    normalizedUrls,
    8,
    (sourceUrl) => buildObject(sourceUrl, previousByUrl.get(sourceUrl)),
  );
  const contentHash = lineHash(
    [...mirrors]
      .sort((left, right) => left.source_url.localeCompare(right.source_url))
      .map((mirror) => `${mirror.source_url}\t${mirror.source_sha256}`),
  );
  if (contentHash !== EXPECTED_CONTENT_HASH) {
    throw new Error(`媒体对象字节已变化；停止吸收并建立新批次：${contentHash}`);
  }
  const byNormalizedUrl = new Map(mirrors.map((mirror) => [mirror.source_url, mirror]));
  const selectedRawUrls = new Set(
    remoteRows.filter((row) => PUBLISHABLE_SOURCE_TYPES.has(row.source_type)).map((row) => row.asset_url),
  );
  if (selectedRawUrls.size !== 178) throw new Error(`页面显示集漂移：${selectedRawUrls.size}，预期 178`);

  const batch = [{
    batch_id: BATCH_ID,
    authorization_status: "approved",
    authorization_basis: "企业素材所有者在 2026-07-14 确认本批次当前站点 OSS 快照可用于官网；授权不自动证明内容事实。",
    authorized_at: VERIFIED_AT,
    scope: "仅覆盖本记录内 341 个原始 URL 及其规范化后的 332 个 HTTPS 对象；不覆盖整个 OSS、未来上传文件或未列入快照的素材。",
    source_domain: "bocang.oss-cn-shenzhen.aliyuncs.com",
    original_url_count: rawUrls.length,
    original_url_list_sha256: rawHash,
    normalized_object_count: normalizedUrls.length,
    normalized_url_list_sha256: normalizedHash,
    normalized_object_content_sha256: contentHash,
    page_selected_original_url_count: selectedRawUrls.size,
    source_urls: rawUrls,
  }];

  const enriched = inventory.map((row) => {
    if (!/^https?:\/\//.test(row.asset_url)) {
      return {
        ...row,
        media_id: row.media_id ?? "",
        authorization_batch_id: row.authorization_batch_id ?? "",
        normalized_source_url: "",
        source_sha256: row.sha256 || "",
        original_path: row.local_path ? `/${row.local_path.replace(/^public\//, "")}` : "",
        variants: row.variants ?? [],
      };
    }
    const normalizedSourceUrl = normalizeUrl(row.asset_url);
    const mirror = byNormalizedUrl.get(normalizedSourceUrl);
    if (!mirror) throw new Error(`镜像记录缺失：${row.asset_url}`);
    const publishAllowed = PUBLISHABLE_SOURCE_TYPES.has(row.source_type);
    return {
      ...row,
      local_path: `public${mirror.original_path}`,
      width: mirror.width,
      height: mirror.height,
      rights_status: "approved",
      rights_basis: `${BATCH_ID} 批次授权已匹配；内容事实与页面发布仍由独立门禁控制。`,
      sha256: mirror.source_sha256,
      last_verified_at: VERIFIED_AT,
      publish_allowed: publishAllowed,
      indexable: false,
      media_id: mirror.media_id,
      authorization_batch_id: BATCH_ID,
      normalized_source_url: normalizedSourceUrl,
      source_sha256: mirror.source_sha256,
      original_path: mirror.original_path,
      variants: mirror.variants,
    };
  });

  const selectedMediaIds = new Set(
    enriched.filter((row) => row.publish_allowed && row.media_id).map((row) => row.media_id),
  );
  const runtime = [...new Map(
    mirrors
      .filter((mirror) => selectedMediaIds.has(mirror.media_id))
      .map((mirror) => [mirror.media_id, runtimeRecord(mirror)]),
  ).values()].sort((a, b) => a.media_id.localeCompare(b.media_id));

  await writeJson(AUTHORIZATION_PATH, batch);
  await writeJson(MIRROR_PATH, mirrors);
  await writeJson(RUNTIME_PATH, runtime);
  await writeJson(ASSIGNMENTS_PATH, contentMediaAssignments(enriched));
  await writeJson(SOURCE_SNAPSHOT_PATH, sourceSnapshot(enriched));
  await mkdir(resolve(ROOT, "content/runtime"), { recursive: true });
  await writeJson(
    RUNTIME_PRODUCTS_PATH,
    runtimeProducts(JSON.parse(await readFile(PUBLISHED_PRODUCTS_PATH, "utf8")), byNormalizedUrl),
  );
  await writeJson(INVENTORY_PATH, enriched);
  const fields = [...new Set(enriched.flatMap((row) => Object.keys(row)))];
  const csv = [fields.join(","), ...enriched.map((row) => fields.map((field) => csvCell(row[field])).join(","))].join("\n");
  await writeFile(INVENTORY_CSV_PATH, `${csv}\n`, "utf8");

  const uniqueSourceHashes = new Set(mirrors.map((mirror) => mirror.source_sha256));
  const summary = {
    batch_id: BATCH_ID,
    original_urls: rawUrls.length,
    normalized_objects: mirrors.length,
    unique_source_hashes: uniqueSourceHashes.size,
    selected_original_urls: selectedRawUrls.size,
    selected_runtime_media: runtime.length,
    inventory_references: enriched.filter((row) => /^https?:\/\//.test(row.asset_url)).length,
    generated_variants: mirrors.reduce((total, mirror) => total + mirror.variants.length, 0),
    animated_sources: mirrors.filter((mirror) => mirror.animated).length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

await main();
