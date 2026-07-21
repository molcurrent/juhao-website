import Image from "next/image";
import Link from "next/link";

import type { PageData } from "@/app/_data/pages";
import { EvidenceScale, type EvidenceScaleItem } from "@/components/experience/EvidenceScale";
import {
  knowledgeCategories,
  knowledgeLibrary,
  type KnowledgeArticle,
} from "@/content/knowledge-library";
import { consultationHref } from "@/lib/consultation";

import styles from "./KnowledgeLibraryPage.module.css";

function articleDate(article: KnowledgeArticle) {
  return article.created_at.slice(0, 10) || "日期待核";
}

const contentStatusCopy = {
  full_text: { label: "正文已收录", listLabel: null, eyebrow: "正文资料", heading: "已收录可核正文", description: "" },
  summary_only: { label: "标题与摘要已收录", listLabel: "仅摘要", eyebrow: "标题与摘要", heading: "仅留存标题与摘要", description: "当前档案保留了来源标题和摘要，未发现可核对的正文段落。" },
  duration_only: { label: "仅收录视频时长", listLabel: "仅时长", eyebrow: "视频资料", heading: "已记录视频时长", description: "当前档案只保留视频时长，原视频与文字正文待补。" },
  in_progress: { label: "正文整理中", listLabel: "整理中", eyebrow: "整理状态", heading: "正文仍在整理", description: "来源明确标记为“内容整理中”，当前不将其展示为完整正文。" },
  metadata_only: { label: "教程资料待补", listLabel: "待补", eyebrow: "仅元数据", heading: "教程文件待补", description: "当前知识库只保留该教程的标题与时长，没有可核对的操作正文、视频文件或版本信息。目录项已经收录，待资料补齐后再更新正文。" },
} satisfies Record<KnowledgeArticle["content_status"], { label: string; listLabel: string | null; eyebrow: string; heading: string; description: string }>;

function statusCopy(article: KnowledgeArticle) {
  return contentStatusCopy[article.content_status];
}

function articleLead(article: KnowledgeArticle) {
  if (article.content_status === "duration_only") {
    return `当前仅收录视频时长：${article.description}`;
  }
  if (article.content_status === "in_progress") {
    return "当前正文仍在整理，暂不作为完整正文展示。";
  }
  if (article.content_status === "metadata_only") {
    return "当前仅收录基础教程资料，正文和关联文件待补。";
  }
  return article.description;
}

function KnowledgeStatusNotice({ article }: { article: KnowledgeArticle }) {
  const status = statusCopy(article);
  const duration = article.content_status === "duration_only" ? article.paragraphs.join("、") : "";
  const summary = article.content_status === "summary_only" && article.description !== article.title
    ? article.description
    : "";
  return <section className={styles.pendingRecord} data-page-section>
    <small>{status.eyebrow}</small>
    <h2>{status.heading}</h2>
    <p>{status.description}</p>
    {duration && <p>已登记的视频时长：{duration}</p>}
    {summary && <p>来源摘要：{summary}</p>}
  </section>;
}

export type KnowledgeLibraryView = {
  articles: KnowledgeArticle[];
  category: KnowledgeArticle["site_category"] | "all";
  page: number;
  total: number;
  totalPages: number;
};

