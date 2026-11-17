"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToSheet } from "@/components/scroll/beats";
import { on } from "@/lib/fx";
import { getLenis } from "@/lib/scroll";
import { sheets, type SheetId } from "@/lib/sheets";

const MIN_THUMB = 28;

/** A place worth jumping to: a sheet of the home page, a section of a post. */
type Mark = { f: number; label: string; el: HTMLElement };

const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

function scrollPageTo(y: number, immediate: boolean) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true } : { duration: 0.7 });
  else window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
}

/**
 * The page's scrollbar, in place of the browser's: a carriage that slides down the
 * frame's right margin, over the zone letters. Drag it, or press the margin to send it
 * there. Red ticks mark the sheets of the home page and the sections of a post; hover
 * one for its name, click it to go. On a phone it is a thin line that shows while the
 * page moves.
 */
export function ScrollRail() {
  const rail = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  // Live geometry, read by the handlers without re-rendering.
  const geo = useRef({ track: 0, size: MIN_THUMB, max: 0 });
  const drag = useRef<{ grab: number; id: number } | null>(null);

  useEffect(() => {
    const el = rail.current!;
    let raf = 0;
    let idle = 0;

    const place = () => {
      raf = 0;
      const { track, size, max } = geo.current;
      const f = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      thumb.current!.style.transform = `translateY(${(f * (track - size)).toFixed(1)}px)`;
      readout.current!.textContent = `${String(Math.round(f * 100)).padStart(3, "0")}%`;
    };
    const measure = () => {
      const max = maxScroll();
      const track = el.clientHeight;
      const size = Math.max(MIN_THUMB, Math.min(track, (track * innerHeight) / (max + innerHeight)));
      geo.current = { track, size, max };
      el.style.setProperty("--thumb-h", `${size}px`);
      el.toggleAttribute("data-idle", max < 4);
      const found = [...document.querySelectorAll<HTMLElement>("[data-rail]")].map((m) => ({
        f: max > 0 ? Math.min(1, Math.max(0, (m.getBoundingClientRect().top + scrollY) / max)) : 0,
        label: m.dataset.rail ?? "",
        el: m,
      }));
      setMarks((prev) =>
        prev.length === found.length && prev.every((p, i) => p.el === found[i].el && Math.abs(p.f - found[i].f) < 1e-3) ? prev : found,
      );
      place();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(place);
      // Phones: show the line while the page moves.
      el.setAttribute("data-active", "");
      clearTimeout(idle);
      idle = window.setTimeout(() => el.removeAttribute("data-active"), 900);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    // A new page may be the same height as the last; its marks still moved.
    const offNavigate = on("navigate", () => requestAnimationFrame(measure));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      offNavigate();
    };
  }, []);

  const fractionAt = (clientY: number, grab: number) => {
    const { track, size } = geo.current;
    const top = rail.current!.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, (clientY - top - grab) / Math.max(1, track - size)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { size, max } = geo.current;
    const onThumb = thumb.current!.contains(e.target as Node);
    const grab = onThumb ? e.clientY - thumb.current!.getBoundingClientRect().top : size / 2;
    // Pressing the margin sends the carriage there; holding on drags it from then on.
    if (!onThumb) scrollPageTo(fractionAt(e.clientY, grab) * max, false);
    drag.current = { grab, id: e.pointerId };
    rail.current!.setPointerCapture(e.pointerId);
    rail.current!.setAttribute("data-drag", "");
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    scrollPageTo(fractionAt(e.clientY, drag.current.grab) * geo.current.max, true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    rail.current!.removeAttribute("data-drag");
  };

  const go = (mark: Mark) => {
    const sheet = mark.el.dataset.sheet as SheetId | undefined;
    if (sheet && sheets.includes(sheet)) scrollToSheet(sheet);
    // Sections land below the header.
    else scrollPageTo(Math.max(0, mark.el.getBoundingClientRect().top + scrollY - 96), false);
  };

  return (
    <div
      ref={rail}
      aria-hidden
      data-idle
      className="rail"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {marks.map((m) => (
        <button
          key={`${m.label}-${m.f}`}
          type="button"
          tabIndex={-1}
          className="rail-tick"
          style={{ top: `calc(var(--thumb-h) / 2 + ${m.f} * (100% - var(--thumb-h)))` }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(m)}
        >
          <span className="rail-tip">{m.label}</span>
        </button>
      ))}
      <div ref={thumb} className="rail-thumb">
        <span ref={readout} className="rail-tip rail-readout" />
      </div>
    </div>
  );
}
