"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [data-cursor]";

/** Full-viewport construction lines that follow the pointer, with a coordinate readout. */
export function CrosshairCursor() {
  const root = useRef<HTMLDivElement>(null);
  const h = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;
    const html = document.documentElement;
    html.classList.add("has-crosshair");

    let x = -100;
    let y = -100;
    let frame = 0;
    const render = () => {
      frame = 0;
      h.current!.style.transform = `translate3d(0, ${y}px, 0)`;
      v.current!.style.transform = `translate3d(${x}px, 0, 0)`;
      reticle.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      readout.current!.textContent = `X ${String(Math.round(x)).padStart(4, "0")}  Y ${String(Math.round(y)).padStart(4, "0")}`;
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      root.current!.dataset.visible = "true";
      if (!frame) frame = requestAnimationFrame(render);
    };
    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest<HTMLElement>(INTERACTIVE);
      root.current!.dataset.hover = target ? "true" : "false";
      tag.current!.textContent = target?.dataset.cursor ?? (target ? "OPEN" : "");
    };
    const onLeave = () => {
      root.current!.dataset.visible = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      html.classList.remove("has-crosshair");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={root}
      data-visible="false"
      data-hover="false"
      aria-hidden
      className="group pointer-events-none fixed inset-0 z-50 hidden opacity-0 transition-opacity duration-300 data-[visible=true]:opacity-100 [@media(pointer:fine)]:block"
    >
      <div ref={h} className="absolute left-0 top-0 h-px w-full bg-ink/15" />
      <div ref={v} className="absolute left-0 top-0 h-full w-px bg-ink/15" />
      <div ref={reticle} className="absolute left-0 top-0">
        <div className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink transition-all duration-200 group-data-[hover=true]:size-10 group-data-[hover=true]:border-accent" />
        <div className="absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        <div className="absolute left-3 top-3 flex flex-col gap-0.5 whitespace-nowrap">
          <div ref={readout} className="label text-[9px] text-ink-soft" />
          <span
            ref={tag}
            className="label hidden bg-accent px-1 text-[9px] text-paper group-data-[hover=true]:inline-block empty:hidden"
          />
        </div>
      </div>
    </div>
  );
}