function archiveHref(category: KnowledgeLibraryView["category"], page = 1) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/knowledge?${query}` : "/knowledge";
}

export function KnowledgeLibraryPage({ page, view }: { page: PageData; view: KnowledgeLibraryView }) {
  const activeCategory = view.category === "all"
    ? { id: "all", label: "全部资料", description: "按来源编号浏览全部五类企业资料。", count: knowledgeLibrary.totals.records }
    : knowledgeCategories.find((category) => category.id === view.category)!;
  return (
    <main id="main-content" className={styles.page} data-lightfield-page="knowledge-archive" tabIndex={-1}>
      <section className={styles.hero} data-page-hero="document">
        <div className={styles.heroMedia}><Image src={page.image} alt={page.imageAlt ?? "钜豪企业资料库"} fill priority sizes="(max-width: 760px) 100vw, 52vw" /></div>
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <nav aria-label="面包屑"><Link href="/">首页</Link><span>/</span><span>企业资料库</span></nav>
          <p className={styles.eyebrow} data-page-role="eyebrow">{page.eyebrow}</p>
          <h1 data-page-role="display">{page.title}</h1>
          <p data-page-role="lead">{page.intro}</p>
          <dl className={styles.totals} data-page-role="metadata">
            <div><dt>{knowledgeLibrary.totals.records}</dt><dd>来源记录</dd></div>
            <div><dt>{knowledgeLibrary.totals.full_text}</dt><dd>正文资料</dd></div>
            <div><dt>{knowledgeCategories.length}</dt><dd>业务分类</dd></div>
          </dl>
        </div>
      </section>

      <section className={styles.intro} aria-labelledby="knowledge-categories-title">
        <header>
          <p className={styles.sectionLabel}>资料分类</p>
          <h2 id="knowledge-categories-title">按业务主题查找资料</h2>
          <p>所有条目按企业知识库来源编号去重，统一作为不参与公开索引的历史档案保留。{knowledgeLibrary.totals.full_text} 条含可核正文，其余记录按摘要、视频时长、整理中或教程待补状态明确标注。旧商城模板仅供档案核对，不进入全站搜索，也不代表现行政策。</p>
        </header>
        <form className={styles.archiveSearch} method="get" action="/search" role="search">
          <label htmlFor="knowledge-keywords">搜索企业资料库</label>
          <input id="knowledge-keywords" name="keywords" type="search" placeholder="输入新闻、项目、招商、商城或智能家居关键词" />
          <input type="hidden" name="category" value="knowledge" />
          <button type="submit">搜索资料 <span aria-hidden="true">→</span></button>
        </form>
        <nav className={styles.categoryNav} aria-label="资料分类">
          <Link href="/knowledge" aria-current={view.category === "all" ? "page" : undefined}>
            <strong>全部资料</strong><span>跨五类浏览完整资料目录</span><b>{knowledgeLibrary.totals.records}</b>
          </Link>
          {knowledgeCategories.map((category) => (
            <Link href={archiveHref(category.id)} key={category.id} aria-current={view.category === category.id ? "page" : undefined}>
              <strong>{category.label}</strong>
              <span>{category.description}</span>
              <b>{category.count}</b>
            </Link>
          ))}
        </nav>
      </section>

      <div className={styles.archive}>
            <section id="knowledge-records" className={styles.categorySection} data-page-section aria-labelledby="knowledge-records-title">
              <header>
                <div><small>{String(view.page).padStart(2, "0")}</small><span>{view.total} 条</span></div>
                <div><p className={styles.sectionLabel}>当前分类</p><h2 id="knowledge-records-title">{activeCategory.label}</h2><p>{activeCategory.description}</p></div>
              </header>
              <ol className={styles.articleList}>
                {view.articles.map((article) => {
                  const status = statusCopy(article);
                  return <li key={article.source_id}>
                    <Link href={article.path}>
                      <small>#{article.source_id}</small>
                      <div><h3>{article.title}</h3><p>{article.description}</p></div>
                      <span><time dateTime={articleDate(article)}>{articleDate(article)}</time>{status.listLabel && <em>{status.listLabel}</em>}</span>
                      <b aria-hidden="true">↗</b>
                    </Link>
                  </li>
                })}
              </ol>
              {view.totalPages > 1 && (
                <nav className={styles.pagination} aria-label="资料分页">
                  {view.page > 1 && <Link href={archiveHref(view.category, view.page - 1)}>← 上一页</Link>}
                  <span>第 {view.page} / {view.totalPages} 页</span>
                  {view.page < view.totalPages && <Link href={archiveHref(view.category, view.page + 1)}>下一页 →</Link>}
                </nav>
              )}
            </section>
      </div>
    </main>
  );
}

export function KnowledgeArticlePage({ article }: { article: KnowledgeArticle }) {
  const related = knowledgeLibrary.articles
    .filter((item) => item.site_category === article.site_category && item.source_id !== article.source_id)
    .slice(0, 3);
  const consultationLink = consultationHref("project", "page", `knowledge-${article.source_id}`);
  const status = statusCopy(article);
  const lead = articleLead(article);
  const evidenceItems: EvidenceScaleItem[] = [
    { code: "01", title: "资料分类", value: article.site_category_label, status: "context" },
    { code: "02", title: "来源编号", value: `#${article.source_id}`, status: "confirmed" },
    { code: "03", title: "来源日期", value: articleDate(article), status: "confirmed" },
    { code: "04", title: "收录状态", value: status.label, status: article.content_status === "full_text" ? "confirmed" : "pending" },
    { code: "05", title: "下一步", value: article.historical_notice ? "核对现行服务" : "带来源进入资料咨询", status: "action", href: consultationLink },
  ];

  return (
    <main id="main-content" className={`${styles.page} ${styles.articlePage}`} data-lightfield-page="knowledge-record" tabIndex={-1}>
      <header className={styles.articleHeader} data-page-hero="document">
        <nav aria-label="面包屑"><Link href="/">首页</Link><span>/</span><Link href="/knowledge">企业资料库</Link><span>/</span><span>{article.site_category_label}</span></nav>
        <p className={styles.eyebrow} data-page-role="eyebrow">资料记录 · #{article.source_id}</p>
        <h1 data-page-role="display">{article.title}</h1>
        <p data-page-role="lead">{lead}</p>
        <dl data-page-role="metadata">
          <div><dt>资料分类</dt><dd>{article.site_category_label}</dd></div>
          <div><dt>来源编号</dt><dd>#{article.source_id}</dd></div>
          <div><dt>来源日期</dt><dd><time dateTime={articleDate(article)}>{articleDate(article)}</time></dd></div>
          <div><dt>收录状态</dt><dd>{status.label}</dd></div>
        </dl>
      </header>

      <EvidenceScale items={evidenceItems} label="资料来源证据刻度" />

      <div className={styles.articleLayout}>
        <aside aria-label="资料说明">
          <p className={styles.sectionLabel}>来源边界</p>
          <h2>资料边界</h2>
          <p>本文按企业知识库本地快照收录，来源编号和文本保持可追溯。</p>
          <ul>
            <li>远程图片与下载文件未直接发布。</li>
            <li>宣传性表述按历史来源保留，不自动升级为当前结论。</li>
            {article.historical_notice && <li>本条属于旧商城历史资料，不构成当前价格、支付、配送、售后或合作政策。</li>}
            {article.asset_notice && <li>来源关联文件尚未进入知识库，本页只展示现有文字记录。</li>}
          </ul>
          <details className={styles.sourceLens}>
            <summary>打开来源镜片 <span aria-hidden="true">＋</span></summary>
            <div className={styles.sourceLensPanel}>
              <small>档案来源镜片</small>
              <dl>
                <div><dt>编号</dt><dd>#{article.source_id}</dd></div>
                <div><dt>分类</dt><dd>{article.site_category_label}</dd></div>
                <div><dt>日期</dt><dd>{articleDate(article)}</dd></div>
                <div><dt>状态</dt><dd>{status.label}</dd></div>
              </dl>
              <Link href={consultationLink}>{article.historical_notice ? "核对现行服务" : "带来源进入资料咨询"} <span aria-hidden="true">→</span></Link>
            </div>
          </details>
        </aside>

        <article className={styles.articleBody} data-page-content="article">
          {article.content_status === "full_text"
            ? article.paragraphs.map((paragraph, index) => <p key={`${article.source_id}-${index}`}>{paragraph}</p>)
            : <KnowledgeStatusNotice article={article} />}
        </article>
      </div>

      <section className={styles.related} data-page-section aria-labelledby="knowledge-related-title">
        <header><p className={styles.sectionLabel}>同类资料</p><h2 id="knowledge-related-title">继续查看{article.site_category_label}</h2></header>
        <div>{related.map((item) => <Link href={item.path} key={item.source_id}><small>#{item.source_id}</small><strong>{item.title}</strong><span>查看资料 ↗</span></Link>)}</div>
      </section>
    </main>
  );
}
