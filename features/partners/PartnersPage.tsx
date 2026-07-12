"use client";

import { useEffect, useState } from "react";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type PartnerRegion } from "@/lib/api";
import styles from "./PartnersPage.module.css";

const steps = [
  ["需求沟通", "说明区域、团队、经验与计划方向。"],
  ["能力评估", "共同确认服务、运营与交付条件。"],
  ["方案确认", "明确合作边界、节奏与双方责任。"],
  ["持续共建", "依据用户与市场反馈持续优化。"],
];

const regionStatus = {
  open: {
    label: "开放沟通",
    description: "当前 Mock 状态为“开放沟通”，仅表示演示流程可继续，不代表该区域已开放招商、保留名额或适用任何正式政策。",
  },
  "available-soon": {
    label: "即将开放",
    description: "当前 Mock 状态为“即将开放”，仅用于演示待开放状态，不构成开放时间、区域权益或正式政策承诺。",
  },
} satisfies Record<PartnerRegion["status"], { label: string; description: string }>;

export function PartnersPage({ page }: { page: PageData }) {
  const [regions, setRegions] = useState<PartnerRegion[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId);

  useEffect(() => {
    let current = true;
    siteApi.getPartnerRegions().then((items) => {
      if (!current) return;
      setRegions(items);
      setSelectedRegionId((selectedId) => items.some((item) => item.id === selectedId) ? selectedId : "");
      setStatus("ready");
    }).catch(() => {
      if (!current) return;
      setRegions([]);
      setSelectedRegionId("");
      setStatus("error");
    });
    return () => { current = false; };
  }, [retryKey]);

  function retryRegions() {
    setStatus("loading");
    setRetryKey((key) => key + 1);
  }

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero} style={{ backgroundImage: `url(${page.image})` }}><div data-reveal="fade"><small>{page.eyebrow}</small><h1>{page.title}</h1><p>{page.intro}</p></div></section>
      <section className={styles.process}><header data-reveal><span>01 / PROCESS</span><h2>从了解彼此开始</h2></header><div className={styles.steps}>{steps.map((step, index) => <article className={styles.step} key={step[0]} data-reveal><small>0{index + 1}</small><h3>{step[0]}</h3><p>{step[1]}</p></article>)}</div></section>
      <section className={styles.regions}><header data-reveal><span>02 / REGIONS</span><h2>区域信息示例状态</h2></header>
        {status === "loading" && <p className={styles.notice}>正在读取区域数据…</p>}
        {status === "error" && <div className={styles.errorState}><p role="alert">区域 Mock 数据暂时不可用，未加载任何正式招商区域或政策。</p><button type="button" onClick={retryRegions}>重试读取区域示例</button></div>}
        {status === "ready" && regions.length === 0 && <p className={styles.notice}>当前没有可公开的区域信息。</p>}
        {status === "ready" && regions.length > 0 && <>
          <div className={styles.regionList} role="group" aria-label="选择区域查看 Mock 状态">{regions.map((region) => <button className={styles.region} type="button" key={region.id} aria-pressed={selectedRegionId === region.id} aria-label={`${region.name}，Mock 状态：${regionStatus[region.status].label}`} onClick={() => setSelectedRegionId(region.id)}><strong>{region.name}</strong><span>{regionStatus[region.status].label}</span></button>)}</div>
          {selectedRegion ? <div className={styles.regionDetail} aria-live="polite"><small>SELECTED REGION · MOCK</small><h3>{selectedRegion.name} · {regionStatus[selectedRegion.status].label}</h3><p>{regionStatus[selectedRegion.status].description}</p></div> : <p className={styles.selectionHint}>选择一个区域，查看对应的 Mock 状态说明。</p>}
        </>}
        <p className={styles.notice}>以上仅用于验证交互状态，不代表正式招商区域或政策；正式信息以企业确认后发布的内容为准。</p>
      </section>
    </main>
  );
}
