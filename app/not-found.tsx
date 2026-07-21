import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function NotFound() {
  return <>
    <SiteHeader/>
    <main className="notFound" id="main-content" tabIndex={-1}>
      <section className="notFoundIntro">
        <p className="eyebrow dark"><span/>404 / PAGE NOT FOUND</p>
        <h1>这里还没有内容</h1>
        <p>链接可能已调整，或页面尚未发布。你可以搜索当前网站，或从已公开栏目继续浏览。</p>
        <div className="actions"><Link className="primary orange" href="/">返回首页</Link></div>
      </section>
      <form className="notFoundSearch" method="get" action="/search" role="search">
        <label htmlFor="not-found-search">搜索钜豪网站</label>
        <div><small>站内搜索</small><strong>换一个关键词继续</strong></div>
        <input id="not-found-search" name="keywords" type="search" placeholder="输入产品、项目或服务关键词" autoComplete="off"/>
        <button type="submit">搜索 <span>→</span></button>
      </form>
      <nav className="notFoundRoutes" aria-label="推荐浏览路径">
        <Link href="/products"><small>01</small><span><strong>产品中心</strong><em>查看已发布的产品专题与详情</em></span><b aria-hidden="true">↗</b></Link>
        <Link href="/solutions"><small>02</small><span><strong>照明方案</strong><em>按真实空间任务浏览方案</em></span><b aria-hidden="true">↗</b></Link>
        <Link href="/service"><small>03</small><span><strong>服务支持</strong><em>找到咨询与问题处理入口</em></span><b aria-hidden="true">↗</b></Link>
      </nav>
    </main>
    <SiteFooter/>
  </>;
}
