"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./CatalogLabSummaryDetail.module.css";

type ShardDescriptor = {
  file: string;
  shard_number: number;
  family_count: number;
  first_family_id: string;
  last_family_id: string;
  bytes: number;
  sha256: string;
};

type PrivateManifest = {
  family_count: number;
  summary_detail_family_count: number;
  family_set_sha256: string;
  shards: ShardDescriptor[];
};

type SummaryVariantReference = {
  source_key: string;
  source_id: string;
  display_id: string;
  model_label: string | null;
  model_state: string;
};

type SummaryCardSpec = {
  key: string;
  label: string;
  values: string[];
  evidence: string;
};

type SummaryFamily = {
  family_id: string;
  title: string;
  category: string;
  source_categories: string[];
  category_state: string;
  member_count: number;
  grouping_status: string;
  review_state: string;
  detail_state: "safe_index_summary";
  detail_ref: string;
  model_label: string | null;
  model_state: string;
  series_label: string | null;
  series_state: string;
  canonical_source_id: string;
  planned_canonical_route: string | null;
  route_plan_state: string;
  route_plan_evidence: string;
  representative: {
    source_key: string;
    display_id: string;
    title: string;
  };
  variant_refs: SummaryVariantReference[];
  card_specs: SummaryCardSpec[];
  quality_flags: string[];
};

type LoadState =
  | { requestedFamilyId: string; status: "loading" }
  | { requestedFamilyId: string; status: "ready"; family: SummaryFamily }
  | { requestedFamilyId: string; status: "unavailable" }
  | { requestedFamilyId: string; status: "error" };

const familyIdPattern = /^family-[a-f0-9]{12}$/;
const shardFilePattern = /^index-\d{4}\.json$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

const groupingLabels: Record<string, string> = {
  auto_merged_shared_reference_image_set: "完整参考图一致",
  singleton_unreviewed: "独立来源记录",
  human_approved_recategorize: "审核分类修正已应用",
  human_approved_exclusion: "审核排除已应用",
  human_approved_split: "审核拆分已应用",
  human_approved_merge: "审核合并已应用",
};

const reviewLabels: Record<string, string> = {
  private_unreleased: "私有审核中",
  pending_family_review: "产品族关系待复核",
  approved_and_applied: "审核已通过并应用",
};

const routeLabels: Record<string, string> = {
  pending_category_selection: "主分类待人工确认",
  pending_topic_assignment: "主题分类待人工确认",
  existing_route_preserved: "沿用已存在的正式路径",
};

const qualityLabels: Record<string, string> = {
  attributes_missing: "结构化参数待补",
  detail_images_missing: "详情图待授权",
  primary_image_missing: "主图待授权",
  undefined_spec_codes_normalized_to_null: "来源规格编号待复核",
  volume_header_typo_normalized: "来源体积表头已归一",
};

function groupingLabel(family: SummaryFamily) {
  const label = groupingLabels[family.grouping_status] ?? family.grouping_status;
  if (family.review_state !== "approved_and_applied") return label;
  if (
    family.grouping_status === "auto_merged_shared_reference_image_set" ||
    family.grouping_status === "singleton_unreviewed"
  ) {
    return `${label}，审核已通过`;
  }
  return label;
}

class SummaryLoadError extends Error {
  constructor(readonly kind: "unavailable" | "invalid") {
    super(kind);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SummaryLoadError("invalid");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new SummaryLoadError("invalid");
  }
  return value;
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}

function positiveInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new SummaryLoadError("invalid");
  }
  return Number(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) throw new SummaryLoadError("invalid");
  return value.map(text);
}

function verifyPrivateLocks(value: Record<string, unknown>) {
  if (
    value.visibility !== "private_noindex" ||
    value.robots_index !== false ||
    value.sitemap_included !== false ||
    value.alias_activation !== false
  ) {
    throw new SummaryLoadError("invalid");
  }
}

