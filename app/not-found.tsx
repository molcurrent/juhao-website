import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";

export default function NotFound() {
  return <><SiteHeader/><main className="notFound" id="main-content"><p className="eyebrow dark"><span/>404</p><h1>这里还没有内容</h1><p>你访问的页面不存在或已经调整。</p><div className="actions"><a className="primary orange" href="/">返回首页</a><a className="textLink" href="/solutions">查看照明方案 <span>→</span></a></div></main><SiteFooter/></>;
}
