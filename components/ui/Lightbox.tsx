"use client";

import { useEffect, useState } from "react";
import { lockScroll } from "@/lib/scroll";

type Shot = { src: string; alt: string };

let open: (shots: Shot[], index: number) => void = () => {};

/** Opens an image (or a set of them) full-screen. */
export const showLightbox = (shots: Shot[], index = 0) => open(shots, index);

export function Lightbox({ closeLabel }: { closeLabel: string }) {
  const [state, setState] = useState<{ shots: Shot[]; index: number } | null>(null);

  useEffect(() => {
    open = (shots, index) => setState({ shots, index });
    return () => {
      open = () => {};
    };
  }, []);

  useEffect(() => {
    lockScroll(Boolean(state));
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
      if (e.key === "ArrowRight") setState((s) => s && { ...s, index: (s.index + 1) % s.shots.length });
      if (e.key === "ArrowLeft") setState((s) => s && { ...s, index: (s.index - 1 + s.shots.length) % s.shots.length });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  if (!state) return null;
  const shot = state.shots[state.index];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={shot.alt}
      className="fixed inset-0 z-[90] flex animate-[panic-in_0.25s_ease-out] flex-col items-center justify-center gap-4 bg-[#141414]/90 p-6"
      onClick={() => setState(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- full-size original, already optimised */}
      <img
        src={shot.src}
        alt={shot.alt}
        className="max-h-[82vh] max-w-[92vw] border border-[#f1ede4]/40 bg-[#f1ede4] object-contain shadow-[10px_10px_0_#e8402a]"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#f1ede4]/80">
        <span>{shot.alt}</span>
        {state.shots.length > 1 && (
          <span>
            {state.index + 1} / {state.shots.length} · ← →
          </span>
        )}
        <button type="button" className="hover:text-[#e8402a]" onClick={() => setState(null)}>
          {closeLabel} ✕
        </button>
      </div>
    </div>
  );
}