function readManifest(value: unknown): PrivateManifest {
  const source = record(value);
  verifyPrivateLocks(source);
  if (
    source.schema_version !== 1 ||
    source.publication_state !== "private_runtime_not_public_release" ||
    source.formal_routes_activated !== false ||
    source.total_source_count !== 1920 ||
    source.eligible_source_count !== 1913 ||
    source.excluded_source_count !== 7 ||
    source.source_count !== 1913 ||
    source.family_count !== 1208 ||
    source.rich_detail_family_count !== 120 ||
    source.summary_detail_family_count !== 1088 ||
    source.shard_count !== 13
  ) {
    throw new SummaryLoadError("invalid");
  }

  const familyCount = positiveInteger(source.family_count);
  const summaryDetailFamilyCount = positiveInteger(
    source.summary_detail_family_count,
  );
  const familySetSha256 = text(source.family_set_sha256);
  if (
    !sha256Pattern.test(familySetSha256) ||
    !Array.isArray(source.shards) ||
    source.shards.length !== source.shard_count
  ) {
    throw new SummaryLoadError("invalid");
  }

  let previousLastFamilyId = "";
  const shards = source.shards.map((value, index) => {
    const shard = record(value);
    const descriptor: ShardDescriptor = {
      file: text(shard.file),
      shard_number: index + 1,
      family_count: positiveInteger(shard.family_count),
      first_family_id: text(shard.first_family_id),
      last_family_id: text(shard.last_family_id),
      bytes: positiveInteger(shard.bytes),
      sha256: text(shard.sha256),
    };
    if (
      !shardFilePattern.test(descriptor.file) ||
      !familyIdPattern.test(descriptor.first_family_id) ||
      !familyIdPattern.test(descriptor.last_family_id) ||
      !sha256Pattern.test(descriptor.sha256) ||
      descriptor.first_family_id > descriptor.last_family_id ||
      (previousLastFamilyId &&
        descriptor.first_family_id <= previousLastFamilyId)
    ) {
      throw new SummaryLoadError("invalid");
    }
    previousLastFamilyId = descriptor.last_family_id;
    return descriptor;
  });

  if (
    shards.reduce((total, shard) => total + shard.family_count, 0) !==
      familyCount ||
    summaryDetailFamilyCount >= familyCount
  ) {
    throw new SummaryLoadError("invalid");
  }

  return {
    family_count: familyCount,
    summary_detail_family_count: summaryDetailFamilyCount,
    family_set_sha256: familySetSha256,
    shards,
  };
}

function readVariantReference(value: unknown): SummaryVariantReference {
  const source = record(value);
  return {
    source_key: text(source.source_key),
    source_id: text(source.source_id),
    display_id: text(source.display_id),
    model_label: nullableText(source.model_label),
    model_state: text(source.model_state),
  };
}

function readCardSpec(value: unknown): SummaryCardSpec {
  const source = record(value);
  const values = stringList(source.values);
  if (values.length === 0) throw new SummaryLoadError("invalid");
  return {
    key: text(source.key),
    label: text(source.label),
    values,
    evidence: text(source.evidence),
  };
}

