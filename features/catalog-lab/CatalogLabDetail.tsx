"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  CatalogV2Detail,
  CatalogV2Variant,
} from "@/content/catalog-v2.generated";
import { catalogImageUrlOrNull } from "@/lib/catalog-image";
import { consultationHref } from "@/lib/consultation";
import { CatalogAmbientFieldCanvas } from "./CatalogAmbientFieldCanvas";

const dimensionLabels: Record<string, string> = {
  dimensions: "尺寸",
  wattage: "功率",
  cct: "色温",
  cri: "显色指数",
  beam_angle: "光束角",
  ip_rating: "防护等级",
  protocol: "通信协议",
  finish_color: "颜色与工艺",
};

const flagLabels: Record<string, string> = {
  primary_image_missing: "主图待补",
  detail_images_missing: "详情图待补",
  attributes_missing: "参数待补",
  undefined_spec_codes_normalized_to_null: "规格编号待复核",
  volume_header_typo_normalized: "体积表头已归一",
};

function VariantPanel({ variant }: { variant: CatalogV2Variant }) {
  const dimensions = Object.entries(variant.dimensions);
  return (
    <div className="catalogLab-variantPanel">
      <div>
        <span>当前变体</span>
        <strong>{variant.label}</strong>
        <small>{variant.source_key}</small>
      </div>
      {dimensions.length > 0 ? (
        <dl>
          {dimensions.map(([key, item]) => (
            <div key={key}>
              <dt>{dimensionLabels[key] ?? key}</dt>
              <dd>
                {item.value}
                <small>
                  {item.evidence === "title_literal" ? "标题原文" : "来源属性"}
                </small>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>该变体没有足够的结构化尺寸、功率或协议字段，保留为待复核状态。</p>
      )}
      {variant.quality_flags.length > 0 && (
        <ul aria-label="数据质量提示">
          {variant.quality_flags.map((flag) => (
            <li key={flag}>{flagLabels[flag] ?? flag}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductEvidenceStage({ detail }: { detail: CatalogV2Detail }) {
  const media = useMemo(
    () => [
      {
        label: "主图",
        source: detail.representative_detail.primary_image,
        alt: detail.family.representative.title,
      },
      ...detail.representative_detail.detail_images.map((source, index) => ({
        label: `来源图 ${String(index + 1).padStart(2, "0")}`,
        source,
        alt: `${detail.family.title} 来源详情图 ${index + 1}`,
      })),
    ],
    [detail],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedSources, setFailedSources] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedMedia = media[selectedIndex] ?? media[0];
  const selectedSource = selectedMedia?.source ?? null;
  const image =
    selectedSource && !failedSources.has(selectedSource)
      ? catalogImageUrlOrNull(selectedSource)
      : null;

  return (
    <figure
      className="catalogLab-evidenceStage"
      aria-labelledby="catalog-media-title"
      aria-describedby="catalog-media-boundary"
    >
      <div className="catalogLab-evidenceViewport">
        <CatalogAmbientFieldCanvas />
        <div className="catalogLab-evidenceImageFrame">
          {image ? (
            <img
              key={selectedSource}
              src={image}
              alt={selectedMedia.alt}
              width="1600"
              height="1600"
              loading={selectedIndex === 0 ? undefined : "lazy"}
              decoding="async"
              fetchPriority={selectedIndex === 0 ? "high" : "auto"}
              onError={() => {
                if (!selectedSource) return;
                setFailedSources((current) => {
                  const next = new Set(current);
                  next.add(selectedSource);
                  return next;
                });
              }}
            />
          ) : (
            <div
              className="catalogLab-mediaPlaceholder"
              role="img"
              aria-label={`${selectedMedia.label} 未进入授权预览`}
            >
              <span>MEDIA HELD</span>
              <strong>图片未进入授权预览</strong>
              <small>仅展示已核对的来源字段</small>
            </div>
          )}
        </div>
      </div>
      <figcaption>
        <div>
          <strong id="catalog-media-title">来源证据光场展陈台</strong>
          <span id="catalog-media-boundary">
            产品图保持来源原貌。背景光场非配光、照度或性能模拟。
          </span>
        </div>
        <div
          className="catalogLab-mediaControls"
          role="group"
          aria-label="选择已授权来源图片"
        >
          {media.map((item, index) => (
            <button
              type="button"
              key={`${item.label}-${item.source ?? index}`}
              aria-current={selectedIndex === index ? "true" : undefined}
              aria-pressed={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="catalogLab-srOnly" aria-live="polite">
          当前显示 {selectedMedia.label}。图片来自冻结来源记录。
        </p>
      </figcaption>
    </figure>
  );
}

export function CatalogLabDetail({
  detail,
  returnHref,
}: {
  detail: CatalogV2Detail;
  returnHref: string;
}) {
  const [selectedId, setSelectedId] = useState(detail.variants[0]?.variant_id);
  const selected = useMemo(
    () =>
      detail.variants.find((variant) => variant.variant_id === selectedId) ??
      detail.variants[0],
    [detail.variants, selectedId],
  );
  const attributes = Object.entries(detail.representative_detail.attributes);
  const consultationLink = consultationHref(
    "project",
    "product-detail",
    selected.display_id,
  );
  const pendingCategoryOwner =
    detail.family.category_state === "pending_owner_selection";

  return (
    <main
      id="main-content"
      className="catalogLab-page catalogLab-detailPage"
      tabIndex={-1}
    >
      <section
        className="catalogLab-detailHero"
        data-page-hero="split"
        data-header-tone="light"
      >
        <ProductEvidenceStage detail={detail} />
        <div className="catalogLab-detailSummary">
          <nav aria-label="面包屑">
            <Link href="/">首页</Link>
            <span>/</span>
            <Link href={returnHref}>产品目录审核</Link>
          </nav>
          <p data-page-role="eyebrow">
            {pendingCategoryOwner ? "正式主分类待确认" : detail.family.category}
          </p>
          <h1 data-page-role="display">{detail.family.title}</h1>
          <span data-page-role="lead">
            {detail.family.member_count > 1
              ? detail.family.review_state === "approved_and_applied"
                ? `${detail.family.member_count} 个来源记录已按审核决定归入同一产品族。`
                : `${detail.family.member_count} 个来源记录按强证据归入同一产品族，仍待人工确认。`
              : detail.family.review_state === "approved_and_applied"
                ? "当前来源记录已按审核决定保留为独立产品。"
                : "当前没有足够证据自动合并同系列产品，保留为独立待复核单品。"}
          </span>
          <dl
            className="catalogLab-familyFacts"
            data-page-role="metadata"
            aria-label="产品族元信息"
          >
            <div>
              <dt>代表编号</dt>
              <dd>{detail.family.representative.display_id}</dd>
            </div>
            <div>
              <dt>产品族状态</dt>
              <dd>
                {detail.family.grouping_status ===
                "auto_merged_shared_reference_image_set"
                  ? "强证据合并"
                  : detail.family.grouping_status ===
                      "human_approved_recategorize"
                    ? "审核分类修正已应用"
                  : "待人工复核"}
              </dd>
            </div>
            {pendingCategoryOwner && (
              <>
                <div>
                  <dt>来源分类</dt>
                  <dd>{detail.family.source_categories.join(" / ")}</dd>
                </div>
                <div>
                  <dt>正式路径</dt>
                  <dd>主分类待人工确认，尚未生成正式路径</dd>
                </div>
              </>
            )}
          </dl>
          <div className="catalogLab-detailActions">
            <Link href={consultationLink}>
              带着当前型号咨询
              <span aria-hidden="true">→</span>
            </Link>
            <Link href={returnHref}>返回目录结果</Link>
            <small>咨询将携带来源编号 {selected.display_id}</small>
          </div>
        </div>
      </section>

      <section
        className="catalogLab-variants"
        data-page-section
        data-header-tone="light"
        aria-labelledby="variant-title"
      >
        <header>
          <h2 id="variant-title">在同一产品族内选变体</h2>
          <p>切换只改变来源变体字段，不改写原始商品说明。</p>
        </header>
        <div
          className="catalogLab-variantSelector"
          role="group"
          aria-label="产品变体"
        >
          {detail.variants.map((variant) => (
            <button
              type="button"
              aria-pressed={selected.variant_id === variant.variant_id}
              onClick={() => setSelectedId(variant.variant_id)}
              key={variant.variant_id}
            >
              <span>{variant.display_id}</span>
              <strong>{variant.label}</strong>
            </button>
          ))}
        </div>
        <VariantPanel variant={selected} />
      </section>

      <section
        className="catalogLab-attributeSection"
        data-page-section
        data-header-tone="light"
        aria-labelledby="attribute-title"
      >
        <header>
          <h2 id="attribute-title">已确认的来源属性</h2>
          <p>缺失字段保持缺失，不从图片或经验补写技术参数。</p>
        </header>
        {attributes.length > 0 ? (
          <dl>
            {attributes.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="catalogLab-inlineEmpty">当前来源没有结构化属性。</div>
        )}
      </section>

      <section
        className="catalogLab-sourceBoundary"
        data-page-section
        data-header-tone="light"
        aria-labelledby="source-boundary-title"
      >
        <div>
          <h2 id="source-boundary-title">来源与页面边界</h2>
          <p>
            该页面是冻结数据的派生预览。库存、价格、用户、地址、订单、设备实例和日志均未公开。
          </p>
          <Link href={returnHref}>返回进入详情前的目录 →</Link>
        </div>
        <details>
          <summary>查看来源引用</summary>
          <ul>
            {detail.source_references.map((source) => (
              <li key={source.source_key}>
                <strong>{source.source_key}</strong>
                <span>{source.source_path}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}
