"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { prefersReducedMotion } from "@/lib/scroll";

gsap.registerPlugin(ScrambleTextPlugin);

const GLYPHS = "▚▞▙▟▛▜░▒▓01";

/** Text that decodes from block glyphs whenever `text` changes. */
export function ScrambleText({
  text,
  className,
  duration = 0.7,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = text;
      return;
    }
    const tween = gsap.to(el, {
      duration,
      ease: "none",
      scrambleText: { text, chars: GLYPHS, speed: 0.6, revealDelay: 0.15 },
    });
    return () => {
      tween.kill();
    };
  }, [text, duration]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {text}
    </span>
  );
}
