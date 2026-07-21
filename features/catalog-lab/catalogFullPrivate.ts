import type { CatalogV2FamilyIndex } from "@/content/catalog-v2.generated";
import { validatedCatalogImagePath } from "@/lib/catalog-image";

const DATA_ROOT = "/catalog-lab/_data";
const FAMILY_ID_PATTERN = /^family-[a-f0-9]{12}$/;
const SHARD_FILE_PATTERN = /^index-\d{4}\.json$/;

type ShardDescriptor = {
  file: string;
  family_count: number;
  first_family_id: string;
  last_family_id: string;
  bytes: number;
  sha256: string;
};

type FullCatalogManifest = {
  schema_version: number;
  visibility: string;
  publication_state: string;
  robots_index: boolean;
  sitemap_included: boolean;
  formal_routes_activated: boolean;
  alias_activation: boolean;
  total_source_count: number;
  eligible_source_count: number;
  excluded_source_count: number;
  source_count: number;
  family_count: number;
  rich_detail_family_count: number;
  summary_detail_family_count: number;
  shard_count: number;
  family_set_sha256: string;
  shards: ShardDescriptor[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeRuntimeText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 500 &&
    !/[\u0000-\u001f\u007f<>]/.test(value) &&
    !/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i.test(value)
  );
}

function isNullableSafeRuntimeText(value: unknown): value is string | null {
  return value === null || isSafeRuntimeText(value);
}

function isSafeStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isSafeRuntimeText);
}

function hasSafeFacetLists(value: Record<string, unknown>) {
  return Object.values(value).every(isSafeStringList);
}

function assertPrivateLocks(value: Record<string, unknown>) {
  if (
    value.visibility !== "private_noindex" ||
    value.robots_index !== false ||
    value.sitemap_included !== false ||
    value.alias_activation !== false
  ) {
    throw new Error("私有目录安全锁不完整");
  }
}

function parseManifest(value: unknown): FullCatalogManifest {
  if (!isRecord(value)) throw new Error("全量目录清单格式无效");
  assertPrivateLocks(value);
  if (
    value.schema_version !== 1 ||
    value.publication_state !== "private_runtime_not_public_release" ||
    value.formal_routes_activated !== false ||
    value.total_source_count !== 1920 ||
    value.eligible_source_count !== 1913 ||
    value.excluded_source_count !== 7 ||
    value.source_count !== 1913 ||
    value.family_count !== 1208 ||
    value.rich_detail_family_count !== 120 ||
    value.summary_detail_family_count !== 1088 ||
    value.shard_count !== 13 ||
    typeof value.family_set_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.family_set_sha256) ||
    !Array.isArray(value.shards) ||
    value.shards.length !== value.shard_count
  ) {
    throw new Error("全量目录清单与冻结范围不一致");
  }

  const files = new Set<string>();
  let familyCount = 0;
  let previousLastFamilyId = "";
  const shards = value.shards.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.file !== "string" ||
      !SHARD_FILE_PATTERN.test(entry.file) ||
      files.has(entry.file) ||
      !Number.isInteger(entry.family_count) ||
      Number(entry.family_count) < 1 ||
      typeof entry.first_family_id !== "string" ||
      !FAMILY_ID_PATTERN.test(entry.first_family_id) ||
      typeof entry.last_family_id !== "string" ||
      !FAMILY_ID_PATTERN.test(entry.last_family_id) ||
      entry.first_family_id > entry.last_family_id ||
      (previousLastFamilyId !== "" &&
        entry.first_family_id <= previousLastFamilyId) ||
      !Number.isInteger(entry.bytes) ||
      Number(entry.bytes) < 1 ||
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    ) {
      throw new Error("全量目录分片描述无效");
    }
    files.add(entry.file);
    previousLastFamilyId = entry.last_family_id;
    familyCount += Number(entry.family_count);
    return entry as ShardDescriptor;
  });
  if (familyCount !== value.family_count) {
    throw new Error("全量目录产品族计数不守恒");
  }
  return { ...value, shards } as FullCatalogManifest;
}

async function sha256Hex(bytes: ArrayBuffer) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("当前浏览器无法校验目录完整性");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchBytes(path: string, signal: AbortSignal) {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`私有目录请求失败（${response.status}）`);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("私有目录响应类型无效");
  }
  return response.arrayBuffer();
}

function parseJson(bytes: ArrayBuffer) {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error("私有目录数据不是有效 JSON");
  }
}

