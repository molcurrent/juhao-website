import Link from "next/link";
import Image from "next/image";
import type { PageData } from "@/app/_data/pages";
import { AnalyticsView, CaseDepthAnalytics } from "@/components/analytics/AnalyticsEvents";
import { EvidenceScale, type EvidenceScaleItem } from "@/components/experience/EvidenceScale";
import { LightFieldCanvas } from "@/components/experience/LightFieldCanvas";
import { SemanticPicture } from "@/components/media/SemanticPicture";
import { caseStudies, productTopics, type CaseStudy, type ProductTopic } from "@/content/catalog";
import { buildEngineeringFilterCoverage } from "@/content/product-filter-coverage";
import { productTitleParts, products, productsByTopic, type ProductRecord } from "@/content/products";
import { topicGuideBySlug, type TopicGuide } from "@/content/topic-guides";
import { consultationHref } from "@/lib/consultation";
import { requireRuntimeMedia } from "@/lib/media/runtime";
import styles from "./CatalogPages.module.css";

function Hero({ page, label }: { page: PageData; label: string }) {
  return <section className={styles.hero} data-header-tone="light" data-page-hero="image">
    <Image className={styles.heroMedia} src={page.image} alt={`${page.title}专题视觉`} width={1600} height={1000} priority unoptimized />
    <div className={styles.heroShade} aria-hidden="true" />
    <div className={styles.heroCopy}><p data-page-role="eyebrow">{label}</p><h1 data-page-role="display">{page.title}</h1><span data-page-role="lead">{page.intro}</span></div>
  </section>;
}

const featuredProducts = productTopics
  .map((topic) => productsByTopic(topic.slug)[0])
  .filter((product): product is ProductRecord => Boolean(product))
  .slice(0, 3);

function ProductCenterHero({ page }: { page: PageData }) {
  return <section className={`${styles.hero} ${styles.productHero}`} data-header-tone="light" data-page-hero="image">
    <Image className={styles.heroMedia} src={page.image} alt={`${page.title}专题视觉`} width={1600} height={1000} priority unoptimized />
    <div className={styles.heroShade} aria-hidden="true" />
    <div className={`${styles.heroCopy} ${styles.productHeroCopy}`}>
      <div><p data-page-role="eyebrow">产品中心</p><h1 data-page-role="display">{page.title}</h1><span data-page-role="lead">{page.intro}</span></div>
      <aside className={styles.productEvidence} aria-label="已发布产品样本">
        <header><small>已核验样本</small><strong>来源可追溯样本</strong></header>
        {featuredProducts.map((product) => {
          const title = productTitleParts(product);
          return <Link href={product.seo_slug} key={product.source_id}>
            <SemanticPicture mediaId={product.primary_media_id} alt={`${title.accessibleName} 产品资料图`} sizes="88px" />
            <span><small>{product.topic} · {title.model || product.source_id}</small><strong>{title.description}</strong></span>
            <b aria-hidden="true">↗</b>
          </Link>;
        })}
      </aside>
    </div>
  </section>;
}

export function ProductsPage({ page }: { page: PageData }) {
  const filterCoverage = buildEngineeringFilterCoverage(products);
  return <main id="main-content" className={styles.page} tabIndex={-1}>
    <ProductCenterHero page={page} />
    <section className={styles.intro} data-header-tone="dark"><p>产品内容中心</p><div><h2>从空间出发<br/>找到合适的光</h2><span>当前私有预览开放 {products.length} 款产品详情，覆盖 10 个产品专题。页面只呈现企业知识库与商城中可核对的字段；具体适用性仍需结合安装条件和项目资料确认。</span></div></section>
    <section className={styles.filterCoverage} data-filter-contract="SOURCE FIELD COVERAGE" aria-labelledby="product-filter-coverage-title">
      <header><p>工程字段覆盖</p><h2 id="product-filter-coverage-title">先确认资料，再开放筛选</h2><span>不从标题、图片或复合字段推断功率、色温、显色、配光、尺寸或安装方式。</span></header>
      <div>{filterCoverage.map((item) => <article key={item.key}><strong>{item.label}</strong><span>{item.coveredProducts}/{item.totalProducts}</span><small>{item.gapMessage}</small></article>)}</div>
      <footer><button type="button" disabled>资料不足，暂不可筛选</button><Link href={consultationHref("project", "products", "model-confirmation")}>带型号进入人工确认 →</Link></footer>
    </section>
    <section className={styles.topicGrid} data-header-tone="dark" aria-label="产品专题">
      {productTopics.map((topic, index) => <TopicCard topic={topic} index={index} key={topic.slug} />)}
    </section>
    <section className={styles.workflow} data-header-tone="light"><p>选型路径</p><ol><li><b>01</b><span>从空间与任务开始</span></li><li><b>02</b><span>核对参数与安装条件</span></li><li><b>03</b><span>进入方案咨询或商城采购</span></li></ol><div><Link href={consultationHref("project", "products")}>获取选型方案 →</Link><Link href="/mall">查看商城连接与采购兜底 ↗</Link></div></section>
  </main>;
}

