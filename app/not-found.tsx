import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function NotFound() {
  return <><SiteHeader/><main className="notFound" id="main-content"><p className="eyebrow dark"><span/>404</p><h1>这里还没有内容</h1><p>你访问的页面不存在或已经调整。</p><div className="actions"><Link className="primary orange" href="/">返回首页</Link><Link className="textLink" href="/solutions">查看照明方案 <span>→</span></Link></div></main><SiteFooter/></>;
}
