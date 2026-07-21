"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DESKTOP_MOTION_QUERY, motionTokens, REDUCED_MOTION_QUERY } from "./tokens";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type HomeMotionProps = {
  root: RefObject<HTMLElement | null>;
  onSceneChange: (index: number) => void;
  onSmartChange: (index: number) => void;
};

export default function HomeMotion({ root, onSceneChange, onSmartChange }: HomeMotionProps) {
  useGSAP((context) => {
    const scope = root.current;
    if (!scope) return;

    const reduceMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const desktopMotionQuery = window.matchMedia(DESKTOP_MOTION_QUERY);
    const chapterRail = scope.querySelector<HTMLElement>(".chapterRail");
    const contact = scope.querySelector<HTMLElement>("#contact");
    const footer = document.querySelector<HTMLElement>("footer");
    const chapterLinks = [...scope.querySelectorAll<HTMLAnchorElement>("[data-chapter-link]")];
    let enhancedContext: ReturnType<typeof gsap.context> | null = null;
    let desktopContext: ReturnType<typeof gsap.context> | null = null;
    let refreshFrame = 0;
    let destroyed = false;

    const disposeEnhancedContext = () => {
      const current = enhancedContext;
      enhancedContext = null;
      if (current && !current.isReverted) current.revert();
    };

    const disposeDesktopContext = () => {
      const current = desktopContext;
      desktopContext = null;
      if (current && !current.isReverted) current.revert();
    };

    const queueRefresh = () => {
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = window.requestAnimationFrame(() => {
        if (!destroyed) ScrollTrigger.refresh();
      });
    };

    if (chapterRail && contact && footer) {
      const opacityTo = gsap.quickTo(chapterRail, "opacity", {
        duration: motionTokens.duration.fast,
        ease: motionTokens.ease.enter,
      });
      const xTo = gsap.quickTo(chapterRail, "x", {
        duration: motionTokens.duration.fast,
        ease: motionTokens.ease.enter,
      });
      let railHidden: boolean | null = null;

      const setRailHidden = (hidden: boolean) => {
        if (destroyed || hidden === railHidden) return;
        railHidden = hidden;
        chapterRail.inert = hidden;
        chapterRail.toggleAttribute("aria-hidden", hidden);
        chapterRail.style.pointerEvents = hidden ? "none" : "auto";
        const duration = reduceMotionQuery.matches ? 0 : motionTokens.duration.fast;
        opacityTo.tween.duration(duration);
        xTo.tween.duration(duration);
        opacityTo(hidden ? 0 : 1);
        xTo(hidden ? 8 : 0);
      };

      ScrollTrigger.create({
        trigger: contact,
        start: "top 85%",
        endTrigger: footer,
        end: "bottom bottom",
        onEnter: () => setRailHidden(true),
        onLeaveBack: () => setRailHidden(false),
      });
    }

    scope.querySelectorAll<HTMLElement>("[data-chapter]").forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top 48%",
        end: "bottom 48%",
        onToggle: ({ isActive }) => {
          if (!isActive || destroyed) return;
          chapterLinks.forEach((link) => link.toggleAttribute("aria-current", link.hash === `#${section.id}`));
        },
      });
    });

    const buildEnhancedMotion = () => {
      disposeEnhancedContext();

      if (reduceMotionQuery.matches) {
        scope.querySelectorAll<HTMLElement>("[data-reveal]")
          .forEach((element) => {
            element.style.removeProperty("opacity");
            element.style.removeProperty("transform");
          });
        scope.querySelectorAll<HTMLElement>("[data-count-value]").forEach((element) => {
          const target = Number(element.dataset.countValue);
          const output = element.querySelector<HTMLElement>("strong") ?? element;
          if (Number.isFinite(target)) output.textContent = String(target);
        });
        return;
      }

      context.ignore(() => {
        enhancedContext = gsap.context((_enhanced, contextSafe) => {
          const revealTargets = [...scope.querySelectorAll<HTMLElement>("[data-reveal]")]
            .filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.72);
          let revealObserver: IntersectionObserver | null = null;

          if (revealTargets.length > 0 && "IntersectionObserver" in window && contextSafe) {
            const onReveal = contextSafe((entries: IntersectionObserverEntry[]) => {
              if (destroyed) return;
              const visible = entries
                .filter((entry) => entry.isIntersecting)
                .map((entry) => entry.target as HTMLElement);
              if (visible.length === 0) return;
              visible.forEach((element) => revealObserver?.unobserve(element));
              gsap.from(visible, {
                opacity: 0,
                y: (_index, element: HTMLElement) => element.dataset.reveal === "fade" ? 0 : 36,
                scale: (_index, element: HTMLElement) => element.dataset.reveal === "fade" ? 0.96 : 1,
                duration: motionTokens.duration.content,
                ease: motionTokens.ease.enter,
                stagger: (index, element: HTMLElement) => {
                  const declaredDelay = Number(element.dataset.revealDelay);
                  return Number.isFinite(declaredDelay) ? declaredDelay : index * 0.05;
                },
                overwrite: "auto",
                clearProps: "transform,opacity",
              });
            }) as IntersectionObserverCallback;
            revealObserver = new IntersectionObserver(onReveal, {
              rootMargin: "0px 0px -12% 0px",
              threshold: 0.01,
            });
            revealTargets.forEach((element) => revealObserver?.observe(element));
          } else if (revealTargets.length > 0) {
            gsap.from(revealTargets, {
              opacity: 0,
              y: (_index, element: HTMLElement) => element.dataset.reveal === "fade" ? 0 : 36,
              scale: (_index, element: HTMLElement) => element.dataset.reveal === "fade" ? 0.96 : 1,
              duration: motionTokens.duration.content,
              ease: motionTokens.ease.enter,
              stagger: 0.05,
              clearProps: "transform,opacity",
            });
          }

          const counters = [...scope.querySelectorAll<HTMLElement>("[data-count-value]")]
            .map((element) => ({
              element,
              output: element.querySelector<HTMLElement>("strong") ?? element,
              target: Number(element.dataset.countValue),
              state: { value: 0 },
            }))
            .filter((counter) => Number.isFinite(counter.target));

          if (counters.length > 0) {
            const counterTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: counters[0].element.parentElement ?? counters[0].element,
                start: "top 90%",
                once: true,
              },
            });
            counters.forEach((counter) => {
              counterTimeline.to(counter.state, {
                value: counter.target,
                duration: motionTokens.duration.section,
                ease: motionTokens.ease.enter,
                onUpdate: () => {
                  counter.output.textContent = String(Math.round(counter.state.value));
                },
                onComplete: () => {
                  counter.output.textContent = String(counter.target);
                },
              }, 0);
            });
          }

          return () => {
            revealObserver?.disconnect();
            counters.forEach((counter) => {
              counter.output.textContent = String(counter.target);
            });
          };
        }, scope);
      });
    };

    const buildDesktopMotion = () => {
      disposeDesktopContext();
      if (reduceMotionQuery.matches || !desktopMotionQuery.matches) return;

      context.ignore(() => {
        desktopContext = gsap.context(() => {
          let restoreSmartCardAccessibility: (() => void) | null = null;
          const sceneSection = scope.querySelector<HTMLElement>("[data-scene-section]");
          const sceneStage = scope.querySelector<HTMLElement>("[data-scene-stage]");
          const sceneCount = scope.querySelectorAll(".sceneTabs a").length;
          const sceneSweep = sceneStage?.querySelector<HTMLElement>(".sceneMask + [aria-hidden='true']");
          if (sceneSection && sceneStage && sceneCount > 1) {
            const sweepX = sceneSweep ? gsap.quickSetter(sceneSweep, "x", "px") : null;
            const sceneState = { progress: 0 };
            let currentScene = -1;
            const renderScene = () => {
              const progress = sceneState.progress;
              sweepX?.(window.innerWidth * 1.12 * progress);
              const nextScene = Math.min(sceneCount - 1, Math.floor(progress * sceneCount));
              if (nextScene === currentScene || destroyed) return;
              currentScene = nextScene;
              onSceneChange(nextScene);
            };
            gsap.to(sceneState, {
              progress: 1,
              ease: motionTokens.ease.scrub,
              onUpdate: renderScene,
              scrollTrigger: {
                trigger: sceneSection,
                start: "top top",
                end: () => `+=${window.innerHeight * (sceneCount - 1) * 0.72}`,
                pin: sceneStage,
                pinSpacing: true,
                anticipatePin: 1,
                scrub: 0.55,
                invalidateOnRefresh: true,
                refreshPriority: 20,
              },
            });
          }

          const smartCards = [...scope.querySelectorAll<HTMLElement>("[data-smart-card]")];
          const smartStack = smartCards[0]?.parentElement;
          if (smartStack && smartCards.length > 1) {
            let currentSmart = -1;
            const hiddenCards = new WeakMap<HTMLElement, boolean>();
            const accessibilitySnapshots = smartCards.map((card) => ({
              card,
              inert: card.inert,
              ariaHidden: card.getAttribute("aria-hidden"),
              tabIndex: card.getAttribute("tabindex"),
            }));
            const setSmartCardHidden = (card: HTMLElement, index: number, hidden: boolean) => {
              if (hiddenCards.get(card) === hidden) return;
              hiddenCards.set(card, hidden);
              if (hidden && card.contains(document.activeElement)) {
                smartCards.slice(index + 1).find((candidate) => hiddenCards.get(candidate) !== true)
                  ?.focus({ preventScroll: true });
              }
              card.inert = hidden;
              if (hidden) {
                card.setAttribute("aria-hidden", "true");
                card.setAttribute("tabindex", "-1");
              } else {
                card.removeAttribute("aria-hidden");
                card.removeAttribute("tabindex");
              }
            };
            const syncSmartCardAccessibility = (activeIndex: number) => {
              smartCards.forEach((card, index) => {
                setSmartCardHidden(card, index, index < activeIndex);
              });
            };
            const smartTimeline = gsap.timeline({
              defaults: { ease: motionTokens.ease.scrub },
              scrollTrigger: {
                trigger: smartStack,
                start: "top top",
                end: "bottom 34%",
                scrub: 0.45,
                invalidateOnRefresh: true,
                onUpdate: ({ progress }) => {
                  const nextSmart = Math.min(
                    smartCards.length - 1,
                    Math.floor(progress * smartCards.length),
                  );
                  syncSmartCardAccessibility(nextSmart);
                  if (nextSmart === currentSmart || destroyed) return;
                  currentSmart = nextSmart;
                  onSmartChange(nextSmart);
                },
              },
            });
            smartCards.slice(0, -1).forEach((card, index) => {
              smartTimeline.to(card, {
                scale: 0.94,
                opacity: 0,
                duration: 1,
              }, index);
            });
            syncSmartCardAccessibility(0);

            restoreSmartCardAccessibility = () => {
              accessibilitySnapshots.forEach(({ card, inert, ariaHidden, tabIndex }) => {
                card.inert = inert;
                if (ariaHidden === null) card.removeAttribute("aria-hidden");
                else card.setAttribute("aria-hidden", ariaHidden);
                if (tabIndex === null) card.removeAttribute("tabindex");
                else card.setAttribute("tabindex", tabIndex);
              });
            };
          }

          return () => {
            restoreSmartCardAccessibility?.();
            if (sceneSweep) {
              sceneSweep.style.removeProperty("transform");
            }
          };
        }, scope);
      });
    };

    const handleReducedMotionChange = () => {
      if (destroyed) return;
      buildEnhancedMotion();
      buildDesktopMotion();
      queueRefresh();
    };
    const handleDesktopMotionChange = () => {
      if (destroyed) return;
      buildDesktopMotion();
      queueRefresh();
    };

    buildEnhancedMotion();
    buildDesktopMotion();
    reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    desktopMotionQuery.addEventListener("change", handleDesktopMotionChange);
    queueRefresh();

    return () => {
      destroyed = true;
      reduceMotionQuery.removeEventListener("change", handleReducedMotionChange);
      desktopMotionQuery.removeEventListener("change", handleDesktopMotionChange);
      window.cancelAnimationFrame(refreshFrame);
      disposeEnhancedContext();
      disposeDesktopContext();
      if (chapterRail) {
        chapterRail.inert = false;
        chapterRail.removeAttribute("aria-hidden");
        chapterRail.style.removeProperty("pointer-events");
      }
    };
  }, { scope: root });

  return null;
}
