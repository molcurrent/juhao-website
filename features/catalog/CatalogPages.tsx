import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { caseStudies, productTopics, type CaseStudy, type ProductTopic } from "@/content/catalog";
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
    <section className={styles.intro}><p>产品内容中心</p><div><h2>底层全量管理<br/>前台精选发布</h2><span>首批 10 个专题已经建立，100 款候选产品已进入审核台账。详情页只在销售状态、图片、参数、事业部与资料完整性全部确认后开放。</span></div></section>
    <section className={styles.topicGrid} aria-label="产品专题">
      {productTopics.map((topic, index) => <TopicCard topic={topic} index={index} key={topic.slug} />)}
    </section>
    <section className={styles.workflow}><p>选型路径</p><ol><li><b>01</b><span>从空间与任务开始</span></li><li><b>02</b><span>核对参数与安装条件</span></li><li><b>03</b><span>进入方案咨询或商城采购</span></li></ol><div><Link href={consultationHref("project", "products")}>咨询产品与方案 →</Link><a href="https://mall.juhao.com" rel="external">进入钜豪商城 ↗</a></div></section>
  </main>;
}

function TopicCard({ topic, index }: { topic: ProductTopic; index: number }) {
  return <Link href={`/products/${topic.slug}`} className={styles.topicCard} style={{ backgroundImage: `linear-gradient(180deg,transparent,#050605e8),url(${topic.image})` }}>
    <small>{String(index + 1).padStart(2, "0")} / {topic.scene}</small><div><h2>{topic.title}</h2><p>{topic.description}</p><span>进入专题 ↗</span></div>
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

function CaseCard({ study, index }: { study: CaseStudy; index: number }) {
  return <Link href={`/cases/${study.slug}`} className={styles.caseCard}>
    <div style={{ backgroundImage: `url(${study.image})` }}><span>{study.stage}</span></div>
    <small>{String(index + 1).padStart(2, "0")} / {study.type}</small><h2>{study.title}</h2><p>{study.summary}</p><b>查看项目资料 ↗</b>
  </Link>;
}
