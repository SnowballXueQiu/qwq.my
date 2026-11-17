import { useEffect, useRef } from "react";

/** Runs `tick(dt)` every frame while `el` is on screen (never with reduced motion). */
export function useFrames(el: React.RefObject<Element | null>, tick: (dt: number) => void, enabled = true) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => {
    const node = el.current;
    if (!node || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const observer = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    observer.observe(node);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible) latest.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [el, enabled]);
}
