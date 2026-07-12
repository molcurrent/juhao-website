"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type NewsPageResult } from "@/lib/api";
import { newsPagePath } from "@/lib/news-pagination";
import styles from "./NewsPage.module.css";

type NewsLoadState = "loading" | "success" | "error";

type NewsResult = {
  requestKey: string;
  page: NewsPageResult;
  status: NewsLoadState;
};

function paginationItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total))].sort((a, b) => a - b);
  return pages.flatMap((page, index) => index > 0 && page - pages[index - 1] > 1 ? [-1, page] : [page]);
}

export function NewsPage({
  page,
  initialPage,
}: {
  page: PageData;
  initialPage: NewsPageResult;
}) {
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<NewsResult>({
    requestKey: "server",
    page: initialPage,
    status: "loading",
  });
  const requestKey = `${initialPage.page}:${retryKey}`;
  const status: NewsLoadState = result.requestKey === requestKey ? result.status : "loading";
  const pageResult = result.page.page === initialPage.page ? result.page : initialPage;
  const articles = pageResult.items;
  const [featured, ...rest] = articles;

  useEffect(() => {
    let active = true;

    siteApi.getNewsArticles({ page: initialPage.page, pageSize: initialPage.pageSize }).then(
      (nextPage) => {
        if (!active) return;
        setResult({ requestKey, page: nextPage, status: "success" });
      },
      () => {
        if (!active) return;
        setResult((current) => ({ requestKey, page: current.page.page === initialPage.page ? current.page : initialPage, status: "error" }));
      },
    );

    return () => { active = false; };
  }, [initialPage, requestKey]);

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero} style={{ backgroundImage: `url(${page.image})` }}>
        <div className={styles.heroContent} data-reveal="fade">
          <p className={styles.eyebrow}>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
        </div>
      </section>

      <section className={styles.content} aria-labelledby="news-list-title" aria-busy={status === "loading"}>
        <header className={styles.sectionHead} data-reveal>
          <span>INSIGHTS / 资讯</span>
          <h2 id="news-list-title">理解光，也理解空间</h2>
        </header>

        <div className={styles.stateMessages} aria-live="polite" aria-atomic="true">
          {status === "loading" && (
            <div className={styles.statePanel} role="status">
              <div className={styles.stateCopy}>
                <i className={styles.loadingMark} aria-hidden="true" />
                <div>
                  <strong>{articles.length ? "正在同步最新资讯" : "正在加载资讯"}</strong>
                  <p>{articles.length ? "首屏内容保持可读，刷新完成后自动更新。" : "请稍候。"}</p>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className={`${styles.statePanel} ${styles.errorState}`} role="alert">
              <div className={styles.stateCopy}>
                <i aria-hidden="true">!</i>
                <div>
                  <strong>暂时无法刷新资讯</strong>
                  <p>{articles.length ? "以下仍显示服务端已加载的内容。" : "当前没有可显示的缓存内容。"}</p>
                </div>
              </div>
              <button type="button" onClick={() => setRetryKey((key) => key + 1)}>重新加载</button>
            </div>
          )}

          {status === "success" && articles.length === 0 && (
            <div className={styles.emptyState} role="status">
              <small>NEWSROOM / EMPTY</small>
              <strong>资讯内容正在整理</strong>
              <p>当前没有可公开的文章，请稍后再来查看。</p>
            </div>
          )}

          {status === "success" && articles.length > 0 && (
            <p className={styles.screenReader}>已加载第 {pageResult.page} 页的 {articles.length} 条资讯，共 {pageResult.total} 条。</p>
          )}
        </div>

        {featured && (
          <div className={`${styles.feed} ${status !== "success" ? styles.feedAfterState : ""}`}>
            <Link className={styles.featured} href={featured.path} data-reveal>
              <div className={styles.featuredImage} style={{ backgroundImage: `url(${featured.image})` }} />
              <div className={styles.featuredCopy}>
                <small>{featured.published ?? "持续更新"}</small>
                <h2>{featured.title}</h2>
                <p>{featured.description}</p>
                <b aria-hidden="true">↗</b>
              </div>
            </Link>
            {rest.length > 0 && (
              <div className={styles.list}>
                {rest.map((article) => (
                  <Link className={styles.article} href={article.path} key={article.path} data-reveal>
                    <small>{article.published ?? "持续更新"}</small>
                    <div><h2>{article.title}</h2><p>{article.description}</p></div>
                    <b aria-hidden="true">↗</b>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {pageResult.totalPages > 1 && (
          <nav className={styles.pagination} aria-label="资讯分页">
            {pageResult.page > 1
              ? <Link className={styles.pageDirection} href={newsPagePath(pageResult.page - 1)} rel="prev">← 上一页</Link>
              : <span className={`${styles.pageDirection} ${styles.pageDisabled}`} aria-disabled="true">← 上一页</span>}
            <div className={styles.pageNumbers}>
              {paginationItems(pageResult.page, pageResult.totalPages).map((item, index) => item === -1
                ? <span className={styles.pageEllipsis} aria-hidden="true" key={`ellipsis-${index}`}>…</span>
                : item === pageResult.page
                  ? <span className={styles.pageCurrent} aria-current="page" key={item}>{String(item).padStart(2, "0")}</span>
                  : <Link href={newsPagePath(item)} key={item}>{String(item).padStart(2, "0")}</Link>)}
            </div>
            {pageResult.page < pageResult.totalPages
              ? <Link className={styles.pageDirection} href={newsPagePath(pageResult.page + 1)} rel="next">下一页 →</Link>
              : <span className={`${styles.pageDirection} ${styles.pageDisabled}`} aria-disabled="true">下一页 →</span>}
          </nav>
        )}
      </section>
    </main>
  );
}

export function NewsArticlePage({ page }: { page: PageData }) {
  return (
    <main id="main-content" className={styles.articlePage}>
      <header className={styles.articleHeader}><p className={styles.eyebrow}>{page.eyebrow} · {page.published}</p><h1 data-reveal="fade">{page.title}</h1><p>{page.intro}</p></header>
      <section className={styles.articleBody}>{page.sections.map((section, index) => <article key={section.title} data-reveal><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2><p>{section.text}</p></div></article>)}</section>
    </main>
  );
}
