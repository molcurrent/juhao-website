"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageLoader } from "@/components/motion/PageLoader";
import { HeroDisplacementCanvas } from "@/components/motion/HeroDisplacementCanvas";
import { AccessibleCarousel } from "@/components/ui/AccessibleCarousel";
import { consultationHref, consultationOptions } from "@/lib/consultation";

const scenes = [
  { no: "01", slug: "residential", title: "全屋照明", en: "Residential", image: "/images/juhao-home.webp", copy: "让每一种生活，都拥有恰到好处的光。" },
  { no: "02", slug: "hospitality", title: "酒店照明", en: "Hospitality", image: "/images/juhao-hero.webp", copy: "以光组织抵达、停留与休息的空间体验。" },
  { no: "03", slug: "commercial", title: "商业照明", en: "Commercial", image: "/images/juhao-commercial.webp", copy: "用专业光环境，塑造清晰的商业空间层次。" },
  { no: "04", slug: "public", title: "公共照明", en: "Public", image: "/images/juhao-public.webp", copy: "以可靠光品质，服务城市公共空间。" },
  { no: "05", slug: "industrial", title: "工业照明", en: "Industrial", image: "/images/juhao-industrial.webp", copy: "围绕作业、维护与长期运行规划照明。" },
];

const heroSlides = [
  { image: "/images/juhao-hero.webp", title: "好房子", accent: "光健康", eyebrow: "LIGHTING FOR BETTER LIVING", copy: "用专业照明与智能科技，重新定义每一个空间的光。", side: "为真实生活设计光" },
  { image: "/images/juhao-public.webp", title: "光因空间", accent: "而生", eyebrow: "LIGHT SHAPES SPACE", copy: "从人的活动、空间功能与长期使用出发，让每一束光各得其所。", side: "为公共空间建立秩序" },
  { image: "/images/juhao-commercial.webp", title: "看见体验", accent: "也看见价值", eyebrow: "LIGHT CREATES EXPERIENCE", copy: "用清晰的层次、真实的显色与灵活控制，让空间被看见、被记住。", side: "为商业体验塑造层次" },
];

const heroImages = heroSlides.map((slide) => slide.image);

const newsItems = [
  ["健康光", "2026.07.12", "家庭健康光环境：从看得见到住得舒适", "/news/healthy-home-lighting"],
  ["智能生活", "2026.07.12", "智能家居照明：先设计生活场景，再选择控制方式", "/news/smart-lighting-planning"],
  ["方案导航", "持续更新", "按空间浏览全屋、酒店、商业、公共与工业照明方案", "/solutions"],
];

