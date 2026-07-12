import Link from "next/link";
import styles from "./SiteFooter.module.css";

const footerGroups = [
  {
    title: "品牌",
    label: "品牌导航",
    links: [
      ["关于钜豪", "/about"],
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
      ["钜豪商城", "/mall"],
      ["服务支持", "/service"],
      ["合作共创", "/partners"],
      ["资料下载", "/downloads"],
    ],
  },
  {
    title: "内容与联系",
    label: "内容与联系导航",
    links: [
      ["新闻资讯", "/news"],
      ["站内搜索", "/search"],
      ["联系钜豪", "/contact"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Link href="/" aria-label="钜豪照明首页"><b>JUHAO</b><span>钜豪照明</span></Link>
          <p>从人的活动、空间功能与长期使用出发，让光更适合真实生活。</p>
          <Link className={styles.contact} href="/contact">开始方案咨询 <span aria-hidden="true">↗</span></Link>
        </div>

        <div className={styles.navigation}>
          {footerGroups.map((group) => (
            <nav aria-label={group.label} key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map(([label, href]) => <Link href={href} key={href}>{label}<span aria-hidden="true">↗</span></Link>)}
            </nav>
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
        <p>公开信息以企业最终核验版本为准</p>
      </div>
    </footer>
  );
}
