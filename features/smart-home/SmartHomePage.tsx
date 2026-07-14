"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import type { PageData } from "@/app/_data/pages";
import { consultationHref } from "@/lib/consultation";
import styles from "./SmartHomePage.module.css";

type SceneId = "home" | "movie" | "sleep" | "away";

type Scene = {
  id: SceneId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  time: string;
  cues: string[];
};

const scenes: Scene[] = [
  {
    id: "home",
    label: "回家",
    eyebrow: "WELCOME HOME",
    title: "让光先说“欢迎回来”",
    description: "从玄关到起居空间，按家庭习惯安排灯光进入顺序。实际联动范围与控制方式，由项目方案确认。",
    time: "18:40",
    cues: ["通行光先行", "起居光渐入", "保留墙面控制"],
  },
  {
    id: "movie",
    label: "观影",
    eyebrow: "MOVIE TIME",
    title: "把注意力留给故事",
    description: "降低屏幕周边的明暗反差，同时保留必要的环境光。遮光或影音联动需根据现场设备与方案确认。",
    time: "20:15",
    cues: ["减少直视亮光", "保留低位环境光", "一键也可手动调整"],
  },
  {
    id: "sleep",
    label: "睡眠",
    eyebrow: "WIND DOWN",
    title: "让夜晚慢下来",
    description: "逐步退出高亮度照明，为睡前活动保留柔和、易辨识的光。场景时序应结合家庭作息现场调试。",
    time: "22:30",
    cues: ["主照明逐步退场", "低位光支持通行", "避免复杂操作"],
  },
  {
    id: "away",
    label: "离家",
    eyebrow: "LEAVING HOME",
    title: "一个动作，清晰收尾",
    description: "把需要管理的照明状态集中到离家动作中。其他设备是否参与以及如何联动，需逐项核验后设置。",
    time: "08:10",
    cues: ["集中管理照明", "状态清晰可查", "异常仍可单独处理"],
  },
];

const planningSteps = [
  {
    title: "记录生活的一天",
    text: "从起床、离家、回家到休息，先找出真正高频、值得简化的动作。",
  },
  {
    title: "梳理空间与回路",
    text: "让照明分区对应真实活动，并为稳定、直观的基础控制预留位置。",
  },
  {
    title: "编排场景逻辑",
    text: "逐一确认触发方式、照明状态与必要联动，不把所有设备强行绑定。",
  },
  {
    title: "现场调试与复核",
    text: "按实际作息调整场景，并核验产品、控制范围与每个手动入口。",
  },
];

const verifiedKnowledge = [
  {
    href: "/news/smart-lighting-scene-control",
    title: "智能照明与场景控制",
    text: "先定义真实场景，再核对控制入口、回路、调光与异常回退。",
  },
  {
    href: "/news/led-dimming-compatibility",
    title: "LED 调光兼容性",
    text: "灯具、驱动、控制器和回路负载需要作为组合验证。",
  },
  {
    href: "/news/led-driver-constant-voltage-current",
    title: "驱动电源与恒压恒流",
    text: "不能只比较额定瓦数，还要核对输出窗口、负载和调光方式。",
  },
] as const;

const fallbackFaqs = [
  {
    question: "智能照明一定要使用手机控制吗？",
    answer: "不一定。规划时应保留直观的基础控制；手机、自动化或其他入口是否采用，需要结合家庭习惯与已确认方案决定。",
  },
  {
    question: "智能照明应该在装修哪个阶段确定？",
    answer: "建议在电气点位和回路确定前，先梳理主要生活场景与控制需求，以减少后期调整。",
  },
];

export type SmartHomePageProps = {
  page: PageData;
};

