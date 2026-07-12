import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brand}><b>JUHAO</b><span>钜豪照明</span></div>
      <nav className={styles.links} aria-label="页脚导航">
        <Link href="/about">品牌介绍</Link><Link href="/solutions">照明方案</Link><Link href="/healthy-light">健康光</Link><Link href="/smart-home">智能家居</Link><Link href="/service">服务支持</Link><Link href="/partners">合作共创</Link><Link href="/sustainability">可持续发展</Link><Link href="/news">新闻资讯</Link><Link href="/downloads">资料下载</Link>
      </nav>
      <div className={styles.meta}><nav aria-label="法律信息"><Link href="/legal">法律声明</Link><Link href="/privacy">隐私政策</Link></nav><p>© 2026 JUHAO LIGHTING. 好房子，光健康。</p></div>
    </footer>
  );
}
