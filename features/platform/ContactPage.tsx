"use client";

import type { FormEvent } from "react";
import { useCallback, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PageData } from "@/app/_data/pages";
import { EvidenceScale, type EvidenceScaleItem } from "@/components/experience/EvidenceScale";
import { submitContact } from "@/lib/api/contact";
import type { ContactRequest } from "@/lib/api/types";
import { CONSULTATION_PRIVACY_VERSION, consultationContextForDirection, type ConsultationContext } from "@/lib/consultation";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import styles from "./ContactPage.module.css";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

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

type ContactField = "direction" | "project" | "stage" | "need" | "contactName" | "contactValue" | "consent" | "turnstile";
type ContactFieldErrors = Partial<Record<ContactField, string>>;

const checkFieldOrder: ContactField[] = ["direction", "project", "stage", "need"];
const submitFieldOrder: ContactField[] = ["contactName", "contactValue", "consent", "turnstile"];
const stageLabels: Record<NonNullable<ContactRequest["stage"]>, string> = {
  understanding: "初步了解",
  planning: "筹备或设计",
  delivery: "施工或交付",
  operation: "运营或使用中",
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
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const resultId = useId().replaceAll(":", "");
  const activeContext = direction
    ? initialContext?.direction === direction
      ? initialContext
      : consultationContextForDirection(direction, initialContext?.source ?? "direct", initialContext?.sourceDetail)
    : initialContext;

  function fieldId(field: ContactField) {
    return `${resultId}-${field}`;
  }

  function errorId(field: ContactField) {
    return `${fieldId(field)}-error`;
  }

  function describedBy(...ids: Array<string | false>) {
    return ids.filter(Boolean).join(" ") || undefined;
  }

  function clearFieldError(field: ContactField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function focusFirstError(errors: ContactFieldErrors, order: ContactField[]) {
    const first = order.find((field) => errors[field]);
    if (!first) return;
    window.requestAnimationFrame(() => document.getElementById(fieldId(first))?.focus());
  }

  function clearResult(field?: ContactField) {
    if (result) setResult(null);
    if (submitState !== "idle") setSubmitState("idle");
    if (field) clearFieldError(field);
  }

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
    setSubmitError("");
    setSubmitState("idle");
    setFieldErrors((current) => {
      if (!current.turnstile) return current;
      const next = { ...current };
      delete next.turnstile;
      return next;
    });
  }, []);

  function handleCheck(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const errors: ContactFieldErrors = {
      ...(!direction ? { direction: "请选择咨询方向。" } : {}),
      ...(project.trim().length < 4 ? { project: "请至少填写 4 个字，简要说明项目或业务概况。" } : {}),
      ...(!stage ? { stage: "请选择当前阶段。" } : {}),
      ...(need.trim().length < 12 ? { need: "请至少填写 12 个字，说明希望解决的问题。" } : {}),
    };
    const missing = checkFieldOrder.filter((field) => errors[field]);

    if (missing.length > 0) {
      setFieldErrors(errors);
      setResult({
        tone: "needs-work",
        title: "还可以补充一些信息",
        text: `还有 ${missing.length} 项需要完善。已定位到第一项；检查仅在当前浏览器页面内完成，不会发送或保存内容。`,
      });
      focusFirstError(errors, checkFieldOrder);
      return;
    }

    setFieldErrors({});
    setResult({
      tone: "ready",
      title: "咨询信息已基本准备好",
      text: "请选择电话、邮件、企业微信或提交回访。回访表单只收集本次沟通所需的最少联系信息，提交后系统会返回线索编号。",
    });
  }

  async function handleSubmit() {
    if (result?.tone !== "ready" || !direction || !stage) return;
    const normalizedContact = contactValue.trim();
    const contactValueError = normalizedContact.length < 5
      ? "请填写可用于回访的联系方式。"
      : contactChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact)
        ? "请输入有效的电子邮箱。"
        : contactChannel === "phone" && (!/^[+\d\s()\-]+$/.test(normalizedContact) || normalizedContact.replace(/\D/g, "").length < 7)
          ? "请输入有效的联系电话。"
          : "";
    const errors: ContactFieldErrors = {
      ...(contactName.trim().length < 2 ? { contactName: "请至少填写 2 个字作为联系人称呼。" } : {}),
      ...(contactValueError ? { contactValue: contactValueError } : {}),
      ...(!consent ? { consent: "请先阅读并确认咨询数据处理说明。" } : {}),
      ...(turnstileSiteKey && !turnstileToken ? { turnstile: "请先完成安全校验。" } : {}),
    };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError("请完善标记的回访信息。");
      setSubmitState("error");
      focusFirstError(errors, submitFieldOrder);
      return;
    }

    setFieldErrors({});
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
        ...(turnstileToken ? { turnstileToken } : {}),
        website,
      });
      router.push(`/contact/success?lead=${encodeURIComponent(nextReceipt.id)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "咨询提交失败，请稍后重试");
      if (turnstileSiteKey) setTurnstileResetKey((value) => value + 1);
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
    setSubmitError("");
    setTurnstileToken("");
    setFieldErrors({});
    if (turnstileSiteKey) setTurnstileResetKey((value) => value + 1);
  }

  function chooseDirection(nextDirection: ContactRequest["direction"]) {
    setDirection(nextDirection);
    clearResult("direction");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("consultation-form")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result?.tone === "ready") {
      void handleSubmit();
      return;
    }
    handleCheck();
  }

  const briefCompleted = [
    Boolean(direction),
    project.trim().length >= 4,
    Boolean(stage),
    need.trim().length >= 12,
  ].filter(Boolean).length;
  const directionLabel = directions.find((item) => item.id === direction)?.title ?? "待选择";
  const evidenceItems: EvidenceScaleItem[] = [
    {
      code: "01",
      title: "来源上下文",
      value: activeContext?.sourceDetail ? `已携带 ${activeContext.sourceDetail}` : activeContext?.label ?? "直接进入咨询",
      status: activeContext ? "confirmed" : "context",
    },
    { code: "02", title: "咨询方向", value: directionLabel, status: direction ? "confirmed" : "pending" },
    { code: "03", title: "当前阶段", value: stage ? stageLabels[stage] : "待选择", status: stage ? "context" : "pending" },
    { code: "04", title: "任务书完整度", value: `${briefCompleted} / 4 项`, status: briefCompleted === 4 ? "confirmed" : "context" },
    { code: "05", title: "下一步", value: result?.tone === "ready" ? "补充回访信息并提交" : "先完成需求核对", status: "action", href: "#consultation-form" },
  ];

  return (
    <main id="main-content" className={styles.page} data-lightfield-page="contact-brief" tabIndex={-1}>
      <section
        className={styles.hero}
        data-page-hero="image"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7, 8, 7, .96), rgba(7, 8, 7, .66) 57%, rgba(7, 8, 7, .28)), url("${page.image}")`,
        }}
      >
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroInner} data-reveal="fade">
          <p className={styles.eyebrow} data-page-role="eyebrow"><span aria-hidden="true" />{page.eyebrow}</p>
          <h1 data-page-role="display">{page.title}</h1>
          <p className={styles.heroText} data-page-role="lead">家庭健康光、工程项目与渠道合作分别进入对应表单，先说明场景、阶段与核心目标。</p>
          <div className={styles.heroActions}>
            <Link href="#contact-directions-title" className={styles.heroPrimary}>选择方案方向 <span aria-hidden="true">↓</span></Link>
            <Link href="#consultation-form">直接描述需求</Link>
          </div>
          <div className={styles.channelStatus} role="note">
            <span aria-hidden="true" />
            <div><strong>{initialContext ? `已匹配：${initialContext.label}` : "三类需求，三条咨询路径"}</strong><p>{initialContext ? initialContext.description : "选择最接近的方向；提交成功后，系统会返回本次需求的线索编号。"}</p></div>
          </div>
        </div>
      </section>

      <EvidenceScale items={evidenceItems} label="光的任务书" />

      <section className={styles.directions} data-page-section aria-labelledby="contact-directions-title">
        <header className={styles.sectionHeading} data-reveal>
          <p>选择咨询路径</p>
          <div>
            <h2 id="contact-directions-title">先选择咨询方向</h2>
            <p>家庭、工程与渠道需求分别记录场景和沟通意图，减少后续重复说明。</p>
          </div>
        </header>
        <div className={styles.directionGrid}>
          {directions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={direction === item.id ? styles.directionActive : undefined}
              onClick={() => chooseDirection(item.id)}
              aria-pressed={direction === item.id}
              data-reveal
            >
              <span>{item.code}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <b>选择并填写 <span aria-hidden="true">↘</span></b>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.prepareSection} data-page-section aria-labelledby="contact-prepare-title">
        <div className={styles.prepareInner}>
          <div className={styles.prepareIntro} data-reveal>
            <p>沟通准备</p>
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

      <section className={styles.checkerSection} data-page-section id="consultation-form" aria-labelledby="contact-checker-title">
        <div className={styles.checkerIntro}>
          <p>需求核对</p>
          <h2 id="contact-checker-title">{activeContext ? activeContext.cta : "检查咨询信息是否完整"}</h2>
          <p>第一步只核对需求信息；通过后再选择直接联系或填写最少信息提交回访。</p>
          <div className={styles.privacyNote}>
            <strong>当前状态</strong>
            <p>第一步内容只保留在当前页面。只有主动点击“提交回访”并确认数据处理说明后，信息才会发送并保存。</p>
          </div>
        </div>

        <form className={styles.checkerForm} onSubmit={handleFormSubmit} onReset={handleReset} aria-describedby={`${resultId}-notice`} noValidate>
          {activeContext && (
            <div className={styles.contextBanner} role="status">
              <small>咨询路径</small>
              <strong>{activeContext.label}</strong>
              <p>{activeContext.description}</p>
              <input type="hidden" name="source" value={activeContext.source} />
              {activeContext.sourceDetail && <input type="hidden" name="sourceDetail" value={activeContext.sourceDetail} />}
              <input type="hidden" name="scene" value={activeContext.scene} />
              <input type="hidden" name="intent" value={activeContext.intent} />
            </div>
          )}
          <fieldset className={styles.directionFieldset} aria-invalid={Boolean(fieldErrors.direction)} aria-describedby={fieldErrors.direction ? errorId("direction") : undefined}>
            <legend>咨询方向</legend>
            <div className={styles.radioGrid}>
              {directions.map((item) => (
                <label key={item.id} className={direction === item.id ? styles.radioActive : undefined}>
                  <input
                    id={item.id === "home" ? fieldId("direction") : `${fieldId("direction")}-${item.id}`}
                    type="radio"
                    name="direction"
                    value={item.id}
                    checked={direction === item.id}
                    onChange={(event) => { setDirection(event.target.value as ContactRequest["direction"]); clearResult("direction"); }}
                    required
                  />
                  <span>{item.code}</span>
                  <strong>{item.title}</strong>
                </label>
              ))}
            </div>
            {fieldErrors.direction && <p className={styles.fieldError} id={errorId("direction")}>{fieldErrors.direction}</p>}
          </fieldset>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>项目或业务概况</span>
              <input
                id={fieldId("project")}
                name="project"
                value={project}
                onChange={(event) => { setProject(event.target.value); clearResult("project"); }}
                placeholder={activeContext?.projectPlaceholder ?? "例如：80㎡住宅，正在规划照明"}
                minLength={4}
                maxLength={80}
                required
                aria-invalid={Boolean(fieldErrors.project)}
                aria-describedby={describedBy(`${fieldId("project")}-hint`, Boolean(fieldErrors.project) && errorId("project"))}
              />
              <small id={`${fieldId("project")}-hint`}>不要填写具体门牌或个人联系方式。</small>
              {fieldErrors.project && <p className={styles.fieldError} id={errorId("project")}>{fieldErrors.project}</p>}
            </label>
            <label className={styles.field}>
              <span>当前阶段</span>
              <select id={fieldId("stage")} name="stage" value={stage} onChange={(event) => { setStage(event.target.value as ContactRequest["stage"] | ""); clearResult("stage"); }} required aria-invalid={Boolean(fieldErrors.stage)} aria-describedby={fieldErrors.stage ? errorId("stage") : undefined}>
                <option value="">请选择</option>
                <option value="understanding">初步了解</option>
                <option value="planning">筹备或设计</option>
                <option value="delivery">施工或交付</option>
                <option value="operation">运营或使用中</option>
              </select>
              {fieldErrors.stage && <p className={styles.fieldError} id={errorId("stage")}>{fieldErrors.stage}</p>}
            </label>
          </div>

          <label className={styles.field}>
            <span>希望解决的问题</span>
            <textarea
              id={fieldId("need")}
              name="need"
              value={need}
              onChange={(event) => { setNeed(event.target.value); clearResult("need"); }}
              placeholder={activeContext?.needPlaceholder ?? "说明主要场景、现状和期待结果；无需提供个人信息。"}
              rows={5}
              minLength={12}
              maxLength={360}
              required
              aria-invalid={Boolean(fieldErrors.need)}
              aria-describedby={describedBy(`${fieldId("need")}-count`, Boolean(fieldErrors.need) && errorId("need"))}
            />
            <small id={`${fieldId("need")}-count`}>{need.length}/360 字</small>
            {fieldErrors.need && <p className={styles.fieldError} id={errorId("need")}>{fieldErrors.need}</p>}
          </label>

          <div className={styles.formActions}>
            <button type="button" onClick={() => handleCheck()}>检查准备情况 <span aria-hidden="true">→</span></button>
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
                <small>后续联系</small>
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
                  <input id={fieldId("contactName")} name="contactName" value={contactName} onChange={(event) => { setContactName(event.target.value); setSubmitState("idle"); clearFieldError("contactName"); }} minLength={2} maxLength={40} autoComplete="name" required aria-invalid={Boolean(fieldErrors.contactName)} aria-describedby={fieldErrors.contactName ? errorId("contactName") : undefined} />
                  {fieldErrors.contactName && <p className={styles.fieldError} id={errorId("contactName")}>{fieldErrors.contactName}</p>}
                </label>
                <label className={styles.field}>
                  <span>希望通过什么方式回访</span>
                  <select name="contactChannel" value={contactChannel} onChange={(event) => { setContactChannel(event.target.value as ContactRequest["contactChannel"]); setContactValue(""); setSubmitState("idle"); clearFieldError("contactValue"); }}>
                    <option value="phone">电话</option>
                    <option value="email">邮件</option>
                    <option value="wechat">微信</option>
                  </select>
                </label>
              </div>
              <label className={styles.field}>
                <span>{contactChannel === "phone" ? "联系电话" : contactChannel === "email" ? "电子邮箱" : "微信号"}</span>
                <input
                  id={fieldId("contactValue")}
                  name="contactValue"
                  type={contactChannel === "email" ? "email" : contactChannel === "phone" ? "tel" : "text"}
                  value={contactValue}
                  onChange={(event) => { setContactValue(event.target.value); setSubmitState("idle"); clearFieldError("contactValue"); }}
                  minLength={5}
                  maxLength={80}
                  required
                  autoComplete={contactChannel === "email" ? "email" : contactChannel === "phone" ? "tel" : "off"}
                  aria-invalid={Boolean(fieldErrors.contactValue)}
                  aria-describedby={fieldErrors.contactValue ? errorId("contactValue") : undefined}
                />
                {fieldErrors.contactValue && <p className={styles.fieldError} id={errorId("contactValue")}>{fieldErrors.contactValue}</p>}
              </label>
              <label className={styles.honeypot} aria-hidden="true">
                <span>网站</span>
                <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
              </label>
              <label className={`${styles.consent} ${fieldErrors.consent ? styles.consentInvalid : ""}`}>
                <input id={fieldId("consent")} name="consent" type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setSubmitState("idle"); clearFieldError("consent"); }} required aria-invalid={Boolean(fieldErrors.consent)} aria-describedby={fieldErrors.consent ? errorId("consent") : undefined} />
                <span>我已阅读<Link href="/privacy">咨询数据处理说明</Link>（版本 {CONSULTATION_PRIVACY_VERSION}），同意钜豪为回复本次咨询保存并使用我主动提交的信息。</span>
              </label>
              {fieldErrors.consent && <p className={styles.fieldError} id={errorId("consent")}>{fieldErrors.consent}</p>}
              {turnstileSiteKey && (
                <div className={styles.turnstile} id={fieldId("turnstile")} tabIndex={-1} aria-label="安全校验" aria-invalid={Boolean(fieldErrors.turnstile)} aria-describedby={fieldErrors.turnstile ? errorId("turnstile") : undefined}>
                  <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    resetKey={turnstileResetKey}
                    onTokenChange={handleTurnstileToken}
                  />
                </div>
              )}
              {fieldErrors.turnstile && <p className={styles.fieldError} id={errorId("turnstile")}>{fieldErrors.turnstile}</p>}
              <button className={styles.submitButton} type="submit" disabled={submitState === "submitting"}>
                {submitState === "submitting" ? "正在提交…" : "提交回访"}
              </button>
              <div className={styles.submitStatus} aria-live="polite" aria-atomic="true">
                {submitState === "error" && <p role="alert">提交未完成。{submitError || "请稍后重试。"}</p>}
              </div>
            </div>
          )}
        </form>
      </section>

      <section className={styles.officialContacts} aria-labelledby="official-contact-title">
        <div><p>官方渠道状态</p><h2 id="official-contact-title">联系信息签核状态</h2><span>本地知识库没有可作为正式主体证明的联系方式；以下渠道完成企业负责人签核前不公开具体值。</span></div>
        <address>
          <div><small>服务热线</small><strong>待企业签核</strong></div>
          <div><small>联系电话</small><strong>待企业签核</strong></div>
          <div><small>电子邮箱</small><strong>待企业签核</strong></div>
          <div><small>企业地址</small><strong>待企业签核</strong></div>
        </address>
      </section>

      <section className={styles.nextSteps} aria-labelledby="contact-next-title" data-reveal>
        <div>
          <p>继续了解</p>
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
