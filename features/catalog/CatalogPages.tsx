import Link from "next/link";
import Image from "next/image";
import type { PageData } from "@/app/_data/pages";
import { caseStudies, productTopics, type CaseStudy, type ProductTopic } from "@/content/catalog";
import { products, productsByTopic, type ProductRecord } from "@/content/products";
import { consultationHref } from "@/lib/consultation";
import styles from "./CatalogPages.module.css";

function Hero({ page, label }: { page: PageData; label: string }) {
  return <section className={styles.hero} style={{ backgroundImage: `linear-gradient(90deg,rgba(6,8,7,.94),rgba(6,8,7,.35)),url(${page.image})` }}>
    <div><p>{label}</p><h1>{page.title}</h1><span>{page.intro}</span></div>
  </section>;
}

export function ProductsPage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page}>
    <Hero page={page} label="PRODUCT CENTER" />
    <section className={styles.intro}><p>产品内容中心</p><div><h2>从空间出发<br/>找到合适的光</h2><span>首批开放 {products.length} 款精选产品，覆盖 10 个产品专题。每个详情页均已核对在售状态、结构化参数、事业部和企业商城图片来源。</span></div></section>
    <section className={styles.topicGrid} aria-label="产品专题">
      {productTopics.map((topic, index) => <TopicCard topic={topic} index={index} key={topic.slug} />)}
    </section>
    <section className={styles.workflow}><p>选型路径</p><ol><li><b>01</b><span>从空间与任务开始</span></li><li><b>02</b><span>核对参数与安装条件</span></li><li><b>03</b><span>进入方案咨询或商城采购</span></li></ol><div><Link href={consultationHref("project", "products")}>咨询产品与方案 →</Link><a href="https://mall.juhao.com" rel="external">进入钜豪商城 ↗</a></div></section>
  </main>;
}

function TopicCard({ topic, index }: { topic: ProductTopic; index: number }) {
  const publishedCount = productsByTopic(topic.slug).length;
  return <Link href={`/products/${topic.slug}`} className={styles.topicCard} style={{ backgroundImage: `linear-gradient(180deg,transparent,#050605e8),url(${topic.image})` }}>
    <small>{String(index + 1).padStart(2, "0")} / {topic.scene}</small><div><h2>{topic.title}</h2><p>{topic.description}</p><span>{publishedCount ? `查看 ${publishedCount} 款精选产品` : "进入专题获取选型建议"} ↗</span></div>
  </Link>;
}

export function ProductTopicPage({ page, topic }: { page: PageData; topic: ProductTopic }) {
  const topicProducts = productsByTopic(topic.slug);
  return <main id="main-content" className={styles.page}>
    <Hero page={page} label="PRODUCT TOPIC" />
    <section className={styles.intro}><p>{topic.scene}</p><div><h2>{topic.title}<br/>产品专题</h2><span>{topic.description}</span></div></section>
    {topicProducts.length > 0 ? <section className={styles.productGrid} aria-label={`${topic.title}产品列表`}>
      {topicProducts.map((product) => <ProductCard product={product} key={product.source_id} />)}
    </section> : <section className={styles.emptyTopic}><p>该专题需要结合空间、协议或安装条件进行选型。</p><Link href={consultationHref("project", `product-topic-${topic.slug}`)}>提交需求获取产品建议 →</Link></section>}
    <section className={styles.workflow}><p>选型提示</p><ol><li><b>01</b><span>先核对空间与使用任务</span></li><li><b>02</b><span>再确认参数、安装和控制条件</span></li><li><b>03</b><span>最终以商城或项目确认资料为准</span></li></ol><div><Link href="/products">返回产品中心 →</Link><Link href={consultationHref("project", `product-topic-${topic.slug}`)}>咨询产品方案 ↗</Link></div></section>
  </main>;
}

function ProductCard({ product }: { product: ProductRecord }) {
  return <Link className={styles.productCard} href={product.seo_slug}>
    <div><Image src={product.primary_image} alt={product.title} fill sizes="(max-width: 900px) 100vw, 33vw" unoptimized /></div>
    <small>{product.topic} / {product.department}</small><h2>{product.title}</h2><p>{product.parameters.slice(0, 3).map((item) => `${item.name}：${item.value}`).join(" · ")}</p><b>查看产品详情 ↗</b>
  </Link>;
}

export function CasesPage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page}>
    <Hero page={page} label="PROJECTS & CASES" />
    <section className={styles.intro}><p>工程项目中心</p><div><h2>把项目阶段<br/>写在案例之前</h2><span>以下内容依据企业知识库项目资料重构。签约或中标项目不会表述为已完工案例；具体产品清单、参数与实施成果在资料完成后补充。</span></div></section>
    <section className={styles.caseGrid} aria-label="工程项目与案例">
      {caseStudies.map((study, index) => <CaseCard study={study} index={index} key={study.slug} />)}
    </section>
    <section className={styles.caseCta}><div><p>PROJECT BRIEF</p><h2>有一个真实项目？<br/>从需求和阶段开始。</h2></div><Link href={consultationHref("project", "cases")}>提交工程需求 →</Link></section>
  </main>;
}

export function CaseDetailPage({ study }: { study: CaseStudy }) {
  return <main id="main-content" className={styles.page}>
    <section className={styles.caseDetailHero}><Image src={study.image} alt={study.title} fill sizes="100vw" priority unoptimized/><div><p>{study.stage} / {study.type}</p><h1>{study.title}</h1><span>{study.summary}</span></div></section>
    <section className={styles.caseOverview}><div><p>01 / PROJECT BACKGROUND</p><h2>项目背景</h2></div><p>{study.background}</p></section>
    <section className={styles.caseFacts}>
      <article><p>02 / SOLUTION SCOPE</p><h2>方案范围</h2><ul>{study.solutionScope.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><p>03 / PRODUCT LIST</p><h2>产品方向清单</h2><ul>{study.productList.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><p>04 / COMPLETION DATA</p><h2>完工资料状态</h2><ul>{study.completionEvidence.map((item) => <li key={item}>{item}</li>)}</ul></article>
    </section>
    <section className={styles.caseStrategy}><div><p>LIGHTING STRATEGY</p><h2>照明策略</h2></div><ol>{study.strategy.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span></li>)}</ol></section>
    <section className={styles.caseCta}><div><p>PROJECT BRIEF</p><h2>让项目资料<br/>从方案走向落地。</h2></div><Link href={consultationHref("project", `case-${study.sourceId}`)}>提交工程需求 →</Link></section>
  </main>;
}

function CaseCard({ study, index }: { study: CaseStudy; index: number }) {
  return <Link href={`/cases/${study.slug}`} className={styles.caseCard}>
    <div style={{ backgroundImage: `url(${study.image})` }}><span>{study.stage}</span></div>
    <small>{String(index + 1).padStart(2, "0")} / {study.type}</small><h2>{study.title}</h2><p>{study.summary}</p><b>查看项目资料 ↗</b>
  </Link>;
}
