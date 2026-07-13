import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { consultationHref } from "@/lib/consultation";
import styles from "./PartnersPage.module.css";

const steps = [
  ["需求沟通", "说明区域、团队、经验与计划方向。"],
  ["能力评估", "共同确认服务、运营与交付条件。"],
  ["方案确认", "明确合作边界、节奏与双方责任。"],
  ["持续共建", "依据用户与市场反馈持续优化。"],
] as const;

const cooperationTypes = [
  { title: "经销商合作", text: "面向具备本地市场、门店运营和用户服务能力的长期伙伴。", points: ["所在区域与现有门店", "团队与服务覆盖", "灯饰照明经营经验", "年度业务计划"] },
  { title: "工程项目合作", text: "面向酒店、商业、公共、教育、工业与户外项目的方案和产品协作。", points: ["项目类型与所在城市", "设计或施工阶段", "图纸、清单与交付节点", "技术与服务需求"] },
  { title: "供应商合作", text: "围绕产品、材料、工程交付与数字化供应链建立清晰合作边界。", points: ["企业与产品资质", "质量与交付能力", "售后与责任机制", "合规和知识产权资料"] },
] as const;

export function PartnersPage({ page }: { page: PageData }) {
  return <main id="main-content" className={styles.page}>
    <section className={styles.hero} style={{ backgroundImage: `url(${page.image})` }}><div data-reveal="fade"><small>{page.eyebrow}</small><h1>{page.title}</h1><p>{page.intro}</p></div></section>
    <section className={styles.process}><header data-reveal><span>01 / PROCESS</span><h2>从了解彼此开始</h2></header><div className={styles.steps}>{steps.map((step, index) => <article className={styles.step} key={step[0]} data-reveal><small>0{index + 1}</small><h3>{step[0]}</h3><p>{step[1]}</p></article>)}</div></section>
    <section className={styles.cooperation}><header><span>02 / PARTNERSHIP</span><h2>三类合作入口</h2><p>品牌官网负责意向沟通和内容承接；采购、订单与经销商业务继续由独立商城处理。</p></header><div>{cooperationTypes.map((item, index) => <article key={item.title}><small>0{index + 1}</small><h3>{item.title}</h3><p>{item.text}</p><ul>{item.points.map((point) => <li key={point}>{point}</li>)}</ul><Link href={consultationHref(index === 0 ? "channel" : "project", `partners-${index + 1}`)}>提交合作信息 →</Link></article>)}</div></section>
    <section className={styles.channelModel}><div><span>03 / DIGITAL CHANNEL</span><h2>官网与商城分工</h2><p>官网用于品牌、产品、案例、知识与合作咨询；商城保留采购、订单和经销商系统。两端互相跳转，但不重复建设交易能力。</p></div><nav><a href="https://mall.juhao.com" rel="external">进入钜豪商城 ↗</a><a href="https://mall.juhao.com/login.html" rel="external">经销商登录 ↗</a></nav></section>
  </main>;
}
