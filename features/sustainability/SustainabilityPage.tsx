import Image from "next/image";
import type { PageData } from "@/app/_data/pages";
import styles from "./SustainabilityPage.module.css";

export function SustainabilityPage({ page }: { page: PageData }) {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}><Image className={styles.heroImage} src={page.image} alt={page.imageAlt ?? "钜豪照明可持续信息主题场景"} width={1672} height={941} priority sizes="100vw"/><div className={styles.heroContent} data-reveal="fade"><p className={styles.eyebrow}>{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p></div></section>
      <section className={styles.manifesto}><small data-reveal>01 / RESPONSIBILITY</small><div data-reveal><h2>把目标、行动与结果分开表达</h2><p>可持续发展不是视觉标签。每一项公开信息都应说明边界、时间和证据；尚未核验的数字不会被包装成已经完成的成果。</p></div></section>
      <section className={styles.pillars}><header data-reveal><span>02 / FRAMEWORK</span><h2>长期价值的四个维度</h2></header><div className={styles.grid}>{page.highlights.map((item, index) => <article className={styles.card} key={item.title} data-reveal><small>0{index + 1}</small><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
      <section className={styles.disclosure} data-reveal><h2>透明，才是<br/>可信的起点</h2><p>{page.sections.map((section) => section.text).join(" ")}</p></section>
    </main>
  );
}