function TopicCard({ topic, index }: { topic: ProductTopic; index: number }) {
  const publishedCount = productsByTopic(topic.slug).length;
  return <Link href={`/products/${topic.slug}`} className={styles.topicCard} data-reveal data-reveal-delay={String(Math.min(index, 5) * 0.05)}>
    <Image src={topic.cardImage} alt={`${topic.title}专题场景`} width={1000} height={760} loading="lazy" unoptimized />
    <i aria-hidden="true" />
    <small>{topic.scene}</small><div><h2>{topic.title}</h2><p>{topic.description}</p><span>{publishedCount ? `查看 ${publishedCount} 款精选产品` : "进入专题获取选型建议"} ↗</span></div>
  </Link>;
}

export function ProductTopicPage({ page, topic }: { page: PageData; topic: ProductTopic }) {
  const topicProducts = productsByTopic(topic.slug);
  const guide = topicGuideBySlug(topic.slug);
  const usedMedia = new Set((guide?.media ?? []).map((item) => item.src.startsWith("media-") ? requireRuntimeMedia(item.src).fallback : item.src));
  const productCards = topicProducts.map((product) => {
    const source = requireRuntimeMedia(product.primary_media_id).fallback;
    const showMedia = !usedMedia.has(source);
    usedMedia.add(source);
    return { product, showMedia };
  });
  return <main id="main-content" className={styles.page} tabIndex={-1}>
    <Hero page={page} label="产品专题" />
    <section className={styles.intro} data-header-tone="dark"><p>{topic.scene}</p><div><h2>{topic.title}<br/>产品专题</h2><span>{topic.description}</span></div></section>
    {guide && <FlagshipTopicGuide guide={guide} products={topicProducts} topic={topic} />}
    {topicProducts.length > 0 ? <section className={styles.productGrid} data-header-tone="dark" aria-label={`${topic.title}产品列表`}>
      {productCards.map(({ product, showMedia }) => <ProductCard product={product} showMedia={showMedia} key={product.source_id} />)}
    </section> : <section className={styles.emptyTopic}><p>该专题需要结合空间、协议或安装条件进行选型。</p><Link href={consultationHref("project", "product-topic", topic.slug)}>提交需求获取产品建议 →</Link></section>}
    <section className={styles.workflow} data-header-tone="light"><p>选型提示</p><ol><li><b>01</b><span>先核对空间与使用任务</span></li><li><b>02</b><span>再确认参数、安装和控制条件</span></li><li><b>03</b><span>最终以商城或项目确认资料为准</span></li></ol><div><Link href="/products">返回产品中心 →</Link><Link href={consultationHref("project", "product-topic", topic.slug)}>咨询产品方案 ↗</Link></div></section>
  </main>;
}