function readSummaryFamily(
  value: unknown,
  requestedFamilyId: string,
): SummaryFamily {
  const source = record(value);
  const representative = record(source.representative);
  const memberCount = positiveInteger(source.member_count);
  const category = text(source.category);
  const sourceCategories = stringList(source.source_categories);
  const categoryState = text(source.category_state);
  const plannedCanonicalRoute = nullableText(source.planned_canonical_route);
  const routePlanState = text(source.route_plan_state);
  if (
    source.family_id !== requestedFamilyId ||
    source.detail_state !== "safe_index_summary" ||
    source.detail_ref !== `/catalog-lab/${requestedFamilyId}` ||
    ![
      "source_category_unambiguous",
      "pending_owner_selection",
    ].includes(categoryState) ||
    ![
      "pending_category_selection",
      "pending_topic_assignment",
      "existing_route_preserved",
    ].includes(routePlanState) ||
    !Array.isArray(source.variant_refs) ||
    !Array.isArray(source.card_specs) ||
    source.card_specs.length > 3
  ) {
    throw new SummaryLoadError("invalid");
  }
  if (
    (categoryState === "source_category_unambiguous" &&
      (sourceCategories.length !== 1 || category !== sourceCategories[0])) ||
    (categoryState === "pending_owner_selection" &&
      (sourceCategories.length < 2 ||
        category !== "待复核" ||
        plannedCanonicalRoute !== null ||
        routePlanState !== "pending_category_selection"))
  ) {
    throw new SummaryLoadError("invalid");
  }

  const variantReferences = source.variant_refs.map(readVariantReference);
  if (variantReferences.length !== memberCount) {
    throw new SummaryLoadError("invalid");
  }

  return {
    family_id: requestedFamilyId,
    title: text(source.title),
    category,
    source_categories: sourceCategories,
    category_state: categoryState,
    member_count: memberCount,
    grouping_status: text(source.grouping_status),
    review_state: text(source.review_state),
    detail_state: "safe_index_summary",
    detail_ref: text(source.detail_ref),
    model_label: nullableText(source.model_label),
    model_state: text(source.model_state),
    series_label: nullableText(source.series_label),
    series_state: text(source.series_state),
    canonical_source_id: text(source.canonical_source_id),
    planned_canonical_route: plannedCanonicalRoute,
    route_plan_state: routePlanState,
    route_plan_evidence: text(source.route_plan_evidence),
    representative: {
      source_key: text(representative.source_key),
      display_id: text(representative.display_id),
      title: text(representative.title),
    },
    variant_refs: variantReferences,
    card_specs: source.card_specs.map(readCardSpec),
    quality_flags: stringList(source.quality_flags),
  };
}

async function requestPrivateText(pathname: string, signal: AbortSignal) {
  const response = await fetch(pathname, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (response.status === 404) throw new SummaryLoadError("unavailable");
  if (!response.ok) throw new SummaryLoadError("invalid");
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new SummaryLoadError("invalid");
  }
  return response.text();
}

