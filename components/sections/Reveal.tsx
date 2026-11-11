"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/** Types its `[data-line]` children in, one after another, when the block enters. */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const lines = el.querySelectorAll("[data-line]");
      gsap.fromTo(
        lines,
        { clipPath: "inset(0 100% 0 0)", opacity: 0.2 },
        {
          clipPath: "inset(0 0% 0 0)",
          opacity: 1,
          duration: 0.35,
          stagger: 0.06,
          ease: "steps(8)",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
