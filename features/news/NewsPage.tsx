"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type NewsItem } from "@/lib/api";
import styles from "./NewsPage.module.css";

type NewsLoadState = "loading" | "success" | "error";

type NewsResult = {
  requestKey: number;
  articles: NewsItem[];
  status: NewsLoadState;
};

export function NewsPage({
  page,
  initialArticles,
}: {
  page: PageData;
  initialArticles: NewsItem[];
}) {
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<NewsResult>({
    requestKey: 0,
    articles: initialArticles,
    status: "loading",
  });
  const status: NewsLoadState = result.requestKey === retryKey ? result.status : "loading";
  const articles = result.articles;
  const [featured, ...rest] = articles;

  useEffect(() => {
    let active = true;

    siteApi.getNewsArticles().then(
      (nextArticles) => {
        if (!active) return;
        setResult({ requestKey: retryKey, articles: nextArticles, status: "success" });
      },
      () => {
        if (!active) return;
        setResult((current) => ({ requestKey: retryKey, articles: current.articles, status: "error" }));
      },
    );

    return () => { active = false; };
  }, [retryKey]);

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
            <p className={styles.screenReader}>已加载 {articles.length} 条资讯。</p>
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
