import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import styles from "./MallPage.module.css";

const workflow = [
  { index: "01", title: "整理商品资料", text: "先确认品类、适用场景、规格与版本等基础信息。" },
  { index: "02", title: "连接业务需求", text: "再依据实际合作模式评估选品、询价或订单协同方式。" },
  { index: "03", title: "衔接交付服务", text: "最后明确交付、售后与客户记录的责任边界。" },
];

const audiences = [
  { code: "STORE", title: "零售与门店", text: "需要确认商品范围、库存口径、价格权限及门店协作方式。" },
  { code: "PROJECT", title: "项目合作方", text: "需要确认选型资料、项目阶段、交付范围及服务接口。" },
  { code: "CHANNEL", title: "渠道伙伴", text: "需要确认区域、团队、授权边界与数字化协作流程。" },
];

export type MallPageProps = {
  page: PageData;
};

export function MallPage({ page }: MallPageProps) {
  return (
    <main id="main-content" className={styles.page}>
      <section
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7, 8, 7, .96), rgba(7, 8, 7, .72) 52%, rgba(7, 8, 7, .28)), url("${page.image}")`,
        }}
      >
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy} data-reveal="fade">
            <div className={styles.statusLine}>
              <span>{page.eyebrow}</span>
              <strong>能力框架 · 待企业确认</strong>
            </div>
            <h1>{page.title}</h1>
            <p>
              这里展示商城与渠道协作的规划框架，不代表相关平台功能已经上线。具体商品、交易、库存、会员与分销能力，均需企业完成业务确认后才能公开。
            </p>
            <Link className={styles.heroLink} href="/contact">
              查看咨询准备信息 <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className={styles.platformVisual} role="img" aria-label="规划中的平台信息流示意">
            <div className={styles.visualHeader}>
              <span>PLATFORM MAP</span>
              <span>CONCEPT ONLY</span>
            </div>
            <ol className={styles.visualFlow}>
              <li><span>01</span><strong>商品资料</strong><small>待核验</small></li>
              <li><span>02</span><strong>业务协同</strong><small>待确认</small></li>
              <li><span>03</span><strong>服务记录</strong><small>待接入</small></li>
            </ol>
            <div className={styles.visualFooter}>
              <span aria-hidden="true" />
              <p>所有节点仅用于说明可能的信息关系，不表示真实系统状态。</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="mall-capabilities-title">
        <header className={styles.sectionHeading} data-reveal>
          <p>01 / CAPABILITY FRAMEWORK</p>
          <div>
            <h2 id="mall-capabilities-title">先把能力边界说清楚</h2>
            <p>以下内容来自页面信息架构建议，只说明可讨论的方向。正式版本需逐项确认是否存在、由谁使用，以及数据从哪里来。</p>
          </div>
        </header>
        <div className={styles.capabilityGrid}>
          {page.highlights.slice(0, 4).map((item, index) => (
            <article className={styles.capabilityCard} key={item.title} data-reveal>
              <div className={styles.cardMeta}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>待企业确认</strong>
              </div>
              <h3>{item.title}</h3>
              <p>规划目标：{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workflowSection} aria-labelledby="mall-workflow-title">
        <div className={styles.workflowInner}>
          <header data-reveal>
            <p>02 / BUSINESS FLOW</p>
            <h2 id="mall-workflow-title">平台之前，先确认业务流程</h2>
          </header>
          <ol className={styles.workflowList}>
            {workflow.map((item) => (
              <li key={item.index} data-reveal>
                <span>{item.index}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.audiences} aria-labelledby="mall-audiences-title">
        <div className={styles.audienceIntro} data-reveal>
          <p>03 / FOR PARTNERS</p>
          <h2 id="mall-audiences-title">不同角色，需要确认不同问题</h2>
          <p>页面不会把通用平台设想包装成已上线服务。明确角色、权限和责任后，才能判断应该开放哪些能力。</p>
        </div>
        <div className={styles.audienceList}>
          {audiences.map((audience) => (
            <article key={audience.code} data-reveal>
              <small>{audience.code}</small>
              <h3>{audience.title}</h3>
              <p>{audience.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.confirmation} aria-labelledby="mall-confirmation-title" data-reveal>
        <div>
          <p>PUBLICATION GATE</p>
          <h2 id="mall-confirmation-title">企业确认后再开放</h2>
        </div>
        <div>
          <p>正式发布前，至少需要核验功能清单、使用对象、交易与售后责任、数据来源、隐私规则及真实访问入口。</p>
          <Link href="/contact">准备商城合作咨询 <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
