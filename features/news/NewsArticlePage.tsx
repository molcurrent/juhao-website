import Image from "next/image";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { EvidenceScale, type EvidenceScaleItem } from "@/components/experience/EvidenceScale";
import styles from "./NewsPage.module.css";

function RepresentativeMedia({ page }: { page: PageData }) {
  const media = page.companyNewsEvidence?.local_representative_media;
  return (
    <figure className={styles.articleMedia}>
      <Image
        src={media?.src ?? page.image}
        alt={media?.alt ?? page.imageAlt ?? `${page.title}主题场景代表图`}
        width={media?.width ?? 1672}
        height={media?.height ?? 941}
        priority
        sizes="(max-width: 1120px) 100vw, 1120px"
      />
      <figcaption>{media?.caption ?? "钜豪照明原创主题代表图，不作为文章结论的证据图。"}</figcaption>
    </figure>
  );
}

function RelatedReading({ page }: { page: PageData }) {
  return (
    <section className={styles.articleRelated} aria-labelledby="article-related-title">
      <p className={styles.sectionLabel}>继续了解</p>
      <h2 id="article-related-title">继续核对产品与空间条件</h2>
      <div className={styles.relatedGrid}>
        {page.related.map((item) => (
          <Link href={item.href} key={item.href}>
            <strong>{item.label}</strong>
            <span>{item.text}</span>
            <b aria-hidden="true">↗</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NewsArticlePage({ page }: { page: PageData }) {
  const companyEvidence = page.companyNewsEvidence;
  const contactLink = page.related.find((item) => item.href.startsWith("/contact"))?.href ?? "/contact";
  const evidenceItems: EvidenceScaleItem[] = companyEvidence ? [
    { code: "01", title: "来源日期", value: companyEvidence.published, status: "confirmed" },
    { code: "02", title: "当前阶段", value: companyEvidence.phase_stage, status: "context" },
    { code: "03", title: "事实边界", value: companyEvidence.project_stage?.implementation ?? "按来源记录保守发布", status: companyEvidence.project_stage ? "pending" : "context" },
    { code: "04", title: "来源图片", value: `${companyEvidence.remote_media_count} 个候选待授权`, status: companyEvidence.remote_media_count > 0 ? "pending" : "confirmed" },
    { code: "05", title: "下一步", value: "带本篇来源进入咨询", status: "action", href: contactLink },
  ] : [
    { code: "01", title: "发布日期", value: page.published ?? "持续更新", status: "confirmed" },
    { code: "02", title: "内容类型", value: "钜豪企业动态", status: "context" },
    { code: "03", title: "正文结构", value: `${page.sections.length} 个内容章节`, status: "confirmed" },
    { code: "04", title: "资料复核", value: "以页面公开边界为准", status: "pending" },
    { code: "05", title: "下一步", value: "带当前内容进入咨询", status: "action", href: contactLink },
  ];

  return (
    <main id="main-content" className={styles.articlePage} data-lightfield-page="news-record" tabIndex={-1}>
      <header className={styles.articleHeader} data-header-tone="light" data-page-hero="document">
        <nav className={styles.articleBreadcrumbs} aria-label="面包屑">
          <Link href="/">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href="/news">钜豪动态</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">来源记录</span>
        </nav>
        <p className={styles.eyebrow} data-page-role="eyebrow">{page.eyebrow}</p>
        <h1 data-reveal="fade" data-page-role="display">{page.title}</h1>
        <p data-page-role="lead">{page.intro}</p>
        <div className={styles.articleMeta} aria-label="文章审核信息" data-page-role="metadata">
          {companyEvidence
            ? <><span>来源日期 <time dateTime={companyEvidence.published}>{companyEvidence.published}</time></span><span>来源记录 #{companyEvidence.source_id}</span><span>页面状态 待企业复核</span></>
            : <span>发布日期 <time dateTime={page.published}>{page.published ?? "持续更新"}</time></span>}
        </div>
      </header>

      <EvidenceScale items={evidenceItems} label="资讯来源证据刻度" />

      <RepresentativeMedia page={page} />

      <nav className={styles.articleNav} aria-label="文章章节">
        {companyEvidence && <a href="#company-news-facts-title">来源阶段</a>}
        {page.sections.map((section, index) => <a href={`#news-section-${index + 1}`} key={section.title}>{section.title}</a>)}
        {companyEvidence && <><a href="#company-news-boundary-title">公开边界</a><a href="#company-news-source-title">来源记录</a></>}
      </nav>

      {companyEvidence ? (
        <div className={styles.articleBody}>
          <section className={styles.evidenceSection} aria-labelledby="company-news-facts-title" data-reveal>
            <p className={styles.sectionLabel}>来源事实</p>
            <h2 id="company-news-facts-title">来源记录与当前阶段</h2>
            <ol>
              <li>来源状态：知识库中的有效企业资讯记录。</li>
              <li>当前阶段：{companyEvidence.phase_stage}。</li>
              {companyEvidence.project_stage && <li>项目边界：{companyEvidence.project_stage.confirmed}，{companyEvidence.project_stage.implementation}。</li>}
            </ol>
          </section>

          {page.sections.map((section, index) => (
            <article id={`news-section-${index + 1}`} key={section.title} data-reveal data-page-section>
              <div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}</div>
            </article>
          ))}

          <section className={`${styles.evidenceSection} ${styles.boundarySection}`} aria-labelledby="company-news-boundary-title" data-reveal>
            <p className={styles.sectionLabel}>发布边界</p>
            <h2 id="company-news-boundary-title">公开边界</h2>
            <ul>
              <li>{companyEvidence.publication_boundary}</li>
              <li>{`来源中的 ${companyEvidence.remote_media_count} 个图片候选尚未完成公开使用授权核验，当前不在页面发布。`}</li>
              <li>当前原创栏目示意图仅说明内容类型，不作为活动现场、项目实施或结果证据。</li>
            </ul>
          </section>

          <section className={styles.sourceSection} aria-labelledby="company-news-source-title" data-reveal>
            <div>
              <p className={styles.sectionLabel}>来源记录</p>
              <h2 id="company-news-source-title">{`企业知识库来源记录 #${companyEvidence.source_id}`}</h2>
              <dl>
                <div><dt>来源类型</dt><dd>企业商城资讯表</dd></div>
                <div><dt>来源编号</dt><dd>#{companyEvidence.source_id}</dd></div>
                <div><dt>来源日期</dt><dd><time dateTime={companyEvidence.published}>{companyEvidence.published}</time></dd></div>
                <div><dt>审核状态</dt><dd>待企业内容负责人复核</dd></div>
              </dl>
            </div>
            <div className={styles.sourceLinks}>
              <p>页面只采用来源中可保守确认的阶段信息；宣传性判断、效果数据和未核验实施状态不作为结论。</p>
            </div>
          </section>
        </div>
      ) : (
        <section className={styles.articleBody}>
          {page.sections.map((section, index) => (
            <article id={`news-section-${index + 1}`} key={section.title} data-reveal data-page-section>
              <div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}</div>
            </article>
          ))}
        </section>
      )}

      <RelatedReading page={page} />
    </main>
  );
}
