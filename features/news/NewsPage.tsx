import Image from "next/image";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import type { NewsPageResult } from "@/lib/api/types";
import { newsPagePath } from "@/lib/news-pagination";
import styles from "./NewsPage.module.css";

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
  const pageResult = initialPage;
  const articles = pageResult.items;
  const [featured, ...rest] = articles;

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}>
        <figure className={styles.heroMedia}>
          <Image src={page.image} alt={page.imageAlt ?? "钜豪照明资讯主题原创公共空间场景"} width={1672} height={941} priority sizes="100vw" />
          <figcaption>钜豪照明原创资讯主题代表图</figcaption>
        </figure>
        <div className={styles.heroContent} data-reveal="fade">
          <p className={styles.eyebrow}>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
        </div>
      </section>

      <section className={styles.content} aria-labelledby="news-list-title">
        <header className={styles.sectionHead} data-reveal>
          <span>INSIGHTS / 资讯</span>
          <h2 id="news-list-title">理解光，也理解空间</h2>
        </header>

        <div className={styles.stateMessages} aria-live="polite" aria-atomic="true">
          {articles.length === 0 && (
            <div className={styles.emptyState} role="status">
              <small>NEWSROOM / EMPTY</small>
              <strong>资讯内容正在整理</strong>
              <p>当前没有可在私有预览中展示的文章。</p>
            </div>
          )}

          {articles.length > 0 && (
            <p className={styles.screenReader}>已加载第 {pageResult.page} 页的 {articles.length} 条资讯，共 {pageResult.total} 条。</p>
          )}
        </div>

        {featured && (
          <div className={styles.feed}>
            <Link className={styles.featured} href={featured.path} data-reveal>
              <figure className={styles.featuredImage}>
                <Image src={featured.image} alt={`${featured.title}主题场景代表图`} width={1672} height={941} sizes="(max-width: 800px) 100vw, 58vw" />
                <figcaption>主题代表图 · 非文章证据图</figcaption>
              </figure>
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
