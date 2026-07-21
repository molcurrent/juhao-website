"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { navigation } from "@/content/navigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ home = false }: { home?: boolean }) {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuWasOpen = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(!home);
  const [tone, setTone] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!home) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-header-tone]")];
    if (sections.length === 0) return;
    const headerHeight = header.current?.getBoundingClientRect().height ?? 80;
    const observer = new IntersectionObserver((entries) => {
      const active = entries.find((entry) => entry.isIntersecting);
      if (active) setTone(active.target.getAttribute("data-header-tone") === "dark" ? "dark" : "light");
    }, { rootMargin: `-${Math.ceil(headerHeight)}px 0px -${Math.max(0, window.innerHeight - headerHeight - 2)}px 0px` });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (drawer.current) drawer.current.inert = !menuOpen;
    const background = document.querySelectorAll<HTMLElement>("main, footer, aside[aria-label='页面快捷操作'], header a");
    background.forEach((element) => { element.inert = menuOpen; });

    let focusFrame = 0;
    if (menuOpen) {
      focusFrame = requestAnimationFrame(() => drawer.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus());
    } else if (menuWasOpen.current) {
      menuButton.current?.focus();
    }
    menuWasOpen.current = menuOpen;

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = "";
      background.forEach((element) => { element.inert = false; });
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setDesktopOpen(null);
        setMobileOpen(null);
        return;
      }
      if (event.key !== "Tab" || !menuOpen || !drawer.current) return;
      const focusable = [...drawer.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")]
        .filter((element) => element.tabIndex >= 0 && !element.closest("[inert]"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeNavigation() {
    setMenuOpen(false);
    setDesktopOpen(null);
    setMobileOpen(null);
  }

  return (
    <>
      <header ref={header} className={`${styles.header} ${scrolled ? styles.solid : ""} ${tone === "dark" ? styles.darkTone : ""}`} onMouseLeave={() => setDesktopOpen(null)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDesktopOpen(null); }}>
        <Link className={styles.logo} href="/" aria-label="钜豪照明首页" onClick={closeNavigation}><BrandMark className={styles.logoMark} priority tone={tone === "dark" ? "orange" : "white"} /></Link>
        <nav className={styles.desktopNav} aria-label="主导航">
          {navigation.map((item) => {
            const current = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <div className={styles.group} key={item.href} onMouseEnter={() => setDesktopOpen(item.children ? item.href : null)} onFocus={() => setDesktopOpen(item.children ? item.href : null)}>
                <Link className={`${styles.topLink} ${current ? styles.active : ""}`} href={item.href} onClick={closeNavigation} aria-current={current ? "page" : undefined} aria-haspopup={item.children ? "true" : undefined} aria-expanded={item.children ? desktopOpen === item.href : undefined}>{item.label}</Link>
                {item.children && <div className={`${styles.dropdown} ${desktopOpen === item.href ? styles.dropdownOpen : ""}`} aria-hidden={desktopOpen !== item.href} inert={desktopOpen !== item.href}>
                  <div className={styles.panelInner}>
                    <div className={styles.panelIntro}><small>了解钜豪</small><h2>{item.label}</h2><p>{item.panelDescription}</p><Link href={item.href} onClick={closeNavigation}>{item.panelCta ?? `进入${item.label}`}<b aria-hidden="true">→</b></Link></div>
                    <nav className={styles.panelLinks} aria-label={`${item.label}子导航`}>{item.children.map((child, index) => <Link href={child.href} key={child.href} onClick={closeNavigation}><small>{String(index + 1).padStart(2, "0")}</small><span>{child.label}</span><b aria-hidden="true">↗</b></Link>)}</nav>
                    {item.panelImage && desktopOpen === item.href && <div className={styles.panelMedia}>
                      {/* The source is a pre-sized WebP loaded only after the navigation panel opens. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.panelImage} alt="" width={1672} height={941} loading="eager" decoding="async" />
                      <i aria-hidden="true" />
                      <span><small>JUHAO / LIGHTING</small><strong>{item.label}</strong></span>
                    </div>}
                  </div>
                </div>}
              </div>
            );
          })}
        </nav>
        <Link className={styles.searchLink} href="/search" onClick={closeNavigation} aria-label="搜索钜豪网站"><i aria-hidden="true" /></Link>
        <Link className={styles.cta} href="/contact#contact-directions-title" onClick={closeNavigation}>获取方案 <span>↗</span></Link>
        <button ref={menuButton} className={`${styles.menuButton} ${menuOpen ? styles.menuOpen : ""}`} type="button" onClick={() => menuOpen ? closeNavigation() : setMenuOpen(true)} aria-controls="mobile-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "关闭导航" : "打开导航"}><i /><i /></button>
      </header>
      <button className={`${styles.backdrop} ${menuOpen ? styles.backdropOpen : ""}`} type="button" onClick={closeNavigation} aria-label="关闭导航遮罩" aria-hidden="true" tabIndex={-1} />
      <nav ref={drawer} id="mobile-navigation" className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`} aria-label="移动端导航" aria-hidden={!menuOpen}>
        {navigation.map((item) => <div className={styles.mobileGroup} key={item.href}>
          <div className={styles.mobileRow}><Link href={item.href} onClick={closeNavigation}>{item.label}</Link>{item.children && <button type="button" onClick={() => setMobileOpen((open) => open === item.href ? null : item.href)} aria-expanded={mobileOpen === item.href} aria-label={`${mobileOpen === item.href ? "收起" : "展开"}${item.label}子菜单`}>{mobileOpen === item.href ? "−" : "+"}</button>}</div>
          {item.children && <div className={`${styles.mobileChildren} ${mobileOpen === item.href ? styles.mobileChildrenOpen : ""}`} inert={mobileOpen !== item.href}><div>{item.children.map((child) => <Link href={child.href} key={child.href} onClick={closeNavigation}>{child.label}</Link>)}</div></div>}
        </div>)}
        <Link className={styles.drawerSearch} href="/search" onClick={closeNavigation}><span>站内搜索</span><b aria-hidden="true">⌕</b></Link>
        <Link className={styles.drawerCta} href="/contact#contact-directions-title" onClick={closeNavigation}>获取适合你的方案 <span>↗</span></Link>
      </nav>
    </>
  );
}
