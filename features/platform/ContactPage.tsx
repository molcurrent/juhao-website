"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import styles from "./ContactPage.module.css";

const directions = [
  { id: "lighting", code: "01", title: "照明方案", text: "住宅、商业、公共或工业空间的光环境规划。" },
  { id: "smart", code: "02", title: "智能家居", text: "灯光与窗帘、环境或安防设备的场景协同。" },
  { id: "channel", code: "03", title: "渠道与商城", text: "门店经营、选品协作或数字化渠道需求。" },
] as const;

const preparation = [
  { title: "项目基本情况", text: "空间或业务类型、所在城市，以及大致规模。" },
  { title: "当前所处阶段", text: "筹备、设计、施工、运营或仅在了解阶段。" },
  { title: "希望解决的问题", text: "说明使用人群、主要场景、现状和期待结果。" },
  { title: "可核验的补充资料", text: "如后续开放正式通道，可准备图纸、现场照片或需求清单。" },
];

type CheckResult = {
  tone: "ready" | "needs-work";
  title: string;
  text: string;
};

export type ContactPageProps = {
  page: PageData;
};

export function ContactPage({ page }: ContactPageProps) {
  const [direction, setDirection] = useState("");
  const [project, setProject] = useState("");
  const [stage, setStage] = useState("");
  const [need, setNeed] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const resultId = useId().replaceAll(":", "");

  function clearResult() {
    if (result) setResult(null);
  }

  function handleCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const missing = [
      !direction && "咨询方向",
      project.trim().length < 4 && "项目或业务概况",
      !stage && "当前阶段",
      need.trim().length < 12 && "希望解决的问题",
    ].filter(Boolean) as string[];

    if (missing.length > 0) {
      setResult({
        tone: "needs-work",
        title: "还可以补充一些信息",
        text: `建议继续完善：${missing.join("、")}。检查仅在当前浏览器页面内完成，不会发送或保存内容。`,
      });
      return;
    }

    setResult({
      tone: "ready",
      title: "咨询信息已基本准备好",
      text: "你可以保留这份思路，待企业确认正式联系方式或表单后再提交。当前页面没有接入后端，也不会发送或保存内容。",
    });
  }

  function handleReset() {
    setDirection("");
    setProject("");
    setStage("");
    setNeed("");
    setResult(null);
  }

  return (
    <main id="main-content" className={styles.page}>
      <section
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7, 8, 7, .96), rgba(7, 8, 7, .66) 57%, rgba(7, 8, 7, .28)), url("${page.image}")`,
        }}
      >
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroInner} data-reveal="fade">
          <p className={styles.eyebrow}><span aria-hidden="true" />{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className={styles.heroText}>先把需求说清楚，再找到合适的沟通方向。正式电话、邮箱、地址与在线提交入口尚未获得企业确认，因此当前页面不展示或虚构联系信息。</p>
          <div className={styles.channelStatus} role="note">
            <span aria-hidden="true" />
            <div><strong>咨询通道暂未开放</strong><p>下方工具只帮助整理信息，不会连接网络、发送数据或创建咨询记录。</p></div>
          </div>
        </div>
      </section>

      <section className={styles.directions} aria-labelledby="contact-directions-title">
        <header className={styles.sectionHeading} data-reveal>
          <p>01 / DIRECTION</p>
          <div>
            <h2 id="contact-directions-title">先选择咨询方向</h2>
            <p>三个方向用于帮助归类需求，不代表相关服务范围、响应时效或受理渠道已经正式确认。</p>
          </div>
        </header>
        <div className={styles.directionGrid}>
          {directions.map((item) => (
            <article key={item.id} data-reveal>
              <span>{item.code}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.prepareSection} aria-labelledby="contact-prepare-title">
        <div className={styles.prepareInner}>
          <div className={styles.prepareIntro} data-reveal>
            <p>02 / PREPARATION</p>
            <h2 id="contact-prepare-title">沟通前，可以准备这些信息</h2>
            <p>不需要先写成长文。把项目状态、真实约束和核心问题整理清楚，后续沟通会更聚焦。</p>
          </div>
          <ol className={styles.prepareList}>
            {preparation.map((item, index) => (
              <li key={item.title} data-reveal>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.checkerSection} aria-labelledby="contact-checker-title">
        <div className={styles.checkerIntro} data-reveal>
          <p>03 / OFFLINE CHECK</p>
          <h2 id="contact-checker-title">检查咨询信息是否完整</h2>
          <p>这是无网络的本地预检。请勿填写姓名、电话、邮箱、详细地址或其他个人信息。</p>
          <div className={styles.privacyNote}>
            <strong>当前状态</strong>
            <p>未接入咨询后端，不提交、不保存，也不承诺回复。</p>
          </div>
        </div>

        <form className={styles.checkerForm} onSubmit={handleCheck} onReset={handleReset} aria-describedby={`${resultId}-notice`} noValidate>
          <fieldset className={styles.directionFieldset}>
            <legend>咨询方向</legend>
            <div className={styles.radioGrid}>
              {directions.map((item) => (
                <label key={item.id} className={direction === item.id ? styles.radioActive : undefined}>
                  <input
                    type="radio"
                    name="direction"
                    value={item.id}
                    checked={direction === item.id}
                    onChange={(event) => { setDirection(event.target.value); clearResult(); }}
                  />
                  <span>{item.code}</span>
                  <strong>{item.title}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>项目或业务概况</span>
              <input
                value={project}
                onChange={(event) => { setProject(event.target.value); clearResult(); }}
                placeholder="例如：80㎡住宅，正在规划照明"
                maxLength={80}
              />
              <small>不要填写具体门牌或个人联系方式。</small>
            </label>
            <label className={styles.field}>
              <span>当前阶段</span>
              <select value={stage} onChange={(event) => { setStage(event.target.value); clearResult(); }}>
                <option value="">请选择</option>
                <option value="understanding">初步了解</option>
                <option value="planning">筹备或设计</option>
                <option value="delivery">施工或交付</option>
                <option value="operation">运营或使用中</option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>希望解决的问题</span>
            <textarea
              value={need}
              onChange={(event) => { setNeed(event.target.value); clearResult(); }}
              placeholder="说明主要场景、现状和期待结果；无需提供个人信息。"
              rows={5}
              maxLength={360}
            />
            <small>{need.length}/360 字</small>
          </label>

          <div className={styles.formActions}>
            <button type="submit">检查准备情况 <span aria-hidden="true">→</span></button>
            <button type="reset">清空</button>
          </div>

          <p className={styles.formNotice} id={`${resultId}-notice`}>“检查准备情况”只执行当前页面内的规则判断，不会向钜豪或任何第三方发送信息。</p>
          <div className={styles.result} aria-live="polite" aria-atomic="true">
            {result && (
              <div className={result.tone === "ready" ? styles.resultReady : styles.resultNeedsWork}>
                <strong>{result.title}</strong>
                <p>{result.text}</p>
              </div>
            )}
          </div>
        </form>
      </section>

      <section className={styles.nextSteps} aria-labelledby="contact-next-title" data-reveal>
        <div>
          <p>NEXT STEP</p>
          <h2 id="contact-next-title">正式入口经确认后再发布</h2>
        </div>
        <div>
          <p>在此之前，可以先浏览对应解决方案，或了解商城能力的确认边界。本页面不会以示例信息代替企业真实联系方式。</p>
          <div className={styles.links}>
            <Link href="/solutions">查看照明解决方案 <span aria-hidden="true">↗</span></Link>
            <Link href="/mall">了解商城能力框架 <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
