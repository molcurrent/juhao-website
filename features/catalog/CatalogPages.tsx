import Link from "next/link";
import Image from "next/image";
import type { PageData } from "@/app/_data/pages";
import { caseStudies, productTopics, type CaseStudy, type ProductTopic } from "@/content/catalog";
import { products, productsByTopic, type ProductRecord } from "@/content/products";
import { topicGuideBySlug, type TopicGuide } from "@/content/topic-guides";
import { consultationHref } from "@/lib/consultation";
import styles from "./CatalogPages.module.css";

function Hero({ page, label }: { page: PageData; label: string }) {
  return <section className={styles.hero}>
    <Image className={styles.heroMedia} src={page.image} alt={`${page.title}专题视觉`} width={1600} height={1000} priority unoptimized />
    <div className={styles.heroShade} aria-hidden="true" />
    <div className={styles.heroCopy}><p>{label}</p><h1>{page.title}</h1><span>{page.intro}</span></div>
  </section>;
}

export function ProductsPage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page}>
    <Hero page={page} label="PRODUCT CENTER" />
    <section className={styles.intro}><p>产品内容中心</p><div><h2>从空间出发<br/>找到合适的光</h2><span>首批开放 {products.length} 款精选产品，覆盖 10 个产品专题。每个详情页均已核对在售状态、结构化参数、事业部和企业商城图片来源。</span></div></section>
    <section className={styles.topicGrid} aria-label="产品专题">
      {productTopics.map((topic, index) => <TopicCard topic={topic} index={index} key={topic.slug} />)}
    </section>
    <section className={styles.workflow}><p>选型路径</p><ol><li><b>01</b><span>从空间与任务开始</span></li><li><b>02</b><span>核对参数与安装条件</span></li><li><b>03</b><span>进入方案咨询或商城采购</span></li></ol><div><Link href={consultationHref("project", "products")}>咨询产品与方案 →</Link><Link href="/mall">查看商城连接与采购兜底 ↗</Link></div></section>
  </main>;
}

function TopicCard({ topic, index }: { topic: ProductTopic; index: number }) {
  const publishedCount = productsByTopic(topic.slug).length;
  return <Link href={`/products/${topic.slug}`} className={styles.topicCard}>
    <Image src={topic.image} alt={`${topic.title}专题`} width={1000} height={760} loading="lazy" unoptimized />
    <i aria-hidden="true" />
    <small>{String(index + 1).padStart(2, "0")} / {topic.scene}</small><div><h2>{topic.title}</h2><p>{topic.description}</p><span>{publishedCount ? `查看 ${publishedCount} 款精选产品` : "进入专题获取选型建议"} ↗</span></div>
  </Link>;
}

export function ProductTopicPage({ page, topic }: { page: PageData; topic: ProductTopic }) {
  const topicProducts = productsByTopic(topic.slug);
  const guide = topicGuideBySlug(topic.slug);
  return <main id="main-content" className={styles.page}>
    <Hero page={page} label="PRODUCT TOPIC" />
    <section className={styles.intro}><p>{topic.scene}</p><div><h2>{topic.title}<br/>产品专题</h2><span>{topic.description}</span></div></section>
    {guide && <FlagshipTopicGuide guide={guide} products={topicProducts} topic={topic} />}
    {topicProducts.length > 0 ? <section className={styles.productGrid} aria-label={`${topic.title}产品列表`}>
      {topicProducts.map((product) => <ProductCard product={product} key={product.source_id} />)}
    </section> : <section className={styles.emptyTopic}><p>该专题需要结合空间、协议或安装条件进行选型。</p><Link href={consultationHref("project", "product-topic", topic.slug)}>提交需求获取产品建议 →</Link></section>}
    <section className={styles.workflow}><p>选型提示</p><ol><li><b>01</b><span>先核对空间与使用任务</span></li><li><b>02</b><span>再确认参数、安装和控制条件</span></li><li><b>03</b><span>最终以商城或项目确认资料为准</span></li></ol><div><Link href="/products">返回产品中心 →</Link><Link href={consultationHref("project", "product-topic", topic.slug)}>咨询产品方案 ↗</Link></div></section>
  </main>;
}