function validateFamily(item: unknown): item is CatalogV2FamilyIndex {
  if (
    !isRecord(item) ||
    !FAMILY_ID_PATTERN.test(String(item.family_id ?? ""))
  ) {
    return false;
  }
  const representative = isRecord(item.representative)
    ? item.representative
    : null;
  const primaryImage = representative?.primary_image;
  if (
    !isSafeRuntimeText(item.title) ||
    !isSafeRuntimeText(item.category) ||
    !Number.isInteger(item.member_count) ||
    Number(item.member_count) < 1 ||
    ![
      "auto_merged_shared_reference_image_set",
      "singleton_unreviewed",
      "human_approved_recategorize",
      "human_approved_exclusion",
      "human_approved_split",
      "human_approved_merge",
    ].includes(
      String(item.grouping_status),
    ) ||
    !isSafeStringList(item.source_categories) ||
    item.source_categories.length < 1 ||
    ![
      "source_category_unambiguous",
      "pending_owner_selection",
    ].includes(String(item.category_state)) ||
    ![
      "pending_category_selection",
      "pending_topic_assignment",
      "existing_route_preserved",
    ].includes(String(item.route_plan_state)) ||
    !isSafeRuntimeText(item.route_plan_evidence) ||
    !isNullableSafeRuntimeText(item.planned_canonical_route) ||
    !["rich_private_preview", "safe_index_summary"].includes(
      String(item.detail_state),
    ) ||
    item.detail_ref !== `/catalog-lab/${String(item.family_id)}` ||
    !isNullableSafeRuntimeText(item.model_label) ||
    !representative ||
    !isSafeRuntimeText(representative.source_key) ||
    !isSafeRuntimeText(representative.display_id) ||
    !isSafeRuntimeText(representative.title) ||
    !(
      primaryImage === null ||
      (isSafeRuntimeText(primaryImage) &&
        validatedCatalogImagePath(primaryImage) === primaryImage)
    ) ||
    !Array.isArray(item.variant_refs) ||
    item.variant_refs.length !== item.member_count ||
    !Array.isArray(item.card_specs) ||
    item.card_specs.length > 3 ||
    !isRecord(item.facets) ||
    !hasSafeFacetLists(item.facets) ||
    !isSafeStringList(item.quality_flags)
  ) {
    return false;
  }
  if (
    item.category_state === "source_category_unambiguous" &&
    (item.source_categories.length !== 1 ||
      item.category !== item.source_categories[0])
  ) {
    return false;
  }
  if (
    item.category_state === "pending_owner_selection" &&
    (item.source_categories.length < 2 ||
      item.category !== "待复核" ||
      item.planned_canonical_route !== null ||
      item.route_plan_state !== "pending_category_selection")
  ) {
    return false;
  }
  return (
    item.variant_refs.every(
      (variant) =>
        isRecord(variant) &&
        isSafeRuntimeText(variant.source_key) &&
        isSafeRuntimeText(variant.source_id) &&
        isSafeRuntimeText(variant.display_id) &&
        isNullableSafeRuntimeText(variant.model_label) &&
        isSafeRuntimeText(variant.model_state),
    ) &&
    item.card_specs.every(
      (spec) =>
        isRecord(spec) &&
        isSafeRuntimeText(spec.key) &&
        isSafeRuntimeText(spec.label) &&
        isSafeStringList(spec.values) &&
        spec.values.length > 0 &&
        isSafeRuntimeText(spec.evidence),
    )
  );
}

function parseShard(
  value: unknown,
  descriptor: ShardDescriptor,
  shardNumber: number,
  familySetSha256: string,
) {
  if (!isRecord(value)) throw new Error("全量目录分片格式无效");
  assertPrivateLocks(value);
  if (
    value.schema_version !== 1 ||
    value.family_set_sha256 !== familySetSha256 ||
    value.shard_number !== shardNumber ||
    value.family_count !== descriptor.family_count ||
    !Array.isArray(value.items) ||
    value.items.length !== descriptor.family_count ||
    !value.items.every(validateFamily)
  ) {
    throw new Error("全量目录分片与清单不一致");
  }
  const items = value.items as CatalogV2FamilyIndex[];
  if (
    items[0]?.family_id !== descriptor.first_family_id ||
    items.at(-1)?.family_id !== descriptor.last_family_id ||
    items.some(
      (item, index) =>
        index > 0 && items[index - 1].family_id >= item.family_id,
    )
  ) {
    throw new Error("全量目录分片范围无效");
  }
  return items;
}

export async function loadFullPrivateCatalog(signal: AbortSignal) {
  const manifestBytes = await fetchBytes(`${DATA_ROOT}/manifest.json`, signal);
  const manifest = parseManifest(parseJson(manifestBytes));
  const shardItems = await Promise.all(
    manifest.shards.map(async (descriptor, index) => {
      const bytes = await fetchBytes(`${DATA_ROOT}/${descriptor.file}`, signal);
      if (bytes.byteLength !== descriptor.bytes) {
        throw new Error(`目录分片大小校验失败（${descriptor.file}）`);
      }
      if ((await sha256Hex(bytes)) !== descriptor.sha256) {
        throw new Error(`目录分片哈希校验失败（${descriptor.file}）`);
      }
      return parseShard(
        parseJson(bytes),
        descriptor,
        index + 1,
        manifest.family_set_sha256,
      );
    }),
  );
  const items = shardItems.flat();
  const familyIds = new Set(items.map((item) => item.family_id));
  const sourceKeys = new Set(
    items.flatMap((item) =>
      item.variant_refs.map((variant) => variant.source_key),
    ),
  );
  const variantCount = items.reduce(
    (total, item) => total + item.variant_refs.length,
    0,
  );
  const richCount = items.filter(
    (item) => item.detail_state === "rich_private_preview",
  ).length;
  const summaryCount = items.filter(
    (item) => item.detail_state === "safe_index_summary",
  ).length;
  if (
    items.length !== manifest.family_count ||
    familyIds.size !== manifest.family_count ||
    sourceKeys.size !== manifest.eligible_source_count ||
    variantCount !== manifest.eligible_source_count ||
    richCount !== manifest.rich_detail_family_count ||
    summaryCount !== manifest.summary_detail_family_count
  ) {
    throw new Error("全量目录集合完整性校验失败");
  }
  return { items, manifest };
}
