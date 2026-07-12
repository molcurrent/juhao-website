"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type SearchResult } from "@/lib/api";
import styles from "./SearchPage.module.css";

type SearchState = {
  status: "idle" | "loading" | "success" | "error";
  query: string;
  results: SearchResult[];
};

export function SearchPage({ page }: { page: PageData }) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("keywords") ?? "").trim();
  const [retryKey, setRetryKey] = useState(0);
  const [searchState, setSearchState] = useState<SearchState>({
    status: "idle",
    query: "",
    results: [],
  });
  const state = searchState.query === query
    ? searchState
    : { status: query ? "loading" : "idle", query, results: [] } satisfies SearchState;

  useEffect(() => {
    let active = true;

    if (!query) {
      return () => { active = false; };
    }

    void siteApi.search(query).then((results) => {
      if (!active) return;
      setSearchState({ status: "success", query, results });
    }).catch(() => {
      if (!active) return;
      setSearchState({ status: "error", query, results: [] });
    });

    return () => { active = false; };
  }, [query, retryKey]);

  const retry = () => {
    setSearchState({ status: "loading", query, results: [] });
    setRetryKey((key) => key + 1);
  };

  const summary = state.status === "idle"
    ? "输入关键词开始搜索"
    : state.status === "loading"
      ? `正在搜索“${query}”`
      : state.status === "error"
        ? `“${query}”的搜索暂时不可用`
        : `“${query}”的搜索结果`;

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}><p>{page.eyebrow}</p><h1>{page.title}</h1></section>
      <div className={styles.searchPanel}>
        <form className={styles.form} method="get" action="/search" role="search">
          <label htmlFor="site-keywords">搜索网站内容</label>
          <input id="site-keywords" name="keywords" type="search" defaultValue={query} placeholder="输入解决方案、空间或照明知识" autoComplete="off" />
          <button type="submit">搜索 <span>→</span></button>
        </form>
      </div>
      <section className={styles.results} aria-live="polite" aria-busy={state.status === "loading"}>
        <div className={styles.summary}><span>{summary}</span><span>{state.status === "success" ? `${state.results.length} 条` : ""}</span></div>

        {state.status === "idle" && <div className={styles.empty}><strong>搜索钜豪网站</strong><span>可搜索“健康光”“商业照明”“服务”等内容。</span></div>}

        {state.status === "loading" && <div className={styles.loading} role="status"><i aria-hidden="true"/><strong>正在查找相关内容</strong><span>请稍候，搜索结果马上呈现。</span></div>}

        {state.status === "success" && state.results.length === 0 && <div className={styles.empty}><strong>没有找到匹配内容</strong><span>请尝试更短或不同的关键词。</span></div>}

        {state.status === "success" && state.results.length > 0 && <div className={styles.list}>{state.results.map((item) => <Link className={styles.result} href={item.path} key={item.path} data-reveal>
          <small>{item.type === "article" ? "INSIGHT" : item.type === "service" ? "SOLUTION" : "PAGE"}</small>
          <div><h2>{item.title}</h2><p>{item.description}</p></div><b aria-hidden="true">↗</b>
        </Link>)}</div>}

        {state.status === "error" && <div className={styles.error} role="alert"><strong>搜索服务暂时不可用</strong><span>请检查网络连接，或稍后重新尝试。</span><button type="button" onClick={retry}>重新搜索 <b aria-hidden="true">↻</b></button></div>}
      </section>
    </main>
  );
}
