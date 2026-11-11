"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero copy pinned to the paper while the sheet tears. As the tear reaches it
 * the type shears into slices and drops out, like a bad signal.
 */
export function HeroIntro({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Glitch the whole pinned block (label included), not just the copy.
    const el = root.current?.parentElement;
    const section = el?.closest("section");
    if (!el || !section || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({
          // start→end spans exactly the section's height, so timeline time == scene time.
          scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
        })
        .to(el, { duration: 0.38 })
        .to(el, { duration: 0.04, x: 6, skewX: -8, clipPath: "inset(0 0 52% 0)", ease: "steps(3)" })
        .to(el, { duration: 0.04, x: -18, skewX: 14, clipPath: "inset(38% 0 8% 0)", ease: "steps(2)" })
        .to(el, { duration: 0.04, x: 40, opacity: 0, clipPath: "inset(70% 0 0 0)", ease: "steps(2)" })
        .to(el, { duration: 0.5 });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="will-change-transform">
      {children}
    </div>
  );
}
