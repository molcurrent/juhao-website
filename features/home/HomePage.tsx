"use client";

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { consultationHref, consultationOptions } from "@/lib/consultation";
import styles from "./HomePage.module.css";

const HeroDisplacementCanvas = lazy(() =>
  import("@/components/motion/HeroDisplacementCanvas").then((module) => ({
    default: module.HeroDisplacementCanvas,
  })),
);

const HomeMotion = lazy(() => import("@/components/motion/HomeMotion"));
const HomeNews = lazy(() => import("./HomeNews"));
const subscribeClientReady = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;

const scenes = [
  { no: "01", slug: "residential", title: "全屋照明", en: "Residential", image: "/images/jh48-home-scene-residential.webp", copy: "让每一种生活，都拥有恰到好处的光。" },
  { no: "02", slug: "hospitality", title: "酒店照明", en: "Hospitality", image: "/images/jh48-home-scene-hospitality.webp", copy: "以光组织抵达、停留与休息的空间体验。" },
  { no: "03", slug: "commercial", title: "商业照明", en: "Commercial", image: "/images/jh48-home-scene-commercial.webp", copy: "用专业光环境，塑造清晰的商业空间层次。" },
  { no: "04", slug: "public", title: "公共照明", en: "Public", image: "/images/jh48-home-scene-public.webp", copy: "以可靠光品质，服务城市公共空间。" },
  { no: "05", slug: "industrial", title: "工业照明", en: "Industrial", image: "/images/jh48-home-scene-industrial.webp", copy: "围绕作业、维护与长期运行规划照明。" },
];

const heroSlides = [
  { image: "/images/jh-night.webp", title: "好房子", accent: "光健康", eyebrow: "LIGHTING FOR BETTER LIVING", copy: "用专业照明与智能科技，重新定义每一个空间的光。" },
  { image: "/images/jh48-home-hero-promenade.webp", title: "光因空间", accent: "而生", eyebrow: "LIGHT SHAPES SPACE", copy: "从人的活动、空间功能与长期使用出发，让每一束光各得其所。" },
  { image: "/images/jh48-home-hero-material.webp", title: "看见体验", accent: "也看见价值", eyebrow: "LIGHT CREATES EXPERIENCE", copy: "用清晰的层次、真实的显色与灵活控制，让空间被看见、被记住。" },
];

const heroImages = heroSlides.map((slide) => slide.image);

const businessPlatforms = [
  { index: "01", label: "CONTENT / PRODUCT", title: "产品中心", description: "从 10 个首批专题进入产品内容与选型路径。", href: "/products" },
  { index: "02", label: "EVIDENCE / PROJECT", title: "工程案例", description: "按项目阶段浏览酒店、商业与户外项目资料。", href: "/cases" },
  { index: "03", label: "TRANSACTION / MALL", title: "商城采购", description: "先查看外部商城连接状态；不可用时转入采购咨询。", href: "/mall" },
  { index: "04", label: "PARTNER / CHANNEL", title: "经销商入口", description: "外部登录恢复前由官网提供合作咨询兜底。", href: "/mall" },
];

const smartNodes = [
  { title: "照明", copy: "按阅读、会客、观影与休息切换光环境，保留手动控制入口。" },
  { title: "窗帘", copy: "结合日照和使用场景控制开合，减少重复操作并保留人工调整。" },
  { title: "环境", copy: "把温湿度与空气状态纳入场景提示，具体设备兼容范围以审核资料为准。" },
  { title: "安防", copy: "在离家、回家与夜间场景中联动提醒，不替代专业安防系统。" },
] as const;

