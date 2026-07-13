"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PageData } from "@/app/_data/pages";
import { submitContact, type ContactRequest } from "@/lib/api";
import { CONSULTATION_PRIVACY_VERSION, consultationContextForDirection, type ConsultationContext } from "@/lib/consultation";
import styles from "./ContactPage.module.css";

const directions = [
  { id: "home", code: "01", title: "家庭健康光", text: "围绕户型、家庭活动和真实光环境梳理空间建议。" },
  { id: "project", code: "02", title: "工程项目", text: "住宅、商业、公共或工业项目的方案与协作需求。" },
  { id: "channel", code: "03", title: "渠道合作", text: "结合所在区域、业务基础与合作方向展开沟通。" },
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
  initialContext?: ConsultationContext | null;
};

export function ContactPage({ page, initialContext = null }: ContactPageProps) {
  const router = useRouter();
  const [direction, setDirection] = useState<ContactRequest["direction"] | "">(initialContext?.direction ?? "");
  const [project, setProject] = useState("");
  const [stage, setStage] = useState<ContactRequest["stage"] | "">("");
  const [need, setNeed] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactChannel, setContactChannel] = useState<ContactRequest["contactChannel"]>("phone");
  const [contactValue, setContactValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [clientRequestId, setClientRequestId] = useState("");
  const [website, setWebsite] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const resultId = useId().replaceAll(":", "");
  const activeContext = direction
    ? initialContext?.direction === direction
      ? initialContext
      : consultationContextForDirection(direction, initialContext?.source ?? "direct", initialContext?.sourceDetail)
    : initialContext;

  function clearResult() {
    if (result) setResult(null);
    if (submitState !== "idle") setSubmitState("idle");
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
      text: "请选择电话、邮件、企业微信或提交回访。回访表单只收集本次沟通所需的最少联系信息，提交后系统会返回线索编号。",
    });
  }

  async function handleSubmit() {
    if (result?.tone !== "ready" || !direction || !stage) return;
    if (contactName.trim().length < 2 || contactValue.trim().length < 5 || !consent) {
      setSubmitState("error");
      return;
    }

    setSubmitState("submitting");
    try {
      const requestId = clientRequestId || crypto.randomUUID();
      if (!clientRequestId) setClientRequestId(requestId);
      const nextReceipt = await submitContact({
        direction,
        source: activeContext?.source ?? "direct",
        ...(activeContext?.sourceDetail ? { sourceDetail: activeContext.sourceDetail } : {}),
        scene: activeContext?.scene ?? consultationContextForDirection(direction).scene,
        intent: activeContext?.intent ?? consultationContextForDirection(direction).intent,
        project: project.trim(),
        stage,
        need: need.trim(),
        contactName: contactName.trim(),
        contactChannel,
        contactValue: contactValue.trim(),
        consent: true,
        privacyVersion: CONSULTATION_PRIVACY_VERSION,
        clientRequestId: requestId,
        website,
      });
      router.push(`/contact/success?lead=${encodeURIComponent(nextReceipt.id)}`);
    } catch {
      setSubmitState("error");
    }
  }

  function handleReset() {
    setDirection(initialContext?.direction ?? "");
    setProject("");
    setStage("");
    setNeed("");
    setResult(null);
    setContactName("");
    setContactChannel("phone");
    setContactValue("");
    setConsent(false);
    setClientRequestId("");
    setWebsite("");
    setSubmitState("idle");
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
          <p className={styles.heroText}>家庭健康光、工程项目与渠道合作分别进入对应表单，先说明场景、阶段与核心目标。</p>
          <div className={styles.channelStatus} role="note">
            <span aria-hidden="true" />
            <div><strong>{initialContext ? `已匹配：${initialContext.label}` : "三类需求，三条咨询路径"}</strong><p>{initialContext ? initialContext.description : "选择最接近的方向，表单会匹配对应的问题与填写提示。"}</p></div>
          </div>
        </div>
      </section>

      <section className={styles.directions} aria-labelledby="contact-directions-title">
        <header className={styles.sectionHeading} data-reveal>
          <p>01 / DIRECTION</p>
          <div>
            <h2 id="contact-directions-title">先选择咨询方向</h2>
            <p>家庭、工程与渠道需求分别记录场景和沟通意图，减少后续重复说明。</p>
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

      <section className={styles.checkerSection} id="consultation-form" aria-labelledby="contact-checker-title">
        <div className={styles.checkerIntro}>
          <p>03 / NEED CHECK</p>
          <h2 id="contact-checker-title">{activeContext ? activeContext.cta : "检查咨询信息是否完整"}</h2>
          <p>第一步只核对需求信息；通过后再选择直接联系或填写最少信息提交回访。</p>
          <div className={styles.privacyNote}>
            <strong>当前状态</strong>
            <p>第一步内容只保留在当前页面。只有主动点击“提交回访”并确认数据处理说明后，信息才会发送并保存。</p>
          </div>
        </div>

        <form className={styles.checkerForm} onSubmit={handleCheck} onReset={handleReset} aria-describedby={`${resultId}-notice`} noValidate>
          {activeContext && (
            <div className={styles.contextBanner} role="status">
              <small>CONSULTATION PATH</small>
              <strong>{activeContext.label}</strong>
              <p>{activeContext.description}</p>
              <input type="hidden" name="source" value={activeContext.source} />
              {activeContext.sourceDetail && <input type="hidden" name="sourceDetail" value={activeContext.sourceDetail} />}
              <input type="hidden" name="scene" value={activeContext.scene} />
              <input type="hidden" name="intent" value={activeContext.intent} />
            </div>
          )}
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
                    onChange={(event) => { setDirection(event.target.value as ContactRequest["direction"]); clearResult(); }}
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
                name="project"
                value={project}
                onChange={(event) => { setProject(event.target.value); clearResult(); }}
                placeholder={activeContext?.projectPlaceholder ?? "例如：80㎡住宅，正在规划照明"}
                maxLength={80}
              />
              <small>不要填写具体门牌或个人联系方式。</small>
            </label>
            <label className={styles.field}>
              <span>当前阶段</span>
              <select name="stage" value={stage} onChange={(event) => { setStage(event.target.value as ContactRequest["stage"] | ""); clearResult(); }}>
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
              name="need"
              value={need}
              onChange={(event) => { setNeed(event.target.value); clearResult(); }}
              placeholder={activeContext?.needPlaceholder ?? "说明主要场景、现状和期待结果；无需提供个人信息。"}
              rows={5}
              maxLength={360}
            />
            <small>{need.length}/360 字</small>
          </label>

          <div className={styles.formActions}>
            <button type="submit">检查准备情况 <span aria-hidden="true">→</span></button>
            <button type="reset">清空</button>
          </div>

          <p className={styles.formNotice} id={`${resultId}-notice`}>“检查准备情况”只核对场景、阶段和目标是否完整；只有点击下方“提交回访”后才会发送。</p>
          <div className={styles.result} aria-live="polite" aria-atomic="true">
            {result && (
              <div className={result.tone === "ready" ? styles.resultReady : styles.resultNeedsWork}>
                <strong>{result.title}</strong>
                <p>{result.text}</p>
              </div>
            )}
          </div>

          {result?.tone === "ready" && (
            <div className={styles.submitPanel} aria-labelledby={`${resultId}-submit-title`}>
              <div className={styles.submitHeading}>
                <small>STEP 02 / CONTACT</small>
                <h3 id={`${resultId}-submit-title`}>选择后续联系方法</h3>
                <p>电话、邮件和企业微信入口尚未完成企业核验，暂不作为公开联系渠道。需要钜豪回访时，请填写下方最少信息。</p>
              </div>
              <div className={styles.channelOptions} aria-label="咨询联系方式">
                <span className={styles.channelUnavailable} aria-disabled="true"><small>电话</small><strong>待企业核验</strong><span>当前不可用</span></span>
                <span className={styles.channelUnavailable} aria-disabled="true"><small>邮件</small><strong>待企业核验</strong><span>当前不可用</span></span>
                <span className={styles.channelUnavailable} aria-disabled="true"><small>企业微信</small><strong>待企业核验</strong><span>当前不可用</span></span>
                <span className={styles.channelCallback}><small>提交回访</small><strong>填写下方表单</strong><span>系统生成线索编号</span></span>
              </div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>联系人称呼</span>
                  <input name="contactName" value={contactName} onChange={(event) => { setContactName(event.target.value); setSubmitState("idle"); }} maxLength={40} autoComplete="name" />
                </label>
                <label className={styles.field}>
                  <span>希望通过什么方式回访</span>
                  <select name="contactChannel" value={contactChannel} onChange={(event) => { setContactChannel(event.target.value as ContactRequest["contactChannel"]); setContactValue(""); setSubmitState("idle"); }}>
                    <option value="phone">电话</option>
                    <option value="email">邮件</option>
                    <option value="wechat">微信</option>
                  </select>
                </label>
              </div>
              <label className={styles.field}>
                <span>{contactChannel === "phone" ? "联系电话" : contactChannel === "email" ? "电子邮箱" : "微信号"}</span>
                <input
                  name="contactValue"
                  type={contactChannel === "email" ? "email" : contactChannel === "phone" ? "tel" : "text"}
                  value={contactValue}
                  onChange={(event) => { setContactValue(event.target.value); setSubmitState("idle"); }}
                  maxLength={80}
                  autoComplete={contactChannel === "email" ? "email" : contactChannel === "phone" ? "tel" : "off"}
                />
              </label>
              <label className={styles.honeypot} aria-hidden="true">
                <span>网站</span>
                <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
              </label>
              <label className={styles.consent}>
                <input name="consent" type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setSubmitState("idle"); }} />
                <span>我已阅读<Link href="/privacy">咨询数据处理说明</Link>（版本 {CONSULTATION_PRIVACY_VERSION}），同意钜豪为回复本次咨询保存并使用我主动提交的信息。</span>
              </label>
              <button className={styles.submitButton} type="button" onClick={handleSubmit} disabled={submitState === "submitting"}>
                {submitState === "submitting" ? "正在提交…" : "提交回访"}
              </button>
              <div className={styles.submitStatus} aria-live="polite" aria-atomic="true">
                {submitState === "error" && <p role="alert">提交未完成。请检查联系人信息和隐私确认，或稍后重试。</p>}
              </div>
            </div>
          )}
        </form>
      </section>

      <section className={styles.officialContacts} aria-labelledby="official-contact-title">
        <div><p>04 / CONTACT REVIEW</p><h2 id="official-contact-title">联系信息签核状态</h2><span>本地知识库没有可作为正式主体证明的联系方式；以下渠道完成企业负责人签核前不公开具体值。</span></div>
        <address>
          <div><small>服务热线</small><strong>待企业签核</strong></div>
          <div><small>联系电话</small><strong>待企业签核</strong></div>
          <div><small>电子邮箱</small><strong>待企业签核</strong></div>
          <div><small>企业地址</small><strong>待企业签核</strong></div>
        </address>
      </section>

      <section className={styles.nextSteps} aria-labelledby="contact-next-title" data-reveal>
        <div>
          <p>NEXT STEP</p>
          <h2 id="contact-next-title">继续了解对应方案</h2>
        </div>
        <div>
          <p>在沟通前先浏览对应场景，有助于更准确地说明空间、阶段与希望解决的问题。</p>
          <div className={styles.links}>
            <Link href="/solutions/residential">家庭健康光方案 <span aria-hidden="true">↗</span></Link>
            <Link href="/solutions">工程照明方案 <span aria-hidden="true">↗</span></Link>
            <Link href="/partners">渠道合作方向 <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
