"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { REDUCED_MOTION_QUERY, motionTokens } from "./tokens";

const MAX_DECLARED_DELAY_MS = 240;
const AUTO_STAGGER_MS = 45;
const MAX_AUTO_STAGGER_MS = 180;

export default function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") return;

    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const targets = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const revealed = new Set<HTMLElement>();
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | null = null;
    let destroyed = false;

    const stopMotion = () => {
      observer?.disconnect();
      observer = null;
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };

    const reveal = (element: HTMLElement, index: number) => {
      revealed.add(element);
      observer?.unobserve(element);
      if (destroyed || reducedMotionQuery.matches || typeof element.animate !== "function") return;

      const declaredDelay = Number(element.dataset.revealDelay);
      const delay = element.dataset.revealDelay !== undefined && Number.isFinite(declaredDelay)
        ? Math.min(Math.max(declaredDelay * 1000, 0), MAX_DECLARED_DELAY_MS)
        : Math.min(index * AUTO_STAGGER_MS, MAX_AUTO_STAGGER_MS);
      const fadeOnly = element.dataset.reveal === "fade";
      const animation = element.animate(
        fadeOnly
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: "translateY(34px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
        {
          delay,
          duration: motionTokens.duration.content * 1000,
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "both",
        },
      );

      animations.add(animation);
      animation.addEventListener("cancel", () => animations.delete(animation), { once: true });
      animation.addEventListener("finish", () => {
        animations.delete(animation);
        animation.cancel();
      }, { once: true });
    };

    const startMotion = () => {
      if (destroyed || reducedMotionQuery.matches) return;
      observer?.disconnect();

      const pending = targets.filter((element) => {
        if (revealed.has(element)) return false;
        if (element.getBoundingClientRect().top > window.innerHeight * 0.72) return true;
        revealed.add(element);
        return false;
      });
      if (pending.length === 0 || !("IntersectionObserver" in window)) return;

      observer = new IntersectionObserver((entries) => {
        if (destroyed || reducedMotionQuery.matches) return;
        entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((entry, index) => reveal(entry.target as HTMLElement, index));
      }, {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.01,
      });
      pending.forEach((target) => observer?.observe(target));
    };

    const onMotionPreferenceChange = () => {
      stopMotion();
      startMotion();
    };

    startMotion();
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);

    return () => {
      destroyed = true;
      reducedMotionQuery.removeEventListener("change", onMotionPreferenceChange);
      stopMotion();
    };
  }, [pathname]);

  return null;
}
