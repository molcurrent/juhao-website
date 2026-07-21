import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_URL } from "./_data/pages";
import { FloatingActions } from "@/components/layout/FloatingActions";
import { DeferredSiteEffects } from "@/components/motion/DeferredSiteEffects";
import { routeOgMetadataImage } from "@/lib/media/route-og";
import "./globals.css";

const title = "钜豪照明官网｜健康照明与智能家居解决方案";
const description = "钜豪照明官网，浏览全屋、商业、公共与工业照明解决方案，了解智能家居、钜豪企业与项目动态及家庭、工程与渠道合作咨询。";
const homeOg = routeOgMetadataImage("/");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "钜豪照明 JUHAO",
  openGraph: { type:"website", locale:"zh_CN", siteName:"钜豪照明 JUHAO", title, description, url:"/", images:[homeOg] },
  twitter: { card:"summary_large_image", title, description, images:[homeOg.url] },
};

const organizationSchema = {
  "@context":"https://schema.org", "@graph":[
    {"@type":"Organization","@id":`${SITE_URL}/#organization`,name:"钜豪照明",alternateName:"JUHAO LIGHTING",url:SITE_URL},
    {"@type":"WebSite","@id":`${SITE_URL}/#website`,url:SITE_URL,name:"钜豪照明官网",publisher:{"@id":`${SITE_URL}/#organization`},inLanguage:"zh-CN"}
  ]
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/><meta name="theme-color" content="#1e1916"/><link rel="icon" href="/favicon.png"/><link rel="shortcut icon" href="/favicon.png"/></head><body><a className="skipLink" href="#main-content">跳到主要内容</a>{children}<FloatingActions/><DeferredSiteEffects/><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organizationSchema).replace(/</g,"\\u003c")}} /></body></html>;
}
