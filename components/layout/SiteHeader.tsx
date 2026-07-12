"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/content/navigation";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ home = false }: { home?: boolean }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuWasOpen = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(!home);

  useEffect(() => {
    if (!home) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

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

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(drawer.current, { x: menuOpen ? 0 : "100%", duration: reduced ? 0 : 0.55, ease: "power3.inOut" });
    gsap.to(backdrop.current, { autoAlpha: menuOpen ? 1 : 0, duration: reduced ? 0 : 0.3, ease: "power2.out" });
  }, { dependencies: [menuOpen] });

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.solid : ""}`} onMouseLeave={() => setDesktopOpen(null)}>
        <Link className={styles.logo} href="/" aria-label="钜豪照明首页" onClick={closeNavigation}><strong>JUHAO</strong><small>钜豪照明</small></Link>
        <nav className={styles.desktopNav} aria-label="主导航">
          {navigation.map((item) => {
            const current = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <div className={styles.group} key={item.href} onMouseEnter={() => setDesktopOpen(item.children ? item.href : null)} onFocus={() => setDesktopOpen(item.children ? item.href : null)}>
                <Link className={`${styles.topLink} ${current ? styles.active : ""}`} href={item.href} onClick={closeNavigation} aria-current={current ? "page" : undefined} aria-haspopup={item.children ? "true" : undefined} aria-expanded={item.children ? desktopOpen === item.href : undefined}>{item.label}</Link>
                {item.children && <div className={`${styles.dropdown} ${desktopOpen === item.href ? styles.dropdownOpen : ""}`}>{item.children.map((child) => <Link href={child.href} key={child.href} onClick={closeNavigation}><span>{child.label}</span><b>↗</b></Link>)}</div>}
              </div>
            );
          })}
        </nav>
        <Link className={styles.searchLink} href="/search" onClick={closeNavigation} aria-label="搜索钜豪网站"><i aria-hidden="true" /></Link>
        <Link className={styles.cta} href="/contact" onClick={closeNavigation}>方案咨询 <span>↗</span></Link>
        <button ref={menuButton} className={`${styles.menuButton} ${menuOpen ? styles.menuOpen : ""}`} type="button" onClick={() => menuOpen ? closeNavigation() : setMenuOpen(true)} aria-controls="mobile-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? "关闭导航" : "打开导航"}><i /><i /></button>
      </header>
      <button ref={backdrop} className={`${styles.backdrop} ${menuOpen ? styles.backdropOpen : ""}`} type="button" onClick={closeNavigation} aria-label="关闭导航遮罩" aria-hidden="true" tabIndex={-1} />
      <nav ref={drawer} id="mobile-navigation" className={styles.drawer} aria-label="移动端导航" aria-hidden={!menuOpen}>
        {navigation.map((item) => <div className={styles.mobileGroup} key={item.href}>
          <div className={styles.mobileRow}><Link href={item.href} onClick={closeNavigation}>{item.label}</Link>{item.children && <button type="button" onClick={() => setMobileOpen((open) => open === item.href ? null : item.href)} aria-expanded={mobileOpen === item.href} aria-label={`${mobileOpen === item.href ? "收起" : "展开"}${item.label}子菜单`}>{mobileOpen === item.href ? "−" : "+"}</button>}</div>
          {item.children && <div className={`${styles.mobileChildren} ${mobileOpen === item.href ? styles.mobileChildrenOpen : ""}`} inert={mobileOpen !== item.href}><div>{item.children.map((child) => <Link href={child.href} key={child.href} onClick={closeNavigation}>{child.label}</Link>)}</div></div>}
        </div>)}
        <Link className={styles.drawerSearch} href="/search" onClick={closeNavigation}><span>站内搜索</span><b aria-hidden="true">⌕</b></Link>
        <Link className={styles.drawerCta} href="/contact" onClick={closeNavigation}>联系方案顾问 <span>↗</span></Link>
      </nav>
    </>
  );
}
