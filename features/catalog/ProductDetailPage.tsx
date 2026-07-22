import Link from "next/link";
import { SITE_URL } from "@/app/_data/pages";
import { AnalyticsLink, AnalyticsView } from "@/components/analytics/AnalyticsEvents";
import { EvidenceScale, type EvidenceScaleItem } from "@/components/experience/EvidenceScale";
import { LightFieldCanvas } from "@/components/experience/LightFieldCanvas";
import { SemanticPicture } from "@/components/media/SemanticPicture";
import { productTopics } from "@/content/catalog";
import { isIndexableRoute } from "@/content/publication-ledger";
import { productTitleParts, productsByTopic, type ProductRecord } from "@/content/products";
import { consultationHref } from "@/lib/consultation";
import { requireRuntimeMedia } from "@/lib/media/runtime";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailPage({ product, nonce }: { product: ProductRecord; nonce?: string }) {
  const usedMedia = new Set([requireRuntimeMedia(product.primary_media_id).fallback]);
  const visibleGallery = product.gallery_media_ids.filter((mediaId) => {
    const source = requireRuntimeMedia(mediaId).fallback;
    if (usedMedia.has(source)) return false;
    usedMedia.add(source);
    return true;
  });
  const related = productsByTopic(product.topic_slug)
    .filter((item) => {
      if (item.source_id === product.source_id) return false;
      const source = requireRuntimeMedia(item.primary_media_id).fallback;
      if (usedMedia.has(source)) return false;
      usedMedia.add(source);
      return true;
    })
    .slice(0, 3);
  const topicTitle = productTopics.find((topic) => topic.slug === product.topic_slug)?.title ?? product.topic;
  const indexable = isIndexableRoute(product.seo_slug);
  const reviewLabel = product.review_status === "needs_review" ? "待人工确认" : product.review_status;
  const title = productTitleParts(product);
  const keyParameters = product.parameters.slice(0, 4);
  const consultationLink = consultationHref("project", "product-detail", product.source_id);
  const opticalSpecimen = product.topic_slug === "spotlights";
  const evidenceItems: EvidenceScaleItem[] = [
    { code: "01", title: "来源", value: `商城商品 ${product.source_id}`, status: "confirmed" },
    { code: "02", title: "型号", value: product.model || "型号待补", status: product.model ? "confirmed" : "pending" },
    { code: "03", title: "参数", value: `${product.parameters.length} 项字段 · ${product.parameter_completeness}`, status: "context" },
    { code: "04", title: "人工复核", value: reviewLabel, status: product.review_status === "needs_review" ? "pending" : "confirmed" },
    { code: "05", title: "下一步", value: "带当前型号咨询", status: "action", href: consultationLink },
  ];
  const schema = { "@context": "https://schema.org", "@type": "Product", name: product.title, sku: product.source_id, mpn: product.model, model: product.model, category: product.topic, image: product.gallery_media_ids.map((mediaId) => `${SITE_URL}${requireRuntimeMedia(mediaId).fallback}`), brand: { "@type": "Brand", name: "钜豪照明 JUHAO" }, url: `${SITE_URL}${product.seo_slug}`, description: `${product.topic}产品，查看结构化参数、安装提示和相关方案。` };
  return <main id="main-content" className={styles.page} data-lightfield-page="product" tabIndex={-1}>
    <AnalyticsView event={{ name: "product_detail_view", contentId: product.source_id }} />
    <section className={`${styles.hero} ${opticalSpecimen ? styles.specimenHero : ""}`} data-header-tone="light" data-page-hero="split">
      <figure className={styles.visual}>
        <SemanticPicture className={styles.productMedia} mediaId={product.primary_media_id} alt={`${title.accessibleName} 产品资料图`} sizes="(max-width: 900px) 100vw, 55vw" priority style={{ viewTransitionName: `product-${product.source_id}` }} />
        {opticalSpecimen && <>
          <div className={styles.opticalAxis} aria-hidden="true"><span /><span /><span /></div>
          <LightFieldCanvas variant="product" />
          <div className={styles.opticalReadout} aria-hidden="true">
            <small>OPTICAL SPECIMEN / SOURCE IMAGE</small>
            <strong>{product.model}</strong>
            <span>视觉光场演示 · 不代表配光、照度或色温数据</span>
          </div>
        </>}
        <figcaption>{`产品资料图｜来源：企业商城商品 ${product.source_id}`}</figcaption>
      </figure>
      <div className={styles.summary}>
        <nav aria-label="面包屑"><Link href="/">首页</Link><span>/</span><Link href="/products">产品中心</Link><span>/</span><Link href={`/products/${product.topic_slug}`}>{topicTitle}</Link></nav>
        <p className={styles.topicLabel} data-page-role="eyebrow">{product.topic} / 产品选型资料</p>
        <h1>{product.title}</h1>
        <div className={`${styles.productTitleVisual} ${title.model && title.model.length > 22 ? styles.longProductModel : ""}`} aria-hidden="true" data-page-role="display">{title.model && <span>{title.model}</span>}<strong>{title.description}</strong></div>
        <p className={styles.summaryIntro} data-page-role="lead">先核对型号、关键参数与安装条件，再由钜豪结合真实空间完成选型确认。</p>
        <dl className={styles.keyFacts} aria-label="产品关键元信息" data-page-role="metadata">
          {keyParameters.map((item) => <div key={`${item.name}-${item.value}`}><dt>{item.name}</dt><dd>{item.value}</dd></div>)}
        </dl>
        <aside className={styles.reviewNote} aria-label="资料核验状态">
          <div><span>资料核验状态</span><strong data-status={product.review_status === "needs_review" ? "warning" : "success"}>{reviewLabel}</strong></div>
          <p>{product.fact_status}。正式选型前，请确认最终参数、安装条件与供货信息。</p>
        </aside>
        <div className={styles.actions}><AnalyticsLink href={consultationLink} analyticsEvent={{ name: "product_consultation_click", contentId: product.source_id }}>获取本型号确认 →</AnalyticsLink><a href="#product-specification">查看完整参数 ↓</a></div>
        <details className={styles.auditDetails}>
          <summary>查看资料边界与来源</summary>
          <dl aria-label="产品资料边界与来源">
            <div><dt>产品专题</dt><dd>{product.topic}</dd></div>
            <div><dt>参数完整度</dt><dd>{product.parameter_completeness}</dd></div>
            <div><dt>媒体授权</dt><dd>{product.image_authorization}</dd></div>
            <div><dt>当前发布</dt><dd>私有预览 · 人工确认后用于正式选型</dd></div>
          </dl>
        </details>
      </div>
    </section>
    <EvidenceScale items={evidenceItems} label="产品选型证据刻度" />
    <nav className={styles.sectionNav} aria-label="产品详情章节"><a href="#product-specification">参数</a><a href="#product-gallery">产品图</a><a href="#product-installation">安装提示</a>{related.length > 0 && <a href="#related-products">同专题产品</a>}</nav>
    <section className={styles.parameters} id="product-specification" data-header-tone="dark"><div><p>选型依据</p><h2>产品参数</h2><span>参数来自企业商城商品说明，实际选型仍需结合安装环境和正式资料。</span></div><dl>{product.parameters.map((item) => <div key={`${item.name}-${item.value}`}><dt>{item.name}</dt><dd>{item.value}</dd></div>)}</dl></section>
    <section className={styles.gallery} id="product-gallery" data-header-tone="light"><header><p>产品资料图</p><h2>产品与细节</h2></header><div>{visibleGallery.map((mediaId, index) => <figure className={index % 3 === 0 ? styles.galleryWide : undefined} key={mediaId}><SemanticPicture mediaId={mediaId} alt={`${title.accessibleName} 产品图 ${index + 2}`} sizes={index % 3 === 0 ? "100vw" : "(max-width: 900px) 100vw, 50vw"} /><figcaption>{`产品资料图 ${index + 2}｜来源：企业商城商品 ${product.source_id}`}</figcaption></figure>)}</div></section>
    <section className={styles.notes} id="product-installation" data-header-tone="dark"><div><p>落地前确认</p><h2>安装与选型提示</h2></div><ol>{product.installation_notes.map((note, index) => <li key={note}><b>{String(index + 1).padStart(2, "0")}</b><span>{note}</span></li>)}</ol></section>
    {related.length > 0 && <section className={styles.related} id="related-products" data-header-tone="dark"><p>继续比较</p><h2>同专题产品</h2><div>{related.map((item) => {
      const relatedTitle = productTitleParts(item);
      return <Link href={item.seo_slug} key={item.source_id}><SemanticPicture mediaId={item.primary_media_id} alt={`${relatedTitle.accessibleName} 产品资料图`} sizes="(max-width: 900px) 100vw, 33vw"/><span className={styles.relatedTitle}>{relatedTitle.hasModel && <small>{relatedTitle.model}</small>}<strong>{relatedTitle.description}</strong></span><b>↗</b></Link>;
    })}</div></section>}
    {indexable && <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
  </main>;
}