function FlagshipTopicGuide({ guide, products: topicProducts, topic }: { guide: TopicGuide; products: ProductRecord[]; topic: ProductTopic }) {
  return <>
    <section className={styles.topicStatus} data-header-tone="light" aria-label="专题资料状态" data-status-contract="CONTENT STATUS">
      <p>资料状态</p><strong>{guide.status}</strong>
    </section>
    <section className={styles.topicScenes} id="topic-scenarios" data-header-tone="dark" aria-labelledby="topic-scenarios-title">
      <header><h2 id="topic-scenarios-title">先按空间任务选</h2><span>以下内容是选型检查路径，不替代具体型号的配光、检测和现场样板。</span></header>
      <div>{guide.scenarios.map((scene) => <article key={scene.title}><h3>{scene.title}</h3><p>{scene.task}</p><ul>{scene.checks.map((check) => <li key={check}>{check}</li>)}</ul></article>)}</div>
    </section>
    {guide.comparisonFields.length > 0 && topicProducts.length > 0 && <section className={styles.topicComparison} id="topic-comparison" data-header-tone="light" aria-labelledby="topic-comparison-title" data-comparison-contract="SOURCE FIELD COMPARISON">
      <header><h2 id="topic-comparison-title">只对照已确认字段</h2><span>缺少正式资料的参数不会从商品标题、图片或经验中补写。</span></header>
      <div className={styles.tableWrap}><table><thead><tr><th scope="col">对照项</th>{topicProducts.map((product) => <th scope="col" key={product.source_id}><Link href={product.seo_slug}>{product.model || product.source_id}</Link></th>)}</tr></thead>
        <tbody>{guide.comparisonFields.map((field) => <tr key={field.label}><th scope="row">{field.label}</th>{topicProducts.map((product) => {
          const value = field.parameter ? product.parameters.find((item) => item.name === field.parameter)?.value : undefined;
          return <td key={product.source_id}>{value ?? field.note ?? "资料待补充"}</td>;
        })}</tr>)}</tbody></table></div>
    </section>}
    {guide.media.length > 0 && <section className={styles.topicMedia} data-header-tone="dark" aria-labelledby="topic-media-title">
      <header><h2 id="topic-media-title">语义化资料图片</h2><span>图片标题与来源随内容呈现；当前站点素材已登记批次授权，图片本身不替代产品参数或项目事实审核。</span></header>
      <div>{guide.media.map((item, index) => <figure key={`${item.src}-${index}`}>{item.src.startsWith("media-") ? <SemanticPicture mediaId={item.src} alt={item.alt} sizes="(max-width: 900px) 100vw, 33vw" /> : <Image src={item.src} alt={item.alt} width={1000} height={760} loading="lazy" unoptimized />}<figcaption>{item.caption}</figcaption></figure>)}</div>
    </section>}
    <section className={styles.topicRelated} data-header-tone="dark" aria-labelledby="topic-related-title">
      <header><h2 id="topic-related-title">关联应用与项目资料</h2><span>关联内容用于理解方案方向，不代表某个项目最终采用当前展示型号。</span></header>
      <div>{guide.related.map((item) => <Link href={item.href} key={item.href}><small>{item.status ?? "关联内容"}</small><h3>{item.title}</h3><p>{item.text}</p></Link>)}</div>
    </section>
    <section className={styles.topicFaq} data-header-tone="dark" aria-labelledby="topic-faq-title">
      <header><h2 id="topic-faq-title">{topic.title}常见问题</h2></header>
      <div>{guide.faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
    </section>
    <aside className={styles.topicMissing} data-header-tone="light" aria-label="仍待补齐的资料"><p>资料边界</p><div><h2>这些信息仍待企业补齐</h2><ul>{guide.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul></div></aside>
  </>;
}

function ProductCard({ product, showMedia }: { product: ProductRecord; showMedia: boolean }) {
  const opticalSpecimen = product.topic_slug === "spotlights";
  const title = productTitleParts(product);
  return <Link className={`${styles.productCard} ${opticalSpecimen ? styles.opticalProductCard : ""}`} data-optical-specimen={opticalSpecimen || undefined} href={product.seo_slug} data-reveal>
    {showMedia ? <div><SemanticPicture mediaId={product.primary_media_id} alt={`${title.accessibleName} 产品资料图`} sizes="(max-width: 900px) 100vw, 33vw" style={{ viewTransitionName: `product-${product.source_id}` }} />{opticalSpecimen && <span className={styles.cardOpticalLabel} aria-hidden="true">OPTICAL SPECIMEN · VISUAL STUDY</span>}</div> : <div className={styles.productCardPlaceholder}><span>同系列产品</span><strong>{product.model || product.source_id}</strong><em>共用资料图，不重复展示</em></div>}
    <small>{product.topic} / {product.department}</small><h2 aria-label={title.accessibleName}>{title.hasModel && <span className={styles.productCardModel}>{title.model}</span>}<span className={styles.productCardName}>{title.description}</span></h2><p>{product.parameters.slice(0, 3).map((item) => `${item.name}：${item.value}`).join(" · ")}</p><b>查看产品详情 ↗</b>
  </Link>;
}

export function CasesPage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page} tabIndex={-1}>
    <Hero page={page} label="工程项目" />
    <section className={styles.intro} data-header-tone="dark"><p>工程项目中心</p><div><h2>把项目阶段<br/>写在案例之前</h2><span>以下内容依据企业知识库项目资料重构。签约或中标项目不会表述为已完工案例；具体产品清单、参数与实施成果在资料完成后补充。</span></div></section>
    <header className={styles.caseTrackHeader}>
      <div><small>项目证据档案</small><strong>{caseStudies.length} 个可追溯项目档案</strong></div>
      <p>横向浏览全部项目；每一项先显示当前阶段，再进入来源、空间与待补资料。</p>
    </header>
    <section className={styles.caseGrid} data-header-tone="dark" aria-label="工程项目与案例">
      {caseStudies.map((study, index) => <CaseCard study={study} index={index} key={study.slug} />)}
    </section>
    <section className={styles.caseCta} data-header-tone="light"><div><p>PROJECT BRIEF</p><h2>有一个真实项目？<br/>从需求和阶段开始。</h2></div><Link href={consultationHref("project", "cases")}>提交工程需求 →</Link></section>
  </main>;
}

