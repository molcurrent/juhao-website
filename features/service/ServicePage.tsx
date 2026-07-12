"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type ServiceLocation, type ServiceRegion } from "@/lib/api";
import styles from "./ServicePage.module.css";

type LoadState = "idle" | "loading" | "success" | "error";

const serviceSteps = [
  { title: "确认问题", text: "准备产品信息、购买凭证，并尽量记录问题出现的时间与现象。" },
  { title: "选择入口", text: "根据使用问题、资料需求或项目支持，进入对应的服务路径。" },
  { title: "协同处理", text: "服务信息接入后，由对应团队依据已核验资料给出处理建议。" },
  { title: "结果反馈", text: "确认建议是否解决问题，并为后续跟进保留必要记录。" },
];

export type ServicePageProps = {
  page: PageData;
};

export function ServicePage({ page }: ServicePageProps) {
  const [regions, setRegions] = useState<ServiceRegion[]>([]);
  const [regionState, setRegionState] = useState<LoadState>("loading");
  const [regionError, setRegionError] = useState("");
  const [regionId, setRegionId] = useState("");
  const [city, setCity] = useState("");

  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [locationState, setLocationState] = useState<LoadState>("idle");
  const [locationError, setLocationError] = useState("");
  const [resultCity, setResultCity] = useState("");
  const locationRequest = useRef(0);

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqId = useId().replaceAll(":", "");

  async function loadRegions() {
    setRegionState("loading");
    setRegionError("");

    try {
      const data = await siteApi.getRegions();
      setRegions(data);
      setRegionState("success");
    } catch {
      setRegions([]);
      setRegionState("error");
      setRegionError("地区数据暂时无法加载，请稍后重试。");
    }
  }

  useEffect(() => {
    let current = true;

    void siteApi.getRegions().then((data) => {
      if (!current) return;
      setRegions(data);
      setRegionState("success");
    }).catch(() => {
      if (!current) return;
      setRegions([]);
      setRegionState("error");
      setRegionError("地区数据暂时无法加载，请稍后重试。");
    });

    return () => { current = false; };
  }, []);

  const selectedRegion = regions.find((region) => region.id === regionId);

  function resetLocationResults() {
    locationRequest.current += 1;
    setLocations([]);
    setLocationState("idle");
    setLocationError("");
    setResultCity("");
  }

  function handleRegionChange(nextRegionId: string) {
    setRegionId(nextRegionId);
    setCity("");
    resetLocationResults();
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    resetLocationResults();
  }

  const loadLocations = useCallback(async () => {
    if (!city) return;

    const requestId = locationRequest.current + 1;
    locationRequest.current = requestId;
    setLocationState("loading");
    setLocationError("");
    setLocations([]);
    setResultCity(city);

    try {
      const data = await siteApi.getLocations(city);
      if (locationRequest.current !== requestId) return;
      setLocations(data);
      setLocationState("success");
    } catch {
      if (locationRequest.current !== requestId) return;
      setLocationState("error");
      setLocationError("服务点数据暂时无法加载，请稍后重试。");
    }
  }, [city]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadLocations();
  }

  return (
    <main className={styles.page} id="main-content">
      <section
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7, 8, 7, .94), rgba(7, 8, 7, .34)), url("${page.image}")`,
        }}
      >
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroInner}>
          <nav className={styles.breadcrumbs} aria-label="面包屑">
            <Link href="/">首页</Link><span aria-hidden="true">/</span><span aria-current="page">{page.label}</span>
          </nav>
          <p className={styles.eyebrow}><span aria-hidden="true" />{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className={styles.heroCopy}>{page.intro}</p>
          <div className={styles.heroHighlights} aria-label="服务支持重点">
            {page.highlights.slice(0, 4).map((item, index) => (
              <article key={item.title}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.processSection} aria-labelledby="service-process-title">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionLabel}>SERVICE PROCESS</p>
          <div>
            <h2 id="service-process-title">清晰的服务流程</h2>
            <p>{page.sections[0]?.text ?? "从准备信息到确认处理结果，每一步都应清晰、可追踪。"}</p>
          </div>
        </div>
        <ol className={styles.processGrid}>
          {serviceSteps.map((step, index) => (
            <li key={step.title}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.finderSection} aria-labelledby="service-finder-title">
        <div className={styles.finderInner}>
          <div className={styles.finderIntro}>
            <p className={styles.sectionLabel}>SERVICE FINDER</p>
            <h2 id="service-finder-title">按地区查找服务点</h2>
            <p>先选择地区和城市，再查询当前示例数据中对应的服务点。</p>
            <div className={styles.demoNotice} id="service-demo-note">
              <strong>数据说明</strong>
              <p>当前查询使用本地 Mock 数据，仅用于验证交互流程。结果是示例信息，不是钜豪正式服务网点，请勿据此到访。</p>
            </div>
          </div>

          <div className={styles.finderPanel}>
            {regionState === "loading" && <p className={styles.stateCard} role="status">正在加载地区数据…</p>}
            {regionState === "error" && (
              <div className={`${styles.stateCard} ${styles.errorCard}`} role="alert">
                <p>{regionError}</p>
                <button type="button" onClick={() => void loadRegions()}>重新加载</button>
              </div>
            )}
            {regionState === "success" && regions.length === 0 && (
              <p className={styles.stateCard}>暂时没有可查询的地区数据。</p>
            )}

            {regionState === "success" && regions.length > 0 && (
              <form className={styles.finderForm} onSubmit={handleSearch} aria-describedby="service-demo-note">
                <div className={styles.field}>
                  <label htmlFor="service-region">地区</label>
                  <select
                    id="service-region"
                    value={regionId}
                    onChange={(event) => handleRegionChange(event.target.value)}
                  >
                    <option value="">请选择地区</option>
                    {regions.map((region) => <option value={region.id} key={region.id}>{region.name}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="service-city">城市</label>
                  <select
                    id="service-city"
                    value={city}
                    disabled={!selectedRegion}
                    onChange={(event) => handleCityChange(event.target.value)}
                  >
                    <option value="">请选择城市</option>
                    {selectedRegion?.cities.map((regionCity) => <option value={regionCity} key={regionCity}>{regionCity}</option>)}
                  </select>
                </div>
                <button className={styles.searchButton} type="submit" disabled={!city || locationState === "loading"}>
                  {locationState === "loading" ? "查询中…" : "查询服务点"}<span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            <div className={styles.results} aria-live="polite" aria-busy={locationState === "loading"}>
              {locationState === "idle" && regionState === "success" && regions.length > 0 && (
                <p className={styles.resultPrompt}>{city ? "点击“查询服务点”查看示例结果。" : "请选择地区与城市。"}</p>
              )}
              {locationState === "loading" && <p className={styles.resultPrompt} role="status">正在查询 {resultCity} 的服务点…</p>}
              {locationState === "error" && (
                <div className={`${styles.resultPrompt} ${styles.errorCard}`} role="alert">
                  <p>{locationError}</p>
                  <button type="button" onClick={() => void loadLocations()}>重新查询</button>
                </div>
              )}
              {locationState === "success" && locations.length === 0 && (
                <div className={styles.emptyResult}>
                  <strong>暂无示例服务点</strong>
                  <p>当前 Mock 数据未覆盖 {resultCity}。正式网点信息接入并经企业核验后再发布。</p>
                </div>
              )}
              {locationState === "success" && locations.length > 0 && (
                <div className={styles.locationList}>
                  <div className={styles.resultSummary}><strong>{resultCity}</strong><span>{locations.length} 个示例结果</span></div>
                  {locations.map((location) => (
                    <article className={styles.locationCard} key={location.id}>
                      <span className={styles.demoBadge}>交互示例 · 非正式网点</span>
                      <h3>{location.name}</h3>
                      <dl>
                        <div><dt>城市</dt><dd>{location.city}</dd></div>
                        <div><dt>地址</dt><dd>{location.address}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="service-faq-title">
        <div className={styles.faqHeading}>
          <p className={styles.sectionLabel}>FAQ</p>
          <div>
            <h2 id="service-faq-title">常见问题</h2>
            <p>以下内容说明当前网站服务信息的发布边界。</p>
          </div>
        </div>

        {page.faqs?.length ? (
          <dl className={styles.faqList}>
            {page.faqs.map((faq, index) => {
              const questionId = `${faqId}-question-${index}`;
              const answerId = `${faqId}-answer-${index}`;
              const expanded = openFaq === index;

              return (
                <div className={styles.faqItem} key={faq.question}>
                  <dt>
                    <button
                      id={questionId}
                      type="button"
                      aria-controls={answerId}
                      aria-expanded={expanded}
                      onClick={() => setOpenFaq((current) => current === index ? null : index)}
                    >
                      <span><small>{String(index + 1).padStart(2, "0")}</small>{faq.question}</span>
                      <i aria-hidden="true">{expanded ? "−" : "+"}</i>
                    </button>
                  </dt>
                  <dd id={answerId} role="region" aria-labelledby={questionId} hidden={!expanded}>
                    <p>{faq.answer}</p>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className={styles.faqEmpty}>常见问题将在服务政策核验后发布。</p>
        )}
      </section>

      <section className={styles.supportCta} aria-labelledby="service-support-title">
        <div>
          <p className={styles.sectionLabel}>NEED MORE SUPPORT?</p>
          <h2 id="service-support-title">没有找到需要的信息？</h2>
        </div>
        <Link href="/contact">联系钜豪<span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
