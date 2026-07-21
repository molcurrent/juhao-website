export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const DESKTOP_MOTION_QUERY = "(min-width: 1101px) and (hover: hover) and (pointer: fine)";

export const motionTokens = {
  duration: {
    fast: 0.22,
    content: 0.62,
    section: 1,
    ambient: 10,
  },
  ease: {
    enter: "power4.out",
    section: "power3.inOut",
    scrub: "none",
  },
} as const;

export type MotionTokens = typeof motionTokens;