export function HomePage({ publishedProductCount }: { publishedProductCount: number }) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [activeHero, setActiveHero] = useState(0);
  const [activeSmart, setActiveSmart] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [webGlEnabled, setWebGlEnabled] = useState(false);
  const motionReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReady,
    getServerReady,
  );

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopPointerQuery = window.matchMedia("(min-width: 1101px) and (hover: hover) and (pointer: fine)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; addEventListener?: (type: "change", listener: () => void) => void; removeEventListener?: (type: "change", listener: () => void) => void } }).connection;
    const updatePreference = () => {
      setReduceMotion(reducedMotionQuery.matches);
      setWebGlEnabled(!reducedMotionQuery.matches && desktopPointerQuery.matches && connection?.saveData !== true);
    };
    updatePreference();
    reducedMotionQuery.addEventListener("change", updatePreference);
    desktopPointerQuery.addEventListener("change", updatePreference);
    connection?.addEventListener?.("change", updatePreference);
    return () => {
      reducedMotionQuery.removeEventListener("change", updatePreference);
      desktopPointerQuery.removeEventListener("change", updatePreference);
      connection?.removeEventListener?.("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (heroPaused || reduceMotion) return;
    const timer = window.setTimeout(() => setActiveHero((index) => (index + 1) % heroSlides.length), 6500);
    return () => window.clearTimeout(timer);
  }, [activeHero, heroPaused, reduceMotion]);

  const hero = heroSlides[activeHero];

  return (
    <><SiteHeader home /><main className={`${styles.page} homeExperience`} id="main-content" ref={rootRef} tabIndex={-1}>
      {motionReady && <Suspense fallback={null}>
        <HomeMotion root={rootRef} onSceneChange={setActiveScene} onSmartChange={setActiveSmart} />
      </Suspense>}

      <nav className="chapterRail" aria-label="首页章节">
        <Link href="#top" data-chapter-link aria-current="true"><span>品牌场景</span><i /></Link>
        <Link href="#scenes" data-chapter-link><span>空间方案</span><i /></Link>
        <Link href="#smart" data-chapter-link><span>智能家居</span><i /></Link>
        <Link href="#news" data-chapter-link><span>资讯与咨询</span><i /></Link>
      </nav>

      <section className="hero" id="top" data-header-tone="light" data-chapter>
        <div className="heroImage" key={hero.image} style={{ backgroundImage: `url(${hero.image})` }} />
        {webGlEnabled && <Suspense fallback={null}>
          <HeroDisplacementCanvas images={heroImages} activeIndex={activeHero} className="heroCanvas" />
        </Suspense>}
        <div className="heroShade" />
        <div className="heroGrid" />
        <div className="heroGlow" aria-hidden="true" />
        <div className={styles.heroField} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.heroChrome} aria-hidden="true"><span>JUHAO / LIGHT FIELD</span><span>22.97° N · 113.38° E</span></div>
        <div className="heroContent reveal" data-hero-copy key={activeHero}>
          <p className="eyebrow"><span /> {hero.eyebrow}</p>
          <h1><span className="heroLine">{hero.title}</span><br/><em className="heroLine">{hero.accent}</em></h1>
          <p className="heroCopy">{hero.copy}<br/>好房子，光健康，用钜豪照明。</p>
          <div className="actions"><Link className="primary" href="/contact?source=home-hero#contact-directions-title">获取方案 <b>→</b></Link><Link className="ghost" href="/solutions">浏览照明方案</Link></div>
        </div>
        <nav className={`heroPager ${heroPaused ? "isPaused" : ""}`} aria-label="首页首屏内容">{heroSlides.map((slide, index) => <button type="button" aria-current={activeHero === index ? "true" : undefined} aria-label={`显示第 ${index + 1} 幅：${slide.title}${slide.accent}`} onClick={() => { setActiveHero(index); setHeroPaused(true); }} key={slide.image}><span>{String(index + 1).padStart(2, "0")}</span><i aria-hidden="true" /></button>)}{!reduceMotion && <button className="heroPause" type="button" onClick={() => setHeroPaused((paused) => !paused)} aria-label={heroPaused ? "继续首屏自动播放" : "暂停首屏自动播放"}>{heroPaused ? "▶" : "Ⅱ"}</button>}</nav>
        <a className="scroll" href="#about"><span>SCROLL</span><i /></a>
      </section>

      <aside className="heroProofPeek" aria-label="首页已核验内容" data-header-tone="light">
        <div className={styles.proofTrack}>
          <div className={styles.proofGroup}>
            <span>已核验内容<small>VERIFIED CONTENT</small></span>
            <Link href="/products"><strong>{publishedProductCount} 个产品详情</strong><small>企业商城 + 内容台账</small></Link>
            <Link href="/cases"><strong>6 个阶段透明项目档案</strong><small>企业资料编号可追溯</small></Link>
            <Link href="/knowledge"><strong>钜豪企业资料库</strong><small>品牌、项目与发展节点</small></Link>
          </div>
        </div>
      </aside>

      <section className="intro section" id="about" data-header-tone="dark">
        <div className="introLead" data-reveal><p className="eyebrow dark"><span /> 关于钜豪</p><h2>让健康好光<br/>成为美好生活的底色</h2></div>
        <div className="introBody" data-reveal data-reveal-delay="0.08"><p>钜豪专注照明与智能家居，以人居体验为起点，连接产品、空间、服务与渠道。我们相信，真正好的光不只照亮物体，更关照人的情绪、节律与生活。</p><Link className="textLink" href="/about">了解品牌故事 <span>→</span></Link></div>
        <figure className="introMedia introGraphic" data-reveal="fade" aria-label="光、材质与生活节律的品牌视觉意象"><figcaption><span>LIGHT / MATERIAL / RHYTHM</span><strong>好光不只照亮空间，<br />也定义生活的节律。</strong></figcaption></figure>
        <div className="stats verifiedStats" data-reveal>
          <Link href="/products" data-count-value={publishedProductCount}><strong>{publishedProductCount}</strong><span>私有预览产品详情</span><small>企业商城 + 内容台账</small></Link>
          <Link href="/cases" data-count-value="6"><strong>6</strong><span>阶段透明的项目档案</span><small>企业资料 #199 / #220 / #226 / #228 / #229 / #231</small></Link>
          <Link href="/about/history"><strong>2020—2026</strong><span>5 个发展资料节点</span><small>企业资料 #149 / #160 / #192 / #205 / #224</small></Link>
          <Link href="/news" data-count-value="8"><strong>8</strong><span>钜豪企业与项目资讯</span><small>企业知识库来源记录</small></Link>
        </div>
      </section>

      <section className="sceneSection" id="scenes" data-header-tone="light" data-chapter data-scene-section>
        <div className="sceneSticky" data-scene-stage>
          <div className={styles.sceneVisuals} aria-hidden="true">
            {scenes.map((scene, index) => <div className={`sceneVisual ${index === activeScene ? styles.sceneVisualActive : ""}`} data-scene-visual={index} style={{ backgroundImage: `url(${scene.image})` }} key={scene.image} />)}
          </div>
          <div className="sceneMask" aria-hidden="true" />
          <div className={styles.sceneSweep} aria-hidden="true" />
          <div className="sceneContent"><div className="sceneHeadline"><small>{scenes[activeScene].no} / 05 · 空间照明方案</small><h2>光，因空间而生</h2><p className="sceneCopy" key={scenes[activeScene].slug}>{scenes[activeScene].copy}</p></div>
            <nav className="sceneTabs" aria-label="照明空间方案">{scenes.map((scene, i) => <Link href={`/solutions/${scene.slug}`} key={scene.no} className={i === activeScene ? "active" : ""} aria-current={i === activeScene ? "page" : undefined} onMouseEnter={() => setActiveScene(i)} onFocus={() => setActiveScene(i)}><small>{scene.no}</small><b>{scene.title}</b><span>{scene.en}</span><i aria-hidden="true">↗</i></Link>)}</nav>
          </div>
        </div>
      </section>

      <section className="smart section" id="smart" data-header-tone="dark" data-chapter>
        <div className="smartExperience">
          <div className="smartCopy" data-reveal><h2>光智见未来</h2><p>让灯光、窗帘、环境与安防自然协同。无需改变生活习惯，空间便懂得你的每一种需要。</p><Link className="primary orange" href="/smart-home">了解智能方案 <b>→</b></Link></div>
          <div className="smartVisual" aria-hidden="true"><div className="smartRoom"><i /><i /><i /></div><svg viewBox="0 0 600 600"><circle cx="300" cy="300" r="220"/><circle cx="300" cy="300" r="132"/>{smartNodes.map((_, index) => { const angle = (index * Math.PI) / 2 - Math.PI / 2; return <line className={activeSmart === index ? styles.smartLineActive : ""} x1="300" y1="300" x2={300 + Math.cos(angle) * 220} y2={300 + Math.sin(angle) * 220} key={index}/>; })}</svg><div className="core"><span>JUHAO</span><b>{smartNodes[activeSmart].title}</b></div></div>
        </div>
        <div className={styles.smartStack} role="group" aria-label="智能家居联动节点">{smartNodes.map((item, index) => <button type="button" className={styles.smartCard} data-smart-card={index} aria-pressed={activeSmart === index} onMouseEnter={() => setActiveSmart(index)} onFocus={() => setActiveSmart(index)} onClick={() => setActiveSmart(index)} key={item.title}><small>0{index + 1} / 04</small><strong>{item.title}</strong><p>{item.copy}</p><i aria-hidden="true">↗</i></button>)}</div>
      </section>

      <section className="platform" id="platform" data-header-tone="light">
        <div className="platformHead" data-reveal><div><h2>内容与交易<br/>各自做好一件事</h2></div><p>新版官网负责品牌、产品、方案、案例与获客；独立商城继续承接采购、订单和经销商业务，不重复开发成熟交易能力。</p></div>
        <div className="strengthGrid" data-reveal>{businessPlatforms.map((item)=><article key={item.title}><div className="strengthMeta"><small>{item.index}</small><span>{item.label}</span></div><h3>{item.title}</h3><p>{item.description}</p><Link href={item.href} aria-label={`进入${item.title}`}>↗</Link></article>)}</div>
      </section>

      <section className="news section" id="news" data-header-tone="dark" data-chapter><div className="newsTitle" data-reveal><p className="eyebrow dark"><span /> 企业资料更新</p><h2>钜豪资讯与项目动态</h2><div className="newsCount"><strong>08</strong><span>条可追溯的企业、品牌与项目来源记录</span></div></div><div className="homeNews" data-reveal><Suspense fallback={null}><HomeNews /></Suspense></div></section>

      <section className="contact" id="contact" data-header-tone="light"><div data-reveal><p className="eyebrow"><span /> NEXT STEP / 下一步</p><h2>选择你的<br/>咨询方向</h2><p className="contactIntro">家庭、工程与渠道进入不同路径，更快找到明确下一步。</p></div><nav className="contactPaths" aria-label="首页咨询路径" data-reveal data-reveal-delay="0.08"><i className="contactPathGlow" aria-hidden="true" />{consultationOptions.map((item) => <Link href={consultationHref(item.kind, "home-contact")} key={item.kind}><span>{item.label}</span><strong>{item.cta}</strong><b aria-hidden="true">→</b></Link>)}</nav></section>
    </main><SiteFooter /></>
  );
}