export function HomePage() {
  const [activeScene, setActiveScene] = useState(0);
  const [activeHero, setActiveHero] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (heroPaused || reduceMotion) return;
    const timer = window.setTimeout(() => setActiveHero((index) => (index + 1) % heroSlides.length), 6500);
    return () => window.clearTimeout(timer);
  }, [activeHero, heroPaused, reduceMotion]);

  const hero = heroSlides[activeHero];

  return (
    <><PageLoader/><SiteHeader home /><main id="main-content">

      <section className="hero" id="top">
        <div className="heroImage" style={{ backgroundImage: `url(${hero.image})` }} />
        <HeroDisplacementCanvas images={heroImages} activeIndex={activeHero} className="heroCanvas" />
        <div className="heroShade" />
        <div className="heroGrid" />
        <div className="heroGlow" aria-hidden="true" />
        <div className="heroContent reveal" data-reveal="fade" key={activeHero}>
          <p className="eyebrow"><span /> {hero.eyebrow}</p>
          <h1>{hero.title}<br/><em>{hero.accent}</em></h1>
          <p className="heroCopy">{hero.copy}<br/>好房子，光健康，用钜豪照明。</p>
          <div className="actions"><Link className="primary" href={consultationHref("home-health", "home-hero")}>获取空间建议 <b>→</b></Link><Link className="ghost" href={consultationHref("project", "home-hero")}>提交工程需求</Link><Link className="ghost" href={consultationHref("channel", "home-hero")}>渠道合作</Link></div>
        </div>
        <nav className="heroPager" aria-label="首页首屏内容">{heroSlides.map((slide, index) => <button type="button" aria-current={activeHero === index ? "true" : undefined} aria-label={`显示第 ${index + 1} 幅：${slide.title}${slide.accent}`} onClick={() => { setActiveHero(index); setHeroPaused(true); }} key={slide.image}>{String(index + 1).padStart(2, "0")}</button>)}{!reduceMotion && <button className="heroPause" type="button" onClick={() => setHeroPaused((paused) => !paused)} aria-label={heroPaused ? "继续首屏自动播放" : "暂停首屏自动播放"}>{heroPaused ? "▶" : "Ⅱ"}</button>}</nav>
        <div className="heroSide"><b>SPACE</b><span>{hero.side}</span></div>
        <a className="scroll" href="#about"><span>SCROLL</span><i /></a>
      </section>

      <section className="intro section" id="about">
        <div className="sectionNo">01 / BRAND</div>
        <div className="introLead" data-reveal><p className="eyebrow dark"><span /> ABOUT JUHAO</p><h2>让健康好光<br/>成为美好生活的底色</h2></div>
        <div className="introBody" data-reveal data-reveal-delay="0.08"><p>钜豪专注照明与智能家居，以人居体验为起点，连接产品、空间、服务与渠道。我们相信，真正好的光不只照亮物体，更关照人的情绪、节律与生活。</p><Link className="textLink" href="/about">了解品牌故事 <span>→</span></Link></div>
        <div className="stats" data-reveal><div><strong>全屋</strong><span>家庭健康光环境</span></div><div><strong>商业</strong><span>体验与品牌表达</span></div><div><strong>公共</strong><span>安全与运行效率</span></div><div><strong>工业</strong><span>作业与稳定照明</span></div></div>
      </section>

      <section className="sceneSection" id="scenes">
        <div className="sceneVisual" style={{ backgroundImage: `linear-gradient(90deg,rgba(6,7,7,.88),rgba(6,7,7,.08)),url(${scenes[activeScene].image})` }} />
        <div className="sceneContent" data-reveal="fade"><div className="sectionNo light">02 / SOLUTIONS</div><p className="eyebrow"><span /> SPACE & LIGHT</p><h2>光，因空间而生</h2><p className="sceneCopy">{scenes[activeScene].copy}</p>
          <div className="sceneTabs">{scenes.map((scene, i) => <Link href={`/solutions/${scene.slug}`} key={scene.no} className={i === activeScene ? "active" : ""} onMouseEnter={() => setActiveScene(i)} onFocus={() => setActiveScene(i)} onClick={(event) => { if (window.matchMedia("(hover: none)").matches && i !== activeScene) { event.preventDefault(); setActiveScene(i); } }}><small>{scene.no}</small><b>{scene.title}</b><span>{scene.en}</span><i>↗</i></Link>)}</div>
        </div>
      </section>

      <section className="smart section" id="smart">
        <div className="sectionNo">03 / SMART HOME</div>
        <div className="smartCopy" data-reveal><p className="eyebrow dark"><span /> JUHAO INTELLIGENCE</p><h2>光智见未来</h2><p>让灯光、窗帘、环境与安防自然协同。无需改变生活习惯，空间便懂得你的每一种需要。</p><Link className="primary orange" href="/smart-home">了解智能方案 <b>→</b></Link></div>
        <div className="smartVisual" data-reveal="fade"><div className="orbit o1"/><div className="orbit o2"/><div className="core"><span>JUHAO</span><b>智能中枢</b></div>{["照明","窗帘","安防","环境"].map((x,i)=><div className={`node n${i+1}`} key={x}><i/>{x}</div>)}</div>
      </section>

      <section className="platform" id="platform">
        <div className="platformHead" data-reveal><div><p className="eyebrow"><span /> START A CONVERSATION</p><h2>从真实需求出发<br/>进入对应咨询</h2></div><p>家庭、工程与渠道需求分别进入对应路径，减少重复说明，让沟通从场景、阶段和目标开始。</p></div>
        <div className="strengthGrid" data-reveal>{consultationOptions.map((item,i)=><article key={item.kind}><small>0{i+1}</small><div className="strengthIcon"><i/><i/></div><h3>{item.label}</h3><p>{item.description}</p><Link href={consultationHref(item.kind, "home-platform")} aria-label={item.cta}>↗</Link></article>)}</div>
      </section>

      <section className="news section" id="news"><div className="sectionNo">04 / INSIGHTS</div><div className="newsTitle" data-reveal><p className="eyebrow dark"><span /> LIGHTING INSIGHTS</p><h2>照明知识</h2></div><div className="homeNews" data-reveal><AccessibleCarousel ariaLabel="钜豪照明知识" autoPlay autoPlayInterval={5600}>{newsItems.map((item) => <Link className="homeNewsSlide" href={item[3]} key={item[2]}><div><span>{item[0]}</span><time dateTime={item[1] === "持续更新" ? undefined : item[1]}>{item[1]}</time></div><h3>{item[2]}</h3><p>阅读完整内容，了解对应场景的照明规划重点。</p><b>↗</b></Link>)}</AccessibleCarousel></div></section>

      <section className="contact" id="contact"><div data-reveal><p className="eyebrow"><span /> CREATE WITH LIGHT</p><h2>选择你的<br/>咨询方向</h2></div><nav className="contactPaths" aria-label="首页咨询路径" data-reveal>{consultationOptions.map((item) => <Link href={consultationHref(item.kind, "home-contact")} key={item.kind}><span>{item.label}</span><strong>{item.cta}</strong><b aria-hidden="true">→</b></Link>)}</nav></section>
    </main><SiteFooter /></>
  );
}
