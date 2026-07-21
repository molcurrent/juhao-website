"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { consultationHref, consultationOptions } from "@/lib/consultation";
import styles from "./FloatingActions.module.css";

export function FloatingActions() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > Math.min(520, window.innerHeight * 0.65));
      setShowConsultation(window.scrollY > Math.min(420, window.innerHeight * 0.55));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  function scrollToTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  if (pathname.startsWith("/catalog-lab/review")) return null;

  return (
    <aside className={styles.actions} aria-label="页面快捷操作">
      {pathname !== "/contact" && <details
        className={`${styles.consultation} ${showConsultation ? styles.consultationVisible : ""}`}
        aria-hidden={!showConsultation}
        inert={!showConsultation}
      >
        <summary className={styles.contact} aria-label="选择咨询方向" tabIndex={showConsultation ? 0 : -1}>
          <span>方案</span>
          <b aria-hidden="true">＋</b>
        </summary>
        <nav className={styles.consultationMenu} aria-label="快捷咨询路径">
          {consultationOptions.map((item) => (
            <Link href={consultationHref(item.kind, "floating")} key={item.kind}>
              <span>{item.label}</span>
              <strong>{item.cta}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
          ))}
        </nav>
      </details>}
      <button
        className={`${styles.top} ${showTop ? styles.topVisible : ""}`}
        type="button"
        onClick={scrollToTop}
        aria-label="返回页面顶部"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
      >
        <span>TOP</span>
        <b aria-hidden="true">↑</b>
      </button>
    </aside>
  );
}
