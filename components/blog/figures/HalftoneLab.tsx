"use client";

import { useEffect, useRef, useState } from "react";
import { tr, type Lang } from "./Figure";
import { INK, PAPER, edgeMaps, halftone, hatch, mixRGB, renderScene, toneAt, type EdgeMaps, type GBuffer } from "./miniInk";

const LAYERS = [
  { key: "dots", zh: "网点", en: "Dots" },
  { key: "hatch1", zh: "排线 ↗", en: "Hatch ↗" },
  { key: "hatch2", zh: "排线 ↘", en: "Hatch ↘" },
  { key: "lines", zh: "墨线", en: "Lines" },
] as const;
type Layer = (typeof LAYERS)[number]["key"];

/** Ink for one pixel from its darkness, with the same thresholds as the shader. */
function inkAt(x: number, y: number, dk: number, on: Record<Layer, boolean>) {
  let ink = on.dots ? halftone(x, y, dk) : 0;
  if (on.hatch1) ink = Math.max(ink, hatch(x, y, dk, Math.PI / 4, 0.55));
  if (on.hatch2) ink = Math.max(ink, hatch(x, y, dk, -Math.PI / 4, 0.78));
  return ink;
}

/**
 * Tone becomes ink: drag on the picture to move the light. Below, the same
 * rules on a plain ramp from light to dark, so the thresholds are visible.
 */
export function HalftoneLab({ lang }: { lang: Lang }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLCanvasElement>(null);
  const ramp = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [light, setLight] = useState<[number, number, number]>([-0.55, 0.7, 0.55]);
  const [on, setOn] = useState<Record<Layer, boolean>>({ dots: true, hatch1: true, hatch2: true, lines: true });
  const buffers = useRef<{ g: GBuffer; e: EdgeMaps } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const w = Math.round(el.clientWidth);
      setSize((s) => (s.w === w ? s : { w, h: Math.round(w * 0.5) }));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    fit();
    return () => observer.disconnect();
  }, []);

  // Geometry only changes with the size: cast once, shade on every light move.
  useEffect(() => {
    if (!size.w) return;
    const g = renderScene(size.w, size.h);
    buffers.current = { g, e: edgeMaps(g) };
  }, [size]);

  useEffect(() => {
    const ctx = scene.current?.getContext("2d");
    const b = buffers.current;
    if (!ctx || !b || b.g.w !== size.w) return;
    const { g, e } = b;
    const img = ctx.createImageData(g.w, g.h);
    for (let i = 0; i < g.w * g.h; i++) {
      const x = i % g.w;
      const y = Math.floor(i / g.w);
      let c = PAPER;
      if (g.cov[i]) c = mixRGB(PAPER, INK, inkAt(x, y, 1 - toneAt(g, i, light), on));
      if (on.lines) {
        const edge = Math.max(e.silhouette[i], e.id[i], e.crease[i], e.depth[i]);
        c = mixRGB(c, INK, Math.min(1, edge));
      }
      img.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }, [size, light, on]);

  useEffect(() => {
    const ctx = ramp.current?.getContext("2d");
    if (!ctx || !size.w) return;
    const h = 44;
    const img = ctx.createImageData(size.w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < size.w; x++) {
        const c = mixRGB(PAPER, INK, inkAt(x, y, x / (size.w - 1), on));
        img.data.set([c[0], c[1], c[2], 255], (y * size.w + x) * 4);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [size, on]);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = 1 - ((e.clientY - r.top) / r.height) * 2;
    setLight([x * 1.6, y * 1.2, 0.6]);
  };
  return (
    <div ref={wrap}>
      <canvas
        ref={scene}
        width={size.w || 1}
        height={size.h || 1}
        className="block w-full cursor-move touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e)}
      />
      <div className="relative border-t border-ink">
        <canvas ref={ramp} width={size.w || 1} height={44} className="block h-11 w-full" />
        {[0.22, 0.55, 0.78].map((t) => (
          <span key={t} className="pointer-events-none absolute top-0 h-full w-px bg-accent" style={{ left: `${t * 100}%` }}>
            <span className="label absolute -top-0 left-1 bg-paper px-1 text-accent">{t}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-px border-t border-ink bg-ink">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setOn((o) => ({ ...o, [l.key]: !o[l.key] }))}
            className={`label flex-1 px-2 py-1.5 ${on[l.key] ? "bg-paper text-ink" : "bg-paper/70 text-ink-soft line-through"}`}
          >
            {tr(lang, l.zh, l.en)}
          </button>
        ))}
      </div>
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        {tr(
          lang,
          "在图上拖动来移动光源。渐变带从左到右是暗度 0→1：0.22 之后开始出网点，0.55 加一层排线，0.78 再加一层。",
          "Drag on the picture to move the light. The ramp runs darkness 0→1: dots from 0.22, one layer of hatching from 0.55, a second from 0.78.",
        )}
      </p>
    </div>
  );
}
