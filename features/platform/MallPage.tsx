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
    <main id="main-content" className={styles.page} tabIndex={-1}>
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
              <strong>外部商城连接待恢复</strong>
            </div>
            <h1>{page.title}</h1>
            <p>
              2026 年 7 月 13 日复核时，mall.juhao.com、登录与注册地址均未完成 TLS 连接。恢复并通过稳定性检查前，官网不会把用户直接送往失效页面；采购、订单和渠道需求先由咨询入口承接。
            </p>
            <Link className={styles.heroLink} href="/contact?source=mall&scene=channel&intent=partnership">
              提交采购或渠道需求 <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className={styles.platformVisual} role="img" aria-label="商城连接恢复门禁">
            <div className={styles.visualHeader}>
              <span>连接状态</span>
              <span>CHECKED 2026-07-13</span>
            </div>
            <ol className={styles.visualFlow}>
              <li><span>01</span><strong>商城首页</strong><small>TLS 待恢复</small></li>
              <li><span>02</span><strong>登录 / 注册</strong><small>已转官网兜底</small></li>
              <li><span>03</span><strong>采购 / 渠道需求</strong><small>咨询入口可用</small></li>
            </ol>
            <div className={styles.visualFooter}>
              <span aria-hidden="true" />
              <p>域名恢复后仍需复核 TLS、登录落点、外部跳转提示和连续可用性，再重新开放直达链接。</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="mall-capabilities-title">
        <header className={styles.sectionHeading} data-reveal>
          <p>能力边界</p>
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
            <p>业务流程</p>
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
          <p>合作伙伴</p>
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
          <p>发布状态</p>
          <h2 id="mall-confirmation-title">连接验收后再开放</h2>
        </div>
        <div>
          <p>至少需要确认首页和登录页连续返回成功、证书链有效、外部跳转有明确提示，并保留咨询兜底入口。</p>
          <Link href="/contact?source=mall&scene=channel&intent=partnership">提交商城或渠道需求 <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
