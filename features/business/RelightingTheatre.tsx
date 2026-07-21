"use client";

import type { CSSProperties } from "react";
import { lazy, Suspense, useState } from "react";
import Image from "next/image";

import type { BusinessSceneId } from "@/content/scene-resources";

import styles from "./RelightingTheatre.module.css";

const LightFieldCanvas = lazy(() =>
  import("@/components/experience/LightFieldCanvas").then((module) => ({
    default: module.LightFieldCanvas,
  })),
);

type LightMode = {
  code: string;
  label: string;
  layer: string;
  note: string;
  title: string;
};

const modesByScene: Record<BusinessSceneId, LightMode[]> = {
  residential: [
    { code: "01", label: "晨间", title: "让活动清晰启动", note: "用均衡的环境亮度支持起居与整理，避免一开始就用强烈重点光制造反差。", layer: "环境光 / 活动面" },
    { code: "02", label: "共处", title: "让不同活动彼此兼容", note: "把交流、阅读与通行拆成可独立理解的光层次，保留手动调整空间。", layer: "任务光 / 交流区" },
    { code: "03", label: "夜间", title: "让空间自然收束", note: "减少直视和过强反差，让夜间通行与休息拥有更柔和的过渡。", layer: "低位光 / 夜间路径" },
  ],
  hospitality: [
    { code: "01", label: "抵达", title: "先建立方向与欢迎感", note: "入口识别、前台任务面与背景亮度共同建立第一段空间秩序。", layer: "导向光 / 入口界面" },
    { code: "02", label: "停留", title: "用亮暗关系组织交流", note: "让重点落在人物、桌面和材质上，同时保留公共区域之间的视觉连续性。", layer: "重点光 / 公共区域" },
    { code: "03", label: "休息", title: "把控制交还给使用者", note: "客房中的阅读、起居和夜间活动应容易切换，不依赖复杂操作。", layer: "局部光 / 客房场景" },
  ],
  commercial: [
    { code: "01", label: "识别", title: "让品牌和入口先被看见", note: "通过明暗节奏建立方向感，不以全空间同亮度替代重点。", layer: "识别光 / 入口焦点" },
    { code: "02", label: "选购", title: "让商品、人物与材质清晰", note: "重点光服务观看和比较，环境光维持舒适的空间尺度。", layer: "重点光 / 展示界面" },
    { code: "03", label: "运营", title: "让光适应时段与维护", note: "按客流、活动和闭店状态组织场景，并考虑后续维护便利。", layer: "分区光 / 运营时段" },
  ],
  public: [
    { code: "01", label: "通行", title: "先让路径安全可辨", note: "入口、转折与高差位置需要连续识别，避免只追求局部亮点。", layer: "路径光 / 导向界面" },
    { code: "02", label: "停留", title: "让公共空间保持尺度", note: "用适度的重点与环境亮度支持交流和停留，不制造过度眩光。", layer: "环境光 / 停留节点" },
    { code: "03", label: "维护", title: "把长期运行纳入设计", note: "控制、检修和替换条件需要和视觉效果同时进入方案讨论。", layer: "运行光 / 维护条件" },
  ],
  industrial: [
    { code: "01", label: "作业", title: "让任务面和障碍清晰", note: "从具体作业、观察距离与环境条件出发，再讨论布灯与控制。", layer: "任务光 / 作业界面" },
    { code: "02", label: "巡检", title: "让路径与设备容易识别", note: "巡检和维护区域需要稳定、连续的可见度，而不是装饰性亮点。", layer: "路径光 / 设备界面" },
    { code: "03", label: "运行", title: "让照明服从长期效率", note: "按班次、分区和维护条件组织控制，具体指标等待正式项目资料。", layer: "分区光 / 运行时段" },
  ],
};

const visualStyles = [
  { "--beam-x": "25%", "--beam-y": "28%", "--wash-opacity": ".58", "--scene-filter": "brightness(.72) contrast(1.08) saturate(.78)" },
  { "--beam-x": "58%", "--beam-y": "44%", "--wash-opacity": ".72", "--scene-filter": "brightness(.78) contrast(1.04) saturate(.92)" },
  { "--beam-x": "78%", "--beam-y": "72%", "--wash-opacity": ".45", "--scene-filter": "brightness(.58) contrast(1.12) saturate(.68)" },
] as const;

export function RelightingTheatre({ image, sceneId }: { image: string; sceneId: BusinessSceneId }) {
  const [activeMode, setActiveMode] = useState(0);
  const modes = modesByScene[sceneId];
  const mode = modes[activeMode];

  return (
    <section className={styles.theatre} data-header-tone="light" aria-labelledby="relighting-theatre-title">
      <header className={styles.heading}>
        <div>
          <p>空间光感说明</p>
          <h2 id="relighting-theatre-title">空间光感演示台</h2>
        </div>
        <p>选择空间任务，观察光的重点如何转移。画面用于解释设计方法，不代表照度、色温、配光或工程计算结果。</p>
      </header>

      <div className={styles.stage} style={visualStyles[activeMode] as CSSProperties}>
        <figure className={styles.visual}>
          <Image src={image} alt="" fill unoptimized sizes="(max-width: 900px) 100vw, 68vw" />
          <div className={styles.wash} aria-hidden="true" />
          <div className={styles.grid} aria-hidden="true" />
          <Suspense fallback={null}>
            <LightFieldCanvas mode={activeMode} variant="space" />
          </Suspense>
          <figcaption>钜豪原创概念场景 · 仅用于空间光感演示</figcaption>
        </figure>

        <aside className={styles.console} aria-labelledby="relighting-console-title">
          <div className={styles.consoleHeader}>
            <small id="relighting-console-title">空间光感控制 / LIGHT CONSOLE</small>
            <strong>{sceneId.toUpperCase()}</strong>
          </div>
          <div className={styles.modeButtons} role="group" aria-label="选择空间光感模式">
            {modes.map((item, index) => (
              <button
                aria-pressed={activeMode === index}
                className={activeMode === index ? styles.modeActive : undefined}
                key={item.code}
                onClick={() => setActiveMode(index)}
                type="button"
              >
                <span>{item.code}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
          <div className={styles.modeCopy} aria-live="polite" aria-atomic="true">
            <small>{mode.layer}</small>
            <h3>{mode.title}</h3>
            <p>{mode.note}</p>
          </div>
          <div className={styles.legend}>
            <span><i />情绪与焦点</span>
            <span><i />真实条件待确认</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
