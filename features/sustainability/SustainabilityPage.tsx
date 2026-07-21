import Image from "next/image";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import styles from "./SustainabilityPage.module.css";

const disclosureStatus = [
  { label: "本页阶段", value: "披露框架", note: "不等同于年度可持续发展报告" },
  { label: "量化指标", value: "尚未发布", note: "待来源、口径与企业审核完整" },
  { label: "当前证据", value: "原则与边界", note: "不引用未经审计的成果数字" },
  { label: "开放条件", value: "企业核验后", note: "按年度发布报告、进展与案例" },
] as const;

export function SustainabilityPage({ page }: { page: PageData }) {
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <section className={styles.hero}><Image className={styles.heroImage} src={page.image} alt={page.imageAlt ?? "钜豪照明可持续信息主题场景"} width={1672} height={941} priority sizes="100vw"/><div className={styles.heroContent} data-reveal="fade"><p className={styles.eyebrow}>{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p></div></section>
      <section className={styles.manifesto}><small data-reveal>责任原则</small><div data-reveal><h2>把目标、行动与结果分开表达</h2><p>可持续发展不是视觉标签。每一项公开信息都应说明边界、时间和证据；尚未核验的数字不会被包装成已经完成的成果。</p></div></section>
      <section className={styles.statusPanel} aria-labelledby="sustainability-status-title">
        <header data-reveal>
          <p>DISCLOSURE STATUS</p>
          <h2 id="sustainability-status-title">先公开边界，<br/>再公开结果</h2>
        </header>
        <dl>
          {disclosureStatus.map((item, index) => (
            <div key={item.label} data-reveal data-reveal-delay={String(index * 0.05)}>
              <dt><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</dt>
              <dd><strong>{item.value}</strong><small>{item.note}</small></dd>
            </div>
          ))}
        </dl>
        <footer>
          <p>页面版本 2026-07-18 · 企业审核状态：待确认</p>
          <nav aria-label="可持续信息下一步">
            <Link href="/downloads">查看资料发布状态 ↗</Link>
            <Link href="/contact?source=sustainability">提交资料核验需求 →</Link>
          </nav>
        </footer>
      </section>
      <section className={styles.pillars}><header data-reveal><span>长期框架</span><h2>长期价值的四个维度</h2></header><div className={styles.grid}>{page.highlights.map((item) => <article className={styles.card} key={item.title} data-reveal><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
      <section className={styles.disclosure} data-reveal><h2>透明，才是<br/>可信的起点</h2><p>{page.sections.map((section) => section.text).join(" ")}</p></section>
    </main>
  );
}
