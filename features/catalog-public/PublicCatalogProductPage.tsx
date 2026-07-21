import Link from "next/link";
import type { PublicCatalogItem } from "@/content/public-catalog-v2";
import styles from "./PublicCatalogProductPage.module.css";

function categoryStateLabel(item: PublicCatalogItem) {
  return item.category_state === "pending_owner_selection"
    ? "归属待明确"
    : "来源分类一致";
}

function groupingEvidenceLabel(item: PublicCatalogItem) {
  if (item.grouping_evidence === "exact_complete_reference_image_set") {
    return "完整参考图一致";
  }
  if (item.grouping_evidence === "no_strong_family_evidence") {
    return "单品来源记录";
  }
  return "审核证据已留存";
}

function reviewStateLabel(item: PublicCatalogItem) {
  return item.review_state === "approved_and_applied"
    ? "审核通过并已应用"
    : "审核状态已留存";
}

export function PublicCatalogProductPage({ item }: { item: PublicCatalogItem }) {
  const hasMultipleCategories = item.source_categories.length > 1;

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <section className={styles.hero} data-header-tone="dark">
        <div className={styles.heroCopy}>
          <nav aria-label="面包屑">
            <Link href="/">首页</Link>
            <span aria-hidden="true">/</span>
            <Link href="/products">产品</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">产品系列</span>
          </nav>
          <p className={styles.eyebrow}>JUHAO / PRODUCT SERIES</p>
          <div className={styles.titleRow}>
            <h1>{item.title}</h1>
            <span>产品系列</span>
          </div>
          <p className={styles.lead}>
            以冻结来源记录形成的中性系列摘要，不把跨分类记录强制归入单一产品类别，也不据此表示销售、库存或供货状态。
          </p>
          <div className={styles.categoryRail} aria-label="来源分类">
            <span>来源分类</span>
            <div>
              {item.source_categories.map((category) => (
                <b key={category}>{category}</b>
              ))}
            </div>
          </div>
        </div>

        <dl className={styles.identity} aria-label="产品系列摘要">
          <div>
            <dt>系列状态</dt>
            <dd>{categoryStateLabel(item)}</dd>
          </div>
          <div>
            <dt>来源变体</dt>
            <dd>{item.member_count} 个</dd>
          </div>
          <div>
            <dt>归族证据</dt>
            <dd>{groupingEvidenceLabel(item)}</dd>
          </div>
          <div>
            <dt>审核状态</dt>
            <dd>{reviewStateLabel(item)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.mediaNotice} data-header-tone="dark" aria-labelledby="media-title">
        <div className={styles.mediaMark} aria-hidden="true">
          <span>MEDIA</span>
          <i />
          <i />
        </div>
        <div>
          <p>素材边界</p>
          <h2 id="media-title">媒体待授权，当前不展示原始图片或源文件。</h2>
          <span>
            本页只保留审核后的文字摘要；不输出图片、文件路径、来源链接或其他原始素材信息。
          </span>
        </div>
        <dl>
          <div>
            <dt>公开媒体</dt>
            <dd>{item.media.emitted_media_count} 项</dd>
          </div>
          <div>
            <dt>待授权素材</dt>
            <dd>{item.media.suppressed_source_media_count} 项</dd>
          </div>
        </dl>
      </section>

      <section className={styles.specSection} data-header-tone="light" aria-labelledby="spec-title">
        <header>
          <p>来源字段摘要</p>
          <h2 id="spec-title">证据规格卡</h2>
          <span>
            以下内容仅以已抽取的来源字段为准，不补写未确认性能、价格、可售状态或适用结论。
          </span>
        </header>
        {item.card_specs.length > 0 ? (
          <div className={styles.specGrid} aria-label="证据规格卡">
            {item.card_specs.map((spec) => (
              <article key={spec.key}>
                <span className={styles.specLabel}>{spec.label}</span>
                <strong className={styles.specValue}>{spec.values.join(" / ")}</strong>
                <small>来源字段摘要</small>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptySpecs}>
            <strong>暂无足够的结构化规格字段</strong>
            <span>该系列仍保留为产品系列，不据此推断参数。</span>
          </div>
        )}
      </section>

      <section className={styles.boundary} data-header-tone="light">
        <div>
          <p>分类说明</p>
          <h2>{hasMultipleCategories ? "保留多源分类，不指定单一正式归属。" : "来源分类保持为单一已核对分类。"}</h2>
        </div>
        <p>
          {hasMultipleCategories
            ? "该系列的来源记录横跨多个分类。为避免错误归类，正式主分类保持待明确状态。"
            : "当前系列仅展示已核对的来源分类；后续发布或业务配置仍以正式审核结果为准。"}
        </p>
      </section>
    </main>
  );
}
