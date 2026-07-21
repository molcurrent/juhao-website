import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { searchCategories, type SearchCategory, type SearchEntry, type SearchPageResult } from "@/content/search-index";
import styles from "./SearchPage.module.css";

const quickLinks = [
  { href: "/products", label: "产品中心", text: "按产品专题和空间任务查看选型入口" },
  { href: "/cases", label: "工程案例", text: "查看项目阶段、空间需求与应用资料" },
  { href: "/knowledge", label: "企业知识库", text: "查阅新闻、商城帮助与智能家居资料" },
  { href: "/service", label: "服务支持", text: "从安装、使用到售后找到处理路径" },
];

function searchHref(query: string, category: SearchCategory, page = 1) {
  const params = new URLSearchParams({ keywords: query });
  if (category !== "all") params.set("category", category);
  if (page > 1) params.set("page", String(page));
  return `/search?${params}`;
}

function highlightText(text: string, query: string) {
  const index = text.toLocaleLowerCase("zh-CN").indexOf(query.toLocaleLowerCase("zh-CN"));
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>;
}

export function SearchPage({ page, initialQuery, initialCategory, initialResults }: { page: PageData; initialQuery: string; initialCategory: SearchCategory; initialResults: SearchPageResult }) {
  const query = initialQuery.trim();
  const results: SearchEntry[] = query ? initialResults.items : [];
  const status = query ? "success" : "idle";
  const activeCategory = searchCategories.find((item) => item.id === initialCategory);
  const hasMatchesOutsideCategory = initialCategory !== "all" && initialResults.facets.all > 0 && results.length === 0;
  const summary = status === "idle"
    ? "输入关键词开始搜索"
    : `“${query}”的搜索结果`;

  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <section className={styles.hero}><p>{page.eyebrow}</p><h1>{page.title}</h1></section>
      <div className={styles.searchPanel}>
        <form className={styles.form} method="get" action="/search" role="search">
          <label htmlFor="site-keywords">搜索网站内容</label>
          <input id="site-keywords" name="keywords" type="search" defaultValue={query} placeholder="输入钜豪产品、项目或企业动态" autoComplete="off" />
          {initialCategory !== "all" && <input type="hidden" name="category" value={initialCategory} />}
          <button type="submit">搜索 <span>→</span></button>
        </form>
      </div>
      <section className={styles.results} data-search-results={status === "success" ? results.length : undefined}>
        <div className={styles.summary}>
          <span>{summary}</span>
          <span role="status" aria-live="polite" aria-atomic="true">{status === "success" ? `${initialResults.total} 条` : ""}</span>
        </div>

        {status === "success" && <div className={styles.filterArea}>
          <nav className={styles.filters} aria-label="按内容类型筛选" aria-describedby="search-filter-hint">
            {searchCategories.map((item) => <Link
              href={searchHref(query, item.id)}
              key={item.id}
              aria-current={initialCategory === item.id ? "page" : undefined}
            ><span>{item.label}</span><b>{initialResults.facets[item.id]}</b></Link>)}
          </nav>
          <p className={styles.filterHint} id="search-filter-hint"><span aria-hidden="true">↔</span>左右滑动查看全部分类</p>
        </div>}

        {status === "idle" && <div className={styles.idleState}>
          <div className={styles.idleIntro}>
            <small>快速入口</small>
            <strong>从常用入口开始</strong>
            <span>也可以在上方输入产品、项目、品牌动态或服务关键词。</span>
          </div>
          <nav className={styles.quickLinks} aria-label="常用内容入口">
            {quickLinks.map((item, index) => <Link href={item.href} key={item.href}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span><strong>{item.label}</strong><em>{item.text}</em></span>
              <b aria-hidden="true">↗</b>
            </Link>)}
          </nav>
        </div>}

        {status === "success" && results.length === 0 && <section className={styles.empty} aria-labelledby="search-empty-title">
          <div className={styles.emptyCode} aria-hidden="true"><strong>0</strong><span>RESULTS</span></div>
          <div className={styles.emptyContent}>
            <small>{activeCategory?.label ?? "全部"}分类</small>
            <strong id="search-empty-title">{hasMatchesOutsideCategory ? "当前分类没有匹配内容" : "没有找到匹配内容"}</strong>
            <p>{hasMatchesOutsideCategory
              ? `网站其他分类中有 ${initialResults.facets.all} 条与“${query}”相关的内容。`
              : "可以缩短关键词，或从已发布的产品、项目和企业资料继续查找。"}</p>
            <nav className={styles.emptyActions} aria-label="搜索无结果后的下一步">
              {hasMatchesOutsideCategory && <Link href={searchHref(query, "all")}>查看全部匹配 <span>→</span></Link>}
              <Link href="/products">浏览产品中心 <span>↗</span></Link>
              <Link href="/cases">查看工程案例 <span>↗</span></Link>
              <Link href="/contact">提交咨询 <span>↗</span></Link>
            </nav>
          </div>
        </section>}

        {status === "success" && results.length > 0 && <div className={styles.list}>{results.map((item) => <Link className={styles.result} href={item.path} key={item.path} data-reveal>
          <small>{item.scope === "archive" ? "历史档案" : item.type === "article" ? "INSIGHT" : item.type === "service" ? "SOLUTION" : "PAGE"}</small>
          <div><h2>{highlightText(item.title, query)}</h2><p>{highlightText(item.description, query)}</p></div><b aria-hidden="true">↗</b>
        </Link>)}</div>}
        {status === "success" && initialResults.totalPages > 1 && (
          <nav className={styles.pagination} aria-label="搜索结果分页">
            {initialResults.page > 1 && <Link href={searchHref(query, initialCategory, initialResults.page - 1)}>← 上一页</Link>}
            <span>第 {initialResults.page} / {initialResults.totalPages} 页</span>
            {initialResults.page < initialResults.totalPages && <Link href={searchHref(query, initialCategory, initialResults.page + 1)}>下一页 →</Link>}
          </nav>
        )}
        {status === "success" && results.length > 0 && <aside className={styles.resultsNext}>
          <div><small>下一步</small><strong>仍未找到需要的信息？</strong></div>
          <nav aria-label="搜索结果后的下一步"><Link href="/products">浏览全部产品</Link><Link href="/contact">提交具体需求 <span>→</span></Link></nav>
        </aside>}
      </section>
    </main>
  );
}