async function sha256(value: Uint8Array) {
  if (!globalThis.crypto?.subtle) throw new SummaryLoadError("invalid");
  const digestInput = new ArrayBuffer(value.byteLength);
  new Uint8Array(digestInput).set(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", digestInput);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function loadSummaryFamily(familyId: string, signal: AbortSignal) {
  if (!familyIdPattern.test(familyId)) {
    throw new SummaryLoadError("unavailable");
  }

  const manifestText = await requestPrivateText(
    "/catalog-lab/_data/manifest.json",
    signal,
  );
  const manifest = readManifest(JSON.parse(manifestText));
  const descriptor = manifest.shards.find(
    (shard) =>
      familyId >= shard.first_family_id && familyId <= shard.last_family_id,
  );
  if (!descriptor) throw new SummaryLoadError("unavailable");

  const shardText = await requestPrivateText(
    `/catalog-lab/_data/${descriptor.file}`,
    signal,
  );
  const bytes = new TextEncoder().encode(shardText);
  if (
    bytes.byteLength !== descriptor.bytes ||
    (await sha256(bytes)) !== descriptor.sha256
  ) {
    throw new SummaryLoadError("invalid");
  }

  const shard = record(JSON.parse(shardText));
  verifyPrivateLocks(shard);
  const shardItems = Array.isArray(shard.items) ? shard.items : [];
  const shardFamilyIds = shardItems.map((value) =>
    text(record(value).family_id),
  );
  if (
    shard.schema_version !== 1 ||
    shard.family_set_sha256 !== manifest.family_set_sha256 ||
    shard.shard_number !== descriptor.shard_number ||
    positiveInteger(shard.family_count) !== descriptor.family_count ||
    shardItems.length !== descriptor.family_count ||
    shardFamilyIds[0] !== descriptor.first_family_id ||
    shardFamilyIds.at(-1) !== descriptor.last_family_id ||
    shardFamilyIds.some(
      (familyId, index) =>
        !familyIdPattern.test(familyId) ||
        (index > 0 && shardFamilyIds[index - 1] >= familyId),
    )
  ) {
    throw new SummaryLoadError("invalid");
  }

  const matchedFamily = shardItems.find(
    (value) => record(value).family_id === familyId,
  );
  if (!matchedFamily) throw new SummaryLoadError("unavailable");
  return readSummaryFamily(matchedFamily, familyId);
}

function StatePage({
  state,
  retry,
  returnHref,
}: {
  state: "loading" | "unavailable" | "error";
  retry: () => void;
  returnHref: string;
}) {
  const content = {
    loading: {
      eyebrow: "VERIFYING PRIVATE INDEX",
      title: "正在核对安全摘要",
      body: "定位产品族所在分片，并校验字节数与内容指纹。",
    },
    unavailable: {
      eyebrow: "SUMMARY UNAVAILABLE",
      title: "未找到可用的安全摘要",
      body: "该产品族不在当前冻结索引中，或本地私有数据入口没有开放。",
    },
    error: {
      eyebrow: "VERIFICATION STOPPED",
      title: "摘要校验未通过",
      body: "页面没有使用未验证的数据。请重试，或返回全量审核目录。",
    },
  }[state];

  return (
    <main
      id="main-content"
      className={`catalogLab-page ${styles.page} ${styles.statePage}`}
      data-summary-state={state}
      aria-busy={state === "loading"}
      tabIndex={-1}
    >
      <section className={styles.statePanel} aria-live="polite">
        <p>{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <span>{content.body}</span>
        {state === "loading" ? (
          <div className={styles.progress} aria-hidden="true" />
        ) : (
          <div className={styles.stateActions}>
            {state === "error" && (
              <button type="button" onClick={retry}>
                重新校验
              </button>
            )}
            <Link href={returnHref}>返回全量审核目录</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryContent({
  family,
  returnHref,
}: {
  family: SummaryFamily;
  returnHref: string;
}) {
  return (
    <main
      id="main-content"
      className={`catalogLab-page ${styles.page}`}
      data-summary-state="ready"
      tabIndex={-1}
    >
      <section className={styles.hero} data-header-tone="dark">
        <div className={styles.heroCopy}>
          <nav aria-label="面包屑">
            <Link href="/">首页</Link>
            <span>/</span>
            <Link href={returnHref}>全量审核目录</Link>
          </nav>
          <p className={styles.eyebrow}>PRIVATE INDEX / SAFE SUMMARY</p>
          <div className={styles.titleRow}>
            <h1>{family.title}</h1>
            <span>索引级摘要</span>
          </div>
          <p className={styles.lead}>
            此页面只呈现已进入冻结索引的安全字段。没有加载完整商品正文、媒体或可售规格。
          </p>
        </div>
        <dl className={styles.identity} aria-label="产品族身份信息">
          <div>
            <dt>正式主分类</dt>
            <dd>
              {family.category_state === "pending_owner_selection"
                ? "待人工确认"
                : family.category}
            </dd>
          </div>
          <div>
            <dt>来源型号</dt>
            <dd>{family.model_label ?? "待人工确认"}</dd>
          </div>
          <div>
            <dt>代表来源编号</dt>
            <dd>{family.canonical_source_id}</dd>
          </div>
          <div>
            <dt>来源记录数</dt>
            <dd>{family.member_count}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.evidence} aria-labelledby="safe-fields-title">
        <header>
          <p>VERIFIED SAFE FIELDS</p>
          <h2 id="safe-fields-title">来源字段摘要</h2>
          <span>下列字段来自冻结来源记录，经运行时索引清洗后展示。</span>
        </header>
        {family.card_specs.length > 0 ? (
          <dl className={styles.specGrid}>
            {family.card_specs.map((spec) => (
              <div key={spec.key}>
                <dt>{spec.label}</dt>
                <dd>{spec.values.join(" · ")}</dd>
                <small>标准化来源属性</small>
              </div>
            ))}
          </dl>
        ) : (
          <div className={styles.emptyEvidence}>
            <strong>没有足够的结构化安全参数</strong>
            <span>字段保持为空，等待来源补全与人工审核。</span>
          </div>
        )}
      </section>

      <section
        className={styles.sources}
        aria-labelledby="source-records-title"
      >
        <header>
          <p>SOURCE RECORD INDEX</p>
          <h2 id="source-records-title">来源记录索引</h2>
          <span>
            这些记录只证明当前产品族的来源覆盖，不代表可选、可售或参数等价的产品变体。
          </span>
        </header>
        <ol>
          {family.variant_refs.map((source) => (
            <li key={source.source_key}>
              <span>#{source.display_id}</span>
              <strong>{source.model_label ?? "型号待审核"}</strong>
              <small>{source.source_key}</small>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={styles.governance}
        aria-labelledby="review-state-title"
      >
        <header>
          <p>RELEASE BOUNDARY</p>
          <h2 id="review-state-title">审核与发布边界</h2>
        </header>
        <dl>
          <div>
            <dt>归族状态</dt>
            <dd>{groupingLabel(family)}</dd>
          </div>
          <div>
            <dt>来源分类</dt>
            <dd>{family.source_categories.join(" / ")}</dd>
          </div>
          <div>
            <dt>正式主分类</dt>
            <dd>
              {family.category_state === "pending_owner_selection"
                ? "待人工确认"
                : family.category}
            </dd>
          </div>
          <div>
            <dt>审核状态</dt>
            <dd>{reviewLabels[family.review_state] ?? family.review_state}</dd>
          </div>
          <div>
            <dt>正式路径</dt>
            <dd>
              {routeLabels[family.route_plan_state] ?? family.route_plan_state}
            </dd>
          </div>
        </dl>
        {family.quality_flags.length > 0 && (
          <ul aria-label="数据质量提示">
            {family.quality_flags.map((flag) => (
              <li key={flag}>{qualityLabels[flag] ?? flag}</li>
            ))}
          </ul>
        )}
        <div className={styles.boundaryNote}>
          <strong>此摘要不是正式产品页</strong>
          <span>
            正式主题分类、产品族关系、媒体授权与商业字段仍需人工签核；当前页面保持
            noindex。
          </span>
        </div>
        <Link className={styles.returnLink} href={returnHref}>
          返回全量审核目录
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}

export function CatalogLabSummaryDetail({
  familyId,
  returnHref,
}: {
  familyId: string;
  returnHref: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>(() => ({
    requestedFamilyId: familyId,
    status: "loading",
  }));

  useEffect(() => {
    const controller = new AbortController();
    loadSummaryFamily(familyId, controller.signal)
      .then((family) => {
        if (!controller.signal.aborted) {
          setState({ requestedFamilyId: familyId, status: "ready", family });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          requestedFamilyId: familyId,
          status:
            error instanceof SummaryLoadError && error.kind === "unavailable"
              ? "unavailable"
              : "error",
        });
      });
    return () => controller.abort();
  }, [attempt, familyId]);

  const visibleState: LoadState =
    state.requestedFamilyId === familyId
      ? state
      : { requestedFamilyId: familyId, status: "loading" };
  if (visibleState.status === "ready") {
    return (
      <SummaryContent family={visibleState.family} returnHref={returnHref} />
    );
  }
  return (
    <StatePage
      state={visibleState.status}
      returnHref={returnHref}
      retry={() => {
        setState({ requestedFamilyId: familyId, status: "loading" });
        setAttempt((current) => current + 1);
      }}
    />
  );
}
