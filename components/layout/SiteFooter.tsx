import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { consultationHref, consultationOptions } from "@/lib/consultation";
import styles from "./SiteFooter.module.css";

const footerGroups = [
  {
    title: "品牌",
    label: "品牌导航",
    links: [
      ["关于钜豪", "/about"],
      ["产品中心", "/products"],
      ["工程案例", "/cases"],
      ["发展历程", "/about/history"],
      ["加入钜豪", "/about/join"],
      ["健康光", "/healthy-light"],
      ["可持续发展", "/sustainability"],
    ],
  },
  {
    title: "照明方案",
    label: "照明解决方案导航",
    links: [
      ["方案总览", "/solutions"],
      ["全屋照明", "/solutions/residential"],
      ["酒店照明", "/solutions/hospitality"],
      ["商业照明", "/solutions/commercial"],
      ["公共照明", "/solutions/public"],
      ["工业照明", "/solutions/industrial"],
    ],
  },
  {
    title: "服务与合作",
    label: "服务与合作导航",
    links: [
      ["智能家居", "/smart-home"],
      ["服务支持", "/service"],
      ["合作共创", "/partners"],
      ["资料下载", "/downloads"],
    ],
  },
  {
    title: "内容与联系",
    label: "内容与联系导航",
    links: [
      ["钜豪动态", "/news"],
      ["站内搜索", "/search"],
      ["联系钜豪", "/contact"],
    ],
  },
] as const;

type FooterGroup = (typeof footerGroups)[number];

function FooterLinks({ group }: { group: FooterGroup }) {
  return <nav className={styles.footerLinks} aria-label={group.label}>{group.links.map(([label, href]) => <Link href={href} key={href}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>;
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Link href="/" aria-label="钜豪照明首页"><BrandMark className={styles.brandMark} tone="white" variant="stacked" /></Link>
          <p>从人的活动、空间功能与长期使用出发，让光更适合真实生活。</p>
          <nav className={styles.consultationPaths} aria-label="咨询路径">
            {consultationOptions.map((item) => <Link href={consultationHref(item.kind, "footer")} key={item.kind}>{item.label}<span aria-hidden="true">↗</span></Link>)}
          </nav>
        </div>

        <div className={styles.navigation}>
          {footerGroups.map((group) => (
            <section className={styles.desktopGroup} key={`desktop-${group.title}`}>
              <h2 className={styles.footerGroupTitle}>{group.title}</h2>
              <FooterLinks group={group} />
            </section>
          ))}
          {footerGroups.map((group) => (
            <details className={styles.mobileGroup} key={`mobile-${group.title}`}>
              <summary><span>{group.title}</span><b aria-hidden="true">＋</b></summary>
              <FooterLinks group={group} />
            </details>
          ))}
        </div>
      </div>

      <div className={styles.statement} aria-hidden="true">
        <span>LIGHT FOR BETTER LIVING</span>
        <strong>好房子，光健康。</strong>
      </div>

      <div className={styles.bottom}>
        <p>© 2026 JUHAO LIGHTING</p>
        <nav aria-label="法律信息"><Link href="/legal">法律声明</Link><Link href="/privacy">隐私政策</Link></nav>
        <p>照明与智能空间解决方案</p>
      </div>
    </footer>
  );
}
