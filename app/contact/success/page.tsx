import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { findConsultationLeadById } from "@/db/consultation-leads";
import { isPublishedRoute } from "@/content/publication-ledger";
import { routeOgMetadataImage } from "@/lib/media/route-og";
import { CopyLeadButton } from "./CopyLeadButton";
import styles from "./page.module.css";

const title = "咨询提交结果｜钜豪照明";
const description = "查看钜豪照明官网咨询回访的线索编号和后续联系方法。";
const socialImage = routeOgMetadataImage("/contact/success");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact/success" },
  robots: { index: false, follow: false, noarchive: true },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "钜豪照明 JUHAO",
    title,
    description,
    url: "/contact/success",
    images: [socialImage],
  },
  twitter: { card: "summary_large_image", title, description, images: [socialImage.url] },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactSuccessPage({ searchParams }: Props) {
  if (!isPublishedRoute("/contact/success")) notFound();
  const rawLead = (await searchParams).lead;
  const lead = Array.isArray(rawLead) ? rawLead[0] : rawLead;
  const candidateLead = lead && /^JUHAO-\d{8}-[A-F0-9]{8}$/.test(lead) ? lead : null;
  let confirmedLead: string | null = null;
  let lookupUnavailable = Boolean(candidateLead && !env.DB);
  if (candidateLead && env.DB) {
    try {
      confirmedLead = (await findConsultationLeadById(env.DB, candidateLead, new Date().toISOString()))?.id ?? null;
    } catch {
      lookupUnavailable = true;
    }
  }

  return <>
    <SiteHeader />
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <section className={styles.result}>
        <p>咨询回执</p>
        <h1>{confirmedLead ? "咨询已提交" : lookupUnavailable ? "暂时无法核验线索" : "未找到有效线索编号"}</h1>
        {confirmedLead ? <>
          <span>官网系统已记录你的回访需求。请保存线索编号，后续查询、更正或删除信息时可以提供该编号。</span>
          <div className={styles.receipt}>
            <dl><dt>线索编号</dt><dd>{confirmedLead}</dd></dl>
            <CopyLeadButton value={confirmedLead}/>
          </div>
        </> : <span>{lookupUnavailable ? "线索核验服务暂时不可用。请稍后刷新，或返回联系页重新提交。" : "请从联系页完成回访提交。如果刚刚提交后未看到编号，可返回联系页重试。"}</span>}
        <div className={styles.nextStep}>
          <small>下一步</small>
          <strong>{confirmedLead ? "继续浏览，或提交另一项需求" : lookupUnavailable ? "稍后重新核验，原编号无需重新创建" : "从联系页重新开始提交"}</strong>
        </div>
        <div className={styles.actions}>
          {confirmedLead ? <>
            <Link href="/products">继续浏览产品 <b>→</b></Link>
            <Link href="/service">查看服务支持 <b>↗</b></Link>
            <Link href="/contact">提交另一项需求 <b>↗</b></Link>
          </> : <>
            {lookupUnavailable && candidateLead && <Link href={`/contact/success?lead=${encodeURIComponent(candidateLead)}`}>重新核验编号 <b>↻</b></Link>}
            <Link href="/contact">返回联系页 <b>→</b></Link>
            <Link href="/service">查看服务支持 <b>↗</b></Link>
          </>}
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
