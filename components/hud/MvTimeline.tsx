"use client";

import { useEffect, useRef, useState } from "react";
import { prng } from "@/lib/prng";
import { getLenis } from "@/lib/scroll";
import { sheetNumber, sheets, type SheetId } from "@/lib/sheets";
import { useSite } from "@/lib/store";

/** The page runs like a 4-minute cut; the timecode reads off scroll progress. */
const RUNTIME = 240;
const FPS = 24;

const timecode = (p: number) => {
  const total = Math.max(0, Math.min(1, p)) * RUNTIME;
  const f = Math.floor((total % 1) * FPS);
  const s = Math.floor(total) % 60;
  const m = Math.floor(total / 60);
  return `00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
};

/** Deterministic "audio waveform" bars for the clip backgrounds (whole percents, SSR-safe). */
const WAVE = (() => {
  const r = prng(7);
  return Array.from({ length: 140 }, (_, i) => 20 + Math.round(r() * 55 + (i % 9 < 2 ? 25 : 0)));
})();

/**
 * A video-editor timeline along the bottom of the frame: one clip per sheet,
 * a playhead on the current scroll position, and drag-to-scrub.
 */
export function MvTimeline({ titles }: { titles: Record<SheetId, string> }) {
  const reading = useSite((s) => s.reading);
  const percent = useSite((s) => Math.round(s.progress * 100));
  const bar = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<number[]>(() => sheets.map(() => 1));

  // Clip widths follow the real section heights.
  useEffect(() => {
    if (reading) return;
    const measure = () =>
      setWidths(sheets.map((id) => document.querySelector<HTMLElement>(`[data-sheet="${id}"]`)?.offsetHeight ?? 1));
    measure();
    const ro = new ResizeObserver(measure);
    const main = document.getElementById("main");
    if (main) ro.observe(main);
    return () => ro.disconnect();
  }, [reading]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const p = useSite.getState().progress;
      if (head.current) head.current.style.left = `${p * 100}%`;
      if (tc.current) tc.current.textContent = `TC ${timecode(p)}`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrub = (clientX: number, immediate: boolean) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r) return;
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = p * (document.documentElement.scrollHeight - innerHeight);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { immediate, duration: 1.2 });
    else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
  };

  if (reading) return null;
  const total = widths.reduce((a, b) => a + b, 0);
  return (
    <div
      className="pointer-events-none fixed z-40 hidden items-center gap-3 md:flex"
      style={{
        left: "calc(var(--frame-inset) + var(--frame-gutter) + 12px)",
        right: "calc(var(--frame-inset) + var(--frame-gutter) + 352px)",
        bottom: "calc(var(--frame-inset) + var(--frame-gutter) + 10px)",
      }}
    >
      <span ref={tc} className="label shrink-0 tabular-nums text-accent" />
      <div
        ref={bar}
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const step = (e.key === "ArrowRight" ? 1 : -1) * 0.02;
          const y = Math.max(0, Math.min(1, useSite.getState().progress + step)) * (document.documentElement.scrollHeight - innerHeight);
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(y);
          else window.scrollTo({ top: y });
        }}
        data-cursor="SCRUB"
        className="pointer-events-auto relative flex h-8 flex-1 cursor-ew-resize select-none border border-ink bg-paper/70"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e.clientX, false);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientX, true);
        }}
      >
        {sheets.map((id, i) => {
          const from = Math.floor((widths.slice(0, i).reduce((a, b) => a + b, 0) / total) * WAVE.length);
          const to = Math.floor((widths.slice(0, i + 1).reduce((a, b) => a + b, 0) / total) * WAVE.length);
          return (
            <div key={id} className={`relative flex flex-col overflow-hidden ${i ? "border-l border-ink" : ""}`} style={{ flexGrow: widths[i], flexBasis: 0 }}>
              <span className="label truncate px-1 pt-0.5 text-[8px] leading-none">
                <span className="text-accent">{sheetNumber(id)}</span> {titles[id]}
              </span>
              <div className="flex flex-1 items-end gap-px px-1 pb-0.5 opacity-50">
                {WAVE.slice(from, to).map((h, k) => (
                  <span key={k} className="flex-1 bg-ink" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          );
        })}
        <div ref={head} className="absolute -top-1.5 bottom-[-6px] w-px bg-accent">
          <span className="absolute -left-[4px] -top-[1px] size-[9px] rotate-45 bg-accent" />
        </div>
      </div>
    </div>
  );
}