export function SmartHomePage({ page }: SmartHomePageProps) {
  const sceneButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeSceneId, setActiveSceneId] = useState<SceneId>(scenes[0].id);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  const activeSceneIndex = scenes.indexOf(activeScene);
  const faqs = page.faqs?.length ? page.faqs : fallbackFaqs;

  const selectSceneFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % scenes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + scenes.length) % scenes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = scenes.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    setActiveSceneId(scenes[nextIndex].id);
    sceneButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <main className={styles.page} id="main-content">
      <section className={styles.hero} aria-labelledby="smart-home-title">
        <div className={styles.heroMedia} aria-hidden="true">
          <Image src={page.image} alt="" fill priority unoptimized sizes="100vw" />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />

        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}><span aria-hidden="true" />{page.eyebrow}</p>
          <h1 className={styles.heroTitle} id="smart-home-title">
            <span>{page.label}</span>
            <strong>照明解决方案</strong>
          </h1>
          <p className={styles.heroIntro}>{page.intro}</p>
          <div className={styles.heroActions}>
            <a href="#life-scenes">体验生活场景 <span aria-hidden="true">↓</span></a>
            <Link href={consultationHref("project", "solutions", "smart-home")}>咨询规划 <span aria-hidden="true">↗</span></Link>
          </div>
        </div>

        <div className={styles.signalBoard} aria-hidden="true">
          <p>SCENE LOGIC</p>
          <ol>
            <li><small>01</small><span>时刻</span><i /></li>
            <li><small>02</small><span>活动</span><i /></li>
            <li><small>03</small><span>手动</span><i /></li>
          </ol>
        </div>
      </section>

      <section className={styles.scenes} id="life-scenes" aria-labelledby="life-scenes-title">
        <header className={styles.sectionHeading} data-reveal>
          <p>01 / DAILY RHYTHM</p>
          <div>
            <h2 id="life-scenes-title">先设计生活，<br />再设计控制</h2>
            <p>场景不是功能清单，而是对日常时刻的清晰回应。选择一个场景，查看它应该解决什么问题。</p>
          </div>
        </header>

        <div className={styles.sceneShell} data-reveal="fade">
          <div className={styles.sceneTabs} role="tablist" aria-label="生活场景">
            {scenes.map((scene, index) => {
              const active = scene.id === activeSceneId;

              return (
                <button
                  aria-controls={`smart-scene-panel-${scene.id}`}
                  aria-selected={active}
                  className={active ? styles.sceneTabActive : undefined}
                  id={`smart-scene-tab-${scene.id}`}
                  key={scene.id}
                  onClick={() => setActiveSceneId(scene.id)}
                  onKeyDown={(event) => selectSceneFromKeyboard(event, index)}
                  ref={(element) => { sceneButtonRefs.current[index] = element; }}
                  role="tab"
                  tabIndex={active ? 0 : -1}
                  type="button"
                >
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <span>{scene.label}</span>
                  <i aria-hidden="true">↗</i>
                </button>
              );
            })}
          </div>

          <div className={styles.sceneStage} data-scene={activeScene.id}>
            <Image
              className={styles.sceneImage}
              src="/images/juhao-home.webp"
              alt="钜豪智能照明生活场景示意"
              fill
              unoptimized
              sizes="(max-width: 900px) 100vw, 72vw"
            />
            <div className={styles.sceneWash} aria-hidden="true" />
            <div className={styles.sceneClock} aria-hidden="true">
              <small>SCENE / {String(activeSceneIndex + 1).padStart(2, "0")}</small>
              <strong>{activeScene.time}</strong>
            </div>
            {scenes.map((scene) => {
              const active = scene.id === activeScene.id;

              return (
                <article
                  aria-labelledby={`smart-scene-tab-${scene.id}`}
                  className={styles.scenePanel}
                  hidden={!active}
                  id={`smart-scene-panel-${scene.id}`}
                  key={scene.id}
                  role="tabpanel"
                  tabIndex={0}
                >
                  <p>{scene.eyebrow}</p>
                  <h3>{scene.title}</h3>
                  <p>{scene.description}</p>
                  <ul>
                    {scene.cues.map((cue) => <li key={cue}>{cue}</li>)}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.evidence} aria-labelledby="smart-evidence-title">
        <header>
          <p>02 / VERIFIED CONTENT</p>
          <h2 id="smart-evidence-title">先公开方法，<br />再逐款审核设备</h2>
          <span>当前智能设备候选清单已建立，但 0 款完成协议、供电、安装、兼容范围与售后资料审核，因此不生成产品详情。</span>
        </header>
        <div className={styles.evidenceGrid}>
          {verifiedKnowledge.map((item, index) => (
            <Link href={item.href} key={item.href}>
              <small>{String(index + 1).padStart(2, "0")} / JUHAO 审核知识</small>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <b>查看来源与边界 ↗</b>
            </Link>
          ))}
        </div>
        <Link className={styles.evidenceCta} href="/contact?source=product-topic&sourceDetail=smart-home-devices&scene=project&intent=project-brief#consultation-form">提交场景与兼容需求 →</Link>
      </section>

      <section className={styles.planning} id="planning" aria-labelledby="planning-title">
        <div className={styles.planningInner}>
          <header className={styles.planningHeading} data-reveal>
            <p>03 / SYSTEM PLANNING</p>
            <h2 id="planning-title">让智能从图纸上<br />就变得清楚</h2>
          </header>

          <div className={styles.planningLayout}>
            <div className={styles.planningDiagram} aria-hidden="true" data-reveal="fade">
              <div className={styles.diagramOrbit}><span>生活</span><span>空间</span><span>控制</span><span>调试</span></div>
              <div className={styles.diagramCore}><strong>JUHAO</strong><small>SCENE FIRST</small></div>
              <p>需求不是从设备型号开始</p>
            </div>

            <ol className={styles.stepList}>
              {planningSteps.map((step, index) => (
                <li key={step.title} data-reveal data-reveal-delay={String(index * 0.05)}>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className={styles.planningNotice} data-reveal>
            本页展示的是规划方法，不代表特定产品、通信协议或设备兼容承诺。正式功能以经核验的项目方案与产品资料为准。
          </p>
        </div>
      </section>

      <section className={styles.faq} aria-labelledby="smart-faq-title">
        <header data-reveal>
          <p>04 / QUESTIONS</p>
          <h2 id="smart-faq-title">关于智能照明，<br />先问对问题</h2>
        </header>
        <div className={styles.faqList} data-reveal>
          {faqs.map((faq, index) => (
            <details key={faq.question}>
              <summary>
                <span><small>{String(index + 1).padStart(2, "0")}</small>{faq.question}</span>
                <i aria-hidden="true" />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
