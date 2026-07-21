"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { appendDecisionRevisions } from "./catalogDecisionLedger";
import styles from "./CatalogReviewWorkbench.module.css";

type ReviewKind =
  | "confirm_auto_family"
  | "merge_candidate"
  | "category_anomaly";

type ReviewMachineState =
  | "pending"
  | "approved"
  | "approved_pending_application";

type ReviewMember = {
  source_key: string;
  display_id: string;
  title: string;
  category: string;
  current_family_id: string;
  in_active_batch: boolean;
  source_path: string;
  quality_flags: string[];
  dimensions: Record<string, { value: string; evidence: string }>;
};

type ReviewItem = {
  review_id: string;
  review_kind: ReviewKind;
  candidate_sha256: string;
  machine_state: ReviewMachineState;
  title: string;
  category: string;
  model_signature: string;
  evidence_type: string;
  suggested_action: string;
  allowed_actions: string[];
  member_count: number;
  members: ReviewMember[];
  affected_family_ids: string[];
  active_batch_family_ids: string[];
  related_review_ids: string[];
  release_impact: string;
  active_decision_id: string | null;
};

export type CatalogReviewWorkbenchData = {
  schema_version: number;
  snapshot_date: string;
  source_snapshot_sha256: string;
  derived_family_model_sha256: string;
  batch_id: string;
  active_batch_family_set_sha256: string;
  decision_ledger_sha256: string;
  visibility: string;
  verified_categories: string[];
  allowed_dispositions: string[];
  counts: {
    total: number;
    pending: number;
    approved: number;
    approved_pending_application: number;
    confirm_auto_family: number;
    merge_candidate: number;
    category_anomaly: number;
    shared_member_source_keys: number;
    linked_review_clusters: number;
  };
  review_items: ReviewItem[];
};

type PilotCandidate = {
  candidate_rank: number;
  family_id: string;
  title: string;
  category: string;
  member_count: number;
  representative: {
    display_id: string;
  };
  media: {
    display_media_count: number;
    authorized_media_count: number;
    unauthorized_media_count: number;
    fully_authorized: boolean;
  };
  governance: {
    unresolved_review_ids: string[];
    unresolved_category_review_ids: string[];
    family_id_stability_requires_actions: Record<string, string>;
  };
  legacy_alias_count: number;
  release_ready: boolean;
  candidate_state: string;
};

export type CatalogPilotCandidates = {
  status: string;
  counts: {
    active_sample_families: number;
    authorized_primary_candidates: number;
    fully_media_authorized_candidates: number;
    decision_clear_candidates: number;
    release_ready_candidates: number;
    categories_covered: number;
    legacy_aliases_covered: number;
  };
  candidates: PilotCandidate[];
};

type ExistingDecision = {
  decision_id: string;
  review_id: string;
  candidate_sha256: string;
  status: "draft" | "approved";
  action: string;
  reviewer?: string;
  reviewed_at?: string;
  rationale?: string;
  supersedes_decision_id?: string;
  split_groups?: string[][];
  target_category?: string;
  disposition?: string;
};

export type CatalogDecisionLedger = {
  schema_version: number;
  ledger_id: string;
  source_snapshot_sha256: string;
  ownership: string;
  candidate_source: string;
  revision_policy: string;
  allowed_statuses: string[];
  allowed_actions: Record<string, string[]>;
  decisions: ExistingDecision[];
};

type ReviewDraft = {
  action: string;
  rationale: string;
  targetCategory: string;
  disposition: string;
  splitAssignments: Record<string, string>;
};

type ReviewDrafts = Record<string, ReviewDraft>;

const kindLabels: Record<ReviewKind, string> = {
  category_anomaly: "分类异常",
  confirm_auto_family: "自动族确认",
  merge_candidate: "合并候选",
};

const actionLabels: Record<string, string> = {
  confirm_family: "确认当前产品族",
  split_family: "拆分为多个产品族",
  merge_candidate: "合并这些候选",
  keep_separate: "保持彼此独立",
  recategorize: "修正商品分类",
  exclude_with_disposition: "排除并记录去向",
};

const evidenceLabels: Record<string, string> = {
  exact_complete_reference_image_set: "完整详情参考图集合完全一致",
  normalized_model_signature_only: "仅型号签名相似，不能自动合并",
  literal_source_category_anomaly: "来源分类字段原样写成“类别”",
};

