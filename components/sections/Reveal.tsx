"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/scroll";

/**
 * Types its `[data-line]` children in, one after another, when the block
 * comes on screen, and takes them back out once it has dropped below the
 * screen (scrolling back up). Checked against where the block actually is on
 * every scroll, not against offsets measured in advance: these blocks live in
 * sticky sheets, where a missed or mis-measured trigger left the lines hidden.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const typing = gsap.fromTo(
      el.querySelectorAll("[data-line]"),
      { clipPath: "inset(0 100% 0 0)", opacity: 0.2 },
      { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.35, stagger: 0.06, ease: "power2.out", paused: true },
    );
    const check = () => {
      const r = el.getBoundingClientRect();
      const shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (shown >= r.height * 0.15) typing.play();
      else if (r.top >= innerHeight) typing.reverse();
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      typing.revert();
    };
  }, []);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
