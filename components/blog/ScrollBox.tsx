"use client";

import { useEffect, useRef } from "react";

/** A list that scrolls on its own (not the page), opened with its current entry in the middle. */
export function ScrollBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    const current = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !current) return;
    // Hidden on narrow screens, so wait until the list has a size (the window may widen later).
    const seen = new ResizeObserver(() => {
      if (!el.clientHeight) return;
      el.scrollTop = current.offsetTop - el.clientHeight / 2 + current.offsetHeight / 2;
      seen.disconnect();
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);
  return (
    <div ref={box} className={`side-scroll ${className}`} data-lenis-prevent>
      {children}
    </div>
  );
}