const dispositionLabels: Record<string, string> = {
  duplicate_source_governance_only: "重复来源，仅保留治理记录",
  insufficient_product_evidence_hold: "资料不足，暂缓进入目录",
  non_lighting_governance_only: "非照明产品，仅保留治理记录",
  out_of_scope_product_hold: "超出当前网站范围，暂缓处理",
};

const defaultDraft = (): ReviewDraft => ({
  action: "",
  rationale: "",
  targetCategory: "",
  disposition: "",
  splitAssignments: {},
});

function today() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function compactHash(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function searchableReview(item: ReviewItem) {
  return [
    item.review_id,
    item.title,
    item.category,
    item.model_signature,
    ...item.members.flatMap((member) => [
      member.source_key,
      member.display_id,
      member.title,
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase("zh-CN");
}

function groupedMembers(item: ReviewItem, draft: ReviewDraft) {
  const groups = new Map<string, string[]>();
  for (const member of item.members) {
    const group = draft.splitAssignments[member.source_key] ?? "1";
    groups.set(group, [...(groups.get(group) ?? []), member.source_key]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, memberKeys]) => memberKeys);
}

function uniqueDecisionId(
  reviewId: string,
  existingIds: Set<string>,
) {
  const base = `decision-${reviewId}`.slice(0, 68);
  let candidate = base;
  let revision = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base.slice(0, 68 - String(revision).length)}-${revision}`;
    revision += 1;
  }
  existingIds.add(candidate);
  return candidate;
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CatalogReviewWorkbench({
  workbench,
  pilot,
  decisionLedger,
}: {
  workbench: CatalogReviewWorkbenchData;
  pilot: CatalogPilotCandidates;
  decisionLedger: CatalogDecisionLedger;
}) {
  const storageKey = `catalog-review:${workbench.source_snapshot_sha256}`;
  const [drafts, setDrafts] = useState<ReviewDrafts>({});
  const [draftsHydrated, setDraftsHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ReviewKind | "all">("all");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState<ReviewMachineState | "all">("pending");
  const [exportStatus, setExportStatus] = useState<"draft" | "approved">(
    "draft",
  );
  const [reviewer, setReviewer] = useState("");
  const [reviewedAt, setReviewedAt] = useState(today);
  const [message, setMessage] = useState(
    "选择审核动作后，可下载或复制完整决策账本。",
  );
  const [draftSaveState, setDraftSaveState] = useState<
    "loading" | "saving" | "saved" | "error"
  >("loading");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const exportStatusRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) setDrafts(JSON.parse(stored) as ReviewDrafts);
      } catch {
        setMessage("浏览器草稿无法读取，但仍可继续填写并导出。");
        setDraftSaveState("error");
      }
      setDraftsHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!draftsHydrated) return;
    let nextState: "saved" | "error" = "saved";
    let nextMessage = "";
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(drafts));
    } catch {
      nextState = "error";
      nextMessage = "浏览器草稿无法保存，请尽快下载决策账本。";
    }
    const timer = window.setTimeout(() => {
      setDraftSaveState(nextState);
      if (nextMessage) setMessage(nextMessage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drafts, draftsHydrated, storageKey]);

  const categories = useMemo(
    () =>
      [...new Set(workbench.review_items.map((item) => item.category))].sort(
        (a, b) => a.localeCompare(b, "zh-CN"),
      ),
    [workbench.review_items],
  );

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    return workbench.review_items.filter((item) => {
      if (kind !== "all" && item.review_kind !== kind) return false;
      if (category !== "all" && item.category !== category) return false;
      if (state !== "all" && item.machine_state !== state) return false;
      return !needle || searchableReview(item).includes(needle);
    });
  }, [category, kind, query, state, workbench.review_items]);

  const selectedItems = workbench.review_items.filter(
    (item) => drafts[item.review_id]?.action,
  );

  function updateDraft(
    reviewId: string,
    patch: Partial<ReviewDraft>,
  ) {
    setDraftSaveState("saving");
    setDrafts((current) => ({
      ...current,
      [reviewId]: {
        ...(current[reviewId] ?? defaultDraft()),
        ...patch,
      },
    }));
  }

  function selectAction(item: ReviewItem, action: string) {
    const current = drafts[item.review_id] ?? defaultDraft();
    const splitAssignments =
      action === "split_family"
        ? Object.fromEntries(
            item.members.map((member) => [
              member.source_key,
              current.splitAssignments[member.source_key] ?? "1",
            ]),
          )
        : current.splitAssignments;
    updateDraft(item.review_id, { action, splitAssignments });
  }

  function validationMessage(
    item: ReviewItem,
    draft: ReviewDraft,
    approving: boolean,
  ) {
    if (!draft.action) return "请选择审核动作";
    if (!approving) return "";
    if (!reviewer.trim()) return "请填写审核人";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt))
      return "请填写有效审核日期";
    if (!draft.rationale.trim()) return "请填写审核依据";
    if (
      draft.action === "split_family" &&
      groupedMembers(item, draft).length < 2
    )
      return "拆分至少需要两个非空分组";
    if (
      draft.action === "recategorize" &&
      !workbench.verified_categories.includes(draft.targetCategory)
    )
      return "请选择已有且已核验的目标分类";
    if (
      draft.action === "exclude_with_disposition" &&
      !workbench.allowed_dispositions.includes(draft.disposition)
    )
      return "请选择明确的排除去向";
    return "";
  }

  function buildDecisionLedger() {
    const approving = exportStatus === "approved";
    const invalid = selectedItems
      .map((item) => ({
        item,
        error: validationMessage(
          item,
          drafts[item.review_id],
          approving,
        ),
      }))
      .find((entry) => entry.error);
    if (selectedItems.length === 0) {
      setMessage("尚未选择任何审核动作。");
      return null;
    }
    if (invalid) {
      setMessage(`${invalid.item.review_id}：${invalid.error}`);
      document
        .getElementById(`review-${invalid.item.review_id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      statusRef.current?.focus();
      return null;
    }

    const decisionIds = new Set(
      decisionLedger.decisions.map((decision) => decision.decision_id),
    );
    const newDecisions = selectedItems.map((item) => {
      const draft = drafts[item.review_id];
      const decision: ExistingDecision = {
        decision_id: uniqueDecisionId(item.review_id, decisionIds),
        review_id: item.review_id,
        candidate_sha256: item.candidate_sha256,
        status: exportStatus,
        action: draft.action,
        reviewer: reviewer.trim(),
        reviewed_at: reviewedAt,
        rationale: draft.rationale.trim(),
      };
      if (draft.action === "split_family")
        decision.split_groups = groupedMembers(item, draft);
      if (draft.action === "recategorize")
        decision.target_category = draft.targetCategory;
      if (draft.action === "exclude_with_disposition")
        decision.disposition = draft.disposition;
      return decision;
    });
    return {
      ...decisionLedger,
      decisions: appendDecisionRevisions(
        decisionLedger.decisions,
        newDecisions,
      ),
    };
  }

  function ledgerText() {
    const ledger = buildDecisionLedger();
    return ledger ? `${JSON.stringify(ledger, null, 2)}\n` : null;
  }

  async function copyLedger() {
    const text = ledgerText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`已复制 ${selectedItems.length} 项决策的完整账本 JSON。`);
    } catch {
      setMessage("浏览器拒绝剪贴板访问，请改用下载。");
    }
  }

  function downloadLedger() {
    const text = ledgerText();
    if (!text) return;
    downloadText(
      "product-catalog-v2-family-decisions.reviewed.json",
      text,
    );
    setMessage(`已下载 ${selectedItems.length} 项决策的完整账本 JSON。`);
  }

  function clearDrafts() {
    setDraftSaveState("saving");
    setDrafts({});
    setMessage("当前快照的浏览器草稿已清空，人工账本没有被修改。");
  }

  const structurallySelected = selectedItems.filter((item) => {
    const action = drafts[item.review_id]?.action;
    return [
      "split_family",
      "merge_candidate",
      "recategorize",
      "exclude_with_disposition",
    ].includes(action);
  }).length;

  useEffect(() => {
    function handleKeyboardPath(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        queryInputRef.current?.focus();
      }
      if (event.altKey && event.key.toLocaleLowerCase() === "d") {
        event.preventDefault();
        exportStatusRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyboardPath);
    return () => window.removeEventListener("keydown", handleKeyboardPath);
  }, []);

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <section className={styles.intro} data-page-hero="workbench" data-header-tone="light">
        <div>
          <p className={styles.eyebrow} data-page-role="eyebrow">目录治理 · 仅限本地</p>
          <h1 data-page-role="display">让每一个产品关系，经得起人的判断。</h1>
          <p className={styles.lead} data-page-role="lead">
            这里整理机器发现，不替代产品负责人决策。所有草稿只留在当前浏览器；
            导出后仍需检查并覆盖人工账本，再重新生成目录。
          </p>
        </div>
        <dl className={styles.snapshot}>
          <div>
            <dt>来源快照</dt>
            <dd>{workbench.snapshot_date}</dd>
          </div>
          <div>
            <dt>活动批次</dt>
            <dd>{workbench.batch_id}</dd>
          </div>
          <div>
            <dt>来源哈希</dt>
            <dd title={workbench.source_snapshot_sha256}>
              {compactHash(workbench.source_snapshot_sha256)}
            </dd>
          </div>
          <div>
            <dt>产品族模型</dt>
            <dd title={workbench.derived_family_model_sha256}>
              {compactHash(workbench.derived_family_model_sha256)}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.metrics} data-page-section aria-label="审核进度">
        <article>
          <strong>{workbench.counts.pending}</strong>
          <span>当前待决项</span>
        </article>
        <article>
          <strong>{workbench.counts.shared_member_source_keys}</strong>
          <span>跨审核共享来源</span>
        </article>
        <article>
          <strong>{pilot.counts.authorized_primary_candidates}</strong>
          <span>已授权首图候选</span>
        </article>
        <article data-alert="true">
          <strong>{pilot.counts.release_ready_candidates}</strong>
          <span>当前发布就绪</span>
        </article>
      </section>

      <div className={`${styles.filters} ${styles.queueFilters}`} aria-label="审核队列筛选">
        <label>
          <span>搜索审核编号、型号或来源 ID</span>
          <input
            ref={queryInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如 S288、11910、family-"
          />
        </label>
        <label>
          <span>审核类型</span>
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as ReviewKind | "all")
            }
          >
            <option value="all">全部类型</option>
            <option value="category_anomaly">分类异常</option>
            <option value="confirm_auto_family">自动族确认</option>
            <option value="merge_candidate">合并候选</option>
          </select>
        </label>
        <label>
          <span>来源分类</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">全部分类</option>
            {categories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>机器状态</span>
          <select
            value={state}
            onChange={(event) =>
              setState(
                event.target.value as ReviewMachineState | "all",
              )
            }
          >
            <option value="pending">待人工判断</option>
            <option value="approved_pending_application">
              已签核，待结构应用
            </option>
            <option value="approved">已生效</option>
            <option value="all">全部状态</option>
          </select>
        </label>
        <output aria-live="polite">
          <strong>{filteredItems.length}</strong>
          <span>项匹配</span>
        </output>
      </div>

      <section className={styles.workspace} data-page-section aria-labelledby="review-title">
        <header className={styles.workspaceHeader}>
          <div>
            <p>人工决策队列</p>
            <h2 id="review-title">{workbench.counts.total} 项判断，一项一项留下依据。</h2>
          </div>
          <div className={styles.keyboardPath}>
            <span><kbd>/</kbd> 聚焦搜索</span>
            <span><kbd>Alt</kbd> + <kbd>D</kbd> 聚焦决策栏</span>
            <Link href="/catalog-lab">返回目录样板 →</Link>
          </div>
        </header>

        <div className={styles.reviewList}>
          {filteredItems.map((item, index) => {
            const draft = drafts[item.review_id] ?? defaultDraft();
            const locked = item.machine_state !== "pending";
            const splitGroups =
              draft.action === "split_family"
                ? groupedMembers(item, draft).length
                : 0;
            return (
              <article
                className={styles.reviewCard}
                data-kind={item.review_kind}
                data-state={item.machine_state}
                id={`review-${item.review_id}`}
                key={item.review_id}
              >
                <header>
                  <div className={styles.reviewNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <p>
                      <span>{kindLabels[item.review_kind]}</span>
                      <code>{item.review_id}</code>
                    </p>
                    <h3>{item.title}</h3>
                    <dl className={styles.reviewFacts}>
                      <div>
                        <dt>分类</dt>
                        <dd>{item.category}</dd>
                      </div>
                      <div>
                        <dt>成员</dt>
                        <dd>{item.member_count}</dd>
                      </div>
                      <div>
                        <dt>证据</dt>
                        <dd>
                          {evidenceLabels[item.evidence_type] ??
                            item.evidence_type}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </header>

                {item.related_review_ids.length > 0 && (
                  <aside className={styles.relatedNotice}>
                    <strong>关联审核</strong>
                    <p>
                      这些项目共享来源记录，决定前应一起核对：
                      {item.related_review_ids.map((reviewId) => (
                        <a href={`#review-${reviewId}`} key={reviewId}>
                          {reviewId}
                        </a>
                      ))}
                    </p>
                  </aside>
                )}

                {locked ? (
                  <div className={styles.lockedState}>
                    <strong>
                      {item.machine_state === "approved"
                        ? "该决定已经生效"
                        : "该决定已签核，但仍需结构应用"}
                    </strong>
                    <span>{item.active_decision_id}</span>
                  </div>
                ) : (
                  <>
                    <fieldset className={styles.actions}>
                      <legend>选择处理动作</legend>
                      {item.allowed_actions.map((action) => (
                        <label key={action}>
                          <input
                            type="radio"
                            name={`action-${item.review_id}`}
                            value={action}
                            checked={draft.action === action}
                            onChange={() => selectAction(item, action)}
                          />
                          <span>
                            <strong>
                              {actionLabels[action] ?? action}
                            </strong>
                            <small>
                              {[
                                "split_family",
                                "merge_candidate",
                                "recategorize",
                                "exclude_with_disposition",
                              ].includes(action)
                                ? "签核后仍需重新派生产品族"
                                : "当前结构可直接保留"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </fieldset>

                    {draft.action === "split_family" && (
                      <div className={styles.splitEditor}>
                        <header>
                          <strong>成员分组</strong>
                          <span>当前 {splitGroups} 个非空组，至少需要 2 组</span>
                        </header>
                        <div>
                          {item.members.map((member) => (
                            <label key={member.source_key}>
                              <span>
                                <strong>{member.title}</strong>
                                <small>{member.source_key}</small>
                              </span>
                              <select
                                aria-label={`${member.title} 所属拆分组`}
                                value={
                                  draft.splitAssignments[
                                    member.source_key
                                  ] ?? "1"
                                }
                                onChange={(event) =>
                                  updateDraft(item.review_id, {
                                    splitAssignments: {
                                      ...draft.splitAssignments,
                                      [member.source_key]:
                                        event.target.value,
                                    },
                                  })
                                }
                              >
                                {item.members.map((_, groupIndex) => (
                                  <option
                                    value={String(groupIndex + 1)}
                                    key={groupIndex}
                                  >
                                    组 {groupIndex + 1}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {draft.action === "recategorize" && (
                      <label className={styles.payloadField}>
                        <span>目标分类</span>
                        <select
                          value={draft.targetCategory}
                          onChange={(event) =>
                            updateDraft(item.review_id, {
                              targetCategory: event.target.value,
                            })
                          }
                        >
                          <option value="">请选择已核验分类</option>
                          {workbench.verified_categories.map(
                            (verifiedCategory) => (
                              <option
                                value={verifiedCategory}
                                key={verifiedCategory}
                              >
                                {verifiedCategory}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    )}

                    {draft.action === "exclude_with_disposition" && (
                      <label className={styles.payloadField}>
                        <span>排除去向</span>
                        <select
                          value={draft.disposition}
                          onChange={(event) =>
                            updateDraft(item.review_id, {
                              disposition: event.target.value,
                            })
                          }
                        >
                          <option value="">请选择治理去向</option>
                          {workbench.allowed_dispositions.map(
                            (disposition) => (
                              <option value={disposition} key={disposition}>
                                {dispositionLabels[disposition] ??
                                  disposition}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    )}

                    <label className={styles.rationale}>
                      <span>审核依据</span>
                      <textarea
                        value={draft.rationale}
                        onChange={(event) =>
                          updateDraft(item.review_id, {
                            rationale: event.target.value,
                          })
                        }
                        placeholder="记录核对过的型号、图片、参数或业务规则；批准时必填。"
                        rows={3}
                      />
                    </label>
                  </>
                )}

                <details className={styles.members}>
                  <summary>
                    查看 {item.member_count} 条来源记录
                    <span>
                      {item.active_batch_family_ids.length} 个活动批次产品族
                    </span>
                  </summary>
                  <div>
                    {item.members.map((member) => (
                      <article key={member.source_key}>
                        <header>
                          <div>
                            <strong>{member.title}</strong>
                            <code>{member.source_key}</code>
                          </div>
                          {member.in_active_batch ? (
                            <Link
                              href={`/catalog-lab/${member.current_family_id}`}
                            >
                              查看样板 ↗
                            </Link>
                          ) : (
                            <span>样板外来源</span>
                          )}
                        </header>
                        <dl>
                          <div>
                            <dt>展示编号</dt>
                            <dd>{member.display_id}</dd>
                          </div>
                          <div>
                            <dt>当前产品族</dt>
                            <dd>{member.current_family_id}</dd>
                          </div>
                          <div>
                            <dt>规格证据</dt>
                            <dd>
                              {Object.values(member.dimensions)
                                .map((dimension) => dimension.value)
                                .join(" · ") || "来源待补"}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </details>
              </article>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className={styles.empty}>
            <h3>没有匹配的审核项</h3>
            <p>调整搜索、类型、分类或机器状态后再试。</p>
          </div>
        )}
      </section>

      <section className={styles.pilot} data-page-section aria-labelledby="pilot-title">
        <header>
          <div>
            <p>首批候选池</p>
            <h2 id="pilot-title">首批候选不是发布批准。</h2>
          </div>
          <p>
            {pilot.counts.authorized_primary_candidates} 个家族拥有授权首图，
            覆盖 {pilot.counts.legacy_aliases_covered} 条旧 URL；只有{" "}
            {pilot.counts.fully_media_authorized_candidates} 个家族可原样展示全部媒体。
          </p>
        </header>
        <details>
          <summary>
            查看 {pilot.candidates.length} 个候选
            <span>当前全部仍需产品关系签核</span>
          </summary>
          <div className={styles.tableScroller} role="region" tabIndex={0}>
            <table>
              <caption className={styles.srOnly}>
                已授权首图的产品族候选清单
              </caption>
              <thead>
                <tr>
                  <th scope="col">顺序</th>
                  <th scope="col">产品族</th>
                  <th scope="col">媒体授权</th>
                  <th scope="col">待决项</th>
                  <th scope="col">旧 URL</th>
                </tr>
              </thead>
              <tbody>
                {pilot.candidates.map((candidate) => (
                  <tr key={candidate.family_id}>
                    <td>{String(candidate.candidate_rank).padStart(2, "0")}</td>
                    <th scope="row">
                      <Link href={`/catalog-lab/${candidate.family_id}`}>
                        {candidate.title}
                      </Link>
                      <span>{candidate.category}</span>
                    </th>
                    <td>
                      <strong>
                        {candidate.media.authorized_media_count}/
                        {candidate.media.display_media_count}
                      </strong>
                      <span>
                        {candidate.media.fully_authorized
                          ? "全部展示媒体已授权"
                          : `${candidate.media.unauthorized_media_count} 张需隐藏或补授权`}
                      </span>
                    </td>
                    <td>
                      {candidate.governance.unresolved_review_ids.length}
                    </td>
                    <td>{candidate.legacy_alias_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className={styles.exportBar} aria-label="决策账本导出">
        <div className={styles.signoff}>
          <label>
            <span>导出状态</span>
            <select
              ref={exportStatusRef}
              value={exportStatus}
              onChange={(event) =>
                setExportStatus(
                  event.target.value as "draft" | "approved",
                )
              }
            >
              <option value="draft">草稿，不解除门禁</option>
              <option value="approved">已批准，要求完整签核</option>
            </select>
          </label>
          <label>
            <span>审核人</span>
            <input
              value={reviewer}
              onChange={(event) => setReviewer(event.target.value)}
              placeholder="真实姓名或内部签核标识"
            />
          </label>
          <label>
            <span>审核日期</span>
            <input
              type="date"
              value={reviewedAt}
              onChange={(event) => setReviewedAt(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.exportSummary}>
          <strong className={styles.draftStatus} data-save-state={draftSaveState}>
            {draftSaveState === "loading" && "正在读取浏览器草稿"}
            {draftSaveState === "saving" && "存在未保存更改"}
            {draftSaveState === "saved" && (selectedItems.length > 0 ? "浏览器草稿已保存 · 尚未导出" : "没有待导出的浏览器草稿")}
            {draftSaveState === "error" && "浏览器草稿未保存"}
          </strong>
          <p ref={statusRef} tabIndex={-1} aria-live="polite">
            {message}
          </p>
          <span>
            已选择 <strong>{selectedItems.length}</strong> 项
            {structurallySelected > 0 &&
              ` · ${structurallySelected} 项签核后仍需结构应用`}
          </span>
        </div>
        <div className={styles.exportActions}>
          <button type="button" onClick={clearDrafts}>
            清空浏览器草稿
          </button>
          <button type="button" onClick={copyLedger}>
            复制完整账本
          </button>
          <button type="button" onClick={downloadLedger}>
            下载审核账本
          </button>
        </div>
      </section>
    </main>
  );
}