export function CaseDetailPage({ study }: { study: CaseStudy }) {
  const sourceMeta = "sourceMeta" in study ? study.sourceMeta : null;
  const hasSpaceBreakdown = study.spaceBreakdown.length > 0;
  const consultationLink = consultationHref("project", "case-detail", study.sourceId);
  const evidenceItems: EvidenceScaleItem[] = [
    { code: "01", title: "来源", value: `企业知识库文章 ${study.sourceId}`, status: "confirmed" },
    { code: "02", title: "当前阶段", value: study.stage, status: "context" },
    { code: "03", title: "空间证据", value: hasSpaceBreakdown ? `${study.spaceBreakdown.length} 个来源分节` : "来源未提供空间分节", status: hasSpaceBreakdown ? "confirmed" : "pending" },
    { code: "04", title: "交付与完工", value: "正式资料待补", status: "pending" },
    { code: "05", title: "下一步", value: "带当前项目进入咨询", status: "action", href: consultationLink },
  ];
  return <main id="main-content" className={styles.page} data-case-mode={hasSpaceBreakdown ? "spatial" : "archive"} data-lightfield-page="case" tabIndex={-1}>
    <AnalyticsView event={{ name: "case_detail_view", contentId: study.sourceId }} />
    <CaseDepthAnalytics contentId={study.sourceId} />
    <section className={styles.caseDetailHero} data-header-tone="light" data-page-hero="image">
      <SemanticPicture className={styles.caseHeroMedia} imageClassName={styles.caseHeroImage} mediaId={study.image} alt={`${study.title}企业来源资料`} sizes="100vw" priority style={{ viewTransitionName: `case-${study.sourceId}` }} />
      <LightFieldCanvas className={styles.caseLightField} variant="case" />
      <div><p data-page-role="eyebrow">{study.stage} / {study.type}</p><small className={styles.caseMode}>{hasSpaceBreakdown ? "空间证据重构" : "档案证据扫描"}</small><h1 data-page-role="display">{study.title}</h1><span data-page-role="lead">{study.summary}</span><strong>页面图片已纳入当前站点媒体授权批次；不作为供货、施工、交付或完工证明</strong></div>
    </section>
    <EvidenceScale items={evidenceItems} label="项目事实证据刻度" />
    <nav className={styles.caseSectionNav} aria-label="项目资料章节"><a href="#case-overview">项目背景</a><a href="#case-spaces">空间拆解</a><a href="#case-scope">方案范围</a><a href="#case-evidence">资料图集</a><a href="#case-boundary">资料边界</a></nav>
    <section className={styles.caseOverview} id="case-overview" data-header-tone="dark"><div><h2>项目背景</h2></div><p>{study.background}</p></section>
    {sourceMeta && <section className={styles.caseFacts} aria-label="案例来源与治理状态">
      <article><h2>来源日期</h2><ul><li>{sourceMeta.sourceDate}</li></ul></article>
      <article><h2>正文图数</h2><ul><li>{sourceMeta.bodyImageCount} 张</li></ul></article>
      <article><h2>事实边界</h2><ul><li>{sourceMeta.factBoundary}</li></ul></article>
      <article><h2>媒体授权</h2><ul><li>{sourceMeta.mediaAuthorization}</li></ul></article>
    </section>}
    {hasSpaceBreakdown && <section className={styles.caseSpaces} id="case-spaces" data-header-tone="light" aria-labelledby="case-spaces-title"><header><h2 id="case-spaces-title">按空间拆解方案方向</h2><span>只呈现企业原文能够支持的方案方向，不使用“已安装”或“已实现”等完成时态。</span></header><div>{study.spaceBreakdown.map((space) => <article key={space.title}><h3>{space.title}</h3><p>{space.text}</p></article>)}</div></section>}
    {!hasSpaceBreakdown && sourceMeta && <section className={styles.caseOverview} aria-label="空间分节状态"><div><h2>空间分节状态</h2></div><p>{sourceMeta.spaceEvidenceNote}</p></section>}
    <section className={styles.caseFacts} id="case-scope" data-header-tone="light">
      <article><h2>方案范围</h2><ul>{study.solutionScope.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h2>产品方向清单</h2><ul>{study.productList.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><h2>完工资料状态</h2><ul>{study.completionEvidence.map((item) => <li key={item}>{item}</li>)}</ul></article>
    </section>
    <section className={styles.caseEvidence} id="case-evidence" data-header-tone="dark">
      <header><h2>企业资料图集</h2><span>{study.evidenceLabel}</span></header>
      <div>{study.evidenceImages.map((item) => <figure key={item.src}><div className={"width" in item ? styles.evidenceNatural : undefined}><SemanticPicture className={styles.evidencePicture} mediaId={item.src} alt={item.alt} sizes="(max-width: 900px) 100vw, 33vw" /></div><figcaption>{item.caption}</figcaption></figure>)}</div>
      <small>资料来源：企业知识库文章 {study.sourceId}。页面阶段以企业后续交付、验收与授权资料为准。</small>
    </section>
    <section className={styles.caseVerification} id="case-boundary" data-header-tone="dark" aria-labelledby="case-verification-title">
      <header><h2 id="case-verification-title">已确认，与尚待补齐</h2></header>
      <div><article><small>已确认</small><h3>企业资料已确认</h3><ul>{study.confirmedFacts.map((item) => <li key={item}>{item}</li>)}</ul></article><article><small>待补齐</small><h3>暂不能作为结论</h3><ul>{study.completionEvidence.map((item) => <li key={item}>{item}</li>)}{!sourceMeta && <li>项目方对官网公开使用资料的正式授权：待确认</li>}</ul></article></div>
    </section>
    <section className={styles.caseRelatedTopics} aria-labelledby="case-related-title"><div><h2 id="case-related-title">理解相关产品方向</h2><span>相关品类用于理解方案方向，不代表项目最终采用这些页面中的具体型号。</span></div><nav aria-label="关联产品专题">{study.relatedTopics.map((item) => <Link href={item.href} key={item.href}>{item.label}<span>↗</span></Link>)}</nav></section>
    <section className={styles.caseStrategy}><div><h2>照明策略</h2></div><ol>{study.strategy.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span></li>)}</ol></section>
    <section className={styles.caseCta}><div><p>PROJECT BRIEF</p><h2>让项目资料<br/>从方案走向落地。</h2></div><Link href={consultationLink}>提交工程需求 →</Link></section>
  </main>;
}

function CaseCard({ study, index }: { study: CaseStudy; index: number }) {
  return <Link href={`/cases/${study.slug}`} className={styles.caseCard} data-reveal data-reveal-delay={String(Math.min(index, 4) * 0.05)}>
    <div><SemanticPicture mediaId={study.image} alt={`${study.title}企业来源资料`} sizes="(max-width: 900px) 100vw, 33vw" style={{ viewTransitionName: `case-${study.sourceId}` }} /><span>{study.stage}</span></div>
    <small>{study.type}</small><h2>{study.title}</h2><p>{study.summary}</p><b>查看项目资料 ↗</b>
  </Link>;
}
