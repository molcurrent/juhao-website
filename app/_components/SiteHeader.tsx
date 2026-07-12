"use client";

import { useEffect, useState } from "react";

const navigation = [
  ["关于钜豪", "/about"],
  ["照明方案", "/solutions"],
  ["智能家居", "/smart-home"],
  ["钜豪商城", "/mall"],
  ["新闻资讯", "/news"],
  ["联系合作", "/contact"],
];

export function SiteHeader({ home = false }: { home?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!home);

  useEffect(() => {
    if (!home) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  return (
    <header className={`nav ${scrolled ? "navSolid" : ""} ${home ? "" : "navInner"}`}>
      <a className="logo" href="/" aria-label="钜豪照明首页"><span>JUHAO</span><small>钜豪照明</small></a>
      <nav id="main-navigation" className={`links ${menuOpen ? "open" : ""}`} aria-label="主导航">
        {navigation.map(([label, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
      </nav>
      <a className="navCta" href="/contact">方案咨询 <span>↗</span></a>
      <button type="button" className="menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="切换导航" aria-controls="main-navigation" aria-expanded={menuOpen}><i/><i/></button>
    </header>
  );
}
