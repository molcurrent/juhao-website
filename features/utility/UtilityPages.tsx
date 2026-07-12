"use client";

import { useEffect, useState } from "react";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type DownloadItem } from "@/lib/api";
import styles from "./UtilityPages.module.css";

function Header({ page }: { page: PageData }) {
  return <header className={styles.header}><small>{page.eyebrow}</small><h1 data-reveal="fade">{page.title}</h1><p>{page.intro}</p></header>;
}

export function DownloadsPage({ page }: { page: PageData }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    siteApi.getDownloads().then((items) => {
      if (!active) return;
      setDownloads(items);
      setStatus("success");
    }).catch(() => {
      if (!active) return;
      setDownloads([]);
      setStatus("error");
    });

    return () => { active = false; };
  }, [retryKey]);

  function retryDownloads() {
    setStatus("loading");
    setRetryKey((key) => key + 1);
  }

  return <main id="main-content" className={styles.page}><Header page={page}/><section className={styles.content}><div className={styles.categories}>{page.highlights.map((item, index) => <article className={styles.category} key={item.title} data-reveal><small>0{index + 1}</small><h2>{item.title}</h2><p>{item.text}</p></article>)}</div><div className={styles.downloadsHeader}><small>VERIFIED DOWNLOADS</small><h2>已核验文件</h2></div>
    {status === "loading" && <div className={styles.empty} role="status"><strong>正在读取文件列表</strong><span>只会展示来源、版本和适用范围已经确认的文件。</span></div>}
    {status === "error" && <div className={styles.empty}><strong role="alert">文件列表暂时无法加载</strong><span>当前没有展示任何未经核验的文件，请稍后重试。</span><button type="button" onClick={retryDownloads}>重新加载</button></div>}
    {status === "success" && downloads.length === 0 && <div className={styles.empty}><strong>暂无已核验文件</strong><span>正式文件将在来源、版本和适用范围确认后发布。</span></div>}
    {status === "success" && downloads.length > 0 && <div className={styles.downloadList}>{downloads.map((item) => <article className={styles.downloadItem} key={item.id}><div className={styles.downloadTop}><span>{item.category}</span><time dateTime={item.updatedAt}>{item.updatedAt}</time></div><div className={styles.downloadBody}><div><h3>{item.title}</h3><dl><div><dt>版本</dt><dd>{item.version}</dd></div><div><dt>大小</dt><dd>{item.size}</dd></div><div><dt>更新时间</dt><dd>{item.updatedAt}</dd></div></dl></div><a href={item.href} aria-label={`下载${item.title}`}>下载文件 <span aria-hidden="true">↓</span></a></div></article>)}</div>}
  </section></main>;
}

export function LegalPage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page}><Header page={page}/><section className={`${styles.content} ${styles.legal}`}>{page.sections.map((section, index) => <article key={section.title} data-reveal><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2><p>{section.text}</p></div></article>)}</section></main>;
}
