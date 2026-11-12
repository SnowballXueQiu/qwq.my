import type Lenis from "lenis";

let instance: Lenis | null = null;

/** Latest scroll velocity in px per frame (signed), for effects that react to speed. */
export const scrollMotion = { velocity: 0 };

/** Lenis' live velocity (0 when idle), falling back to the last scroll event. */
export const getScrollVelocity = () => instance?.velocity ?? scrollMotion.velocity;

export const setLenis = (lenis: Lenis | null) => {
  instance = lenis;
};

export const getLenis = () => instance;

/** Smoothly scrolls to a selector or offset, falling back to native scroll. */
export function scrollToTarget(target: string | number) {
  if (instance) {
    instance.scrollTo(target, { duration: 1.6 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  }
}

/** Freezes page scrolling while an overlay (terminal, menu, game) owns the screen. */
export function lockScroll(locked: boolean) {
  if (instance) {
    if (locked) instance.stop();
    else instance.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
