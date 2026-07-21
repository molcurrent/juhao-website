import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import type { DownloadItem } from "@/lib/api/types";
import { CONSULTATION_PRIVACY_VERSION, consultationHref } from "@/lib/consultation";
import styles from "./UtilityPages.module.css";

const releaseRequirements = [
  "来源与授权范围可追溯",
  "版本、大小与更新时间明确",
  "适用产品和使用范围已确认",
] as const;

function Header({ page }: { page: PageData }) {
  return <header className={styles.header}>
    <small>{page.eyebrow}</small>
    <h1 data-reveal="fade">{page.title}</h1>
    <p>{page.intro}</p>
  </header>;
}

export function DownloadsPage({ page, downloads = [] }: { page: PageData; downloads?: DownloadItem[] }) {
  return <main id="main-content" className={styles.page} tabIndex={-1}>
    <Header page={page}/>
    <section className={styles.content}>
      <div className={styles.categories}>
        {page.highlights.map((item, index) => <article className={styles.category} key={item.title} data-reveal>
          <small>{String(index + 1).padStart(2, "0")}</small>
          <h2>{item.title}</h2>
          <p>{item.text}</p>
        </article>)}
      </div>
      <div className={styles.downloadsHeader}>
        <small>资料发布状态</small>
        <h2>已核验文件</h2>
      </div>
      {downloads.length === 0 && <section className={styles.empty} aria-labelledby="downloads-empty-title">
        <div className={styles.emptyIntro}>
          <small>当前公开数量</small>
          <strong><span aria-hidden="true">0</span> 项</strong>
          <h3 id="downloads-empty-title">目前没有可公开下载的文件</h3>
          <p>这里不会放置示例链接。正式文件将在来源、版本、适用范围和更新时间全部确认后发布。</p>
        </div>
        <div className={styles.releasePanel}>
          <span>文件上线前必须核验</span>
          <ol>
            {releaseRequirements.map((item, index) => <li key={item}><small>{String(index + 1).padStart(2, "0")}</small><strong>{item}</strong></li>)}
          </ol>
          <nav aria-label="资料下载页下一步">
            <Link href={consultationHref("project", "page", "downloads")}>提交资料需求 <span>→</span></Link>
            <Link href="/service">查看服务支持 <span>↗</span></Link>
          </nav>
        </div>
      </section>}
      {downloads.length > 0 && <div className={styles.downloadList}>
        {downloads.map((item) => <article className={styles.downloadItem} key={item.id}>
          <div className={styles.downloadTop}><span>{item.category}</span><time dateTime={item.updatedAt}>{item.updatedAt}</time></div>
          <div className={styles.downloadBody}>
            <div>
              <h3>{item.title}</h3>
              <dl>
                <div><dt>版本</dt><dd>{item.version}</dd></div>
                <div><dt>大小</dt><dd>{item.size}</dd></div>
                <div><dt>更新时间</dt><dd>{item.updatedAt}</dd></div>
              </dl>
            </div>
            <a href={item.href} aria-label={`下载${item.title}`}>下载文件 <span aria-hidden="true">↓</span></a>
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}

export function LegalPage({ page }: { page: PageData }) {
  const isPrivacy = page.path === "/privacy";
  const statusItems = isPrivacy
    ? [
        { label: "当前覆盖", value: "官网“提交回访”功能" },
        { label: "说明版本", value: CONSULTATION_PRIVACY_VERSION, dateTime: CONSULTATION_PRIVACY_VERSION },
        { label: "审核状态", value: "待企业确认" },
      ]
    : [
        { label: "当前内容", value: "法律文本发布状态说明" },
        { label: "正式文本", value: "尚未发布" },
        { label: "审核状态", value: "待企业与法务确认" },
      ];

  return <main id="main-content" className={styles.page} tabIndex={-1}>
    <Header page={page}/>
    <section className={styles.publicationStatus} aria-labelledby="publication-status-title">
      <header>
        <small>{isPrivacy ? "数据处理说明" : "法律文本"}</small>
        <h2 id="publication-status-title">{isPrivacy ? "当前实现披露" : "当前发布状态"}</h2>
        <p>{isPrivacy
          ? "本页仅说明官网回访功能当前真实的数据流，企业审核仍待完成。"
          : "本页不是正式法律文本，只公开说明审核和发布边界。"}</p>
      </header>
      <dl>
        {statusItems.map((item) => <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.dateTime ? <time dateTime={item.dateTime}>{item.value}</time> : item.value}</dd>
        </div>)}
      </dl>
    </section>
    <section className={`${styles.content} ${styles.legal}`}>
      {page.sections.map((section, index) => <article key={section.title} data-reveal>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><h2>{section.title}</h2><p>{section.text}</p></div>
      </article>)}
      <nav className={styles.related} aria-label={`${page.title}相关页面`}>
        {page.related.map((item) => <Link href={item.href} key={item.href}>
          <span><strong>{item.label}</strong><small>{item.text}</small></span>
          <b aria-hidden="true">↗</b>
        </Link>)}
      </nav>
    </section>
  </main>;
}
