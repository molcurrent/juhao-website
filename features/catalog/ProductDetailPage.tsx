import Link from "next/link";
import { SITE_URL } from "@/app/_data/pages";
import { SemanticPicture } from "@/components/media/SemanticPicture";
import { productTopics } from "@/content/catalog";
import { isIndexableRoute } from "@/content/publication-ledger";
import { productsByTopic, type ProductRecord } from "@/content/products";
import { consultationHref } from "@/lib/consultation";
import { requireRuntimeMedia } from "@/lib/media/runtime";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailPage({ product }: { product: ProductRecord }) {
  const related = productsByTopic(product.topic_slug).filter((item) => item.source_id !== product.source_id).slice(0, 3);
  const topicTitle = productTopics.find((topic) => topic.slug === product.topic_slug)?.title ?? product.topic;
  const indexable = isIndexableRoute(product.seo_slug);
  const schema = { "@context": "https://schema.org", "@type": "Product", name: product.title, sku: product.source_id, mpn: product.model, model: product.model, category: product.topic, image: product.gallery_media_ids.map((mediaId) => `${SITE_URL}${requireRuntimeMedia(mediaId).fallback}`), brand: { "@type": "Brand", name: "钜豪照明 JUHAO" }, url: `${SITE_URL}${product.seo_slug}`, description: `${product.topic}产品，查看结构化参数、安装提示和相关方案。` };
  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}>
      <figure className={styles.visual}><SemanticPicture className={styles.productMedia} mediaId={product.primary_media_id} alt={product.title} sizes="(max-width: 900px) 100vw, 55vw" priority /><figcaption>{`产品资料图｜来源：企业商城商品 ${product.source_id}`}</figcaption></figure>
      <div className={styles.summary}>
        <nav aria-label="面包屑"><Link href="/">首页</Link><span>/</span><Link href="/products">产品中心</Link><span>/</span><Link href={`/products/${product.topic_slug}`}>{topicTitle}</Link></nav>
        <p>PRODUCT / {product.department}</p><h1>{product.title}</h1>
        <dl><div><dt>产品型号</dt><dd>{product.model}</dd></div><div><dt>产品专题</dt><dd>{product.topic}</dd></div><div><dt>资料状态</dt><dd>{product.sale_status} · 来源字段已通过机器校验，当前为私有预览</dd></div></dl>
        <div className={styles.actions}><Link href={consultationHref("project", "product-detail", product.source_id)}>咨询产品与方案 →</Link><Link href="/mall">商城连接与采购兜底 ↗</Link></div>
      </div>
    </section>
    <section className={styles.parameters}><div><p>01 / SPECIFICATION</p><h2>产品参数</h2><span>参数来自企业商城商品说明，实际选型仍需结合安装环境和正式资料。</span></div><dl>{product.parameters.map((item) => <div key={`${item.name}-${item.value}`}><dt>{item.name}</dt><dd>{item.value}</dd></div>)}</dl></section>
    <section className={styles.gallery}><header><p>02 / PRODUCT VIEW</p><h2>产品与细节</h2></header><div>{product.gallery_media_ids.slice(1).map((mediaId, index) => <figure key={`${mediaId}-${index}`}><SemanticPicture mediaId={mediaId} alt={`${product.title} 产品图 ${index + 2}`} sizes="(max-width: 900px) 100vw, 50vw" /><figcaption>{`产品资料图 ${index + 2}｜来源：企业商城商品 ${product.source_id}`}</figcaption></figure>)}</div></section>
    <section className={styles.notes}><div><p>03 / INSTALLATION</p><h2>安装与选型提示</h2></div><ol>{product.installation_notes.map((note, index) => <li key={note}><b>{String(index + 1).padStart(2, "0")}</b><span>{note}</span></li>)}</ol></section>
    <section className={styles.related}><p>RELATED PRODUCTS</p><h2>同专题产品</h2><div>{related.map((item) => <Link href={item.seo_slug} key={item.source_id}><SemanticPicture mediaId={item.primary_media_id} alt={item.title} sizes="(max-width: 900px) 100vw, 33vw"/><span>{item.title}</span><b>↗</b></Link>)}</div></section>
    {indexable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
  </main>;
}
