"use client";

import Link from "next/link";
import styles from "./error.module.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className={styles.page} data-error-boundary="route" tabIndex={-1}>
    <div className={styles.glow} aria-hidden="true" />
    <section aria-labelledby="route-error-title">
      <small>JUHAO / PAGE RECOVERY</small>
      <p>页面暂时没有完成加载</p>
      <h1 id="route-error-title">这一页需要<br />重新连接。</h1>
      <span>你的表单内容不会在这里显示或写入错误信息。可以重试当前页面，或返回首页重新选择路径。</span>
      <div>
        <button type="button" onClick={reset}>重试当前页面 <b aria-hidden="true">↻</b></button>
        <Link href="/">返回首页 <b aria-hidden="true">→</b></Link>
      </div>
    </section>
  </main>;
}
