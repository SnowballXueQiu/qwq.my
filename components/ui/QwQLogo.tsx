"use client";

import { useEffect, useRef } from "react";

/** Eye centres, ring radius and pupil travel in the 120×52 viewBox. */
const EYES = [
  { cx: 24, cy: 24 },
  { cx: 96, cy: 24 },
] as const;
const PUPIL_TRAVEL = 6;

/**
 * The QwQ mark: two round Q-eyes with tear-streak tails and a soft w mouth.
 * With `track`, the pupils follow the pointer and the eyes blink now and then.
 */
export function QwQLogo({ className, track = true }: { className?: string; track?: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  const pupils = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    if (!track) return;
    const el = svg.current;
    if (!el) return;

    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    const current = EYES.map(() => ({ x: 0, y: 0 }));
    let blinkUntil = 0;
    let nextBlink = performance.now() + 2500 + Math.random() * 3000;
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };
    const blink = () => {
      blinkUntil = performance.now() + 140;
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const scale = rect.width / 120;
      if (now > nextBlink) {
        blink();
        nextBlink = now + 2500 + Math.random() * 4000;
      }
      const lid = now < blinkUntil ? 0.12 : 1;
      EYES.forEach((eye, i) => {
        const ex = rect.left + eye.cx * scale;
        const ey = rect.top + eye.cy * scale;
        const dx = px - ex;
        const dy = py - ey;
        const dist = Math.hypot(dx, dy) || 1;
        // Ease towards the pointer; the pupil reaches the rim once the pointer is ~120px away.
        const reach = Math.min(dist / (120 * scale), 1) * PUPIL_TRAVEL;
        const tx = (dx / dist) * reach;
        const ty = (dy / dist) * reach;
        const c = current[i];
        c.x += (tx - c.x) * 0.18;
        c.y += (ty - c.y) * 0.18;
        pupils.current[i]?.setAttribute(
          "transform",
          `translate(${(eye.cx + c.x).toFixed(2)} ${(eye.cy + c.y).toFixed(2)}) scale(1 ${lid})`,
        );
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("click", blink);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("click", blink);
    };
  }, [track]);

  return (
    <svg
      ref={svg}
      viewBox="0 0 120 52"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {EYES.map((eye, i) => (
        <g key={i}>
          <circle cx={eye.cx} cy={eye.cy} r="17" strokeWidth="6" />
          {/* Q tail, drooping like a tear streak. */}
          <path d={`M${eye.cx + 11} ${eye.cy + 12} q4 7 10 10`} strokeWidth="6" />
          <g
            ref={(node) => {
              pupils.current[i] = node;
            }}
            transform={`translate(${eye.cx} ${eye.cy})`}
          >
            <circle r="7.5" fill="currentColor" stroke="none" />
            <circle cx="-2.6" cy="-2.8" r="2.2" fill="var(--paper)" stroke="none" />
          </g>
        </g>
      ))}
      <path d="M49 23 Q53.5 32 60 25.5 Q66.5 32 71 23" strokeWidth="5" />
    </svg>
  );
}
