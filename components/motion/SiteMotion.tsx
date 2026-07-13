"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import styles from "./SiteMotion.module.css";

export function SiteMotion() {
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const elements = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      gsap.set(curtain.current, { yPercent: -100, autoAlpha: 0 });

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(elements, { clearProps: "all", opacity: 1, visibility: "visible" });
        gsap.set(curtain.current, { yPercent: -100 });
      });
      media.add("(prefers-reduced-motion: no-preference)", () => {
        elements.forEach((element) => {
          const fadeOnly = element.dataset.reveal === "fade";
          const delay = Number(element.dataset.revealDelay ?? 0);
          gsap.fromTo(
            element,
            fadeOnly ? { autoAlpha: 0 } : { autoAlpha: 0, y: 44 },
            fadeOnly ? {
              autoAlpha: 1,
              duration: 0.9,
              delay,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 88%",
                once: true,
              },
            } : {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              delay,
              ease: "power3.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: element,
                start: "top 88%",
                once: true,
              },
            },
          );
        });
      });

      ScrollTrigger.refresh();
      return () => media.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return <div className={styles.curtain} ref={curtain} data-route-curtain aria-hidden="true"><BrandMark className={styles.brandMark} tone="white" /></div>;
}
