"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import styles from "./PageLoader.module.css";

const SESSION_KEY = "juhao-loader-v1";

export function PageLoader() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem(SESSION_KEY) === "seen") return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useGSAP(
    () => {
      if (!visible || !root.current) return;
      sessionStorage.setItem(SESSION_KEY, "seen");

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => setVisible(false),
      });
      timeline
        .from(`.${styles.mark}`, { autoAlpha: 0, y: 12, duration: 0.2 })
        .to(`.${styles.progress}`, { scaleX: 1, duration: 0.34, ease: "power2.inOut" }, 0.02)
        .from(`.${styles.status}`, { autoAlpha: 0, duration: 0.14 }, 0.02)
        .to(root.current, { autoAlpha: 0, duration: 0.2, ease: "power2.out" }, 0.36);
    },
    { scope: root, dependencies: [visible], revertOnUpdate: true },
  );

  if (!visible) return null;

  return (
    <div className={styles.loader} ref={root} aria-hidden="true">
      <div className={styles.mark}><BrandMark className={styles.brandMark} tone="white" /><span>LIGHTING FOR BETTER LIVING</span></div>
      <div className={styles.status}><span>LOADING</span><div className={styles.track}><i className={styles.progress} /></div><span>100</span></div>
    </div>
  );
}
