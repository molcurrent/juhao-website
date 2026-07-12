import type { Metadata } from "next";
import { SITE_URL } from "./_data/pages";
import { FloatingActions } from "@/components/layout/FloatingActions";
import { SiteMotion } from "@/components/motion/SiteMotion";
import "./globals.css";

const title = "钜豪照明官网｜健康照明与智能家居解决方案";
const description = "钜豪照明官网，浏览全屋、商业、公共与工业照明解决方案，了解智能家居、钜豪商城、照明资讯及合作咨询。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "钜豪照明 JUHAO",
  openGraph: { type:"website", locale:"zh_CN", siteName:"钜豪照明 JUHAO", title, description, url:"/", images:[{url:"/og.png",width:1733,height:909,alt:"JUHAO 钜豪照明｜好房子，光健康"}] },
  twitter: { card:"summary_large_image", title, description, images:["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

const organizationSchema = {
  "@context":"https://schema.org", "@graph":[
    {"@type":"Organization","@id":`${SITE_URL}/#organization`,name:"钜豪照明",alternateName:"JUHAO LIGHTING",url:SITE_URL},
    {"@type":"WebSite","@id":`${SITE_URL}/#website`,url:SITE_URL,name:"钜豪照明官网",publisher:{"@id":`${SITE_URL}/#organization`},inLanguage:"zh-CN"}
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><a className="skipLink" href="#main-content">跳到主要内容</a>{children}<FloatingActions/><SiteMotion/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organizationSchema).replace(/</g,"\\u003c")}} /></body></html>;
}
