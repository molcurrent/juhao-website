"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import styles from "./SiteMotion.module.css";

const ROUTE_PATH_KEY = "juhao-route-path-v1";

export function SiteMotion() {
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const elements = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      const previousPath = sessionStorage.getItem(ROUTE_PATH_KEY);
      const routeChanged = previousPath !== null && previousPath !== pathname;
      sessionStorage.setItem(ROUTE_PATH_KEY, pathname);

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(elements, { clearProps: "all", opacity: 1, visibility: "visible" });
        gsap.set(curtain.current, { yPercent: -100 });
      });
      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (routeChanged && curtain.current) {
          gsap.timeline()
            .set(curtain.current, { yPercent: 0, autoAlpha: 1 })
            .fromTo(curtain.current.querySelector("strong"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .28, ease: "power2.out" })
            .to(curtain.current, { yPercent: -100, duration: .72, ease: "power4.inOut" }, .18);
        }
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

  return <div className={styles.curtain} ref={curtain} data-route-curtain aria-hidden="true"><strong>JUHAO</strong></div>;
}
