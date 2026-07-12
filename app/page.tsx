"use client";

import { useEffect, useState } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main>
      <header className={`nav ${scrolled ? "navSolid" : ""}`}>
        <a className="logo" href="#top" aria-label="钜豪照明首页"><span>JUHAO</span><small>钜豪照明</small></a>
        <nav className={`links ${menuOpen ? "open" : ""}`} aria-label="主导航">
          <a href="#about" onClick={() => setMenuOpen(false)}>关于钜豪</a>
          <a href="#scenes" onClick={() => setMenuOpen(false)}>解决方案</a>
          <a href="#smart" onClick={() => setMenuOpen(false)}>智能家居</a>
          <a href="#platform" onClick={() => setMenuOpen(false)}>商城平台</a>
          <a href="#news" onClick={() => setMenuOpen(false)}>新闻动态</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>联系合作</a>
        </nav>
        <a className="navCta" href="#contact">招商加盟 <span>↗</span></a>
        <button className="menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="切换导航" aria-expanded={menuOpen}><i/><i/></button>
      </header>

      <section className="hero" id="top">
        <div className="heroImage" />
        <div className="heroGrid" />
        <div className="heroGlow" />
        <div className="heroContent reveal">
          <p className="eyebrow"><span /> LIGHTING FOR BETTER LIVING</p>
          <h1>好房子<br/><em>光健康</em></h1>
          <p className="heroCopy">用专业照明与智能科技，重新定义每一个空间的光。<br/>好房子，光健康，用钜豪照明。</p>
          <div className="actions"><a className="primary" href="#scenes">探索光的方案 <b>→</b></a><a className="ghost" href="#smart">了解智能家居</a></div>
        </div>
        <div className="heroSide"><b>1998</b><span>始于专业照明</span></div>
        <a className="scroll" href="#about"><span>SCROLL</span><i /></a>
      </section>

      <section className="intro section" id="about">
        <div className="sectionNo">01 / BRAND</div>
        <div className="introLead"><p className="eyebrow dark"><span /> ABOUT JUHAO</p><h2>让健康好光<br/>成为美好生活的底色</h2></div>
        <div className="introBody"><p>钜豪专注照明与智能家居，以人居体验为起点，连接产品、空间、服务与渠道。我们相信，真正好的光不只照亮物体，更关照人的情绪、节律与生活。</p><a className="textLink" href="#platform">了解品牌故事 <span>→</span></a></div>
        <div className="stats"><div><strong>25<sup>+</sup></strong><span>品牌沉淀 / 年</span></div><div><strong>10000<sup>+</sup></strong><span>全品类产品方案</span></div><div><strong>300<sup>+</sup></strong><span>服务城市</span></div><div><strong>24<sup>h</sup></strong><span>数字化服务响应</span></div></div>
      </section>

      <section className="sceneSection" id="scenes">
        <div className="sceneVisual" style={{ backgroundImage: `linear-gradient(90deg,rgba(6,7,7,.88),rgba(6,7,7,.08)),url(${scenes[activeScene].image})` }} />
        <div className="sceneContent"><div className="sectionNo light">02 / SOLUTIONS</div><p className="eyebrow"><span /> SPACE & LIGHT</p><h2>光，因空间而生</h2><p className="sceneCopy">{scenes[activeScene].copy}</p>
          <div className="sceneTabs">{scenes.map((scene, i) => <button key={scene.no} className={i === activeScene ? "active" : ""} onMouseEnter={() => setActiveScene(i)} onFocus={() => setActiveScene(i)} onClick={() => setActiveScene(i)}><small>{scene.no}</small><b>{scene.title}</b><span>{scene.en}</span><i>↗</i></button>)}</div>
        </div>
      </section>

      <section className="smart section" id="smart">
        <div className="sectionNo">03 / SMART HOME</div>
        <div className="smartCopy"><p className="eyebrow dark"><span /> JUHAO INTELLIGENCE</p><h2>光智见未来</h2><p>PLC + Zigbee 双模智能家居系统，让灯光、窗帘、空调与安防自然协同。无需改变生活习惯，空间便懂得你的每一种需要。</p><a className="primary orange" href="#contact">预约智能方案 <b>→</b></a></div>
        <div className="smartVisual"><div className="orbit o1"/><div className="orbit o2"/><div className="core"><span>JUHAO</span><b>智能中枢</b></div>{["照明","窗帘","安防","环境"].map((x,i)=><div className={`node n${i+1}`} key={x}><i/>{x}</div>)}</div>
      </section>

      <section className="platform" id="platform">
        <div className="platformHead"><div><p className="eyebrow"><span /> BUSINESS PLATFORM</p><h2>不止照明<br/>更是增长的平台</h2></div><p>从选品、采购到分销与服务，钜豪数字化平台帮助经销商以更低库存、更快周转，连接更广阔的市场。</p></div>
        <div className="strengthGrid">{strengths.map((item,i)=><article key={item[0]}><small>0{i+1}</small><div className="strengthIcon"><i/><i/></div><h3>{item[0]}</h3><p>{item[1]}</p><a href="#contact" aria-label={`了解${item[0]}`}>↗</a></article>)}</div>
      </section>

      <section className="news section" id="news"><div className="sectionNo">04 / NEWS</div><div className="newsTitle"><p className="eyebrow dark"><span /> LATEST STORIES</p><h2>钜豪新动态</h2></div><div className="newsList">{[
        ["品牌动态","2026.06.18","以健康光重塑人居价值，钜豪全屋照明解决方案焕新发布"],
        ["智慧生活","2026.05.26","PLC + Zigbee 双模协同，让全屋智能更稳定、更自然"],
        ["渠道赋能","2026.04.12","数字化平台升级：从一件代发到门店全链路增长"],
      ].map(n=><a href="#contact" key={n[2]}><span>{n[0]}</span><time>{n[1]}</time><h3>{n[2]}</h3><b>↗</b></a>)}</div></section>

      <section className="contact" id="contact"><div><p className="eyebrow"><span /> CREATE WITH LIGHT</p><h2>一起，把好光<br/>带进更多家庭</h2></div><div className="contactBox"><p>无论是家庭照明、工程项目，还是城市合伙，我们都期待与你共创。</p><a href="mailto:service@juhao.com">立即联系 <span>→</span></a></div></section>
      <footer><div className="footerLogo"><b>JUHAO</b><span>钜豪照明</span></div><div className="footerLinks"><a href="#about">关于钜豪</a><a href="#scenes">解决方案</a><a href="#smart">智能家居</a><a href="#platform">商城平台</a></div><p>© 2026 JUHAO LIGHTING. 好房子，光健康，用钜豪照明。</p></footer>
    </main>
  );
}
