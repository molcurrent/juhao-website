"use client";

import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

export function SiteMotion() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const elements = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      if (!elements.length) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(elements, { clearProps: "all", opacity: 1, visibility: "visible" });
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

  return null;
}