function FlagshipTopicGuide({ guide, products: topicProducts, topic }: { guide: TopicGuide; products: ProductRecord[]; topic: ProductTopic }) {
  return <>
    <section className={styles.topicStatus} aria-label="专题资料状态">
      <p>CONTENT STATUS</p><strong>{guide.status}</strong>
    </section>
    <section className={styles.topicScenes} id="topic-scenarios" aria-labelledby="topic-scenarios-title">
      <header><p>01 / SPACE TASKS</p><h2 id="topic-scenarios-title">先按空间任务选</h2><span>以下内容是选型检查路径，不替代具体型号的配光、检测和现场样板。</span></header>
      <div>{guide.scenarios.map((scene, index) => <article key={scene.title}><small>{String(index + 1).padStart(2, "0")}</small><h3>{scene.title}</h3><p>{scene.task}</p><ul>{scene.checks.map((check) => <li key={check}>{check}</li>)}</ul></article>)}</div>
    </section>
    {guide.comparisonFields.length > 0 && topicProducts.length > 0 && <section className={styles.topicComparison} id="topic-comparison" aria-labelledby="topic-comparison-title">
      <header><p>02 / SOURCE FIELD COMPARISON</p><h2 id="topic-comparison-title">只对照已确认字段</h2><span>缺少正式资料的参数不会从商品标题、图片或经验中补写。</span></header>
      <div className={styles.tableWrap}><table><thead><tr><th scope="col">对照项</th>{topicProducts.map((product) => <th scope="col" key={product.source_id}><Link href={product.seo_slug}>{product.model || product.source_id}</Link></th>)}</tr></thead>
        <tbody>{guide.comparisonFields.map((field) => <tr key={field.label}><th scope="row">{field.label}</th>{topicProducts.map((product) => {
          const value = field.parameter ? product.parameters.find((item) => item.name === field.parameter)?.value : undefined;
          return <td key={product.source_id}>{value ?? field.note ?? "资料待补充"}</td>;
        })}</tr>)}</tbody></table></div>
    </section>}
    <section className={styles.topicMedia} aria-labelledby="topic-media-title">
      <header><p>03 / SEMANTIC MEDIA</p><h2 id="topic-media-title">语义化资料图片</h2><span>图片标题与来源随内容呈现；企业渠道素材仍需企业承担并确认正式公开授权。</span></header>
      <div>{guide.media.map((item) => <figure key={item.src}><Image src={item.src} alt={item.alt} width={1000} height={760} loading="lazy" unoptimized /><figcaption>{item.caption}</figcaption></figure>)}</div>
    </section>
    <section className={styles.topicKnowledge} aria-labelledby="topic-knowledge-title">
      <header><p>04 / RELATED KNOWLEDGE</p><h2 id="topic-knowledge-title">用知识内容理解选型</h2></header>
      <div>{guide.knowledge.map((item) => <Link href={item.href} key={`${item.title}-${item.source}`}><small>{item.source}</small><h3>{item.title}</h3><p>{item.summary}</p><b>继续阅读 ↗</b></Link>)}</div>
    </section>
    <section className={styles.topicRelated} aria-labelledby="topic-related-title">
      <header><p>05 / RELATED APPLICATIONS</p><h2 id="topic-related-title">关联应用与项目资料</h2><span>关联内容用于理解方案方向，不代表某个项目最终采用当前展示型号。</span></header>
      <div>{guide.related.map((item) => <Link href={item.href} key={item.href}><small>{item.status ?? "关联内容"}</small><h3>{item.title}</h3><p>{item.text}</p></Link>)}</div>
    </section>
    <section className={styles.topicFaq} aria-labelledby="topic-faq-title">
      <header><p>06 / FAQ</p><h2 id="topic-faq-title">{topic.title}常见问题</h2></header>
      <div>{guide.faqs.map((item, index) => <details key={item.question}><summary><span>{String(index + 1).padStart(2, "0")}</span>{item.question}</summary><p>{item.answer}</p></details>)}</div>
    </section>
    <aside className={styles.topicMissing} aria-label="仍待补齐的资料"><p>资料边界</p><div><h2>这些信息仍待企业补齐</h2><ul>{guide.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul></div></aside>
  </>;
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
  const sourceMeta = "sourceMeta" in study ? study.sourceMeta : null;
  const hasSpaceBreakdown = study.spaceBreakdown.length > 0;
  return <main id="main-content" className={styles.page}>
    <section className={styles.caseDetailHero}><Image src={study.image} alt={`${study.title}企业来源资料`} fill sizes="100vw" priority unoptimized/><div><p>{study.stage} / {study.type}</p><h1>{study.title}</h1><span>{study.summary}</span><strong>页面图片为企业来源资料，媒体授权待核验；不作为完工实拍证明</strong></div></section>
    <section className={styles.caseOverview}><div><p>01 / PROJECT BACKGROUND</p><h2>项目背景</h2></div><p>{study.background}</p></section>
    {sourceMeta && <section className={styles.caseFacts} aria-label="案例来源与治理状态">
      <article><p>SOURCE DATE</p><h2>来源日期</h2><ul><li>{sourceMeta.sourceDate}</li></ul></article>
      <article><p>BODY MEDIA</p><h2>正文图数</h2><ul><li>{sourceMeta.bodyImageCount} 张</li></ul></article>
      <article><p>FACT BOUNDARY</p><h2>事实边界</h2><ul><li>{sourceMeta.factBoundary}</li></ul></article>
      <article><p>MEDIA RIGHTS</p><h2>媒体授权</h2><ul><li>{sourceMeta.mediaAuthorization}</li></ul></article>
    </section>}
    <section className={styles.caseVerification} aria-labelledby="case-verification-title">
      <header><p>02 / EVIDENCE BOUNDARY</p><h2 id="case-verification-title">已确认，与尚待补齐</h2></header>
      <div><article><small>CONFIRMED</small><h3>企业资料已确认</h3><ul>{study.confirmedFacts.map((item) => <li key={item}>{item}</li>)}</ul></article><article><small>PENDING</small><h3>暂不能作为结论</h3><ul>{study.completionEvidence.map((item) => <li key={item}>{item}</li>)}{!sourceMeta && <li>项目方对官网公开使用资料的正式授权：待确认</li>}</ul></article></div>
    </section>
    {hasSpaceBreakdown && <section className={styles.caseSpaces} aria-labelledby="case-spaces-title"><header><p>03 / SPACE BREAKDOWN</p><h2 id="case-spaces-title">按空间拆解方案方向</h2><span>只呈现企业原文能够支持的方案方向，不使用“已安装”或“已实现”等完成时态。</span></header><div>{study.spaceBreakdown.map((space, index) => <article key={space.title}><small>{String(index + 1).padStart(2, "0")}</small><h3>{space.title}</h3><p>{space.text}</p></article>)}</div></section>}
    {!hasSpaceBreakdown && sourceMeta && <section className={styles.caseOverview} aria-label="空间分节状态"><div><p>03 / SPACE EVIDENCE</p><h2>空间分节状态</h2></div><p>{sourceMeta.spaceEvidenceNote}</p></section>}
    <section className={styles.caseFacts}>
      <article><p>02 / SOLUTION SCOPE</p><h2>方案范围</h2><ul>{study.solutionScope.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><p>03 / PRODUCT LIST</p><h2>产品方向清单</h2><ul>{study.productList.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><p>04 / COMPLETION DATA</p><h2>完工资料状态</h2><ul>{study.completionEvidence.map((item) => <li key={item}>{item}</li>)}</ul></article>
    </section>
    <section className={styles.caseEvidence}>
      <header><p>05 / SOURCE EVIDENCE</p><h2>企业资料图集</h2><span>{study.evidenceLabel}</span></header>
      <div>{study.evidenceImages.map((item) => <figure key={item.src}><div className={"width" in item ? styles.evidenceNatural : undefined}>{"width" in item ? <Image src={item.src} alt={item.alt} width={item.width} height={item.height} loading="lazy" unoptimized /> : <Image src={item.src} alt={item.alt} fill sizes="(max-width: 900px) 100vw, 33vw" unoptimized />}</div><figcaption>{item.caption}</figcaption></figure>)}</div>
      <small>资料来源：企业知识库文章 {study.sourceId}。页面阶段以企业后续交付、验收与授权资料为准。</small>
    </section>
    <section className={styles.caseRelatedTopics} aria-labelledby="case-related-title"><div><p>RELATED PRODUCT TOPICS</p><h2 id="case-related-title">理解相关产品方向</h2><span>相关品类用于理解方案方向，不代表项目最终采用这些页面中的具体型号。</span></div><nav aria-label="关联产品专题">{study.relatedTopics.map((item) => <Link href={item.href} key={item.href}>{item.label}<span>↗</span></Link>)}</nav></section>
    <section className={styles.caseStrategy}><div><p>LIGHTING STRATEGY</p><h2>照明策略</h2></div><ol>{study.strategy.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span></li>)}</ol></section>
    <section className={styles.caseCta}><div><p>PROJECT BRIEF</p><h2>让项目资料<br/>从方案走向落地。</h2></div><Link href={consultationHref("project", "case-detail", study.sourceId)}>提交工程需求 →</Link></section>
  </main>;
}

function CaseCard({ study, index }: { study: CaseStudy; index: number }) {
  return <Link href={`/cases/${study.slug}`} className={styles.caseCard}>
    <div><Image src={study.image} alt={`${study.title}企业来源资料`} width={800} height={560} loading="lazy" unoptimized /><span>{study.stage}</span></div>
    <small>{String(index + 1).padStart(2, "0")} / {study.type}</small><h2>{study.title}</h2><p>{study.summary}</p><b>查看项目资料 ↗</b>
  </Link>;
}
