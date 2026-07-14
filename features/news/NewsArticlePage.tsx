import Image from "next/image";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
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
      <p className={styles.sectionLabel}>CONTINUE EXPLORING</p>
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

  return (
    <main id="main-content" className={styles.articlePage}>
      <header className={styles.articleHeader}>
        <p className={styles.eyebrow}>{page.eyebrow}</p>
        <h1 data-reveal="fade">{page.title}</h1>
        <p>{page.intro}</p>
        <div className={styles.articleMeta} aria-label="文章审核信息">
          {companyEvidence
            ? <><span>来源日期 <time dateTime={companyEvidence.published}>{companyEvidence.published}</time></span><span>来源记录 #{companyEvidence.source_id}</span><span>页面状态 待企业复核</span></>
            : <span>发布日期 <time dateTime={page.published}>{page.published ?? "持续更新"}</time></span>}
        </div>
      </header>

      <RepresentativeMedia page={page} />

      {companyEvidence ? (
        <div className={styles.articleBody}>
          <section className={styles.evidenceSection} aria-labelledby="company-news-facts-title" data-reveal>
            <p className={styles.sectionLabel}>SOURCE FACTS</p>
            <h2 id="company-news-facts-title">来源记录与当前阶段</h2>
            <ol>
              <li>来源状态：知识库中的有效企业资讯记录。</li>
              <li>当前阶段：{companyEvidence.phase_stage}。</li>
              {companyEvidence.project_stage && <li>项目边界：{companyEvidence.project_stage.confirmed}，{companyEvidence.project_stage.implementation}。</li>}
            </ol>
          </section>

          {page.sections.map((section, index) => (
            <article key={section.title} data-reveal>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}</div>
            </article>
          ))}

          <section className={`${styles.evidenceSection} ${styles.boundarySection}`} aria-labelledby="company-news-boundary-title" data-reveal>
            <p className={styles.sectionLabel}>PUBLICATION BOUNDARY</p>
            <h2 id="company-news-boundary-title">公开边界</h2>
            <ul>
              <li>{companyEvidence.publication_boundary}</li>
              <li>{`来源中的 ${companyEvidence.remote_media_count} 个图片候选尚未完成公开使用授权核验，当前不在页面发布。`}</li>
              <li>当前原创栏目示意图仅说明内容类型，不作为活动现场、项目实施或结果证据。</li>
            </ul>
          </section>

          <section className={styles.sourceSection} aria-labelledby="company-news-source-title" data-reveal>
            <div>
              <p className={styles.sectionLabel}>SOURCE RECORD</p>
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
            <article key={section.title} data-reveal>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}</div>
            </article>
          ))}
        </section>
      )}

      <RelatedReading page={page} />
    </main>
  );
}
