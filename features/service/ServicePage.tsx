import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { consultationHref } from "@/lib/consultation";
import styles from "./ServicePage.module.css";

const serviceSteps = [
  { title: "准备信息", text: "记录产品型号、购买或项目资料、问题现象和所在城市。" },
  { title: "选择入口", text: "根据总部、商城、工程或经销商业务进入对应路径。" },
  { title: "协同处理", text: "由对应团队结合产品、订单或项目资料进行处理。" },
  { title: "结果反馈", text: "确认问题处理结果，并为后续跟进保留必要记录。" },
] as const;

const serviceNetwork = [
  { title: "总部服务窗口", text: "品牌、企业与综合服务咨询。", action: "拨打 400-0760-888", href: "tel:4000760888" },
  { title: "商城与订单服务", text: "采购、订单、经销商登录和商城业务；外部连接不可用时转咨询。", action: "查看商城连接状态", href: "/mall" },
  { title: "工程项目支持", text: "酒店、商业、公共、工业及户外项目。", action: "提交工程需求", href: consultationHref("project", "service-network") },
  { title: "经销商协作", text: "区域经营、门店服务与渠道合作沟通。", action: "提交合作信息", href: consultationHref("channel", "service-network") },
] as const;

export function ServicePage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page}>
    <section className={styles.hero} style={{ backgroundImage: `linear-gradient(90deg,rgba(7,8,7,.96),rgba(7,8,7,.4)),url(${page.image})` }}><div className={styles.heroGrid}/><div className={styles.heroInner}><nav className={styles.breadcrumbs}><Link href="/">首页</Link><span>/</span><span>服务支持</span></nav><p className={styles.eyebrow}><span/>{page.eyebrow}</p><h1>{page.title}</h1><p className={styles.heroCopy}>{page.intro}</p><div className={styles.heroHighlights}>{page.highlights.map((item,index)=><article key={item.title}><small>0{index+1}</small><strong>{item.title}</strong><p>{item.text}</p></article>)}</div></div></section>
    <section className={styles.processSection}><div className={styles.sectionHeading}><p className={styles.sectionLabel}>SERVICE PROCESS</p><div><h2>清晰的服务流程</h2><p>{page.sections[0]?.text}</p></div></div><ol className={styles.processGrid}>{serviceSteps.map((step,index)=><li key={step.title}><small>0{index+1}</small><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
    <section className={styles.finderSection}><div className={styles.finderInner}><div className={styles.finderIntro}><p className={styles.sectionLabel}>SERVICE NETWORK</p><h2>四类服务入口</h2><p>{page.sections[1]?.text}</p><div className={styles.demoNotice}><strong>总部公开地址</strong><p>广东省中山市横栏镇富庆一路 8 号钜豪工业园<br/>电话：+86 0760 8985 5555<br/>邮箱：export@juhaolamp.com</p></div></div><div className={`${styles.finderPanel} ${styles.networkGrid}`}>{serviceNetwork.map((item,index)=><article key={item.title}><small>0{index+1}</small><h3>{item.title}</h3><p>{item.text}</p><a href={item.href}>{item.action} →</a></article>)}</div></div></section>
    <section className={styles.faqSection}><div className={styles.faqHeading}><p className={styles.sectionLabel}>FAQ</p><div><h2>常见问题</h2><p>按产品、订单和项目资料确定适用的服务路径。</p></div></div><div className={styles.staticFaq}>{page.faqs?.map((faq)=><details key={faq.question}><summary>{faq.question}<span>＋</span></summary><p>{faq.answer}</p></details>)}</div></section>
    <section className={styles.supportCta}><div><p className={styles.sectionLabel}>NEED MORE SUPPORT?</p><h2>没有找到需要的信息？</h2></div><Link href="/contact">联系钜豪<span>→</span></Link></section>
  </main>;
}
