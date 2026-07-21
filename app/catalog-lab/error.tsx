"use client";

import { SiteHeader } from "@/components/layout/SiteHeader";

export default function CatalogLabError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="catalogLab-page catalogLab-errorPage">
        <div>
          <p>产品目录暂时无法显示</p>
          <h1>数据载入失败</h1>
          <span>来源文件仍然安全保留。请重新载入当前私有样板。</span>
          <button type="button" onClick={reset}>
            重新载入
          </button>
        </div>
      </main>
    </>
  );
}
