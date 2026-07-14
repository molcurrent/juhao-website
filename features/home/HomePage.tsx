"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
  { category: "项目动态", meta: "企业资料 #226", title: "深圳华发冰雪世界 JW 万豪酒店：签约项目方案档案", href: "/cases/jw-marriott-shenzhen-huafa-snow-world" },
  { category: "项目动态", meta: "企业资料 #231", title: "上饶广丰铂尔曼酒店：按空间拆解方案证据", href: "/cases/pullman-shangrao-guangfeng" },
  { category: "企业动态", meta: "5 个可追溯节点", title: "从区域渠道到智慧家庭：钜豪发展资料时间线", href: "/about/history" },
  { category: "品牌荣誉", meta: "企业资料 #167 / #184 / #223 / #225", title: "只展示有企业资料编号的品牌荣誉", href: "/about/history" },
  { category: "企业动态", meta: "企业资料 #232 · 2026-06-11", title: "2026 广州光亚展参展来源记录", href: "/news/guangzhou-international-lighting-exhibition-2026" },
  { category: "企业动态", meta: "企业资料 #224 · 2026-03-17", title: "2026 春季经销商会议来源记录", href: "/news/dealer-conference-spring-2026" },
  { category: "品牌动态", meta: "企业资料 #223 · 2026-01-20", title: "钜豪照明品牌荣誉来源记录", href: "/news/lighting-industry-top10-source-record-2026" },
  { category: "品牌动态", meta: "企业资料 #222 · 2026-01-20", title: "钜豪家居照明品牌来源记录", href: "/news/home-lighting-brand-source-record-2025" },
];

const businessPlatforms = [
  { title: "产品中心", description: "从 10 个首批专题进入产品内容与选型路径。", href: "/products" },
  { title: "工程案例", description: "按项目阶段浏览酒店、商业与户外项目资料。", href: "/cases" },
  { title: "商城采购", description: "先查看外部商城连接状态；不可用时转入采购咨询。", href: "/mall" },
  { title: "经销商入口", description: "外部登录恢复前由官网提供合作咨询兜底。", href: "/mall" },
];

export function HomePage({ publishedProductCount }: { publishedProductCount: number }) {
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
    <><SiteHeader home /><main id="main-content">

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

      <aside className="heroProofPeek" aria-label="首页已核验内容">
        <span>已核验内容</span>
        <Link href="/products">{publishedProductCount} 个产品详情</Link>
        <Link href="/cases">6 个阶段透明项目档案</Link>
      </aside>

      <section className="intro section" id="about">
        <div className="sectionNo">01 / BRAND</div>
        <div className="introLead" data-reveal><p className="eyebrow dark"><span /> ABOUT JUHAO</p><h2>让健康好光<br/>成为美好生活的底色</h2></div>
        <div className="introBody" data-reveal data-reveal-delay="0.08"><p>钜豪专注照明与智能家居，以人居体验为起点，连接产品、空间、服务与渠道。我们相信，真正好的光不只照亮物体，更关照人的情绪、节律与生活。</p><Link className="textLink" href="/about">了解品牌故事 <span>→</span></Link></div>
        <div className="stats verifiedStats" data-reveal>
          <Link href="/products"><strong>{publishedProductCount}</strong><span>私有预览产品详情</span><small>企业商城 + 内容台账</small></Link>
          <Link href="/cases"><strong>6</strong><span>阶段透明的项目档案</span><small>企业资料 #199 / #220 / #226 / #228 / #229 / #231</small></Link>
          <Link href="/about/history"><strong>2020—2026</strong><span>5 个发展资料节点</span><small>企业资料 #149 / #160 / #192 / #205 / #224</small></Link>
          <Link href="/news"><strong>8</strong><span>钜豪企业与项目资讯</span><small>企业知识库来源记录</small></Link>
        </div>
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
        <div className="platformHead" data-reveal><div><p className="eyebrow"><span /> CONTENT & COMMERCE</p><h2>内容与交易<br/>各自做好一件事</h2></div><p>新版官网负责品牌、产品、方案、案例与获客；独立商城继续承接采购、订单和经销商业务，不重复开发成熟交易能力。</p></div>
        <div className="strengthGrid" data-reveal>{businessPlatforms.map((item,i)=><article key={item.title}><small>0{i+1}</small><div className="strengthIcon"><i/><i/></div><h3>{item.title}</h3><p>{item.description}</p><Link href={item.href} aria-label={`进入${item.title}`}>↗</Link></article>)}</div>
      </section>

      <section className="news section" id="news"><div className="sectionNo">04 / INSIGHTS</div><div className="newsTitle" data-reveal><p className="eyebrow dark"><span /> VERIFIED UPDATES</p><h2>钜豪资讯与项目动态</h2></div><div className="homeNews" data-reveal><AccessibleCarousel ariaLabel="钜豪照明资讯与项目动态" autoPlay autoPlayInterval={5600}>{newsItems.map((item) => <Link className="homeNewsSlide" href={item.href} key={item.title}><div><span>{item.category}</span><small>{item.meta}</small></div><h3>{item.title}</h3><p>阅读完整内容，查看资料来源、当前阶段与内容边界。</p><b>↗</b></Link>)}</AccessibleCarousel></div></section>

      <section className="contact" id="contact"><div data-reveal><p className="eyebrow"><span /> CREATE WITH LIGHT</p><h2>选择你的<br/>咨询方向</h2></div><nav className="contactPaths" aria-label="首页咨询路径" data-reveal>{consultationOptions.map((item) => <Link href={consultationHref(item.kind, "home-contact")} key={item.kind}><span>{item.label}</span><strong>{item.cta}</strong><b aria-hidden="true">→</b></Link>)}</nav></section>
    </main><SiteFooter /></>
  );
}
