"use client";

import { useState } from "react";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";

const scenes = [
  { no: "01", title: "全屋照明", en: "Residential", image: "/images/home.jpg", copy: "让每一种生活，都拥有恰到好处的光。" },
  { no: "02", title: "商业照明", en: "Commercial", image: "/images/business.jpg", copy: "用专业光环境，激活空间商业价值。" },
  { no: "03", title: "公共照明", en: "Public", image: "/images/public.jpg", copy: "以可靠光品质，照亮城市公共空间。" },
  { no: "04", title: "工业照明", en: "Industrial", image: "/images/industrial.jpg", copy: "高效、稳定，为持续生产保驾护航。" },
];

const strengths = [
  ["O2O 商城", "一键生成专属商城，连接线上流量与线下体验"],
  ["智能家居", "PLC + Zigbee 双模协同，全屋场景一键联动"],
  ["渠道赋能", "商品、订单、客户与分销，统一在一个平台管理"],
  ["一城一代理", "清晰区域权益，长期陪伴经销商共同成长"],
];

export default function Home() {
  const [activeScene, setActiveScene] = useState(0);

  return (
    <><SiteHeader home /><main id="main-content">

      <section className="hero" id="top">
        <div className="heroImage" />
        <div className="heroGrid" />
        <div className="heroGlow" />
        <div className="heroContent reveal">
          <p className="eyebrow"><span /> LIGHTING FOR BETTER LIVING</p>
          <h1>好房子<br/><em>光健康</em></h1>
          <p className="heroCopy">用专业照明与智能科技，重新定义每一个空间的光。<br/>好房子，光健康，用钜豪照明。</p>
          <div className="actions"><a className="primary" href="/solutions">探索光的方案 <b>→</b></a><a className="ghost" href="/smart-home">了解智能家居</a></div>
        </div>
        <div className="heroSide"><b>SPACE</b><span>为真实空间设计光</span></div>
        <a className="scroll" href="#about"><span>SCROLL</span><i /></a>
      </section>

      <section className="intro section" id="about">
        <div className="sectionNo">01 / BRAND</div>
        <div className="introLead"><p className="eyebrow dark"><span /> ABOUT JUHAO</p><h2>让健康好光<br/>成为美好生活的底色</h2></div>
        <div className="introBody"><p>钜豪专注照明与智能家居，以人居体验为起点，连接产品、空间、服务与渠道。我们相信，真正好的光不只照亮物体，更关照人的情绪、节律与生活。</p><a className="textLink" href="/about">了解品牌故事 <span>→</span></a></div>
        <div className="stats"><div><strong>全屋</strong><span>家庭健康光环境</span></div><div><strong>商业</strong><span>体验与品牌表达</span></div><div><strong>公共</strong><span>安全与运行效率</span></div><div><strong>工业</strong><span>作业与稳定照明</span></div></div>
      </section>

      <section className="sceneSection" id="scenes">
        <div className="sceneVisual" style={{ backgroundImage: `linear-gradient(90deg,rgba(6,7,7,.88),rgba(6,7,7,.08)),url(${scenes[activeScene].image})` }} />
        <div className="sceneContent"><div className="sectionNo light">02 / SOLUTIONS</div><p className="eyebrow"><span /> SPACE & LIGHT</p><h2>光，因空间而生</h2><p className="sceneCopy">{scenes[activeScene].copy}</p>
          <div className="sceneTabs">{scenes.map((scene, i) => <a href={`/solutions/${["residential","commercial","public","industrial"][i]}`} key={scene.no} className={i === activeScene ? "active" : ""} onMouseEnter={() => setActiveScene(i)} onFocus={() => setActiveScene(i)} onClick={(event) => { if (window.matchMedia("(hover: none)").matches && i !== activeScene) { event.preventDefault(); setActiveScene(i); } }}><small>{scene.no}</small><b>{scene.title}</b><span>{scene.en}</span><i>↗</i></a>)}</div>
        </div>
      </section>

      <section className="smart section" id="smart">
        <div className="sectionNo">03 / SMART HOME</div>
        <div className="smartCopy"><p className="eyebrow dark"><span /> JUHAO INTELLIGENCE</p><h2>光智见未来</h2><p>让灯光、窗帘、环境与安防自然协同。无需改变生活习惯，空间便懂得你的每一种需要。</p><a className="primary orange" href="/smart-home">了解智能方案 <b>→</b></a></div>
        <div className="smartVisual"><div className="orbit o1"/><div className="orbit o2"/><div className="core"><span>JUHAO</span><b>智能中枢</b></div>{["照明","窗帘","安防","环境"].map((x,i)=><div className={`node n${i+1}`} key={x}><i/>{x}</div>)}</div>
      </section>

      <section className="platform" id="platform">
        <div className="platformHead"><div><p className="eyebrow"><span /> BUSINESS PLATFORM</p><h2>不止照明<br/>更是增长的平台</h2></div><p>从选品、采购到分销与服务，钜豪数字化平台帮助经销商以更低库存、更快周转，连接更广阔的市场。</p></div>
        <div className="strengthGrid">{strengths.map((item,i)=><article key={item[0]}><small>0{i+1}</small><div className="strengthIcon"><i/><i/></div><h3>{item[0]}</h3><p>{item[1]}</p><a href={i === 1 ? "/smart-home" : "/mall"} aria-label={`了解${item[0]}`}>↗</a></article>)}</div>
      </section>

      <section className="news section" id="news"><div className="sectionNo">04 / INSIGHTS</div><div className="newsTitle"><p className="eyebrow dark"><span /> LIGHTING INSIGHTS</p><h2>照明知识</h2></div><div className="newsList">{[
        ["健康光","2026.07.12","家庭健康光环境：从看得见到住得舒适","/news/healthy-home-lighting"],
        ["智能生活","2026.07.12","智能家居照明：先设计生活场景，再选择控制方式","/news/smart-lighting-planning"],
        ["方案导航","持续更新","按空间浏览全屋、商业、公共与工业照明方案","/solutions"],
      ].map(n=><a href={n[3]} key={n[2]}><span>{n[0]}</span><time dateTime={n[1] === "持续更新" ? undefined : n[1]}>{n[1]}</time><h3>{n[2]}</h3><b>↗</b></a>)}</div></section>

      <section className="contact" id="contact"><div><p className="eyebrow"><span /> CREATE WITH LIGHT</p><h2>一起，把好光<br/>带进更多家庭</h2></div><div className="contactBox"><p>无论是家庭照明、工程项目，还是渠道合作，我们都期待与你共创。</p><a href="/contact">查看咨询方式 <span>→</span></a></div></section>
    </main><SiteFooter /></>
  );
}
