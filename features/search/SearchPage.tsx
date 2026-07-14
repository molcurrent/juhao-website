import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import type { SearchResult } from "@/lib/api";
import styles from "./SearchPage.module.css";

export function SearchPage({ page, initialQuery, initialResults }: { page: PageData; initialQuery: string; initialResults: SearchResult[] }) {
  const query = initialQuery.trim();
  const results = query ? initialResults : [];
  const status = query ? "success" : "idle";
  const summary = status === "idle"
    ? "输入关键词开始搜索"
    : `“${query}”的搜索结果`;

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}><p>{page.eyebrow}</p><h1>{page.title}</h1></section>
      <div className={styles.searchPanel}>
        <form className={styles.form} method="get" action="/search" role="search">
          <label htmlFor="site-keywords">搜索网站内容</label>
          <input id="site-keywords" name="keywords" type="search" defaultValue={query} placeholder="输入钜豪产品、项目或企业动态" autoComplete="off" />
          <button type="submit">搜索 <span>→</span></button>
        </form>
      </div>
      <section className={styles.results} aria-live="polite" data-search-results={status === "success" ? results.length : undefined}>
        <div className={styles.summary}><span>{summary}</span><span>{status === "success" ? `${results.length} 条` : ""}</span></div>

        {status === "idle" && <div className={styles.empty}><strong>搜索钜豪网站</strong><span>可搜索钜豪产品、项目、品牌动态与服务内容。</span></div>}

        {status === "success" && results.length === 0 && <div className={styles.empty}><strong>没有找到匹配内容</strong><span>请尝试更短或不同的关键词。</span></div>}

        {status === "success" && results.length > 0 && <div className={styles.list}>{results.map((item) => <Link className={styles.result} href={item.path} key={item.path} data-reveal>
          <small>{item.type === "article" ? "INSIGHT" : item.type === "service" ? "SOLUTION" : "PAGE"}</small>
          <div><h2>{item.title}</h2><p>{item.description}</p></div><b aria-hidden="true">↗</b>
        </Link>)}</div>}
      </section>
    </main>
  );
}
